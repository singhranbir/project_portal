"""
custom_portal/api/projects.py

Backend API for the Project Portal.
Provides whitelisted methods for project and task operations
with user-level permission validation.
"""

import frappe
from frappe import _
from frappe.utils import nowdate


def _assert_project_access(project_name):
    """
    Raise PermissionError if the current user is not a member
    of the given project (checked via Project Users child table).
    System Manager and Administrator bypass the check.
    """
    user = frappe.session.user

    if user in ("Administrator", "Guest"):
        if user == "Guest":
            frappe.throw(_("Please log in to access this resource."), frappe.PermissionError)
        return  # Administrator has full access

    # System Manager bypass
    if "System Manager" in frappe.get_roles(user):
        return

    # Check Project Users child table
    is_member = frappe.db.exists(
        "Project User",
        {
            "parent": project_name,
            "parenttype": "Project",
            "user": user,
        },
    )

    if not is_member:
        frappe.throw(
            _("You do not have access to project: {0}").format(project_name),
            frappe.PermissionError,
        )


@frappe.whitelist()
def get_user_projects():
    """
    Return all Projects where the logged-in user is listed
    in the Project Users child table (or is System Manager / Administrator).

    Returns a list of project dicts with summary fields including
    task count and percent completion.
    """
    user = frappe.session.user

    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)

    is_admin = user == "Administrator" or "System Manager" in frappe.get_roles(user)

    if is_admin:
        # Admin sees all projects
        projects = frappe.get_all(
            "Project",
            fields=[
                "name",
                "project_name",
                "status",
                "percent_complete",
                "expected_start_date",
                "expected_end_date",
                "notes",
                "priority",
            ],
            order_by="creation desc",
        )
    else:
        # Get project names from Project User table
        project_names = frappe.db.sql(
            """
            SELECT DISTINCT parent
            FROM `tabProject User`
            WHERE user = %(user)s
              AND parenttype = 'Project'
            """,
            {"user": user},
            as_list=True,
        )
        project_names = [p[0] for p in project_names]

        if not project_names:
            return []

        projects = frappe.get_all(
            "Project",
            filters={"name": ("in", project_names)},
            fields=[
                "name",
                "project_name",
                "status",
                "percent_complete",
                "expected_start_date",
                "expected_end_date",
                "notes",
                "priority",
            ],
            order_by="creation desc",
        )

    # Enrich with task counts
    for project in projects:
        project["task_count"] = frappe.db.count(
            "Task", filters={"project": project["name"]}
        )

    return projects


@frappe.whitelist()
def get_project_detail(project):
    """
    Return full project details for the detail page.
    Validates that the current user has access to the project.

    Args:
        project (str): Project name (docname)

    Returns:
        dict: { "project": <project fields> }
    """
    if not project:
        frappe.throw(_("Project name is required."))

    _assert_project_access(project)

    doc = frappe.get_doc("Project", project)

    return {
        "project": {
            "name": doc.name,
            "project_name": doc.project_name,
            "status": doc.status,
            "percent_complete": doc.percent_complete or 0,
            "expected_start_date": str(doc.expected_start_date) if doc.expected_start_date else None,
            "expected_end_date": str(doc.expected_end_date) if doc.expected_end_date else None,
            "notes": doc.notes or "",
            "priority": getattr(doc, "priority", None),
        }
    }


@frappe.whitelist()
def get_project_tasks(project):
    """
    Return all tasks linked to the given project.
    Validates user has access to the project first.

    Args:
        project (str): Project name (docname)

    Returns:
        list[dict]: Task records
    """
    if not project:
        frappe.throw(_("Project name is required."))

    _assert_project_access(project)

    tasks = frappe.get_all(
        "Task",
        filters={"project": project},
        fields=[
            "name",
            "subject",
            "status",
            "priority",
            "description",
            "exp_end_date",
            "assigned_to",
            "_assign",
            "creation",
        ],
        order_by="creation desc",
    )

    return tasks


@frappe.whitelist()
def create_task(data):
    """
    Create a new Task linked to the given project.
    Validates:
      - User has access to the project
      - Required fields are present
      - (Optional) assigned_to is a valid system user

    Args:
        data (dict | str): Task fields including `project`

    Returns:
        dict: { "name": <task docname> }
    """
    if isinstance(data, str):
        import json
        data = json.loads(data)

    project = data.get("project")
    subject = (data.get("subject") or "").strip()

    if not project:
        frappe.throw(_("Project is required to create a task."))
    if not subject:
        frappe.throw(_("Task subject cannot be empty."))

    # Permission check
    _assert_project_access(project)

    # Validate assigned_to if provided
    assigned_to = (data.get("assigned_to") or "").strip()
    if assigned_to:
        if not frappe.db.exists("User", assigned_to):
            frappe.throw(_("User '{0}' does not exist in the system.").format(assigned_to))

    task = frappe.get_doc(
        {
            "doctype": "Task",
            "project": project,
            "subject": subject,
            "description": data.get("description") or "",
            "priority": data.get("priority") or "Medium",
            "exp_end_date": data.get("exp_end_date") or None,
            "assigned_to": assigned_to or None,
            "status": "Open",
        }
    )

    task.insert(ignore_permissions=False)
    frappe.db.commit()

    # Auto-assign if email provided
    if assigned_to:
        try:
            frappe.share.add("Task", task.name, assigned_to, write=1, notify=0)
        except Exception:
            pass  # Non-critical

    return {"name": task.name}
