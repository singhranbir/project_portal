#!/bin/bash
# setup.sh — Run this inside your cloned project_portal repo root
# Usage:
#   git clone https://github.com/singhranbir/project_portal
#   cd project_portal
#   bash setup.sh   (after copying all portal files here)

set -e

echo "📁 Creating directory structure..."
mkdir -p project_portal/www/projects
mkdir -p project_portal/api
mkdir -p public/css
mkdir -p public/js

echo "✅ Directories ready."

# ── Patch hooks.py ────────────────────────────────────────────────────────────
HOOKS_FILE="project_portal/hooks.py"

# Only add if not already patched
if ! grep -q "portal_menu_items" "$HOOKS_FILE" 2>/dev/null; then
  cat >> "$HOOKS_FILE" << 'HOOKS_PATCH'

# ── Project Portal additions ──────────────────────────────────────────────────
web_include_css = ["/assets/project_portal/css/portal.css"]

portal_menu_items = [
    {"title": "Projects", "route": "/projects", "reference_doctype": "Project", "role": ""},
]

website_route_rules = [
    {"from_route": "/projects/<path:name>", "to_route": "projects"},
]
HOOKS_PATCH
  echo "✅ hooks.py patched."
else
  echo "⚠️  hooks.py already patched — skipping."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  bench build --app project_portal"
echo "  bench --site <your-site> clear-cache"
echo "  bench restart"
