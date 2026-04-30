# Project Portal for ERPNext

A modern, dark-themed **Project Portal** built on the Frappe Web Page framework. Replaces the default ERPNext portal with a fully dynamic dashboard featuring project-based access control, task viewing, and inline task creation.

---

## ✨ Features

- 🔐 **Access Control** — Users only see projects they're assigned to (via Project Users child table)
- 📊 **Project Dashboard** — Cards with status badges, progress bars, task counts, and timelines
- ✅ **Task List** — Filterable table with status, priority, assignee, and due date highlighting
- ➕ **Add Task Modal** — Inline task creation with validation, loading states, and live refresh
- 🎨 **Modern UI** — Dark navy theme, animated blobs, skeleton loaders, radial progress ring
- 📱 **Responsive** — Mobile-first, tested at 320px+

---

## 📁 File Structure

```
project_portal/
├── project_portal/
│   ├── api/
│   │   ├── __init__.py
│   │   └── projects.py          # Whitelisted Python API
│   └── www/
│       ├── projects.html        # /projects  — List page
│       ├── projects.py          # /projects  — Context
│       └── projects/
│           ├── index.html       # /projects/<name> — Detail page
│           └── index.py         # /projects/<name> — Context
└── public/
    ├── css/
    │   └── portal.css           # Complete design system
    └── js/
        ├── projects.js          # List page logic
        └── project_detail.js    # Detail page logic + modal
```

---

## 🚀 Installation

### 1. Install the app
```bash
cd /path/to/frappe-bench
bench get-app https://github.com/singhranbir/project_portal --branch main
bench --site <your-site> install-app project_portal
```

### 2. Build assets
```bash
bench build --app project_portal
bench --site <your-site> clear-cache
bench restart
```

### 3. Add portal menu item (optional — or run setup.sh)
In ERPNext → Website → Portal Settings → add:
- **Title**: Projects
- **Route**: /projects

---

## 🔗 URLs

| Route | Description |
|-------|-------------|
| `/projects` | Project dashboard — all assigned projects |
| `/projects/<project-name>` | Project detail with task list |

---

## 🔌 Backend API

All methods in `project_portal.api.projects`:

| Method | Description |
|--------|-------------|
| `get_user_projects()` | Projects where current user is in Project Users |
| `get_project_detail(project)` | Single project header fields |
| `get_project_tasks(project)` | All tasks for a project |
| `create_task(data)` | Create a new Task (validates access) |

---

## 🔑 Permission Model

| Role | Access |
|------|--------|
| Administrator | All projects |
| System Manager | All projects |
| Regular User | Projects listed in their Project Users table |
| Guest | Redirected to `/login` |

---

## 🛠 Development

```bash
bench --site <your-site> set-config developer_mode 1
bench watch   # live reload
```

This app uses `pre-commit` for code formatting:
```bash
cd apps/project_portal
pre-commit install
```

---

## License

MIT
