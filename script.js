// Modern Goal Tracker Script
// Data model: { id, name, streak, history: [true/false], created, lastDone }

const goalsKey = 'todaycounted_goals';
const themeKey = 'todaycounted_theme';
const goalsList = document.getElementById('goals-list');
const addGoalForm = document.getElementById('add-goal-form');
const goalInput = document.getElementById('goal-input');
const themeToggle = document.querySelector('.theme-toggle');
const body = document.body;
const modal = document.getElementById('modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalContent = document.querySelector('.modal-content');
const modalClose = document.querySelector('.modal-close');
const addGoalBtn = document.querySelector('.add-goal-btn');
const settingsBtn = document.querySelector('.settings-btn');

function loadGoals() {
  return JSON.parse(localStorage.getItem(goalsKey) || '[]');
}
function saveGoals(goals) {
  localStorage.setItem(goalsKey, JSON.stringify(goals));
}
function getToday() {
  return new Date().toISOString().slice(0, 10);
}
function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function renderStreakBar(history, streak, lastDone) {
  const days = 30;
  let bar = '';
  const today = getToday();
  for (let i = 0; i < days; i++) {
    const idx = history.length - days + i;
    let cls = 'streak-segment';
    if (idx >= 0) {
      const entry = history[idx];
      if (entry === true || (entry && entry.skipped !== true && entry !== false)) {
        // If this is the rightmost segment and today is done, make it green
        if (i === days - 1 && lastDone === today) {
          cls += ' today-done';
        } else {
          cls += ' active';
        }
        if ((i+1) % 7 === 0) cls += ' milestone';
      } else if (entry && entry.skipped === true) {
        cls += ' skipped-reason';
      } else {
        cls += ' missed';
      }
    } else {
      cls += ' missed';
    }
    bar += `<div class="${cls}"></div>`;
  }
  return bar;
}
function renderCalendar(goal) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  let html = '<div class="goal-calendar"><div class="calendar-row calendar-header">';
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  dayNames.forEach(d => html += `<div class="calendar-cell calendar-header-cell">${d}</div>`);
  html += '</div>';

  // Build a date-indexed map for history
  const historyMap = {};
  if (goal.history && goal.history.length > 0) {
    let d = new Date(goal.created);
    for (let i = 0; i < goal.history.length; i++) {
      const dateStr = d.toISOString().slice(0, 10);
      historyMap[dateStr] = goal.history[i];
      d.setDate(d.getDate() + 1);
    }
  }

  let dayOfWeek = 0;
  html += '<div class="calendar-row">';
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-cell empty"></div>';
    dayOfWeek++;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = d.toISOString().slice(0, 10);
    let cellClass = 'calendar-cell';
    let tooltip = '';
    if (dateStr > getToday()) {
      cellClass += ' future';
    } else if (historyMap[dateStr] !== undefined) {
      const entry = historyMap[dateStr];
      if (entry === true || (entry && entry.skipped !== true && entry !== false)) {
        cellClass += ' done';
      } else if (entry && entry.skipped === true) {
        cellClass += ' missed skipped-reason';
        if (entry.reason) tooltip = ` title="${entry.reason.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
      } else {
        cellClass += ' missed';
      }
    } else {
      cellClass += ' missed';
    }
    if (dateStr === getToday()) cellClass += ' today';
    html += `<div class="${cellClass}"${tooltip}>${day}</div>`;
    dayOfWeek++;
    if (dayOfWeek === 7 && day !== daysInMonth) {
      html += '</div><div class="calendar-row">';
      dayOfWeek = 0;
    }
  }
  // Fill in empty cells if the last week is incomplete
  if (dayOfWeek > 0 && dayOfWeek < 7) {
    for (let i = dayOfWeek; i < 7; i++) {
      html += '<div class="calendar-cell empty"></div>';
    }
  }
  html += '</div></div>';
  return html;
}
function getDayDiff(date1, date2) {
  // date1, date2: yyyy-mm-dd
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
}
function renderGoals(goals) {
  goalsList.innerHTML = '';
  goals.forEach(goal => {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-card-header">
        <span class="goal-name">${goal.name}</span>
        <button class="edit-btn" data-id="${goal.id}" aria-label="Edit Goal">
          <svg width="20" height="20" viewBox="0 0 20 20"><path d="M14.85 2.85a1.2 1.2 0 0 1 1.7 1.7l-9.2 9.2-2.1.4.4-2.1 9.2-9.2zM3 17h14v2H3v-2z" fill="#888"/></svg>
        </button>
      </div>
      <div class="goal-status-row">
        <div class="streak-bar">
          ${renderStreakBar(goal.history, goal.streak, goal.lastDone)}
        </div>
        <span class="streak-fire">🔥 ${goal.streak}</span>
      </div>
      <div class="goal-card-footer">
        <button class="mark-done-btn" data-id="${goal.id}">Mark Done</button>
        <button class="skip-btn" data-id="${goal.id}">Skip</button>
      </div>
      <div class="goal-actions" style="display:none;"></div>
      <div class="calendar-container" style="display:none;"></div>
    `;
    // Add streak bar click handler
    card.querySelector('.streak-bar').addEventListener('click', streakBarClickHandler(goal));
    goalsList.appendChild(card);
  });
}
function addGoal(name) {
  const goals = loadGoals();
  goals.push({
    id: Date.now(),
    name,
    streak: 0,
    history: [],
    created: getToday(),
    lastDone: null
  });
  saveGoals(goals);
  renderGoals(goals);
}
function markDone(id) {
  const goals = loadGoals();
  const today = getToday();
  goals.forEach(goal => {
    if (goal.id == id) {
      if (goal.lastDone !== today) {
        goal.streak = (goal.lastDone === getYesterday()) ? goal.streak + 1 : 1;
        goal.lastDone = today;
        goal.history = goal.history || [];
        goal.history.push(true);
        if (goal.history.length > 30) goal.history.shift();
      }
    }
  });
  saveGoals(goals);
  renderGoals(goals);
}
function skipGoal(id) {
  const goals = loadGoals();
  const today = getToday();
  const goal = goals.find(g => g.id == id);
  if (!goal) return;
  if (goal.lastDone === today) return;
  openModal(`
    <form id="skip-reason-form">
      <label for="skip-reason-input">Why are you skipping today?</label>
      <textarea id="skip-reason-input" rows="3" placeholder="Optional reason..."></textarea>
      <div style="display:flex;gap:1rem;justify-content:flex-end;">
        <button type="submit" class="skip-btn modal-btn">Submit</button>
      </div>
    </form>
  `);
  document.getElementById('skip-reason-form').onsubmit = function(ev) {
    ev.preventDefault();
    const reason = document.getElementById('skip-reason-input').value.trim();
    goal.streak = 0;
    goal.lastDone = today;
    goal.history = goal.history || [];
    goal.history.push({ skipped: true, reason });
    if (goal.history.length > 30) goal.history.shift();
    saveGoals(goals);
    renderGoals(goals);
    closeModal();
  };
}
function editGoal(id) {
  const goals = loadGoals();
  const goal = goals.find(g => g.id == id);
  if (!goal) return;
  const newName = prompt('Edit goal name:', goal.name);
  if (newName === null) return;
  if (newName.trim() === '') {
    if (confirm('Delete this goal?')) {
      deleteGoal(id);
      return;
    } else {
      return;
    }
  }
  goal.name = newName.trim();
  saveGoals(goals);
  renderGoals(goals);
}
function deleteGoal(id) {
  let goals = loadGoals();
  goals = goals.filter(g => g.id != id);
  saveGoals(goals);
  renderGoals(goals);
}

