/* ============================================================
   HABIT TRACKER — GLOBAL SCRIPT
   Handles: API base URL, dashboard logic, toast, modal, reminders
   ============================================================ */

// ── API Base URL (env-aware) ───────────────────────────────
// On Vercel: same origin (empty string), /api/* routed to serverless
// Locally: always talk to Express on port 5000
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : '';

// ── Auth Helper ────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('habitToken');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

// ── Toast Notification ─────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ── Browser Reminder Notification ─────────────────────────
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendReminderNotification(habitName) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Habit Reminder 🔔', {
      body: `Don't forget: "${habitName}" — keep your streak alive!`,
      icon: '',
    });
  }
}

// ── Dashboard Logic ────────────────────────────────────────
if (document.getElementById('habitList')) {
  requestNotificationPermission();

  let habits = [];

  // Fetch habits from API
  async function loadHabits() {
    try {
      const res = await fetch(`${API_BASE}/api/habits`, { headers: authHeaders() });
      if (res.status === 401) { logout(); return; }
      habits = await res.json();
      renderHabits();
      updateStats();
      checkReminders();
    } catch (err) {
      showToast('Failed to load habits. Check your connection.', 'error');
    }
  }

  // Render the habit list
  function renderHabits() {
    const list = document.getElementById('habitList');
    const countBadge = document.getElementById('habitCount');
    countBadge.textContent = habits.length;

    if (!habits.length) {
      list.innerHTML = `
        <div class="empty-state">
          <h3>No habits yet</h3>
          <p>Start building better habits — add your first one above!</p>
        </div>`;
      return;
    }

    list.innerHTML = `<div class="habit-list">${habits.map(habitCard).join('')}</div>`;

    // Bind check buttons
    list.querySelectorAll('.habit-check-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleComplete(btn.dataset.id));
    });

    // Bind delete buttons
    list.querySelectorAll('.habit-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteHabit(btn.dataset.id));
    });

    // Bind stats buttons
    list.querySelectorAll('.habit-stats-btn').forEach(btn => {
      btn.addEventListener('click', () => openStats(btn.dataset.id));
    });
  }

  function habitCard(h) {
    const doneClass = h.completedToday ? 'completed' : '';
    const checkContent = h.completedToday ? '✓' : '';
    const streakLabel = h.streak > 0 ? `🔥 ${h.streak} day streak` : 'No streak yet';
    const rateLabel = `${h.completionRate}% this month`;

    return `
      <div class="habit-item ${doneClass}" id="habit-${h._id}">
        <div class="habit-left">
          <button class="habit-check habit-check-btn" data-id="${h._id}" title="Mark complete">${checkContent}</button>
          <div>
            <div class="habit-name">${escapeHtml(h.name)}</div>
            <div class="habit-meta">
              <span class="habit-streak">${streakLabel}</span>
              <span>${rateLabel}</span>
            </div>
          </div>
        </div>
        <div class="habit-right">
          <button class="btn btn-outline btn-sm habit-stats-btn" data-id="${h._id}" title="View stats">📊</button>
          <button class="btn btn-danger btn-sm habit-delete-btn" data-id="${h._id}" title="Delete">✕</button>
        </div>
      </div>`;
  }

  function updateStats() {
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
    document.getElementById('totalHabits').textContent = habits.length;
    document.getElementById('bestStreak').textContent = bestStreak;
  }

  // Check reminders for uncompleted habits
  function checkReminders() {
    const incomplete = habits.filter(h => !h.completedToday);
    if (incomplete.length > 0) {
      const names = incomplete.map(h => h.name).join(', ');
      console.log(`[Habit Reminder] You have ${incomplete.length} incomplete habit(s) today: ${names}`);
      // Send browser notification for first incomplete habit
      if (incomplete.length === 1) {
        sendReminderNotification(incomplete[0].name);
      } else if (incomplete.length > 1) {
        sendReminderNotification(`${incomplete.length} habits awaiting completion`);
      }
    }
  }

  // Add habit
  document.getElementById('addHabitBtn').addEventListener('click', addHabit);
  document.getElementById('habitInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addHabit();
  });

  async function addHabit() {
    const input = document.getElementById('habitInput');
    const name = input.value.trim();
    if (!name) {
      input.focus();
      showToast('Please enter a habit name.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/habits`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name }),
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      input.value = '';
      showToast(`"${name}" added!`, 'success');
      await loadHabits();
    } catch (err) {
      showToast(err.message || 'Failed to add habit.', 'error');
    }
  }

  // Toggle complete
  async function toggleComplete(id) {
    try {
      const res = await fetch(`${API_BASE}/api/habits/${id}/complete`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      const msg = data.completedToday ? `✓ "${data.name}" marked complete!` : `"${data.name}" unmarked.`;
      showToast(msg, data.completedToday ? 'success' : 'info');
      await loadHabits();
    } catch (err) {
      showToast('Failed to update habit.', 'error');
    }
  }

  // Delete habit
  async function deleteHabit(id) {
    const habit = habits.find(h => h._id === id);
    if (!confirm(`Delete "${habit ? habit.name : 'this habit'}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/habits/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.status === 401) { logout(); return; }
      showToast('Habit deleted.', 'info');
      await loadHabits();
    } catch (err) {
      showToast('Failed to delete habit.', 'error');
    }
  }

  // Stats modal
  async function openStats(id) {
    try {
      const res = await fetch(`${API_BASE}/api/habits/${id}/stats`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();

      document.getElementById('modalHabitName').textContent = data.name;
      document.getElementById('modalStreak').textContent = data.streak;
      document.getElementById('modalRate').textContent = `${data.completionRate}%`;
      document.getElementById('modalTotal').textContent = data.totalCompletions;

      // Calendar
      const grid = document.getElementById('calendarGrid');
      grid.innerHTML = data.last30Days.map(d =>
        `<div class="cal-day ${d.completed ? 'done' : ''}" title="${d.date}"></div>`
      ).join('');

      document.getElementById('statsModal').classList.add('open');
    } catch (err) {
      showToast('Could not load stats.', 'error');
    }
  }

  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('statsModal').classList.remove('open');
  });

  document.getElementById('statsModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('statsModal')) {
      document.getElementById('statsModal').classList.remove('open');
    }
  });

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });

  function logout() {
    localStorage.removeItem('habitToken');
    localStorage.removeItem('habitUser');
    window.location.href = 'login.html';
  }

  // Load on start
  loadHabits();
}

// ── Utility ────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
