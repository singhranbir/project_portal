"""
www/projects.py
Server-side context for the /projects list page.
Redirects unauthenticated guests to login.
"""

import frappe


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=/projects"
		raise frappe.Redirect

	context.no_cache = 1
	context.title = "My Projects"

	user_doc = frappe.get_cached_doc("User", frappe.session.user)
	context.current_user = {
		"email": user_doc.email,
		"full_name": user_doc.full_name or user_doc.email,
	}