function openModal(contentHTML) {
  modalContent.innerHTML = contentHTML;
  modal.style.display = 'flex';
  modalBackdrop.style.display = 'block';
  setTimeout(() => {
    modal.classList.add('active');
    modalBackdrop.classList.add('active');
  }, 10);
}
function closeModal() {
  modal.classList.remove('active');
  modalBackdrop.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
    modalBackdrop.style.display = 'none';
    modalContent.innerHTML = '';
  }, 200);
}
if (modalClose) {
  modalClose.addEventListener('click', closeModal);
}
if (modalBackdrop) {
  modalBackdrop.addEventListener('click', closeModal);
}
if (addGoalBtn) {
  addGoalBtn.addEventListener('click', () => {
    openModal(`
      <form id="add-goal-form-modal">
        <label for="goal-input-modal">Add a New Goal</label>
        <input type="text" id="goal-input-modal" placeholder="e.g., Exercise daily" required>
        <div style="display:flex;gap:1rem;justify-content:flex-end;">
          <button type="submit" class="mark-done-btn modal-btn">Add Goal</button>
        </div>
      </form>
    `);
    document.getElementById('add-goal-form-modal').onsubmit = function(ev) {
      ev.preventDefault();
      const name = document.getElementById('goal-input-modal').value.trim();
      if (!name) return;
      addGoal(name);
      closeModal();
    };
  });
}
if (goalsList) {
  goalsList.addEventListener('click', e => {
    if (e.target.closest('.mark-done-btn')) {
      const id = e.target.closest('.mark-done-btn').dataset.id;
      markDone(id);
    } else if (e.target.closest('.skip-btn')) {
      const id = e.target.closest('.skip-btn').dataset.id;
      skipGoal(id);
    } else if (e.target.closest('.edit-btn')) {
      const id = e.target.closest('.edit-btn').dataset.id;
      const goals = loadGoals();
      const goal = goals.find(g => g.id == id);
      if (!goal) return;
      openModal(`
        <form id="edit-goal-form">
          <label for="edit-goal-input">Edit Goal Name</label>
          <input type="text" id="edit-goal-input" value="${goal.name}" required>
          <div style="display:flex;gap:1rem;justify-content:flex-end;">
            <button type="submit" class="mark-done-btn modal-btn">Save</button>
            <button type="button" class="delete-btn modal-btn">Delete</button>
          </div>
        </form>
      `);
      document.getElementById('edit-goal-form').onsubmit = function(ev) {
        ev.preventDefault();
        const newName = document.getElementById('edit-goal-input').value.trim();
        if (!newName) return;
        goal.name = newName;
        saveGoals(goals);
        renderGoals(goals);
        closeModal();
      };
      document.querySelector('.delete-btn').onclick = function() {
        if (confirm('Delete this goal?')) {
          deleteGoal(id);
          closeModal();
        }
      };
    } else if (e.target.closest('.calendar-btn')) {
      const card = e.target.closest('.goal-card');
      const goals = loadGoals();
      const id = e.target.closest('.calendar-btn').dataset.id;
      const goal = goals.find(g => g.id == id);
      if (!goal) return;
      openModal(renderCalendar(goal));
    }
  });
}

