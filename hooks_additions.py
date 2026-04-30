"""
hooks.py — Add these entries to your existing project_portal/hooks.py
(merge with the file already in the repo, do NOT replace it entirely)

Key additions:
  - app_include_css / app_include_js  → loads assets on all web pages
  - website_route_rules               → maps /projects/* cleanly
  - portal_menu_items                 → adds "Projects" to the portal nav
"""

# ── Asset inclusion (web pages only) ─────────────────────────────────────────
# These paths are relative to the app's /public folder
web_include_css = ["/assets/project_portal/css/portal.css"]
web_include_js = []  # JS is loaded per-page via <script> tags in the templates

# ── Portal sidebar / menu ─────────────────────────────────────────────────────
portal_menu_items = [
	{"title": "Projects", "route": "/projects", "reference_doctype": "Project", "role": ""},
]

# ── Website route rules ───────────────────────────────────────────────────────
# Maps /projects/<name> → www/projects/index.html + www/projects/index.py
website_route_rules = [
	{"from_route": "/projects/<path:name>", "to_route": "projects"},
]
