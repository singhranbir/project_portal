"""
www/projects/index.py
Server-side context for the /projects/<project-name> detail page.
Redirects unauthenticated guests; validates project existence.
"""

import frappe


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=" + frappe.request.path
		raise frappe.Redirect

	# Extract project name from URL path: /projects/<name>
	path_parts = frappe.request.path.strip("/").split("/")
	project_name = path_parts[-1] if len(path_parts) >= 2 else None

	if project_name:
		project_name = frappe.utils.escape_html(frappe.utils.strip(project_name))
		if not frappe.db.exists("Project", project_name):
			frappe.local.flags.redirect_location = "/projects"
			raise frappe.Redirect

	context.no_cache = 1
	context.project_name = project_name or ""
	context.title = "Project Detail"
