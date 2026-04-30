/**
 * project_detail.js — Project Portal: Project Detail Page
 * Handles: project header, task list, task creation modal
 */

(function () {
  'use strict';

  /* ── State ──────────────────────────────────────────── */
  let projectName = '';
  let allTasks = [];
  let activeStatus = 'all';

  /* ── Init ───────────────────────────────────────────── */
  frappe.ready(function () {
    if (!frappe.session.user || frappe.session.user === 'Guest') {
      window.location.href = '/login?redirect-to=' + window.location.pathname;
      return;
    }
    projectName = window.PORTAL_PROJECT_NAME || '';
    if (!projectName) {
      showToast('No project specified.', 'error');
      return;
    }
    setNavUser();
    loadProjectDetail();
    setupModal();
    setupTaskTabs();
  });

  /* ── Nav User ───────────────────────────────────────── */
  function setNavUser() {
    const el = document.getElementById('navUserName');
    if (el) {
      const name = frappe.session.user.split('@')[0];
      el.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  /* ── Load Project ───────────────────────────────────── */
  function loadProjectDetail() {
    frappe.call({
      method: 'custom_portal.api.projects.get_project_detail',
      args: { project: projectName },
      callback: function (r) {
        if (r.message && r.message.project) {
          renderProjectHero(r.message.project);
        } else {
          // Access denied or not found
          window.location.href = '/projects';
        }
      },
      error: function () {
        showToast('Could not load project. Redirecting...', 'error');
        setTimeout(() => { window.location.href = '/projects'; }, 2000);
      }
    });
    loadTasks();
  }

  /* ── Render Project Hero ────────────────────────────── */
  function renderProjectHero(project) {
    setText('heroProjectName', project.project_name || project.name);
    setText('heroProjectDesc', project.notes || 'No description provided for this project.');
    setText('heroStartDate', formatDate(project.expected_start_date));
    setText('heroEndDate', formatDate(project.expected_end_date));

    // Status badge
    const statusBadge = document.getElementById('heroStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = project.status || 'Open';
      statusBadge.setAttribute('data-status', project.status || 'Open');
    }

    // Priority badge (if field exists)
    const priorityBadge = document.getElementById('heroPriorityBadge');
    if (priorityBadge && project.priority) {
      priorityBadge.textContent = project.priority;
      priorityBadge.setAttribute('data-priority', project.priority);
      priorityBadge.style.display = 'inline-block';
    }

    // Radial progress
    const pct = Math.min(100, Math.max(0, project.percent_complete || 0));
    const radialPct = document.getElementById('radialPct');
    const radialFill = document.getElementById('radialFill');
    if (radialPct) radialPct.textContent = `${Math.round(pct)}%`;
    if (radialFill) {
      const circumference = 314;
      const offset = circumference - (pct / 100) * circumference;
      setTimeout(() => { radialFill.style.strokeDashoffset = offset; }, 300);
    }
  }

  /* ── Load Tasks ─────────────────────────────────────── */
  function loadTasks() {
    const tbody = document.getElementById('taskTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr class="pp-table-skeleton"><td colspan="5"><div class="pp-skeleton pp-skeleton--row"></div></td></tr>
        <tr class="pp-table-skeleton"><td colspan="5"><div class="pp-skeleton pp-skeleton--row"></div></td></tr>
        <tr class="pp-table-skeleton"><td colspan="5"><div class="pp-skeleton pp-skeleton--row"></div></td></tr>
      `;
    }

    frappe.call({
      method: 'custom_portal.api.projects.get_project_tasks',
      args: { project: projectName },
      callback: function (r) {
        allTasks = r.message || [];
        renderTasks(allTasks);
        updateTaskCount(allTasks);
      },
      error: function () {
        showToast('Could not load tasks.', 'error');
        renderTasks([]);
      }
    });
  }

  /* ── Render Tasks ───────────────────────────────────── */
  function renderTasks(tasks) {
    const tbody = document.getElementById('taskTableBody');
    const empty = document.getElementById('taskEmpty');
    if (!tbody) return;

    const filtered = activeStatus === 'all'
      ? tasks
      : tasks.filter(t => t.status === activeStatus);

    tbody.innerHTML = '';

    if (!filtered.length) {
      if (empty) empty.style.display = 'flex';
      return;
    }

    if (empty) empty.style.display = 'none';

    const tpl = document.getElementById('taskRowTemplate');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filtered.forEach((task, idx) => {
      const row = tpl.content.cloneNode(true).querySelector('.pp-task-row');
      row.style.animationDelay = `${idx * 40}ms`;

      // Task name + desc
      row.querySelector('.pp-task-name').textContent = task.subject || task.name;
      const descEl = row.querySelector('.pp-task-desc');
      if (task.description) {
        const tmp = document.createElement('div');
        tmp.innerHTML = task.description;
        descEl.textContent = tmp.textContent.trim().slice(0, 80);
      } else {
        descEl.style.display = 'none';
      }

      // Status badge
      const statusBadge = row.querySelector('.pp-status-badge--task');
      statusBadge.textContent = task.status || 'Open';
      statusBadge.setAttribute('data-status', task.status || 'Open');

      // Priority
      const priorityBadge = row.querySelector('.pp-priority-badge');
      if (task.priority) {
        priorityBadge.textContent = task.priority;
        priorityBadge.setAttribute('data-priority', task.priority);
      } else {
        priorityBadge.textContent = 'Medium';
        priorityBadge.setAttribute('data-priority', 'Medium');
      }

      // Assigned to
      row.querySelector('.pp-task-assignee').textContent = task._assign
        ? JSON.parse(task._assign)[0] || '—'
        : (task.assigned_to || '—');

      // Due date
      const dueCell = row.querySelector('.pp-task-due');
      if (task.exp_end_date) {
        const due = new Date(task.exp_end_date);
        due.setHours(0, 0, 0, 0);
        dueCell.textContent = formatDate(task.exp_end_date);
        if (due < today && task.status !== 'Completed') {
          dueCell.classList.add('pp-task-due--overdue');
        }
      } else {
        dueCell.textContent = '—';
      }

      tbody.appendChild(row);
    });
  }

  /* ── Update Task Count Label ────────────────────────── */
  function updateTaskCount(tasks) {
    const el = document.getElementById('taskCountLabel');
    if (!el) return;
    const open = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length;
    el.textContent = `${tasks.length} total · ${open} open`;
  }

  /* ── Task Tabs ──────────────────────────────────────── */
  function setupTaskTabs() {
    document.querySelectorAll('.pp-tab-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.pp-tab-btn').forEach(b => b.classList.remove('pp-tab-btn--active'));
        this.classList.add('pp-tab-btn--active');
        activeStatus = this.dataset.status;
        renderTasks(allTasks);
      });
    });
  }

  /* ── Modal ──────────────────────────────────────────── */
  function setupModal() {
    const backdrop  = document.getElementById('taskModalBackdrop');
    const addBtn    = document.getElementById('addTaskBtn');
    const closeBtn  = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelTaskBtn');
    const submitBtn = document.getElementById('submitTaskBtn');

    if (!backdrop) return;

    addBtn && addBtn.addEventListener('click', openModal);
    closeBtn && closeBtn.addEventListener('click', closeModal);
    cancelBtn && cancelBtn.addEventListener('click', closeModal);

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });

    submitBtn && submitBtn.addEventListener('click', submitTask);
  }

  function openModal() {
    const backdrop = document.getElementById('taskModalBackdrop');
    if (backdrop) backdrop.classList.add('pp-modal--open');
    const firstInput = document.getElementById('taskSubject');
    if (firstInput) setTimeout(() => firstInput.focus(), 250);
    // Set default due date to today
    const dueDateInput = document.getElementById('taskDueDate');
    if (dueDateInput && !dueDateInput.value) {
      dueDateInput.value = new Date().toISOString().split('T')[0];
    }
  }

  function closeModal() {
    const backdrop = document.getElementById('taskModalBackdrop');
    if (backdrop) backdrop.classList.remove('pp-modal--open');
    resetForm();
  }

  function resetForm() {
    const form = document.getElementById('taskForm');
    if (form) form.reset();
    const errEl = document.getElementById('formError');
    if (errEl) errEl.style.display = 'none';
    setSubmitLoading(false);
  }

  /* ── Submit Task ────────────────────────────────────── */
  function submitTask() {
    const subject = document.getElementById('taskSubject')?.value.trim();
    const description = document.getElementById('taskDescription')?.value.trim();
    const priority = document.getElementById('taskPriority')?.value;
    const dueDate = document.getElementById('taskDueDate')?.value;
    const assignedTo = document.getElementById('taskAssignedTo')?.value.trim();

    if (!subject) {
      showFormError('Task subject is required.');
      document.getElementById('taskSubject')?.focus();
      return;
    }

    setSubmitLoading(true);
    hideFormError();

    frappe.call({
      method: 'custom_portal.api.projects.create_task',
      args: {
        data: {
          project: projectName,
          subject: subject,
          description: description || '',
          priority: priority || 'Medium',
          exp_end_date: dueDate || '',
          assigned_to: assignedTo || ''
        }
      },
      callback: function (r) {
        setSubmitLoading(false);
        if (r.message && r.message.name) {
          showToast('Task created successfully!', 'success');
          closeModal();
          loadTasks();
        } else {
          showFormError('Failed to create task. Please try again.');
        }
      },
      error: function (err) {
        setSubmitLoading(false);
        const msg = err.responseJSON?.exc_type === 'PermissionError'
          ? 'You do not have permission to create tasks in this project.'
          : 'An error occurred. Please try again.';
        showFormError(msg);
      }
    });
  }

  /* ── Form helpers ───────────────────────────────────── */
  function showFormError(msg) {
    const el = document.getElementById('formError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function hideFormError() {
    const el = document.getElementById('formError');
    if (el) el.style.display = 'none';
  }

  function setSubmitLoading(loading) {
    const btn = document.getElementById('submitTaskBtn');
    if (!btn) return;
    btn.querySelector('.pp-btn-label').style.display = loading ? 'none' : 'inline';
    btn.querySelector('.pp-btn-loading').style.display = loading ? 'inline-flex' : 'none';
    btn.disabled = loading;
  }

  /* ── Utils ──────────────────────────────────────────── */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return dateStr; }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function showToast(message, type = 'success') {
    const toast = document.getElementById('toastMsg');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `pp-toast pp-toast--${type} pp-toast--show`;
    setTimeout(() => { toast.className = 'pp-toast'; }, 3500);
  }

})();
