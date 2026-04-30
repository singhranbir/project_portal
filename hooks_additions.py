# ── Add these lines to project_portal/project_portal/hooks.py ────────────────
#
# IMPORTANT: We use /my-projects instead of /projects to avoid conflicting
# with ERPNext's built-in route:
#   {"from_route": "/project", "to_route": "Project"}  ← in erpnext/hooks.py
#
# Frappe normalises /projects → /project because of this rule.
# Using /my-projects sidesteps the conflict entirely.
# ─────────────────────────────────────────────────────────────────────────────

# Load portal CSS on all web pages
web_include_css = ["/assets/project_portal/css/portal.css"]

# Add portal sidebar menu item
standard_portal_menu_items = [
	{
		"title": "My Projects",
		"route": "/my-projects",
		"reference_doctype": "Project",
		"role": "",
	},
]

# Route rule: /my-projects/<name> → www/my-projects/index.html
website_route_rules = [
	{"from_route": "/my-projects/<path:name>", "to_route": "my-projects"},
]