function setTheme(theme) {
  if (theme === 'light') {
    body.classList.add('light-theme');
    localStorage.setItem(themeKey, 'light');
  } else {
    body.classList.remove('light-theme');
    localStorage.setItem(themeKey, 'dark');
  }
}
function toggleTheme() {
  const isLight = body.classList.toggle('light-theme');
  localStorage.setItem(themeKey, isLight ? 'light' : 'dark');
}

function getThemeIcon() {
  const isLight = body.classList.contains('light-theme');
  return isLight
    ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b48be4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>' // moon
    : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b48be4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'; // sun
}

if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    openModal(`
      <h2 style="margin-bottom:1.2rem;">Settings</h2>
      <div style="display:flex;flex-direction:column;gap:1.2rem;">
        <div>
          <label style="font-weight:600;">Theme:</label>
          <button class="theme-icon-btn modal-btn" style="margin-left:1rem;vertical-align:middle;">${getThemeIcon()}</button>
        </div>
        <div>
          <button class="delete-btn modal-btn">Reset All Goals</button>
        </div>
        <div>
          <button class="delete-btn modal-btn">Clear All Data</button>
        </div>
      </div>
    `);
    document.querySelector('.modal .theme-icon-btn').onclick = () => {
      toggleTheme();
      // Update icon after theme change
      setTimeout(() => {
        document.querySelector('.modal .theme-icon-btn').innerHTML = getThemeIcon();
      }, 50);
    };
    document.querySelectorAll('.modal .delete-btn')[0].onclick = () => {
      if (confirm('Delete all goals?')) {
        saveGoals([]);
        renderGoals([]);
        closeModal();
      }
    };
    document.querySelectorAll('.modal .delete-btn')[1].onclick = () => {
      if (confirm('Clear all data and reload?')) {
        localStorage.clear();
        location.reload();
      }
    };
  });
}

// Streak bar click animation and modal
function streakBarClickHandler(goal) {
  return function(e) {
    const bar = e.currentTarget;
    bar.classList.remove('ripple');
    void bar.offsetWidth; // force reflow
    bar.classList.add('ripple');
    setTimeout(() => bar.classList.remove('ripple'), 400);
    // Show modal with full history/info
    openModal(`
      <h2 style='margin-bottom:1rem;'>${goal.name} - History</h2>
      ${renderCalendar(goal)}
      <div style='margin-top:1.2rem; color:#b48be4; font-size:1.05rem;'>
        <div>🔥 Streak: <b>${goal.streak}</b></div>
        <div>Started: <b>${goal.created || '-'}</b></div>
        <div>Last Done: <b>${goal.lastDone || '-'}</b></div>
      </div>
    `);
  };
}

// Theme toggle
function setTheme(theme) {
  if (theme === 'light') {
    body.classList.add('light-theme');
    localStorage.setItem(themeKey, 'light');
  } else {
    body.classList.remove('light-theme');
    localStorage.setItem(themeKey, 'dark');
  }
}
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isLight = body.classList.toggle('light-theme');
    localStorage.setItem(themeKey, isLight ? 'light' : 'dark');
  });
}
(function initTheme() {
  const theme = localStorage.getItem(themeKey);
  if (theme === 'light') body.classList.add('light-theme');
})();

document.addEventListener('DOMContentLoaded', () => {
  try {
    const loaded = loadGoals();
    console.log('Loaded goals from localStorage:', loaded);
    renderGoals(loaded);
  } catch (e) {
    console.error('Error loading goals from localStorage:', e);
  }
}); 