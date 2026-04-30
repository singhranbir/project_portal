/**
 * projects.js — Project Portal: Projects List Page
 * Handles: auth check, project fetching, filtering, rendering
 */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────── */
  let allProjects = [];
  let activeFilter = 'all';

  /* ── Init ───────────────────────────────────────────── */
  frappe.ready(function () {
    checkAuth();
  });

  function checkAuth() {
    if (!frappe.session.user || frappe.session.user === 'Guest') {
      window.location.href = '/login?redirect-to=/my-projects';
      return;
    }
    initPage();
  }

  function initPage() {
    setNavUser();
    loadProjects();
    setupFilters();
  }

  /* ── Nav User ───────────────────────────────────────── */
  function setNavUser() {
    const el = document.getElementById('navUserName');
    if (el) {
      const name = frappe.session.user.split('@')[0];
      el.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  /* ── Load Projects ──────────────────────────────────── */
  function loadProjects() {
    frappe.call({
      method: 'custom_portal.api.projects.get_user_projects',
      callback: function (r) {
        if (r.message) {
          allProjects = r.message;
          renderStats(allProjects);
          renderProjects(allProjects);
          updateHeroSub(allProjects);
        } else {
          renderStats([]);
          showEmpty();
        }
      },
      error: function () {
        showToast('Failed to load projects. Please refresh.', 'error');
        renderStats([]);
        showEmpty();
      }
    });
  }

  /* ── Hero Subtext ───────────────────────────────────── */
  function updateHeroSub(projects) {
    const el = document.getElementById('heroSubtext');
    if (!el) return;
    const open = projects.filter(p => p.status === 'Open').length;
    const user = frappe.session.user.split('@')[0];
    el.textContent = `Welcome back, ${capitalize(user)}. You have ${open} active project${open !== 1 ? 's' : ''}.`;
  }

  /* ── Render Stats ───────────────────────────────────── */
  function renderStats(projects) {
    const grid = document.getElementById('statsGrid');
    if (!grid) return;

    const total = projects.length;
    const active = projects.filter(p => p.status === 'Open').length;
    const done = projects.filter(p => p.status === 'Completed').length;

    grid.innerHTML = `
      <div class="pp-stat-card">
        <div class="pp-stat-label">Total Projects</div>
        <div class="pp-stat-value pp-stat-value--indigo">${total}</div>
      </div>
      <div class="pp-stat-card">
        <div class="pp-stat-label">Active</div>
        <div class="pp-stat-value pp-stat-value--amber">${active}</div>
      </div>
      <div class="pp-stat-card">
        <div class="pp-stat-label">Completed</div>
        <div class="pp-stat-value pp-stat-value--green">${done}</div>
      </div>
    `;
  }

  /* ── Render Projects ────────────────────────────────── */
  function renderProjects(projects) {
    const grid = document.getElementById('projectsGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) return;

    const filtered = activeFilter === 'all'
      ? projects
      : projects.filter(p => p.status === activeFilter);

    grid.innerHTML = '';

    if (!filtered.length) {
      emptyState && (emptyState.style.display = 'block');
      return;
    }

    emptyState && (emptyState.style.display = 'none');

    const tpl = document.getElementById('projectCardTemplate');

    filtered.forEach((project, idx) => {
      const card = tpl.content.cloneNode(true).querySelector('.pp-project-card');
      card.style.animationDelay = `${idx * 60}ms`;
      card.dataset.projectName = project.name;

      // Status badge
      const badge = card.querySelector('.pp-status-badge');
      badge.textContent = project.status || 'Open';
      badge.setAttribute('data-status', project.status || 'Open');

      // Date
      card.querySelector('.pp-project-date').textContent = formatDate(project.expected_end_date);

      // Name
      card.querySelector('.pp-project-name').textContent = project.project_name || project.name;

      // Description
      const desc = card.querySelector('.pp-project-desc');
      desc.textContent = project.notes || 'No description provided.';

      // Task count
      card.querySelector('.task-count').textContent =
        `${project.task_count || 0} task${project.task_count !== 1 ? 's' : ''}`;

      // Due date
      card.querySelector('.due-date').textContent = project.expected_end_date
        ? formatDate(project.expected_end_date)
        : 'No deadline';

      // Progress
      const pct = Math.min(100, Math.max(0, project.percent_complete || 0));
      card.querySelector('.pp-progress-pct').textContent = `${Math.round(pct)}%`;
      card.querySelector('.pp-progress-fill').style.width = `${pct}%`;

      // CTA link
      const cta = card.querySelector('.pp-card-cta');
      cta.href = `/my-projects/${encodeURIComponent(project.name)}`;

      // Click whole card
      card.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') return;
        window.location.href = `/my-projects/${encodeURIComponent(project.name)}`;
      });

      grid.appendChild(card);
    });

    // Trigger progress bar animations after paint
    requestAnimationFrame(() => {
      grid.querySelectorAll('.pp-progress-fill').forEach(fill => {
        const w = fill.style.width;
        fill.style.width = '0%';
        setTimeout(() => { fill.style.width = w; }, 100);
      });
    });
  }

  /* ── Filters ────────────────────────────────────────── */
  function setupFilters() {
    document.querySelectorAll('.pp-filter-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.pp-filter-btn').forEach(b => b.classList.remove('pp-filter-btn--active'));
        this.classList.add('pp-filter-btn--active');
        activeFilter = this.dataset.filter;
        renderProjects(allProjects);
      });
    });
  }

  /* ── Empty State ────────────────────────────────────── */
  function showEmpty() {
    const grid = document.getElementById('projectsGrid');
    const empty = document.getElementById('emptyState');
    if (grid) grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
  }

  /* ── Utils ──────────────────────────────────────────── */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return dateStr; }
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
  }

  function showToast(message, type = 'success') {
    const toast = document.getElementById('toastMsg');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `pp-toast pp-toast--${type} pp-toast--show`;
    setTimeout(() => { toast.className = 'pp-toast'; }, 3500);
  }

})();
