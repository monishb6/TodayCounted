// Modern Goal Tracker Script
// Data model: { id, name, streak, history: [true/false], created, lastDone }

const goalsKey = 'todaycounted_goals';
const themeKey = 'todaycounted_theme';
const goalsList = document.getElementById('goals-list');
const addGoalForm = document.getElementById('add-goal-form');
const goalInput = document.getElementById('goal-input');
const statValue = document.querySelector('.stat-value');
const themeToggle = document.querySelector('.theme-toggle');
const body = document.body;
const modal = document.getElementById('modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalContent = document.querySelector('.modal-content');
const modalClose = document.querySelector('.modal-close');
const addGoalBtn = document.querySelector('.add-goal-btn');
const settingsBtn = document.querySelector('.settings-btn');
const userNameKey = 'todaycounted_username';

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
  const days = 10;
  let bar = '';
  const today = getToday();
  for (let i = 0; i < days; i++) {
    const idx = history.length - days + i;
    let cls = 'streak-segment';
    if (idx >= 0) {
      const entry = history[idx];
      if (entry === true || (entry && entry.skipped !== true && entry !== false)) {
        if (i === days - 1 && lastDone === today) {
          cls += ' today-done';
        } else {
          cls += ' active';
        }
        if ((i+1) % 5 === 0) cls += ' milestone';
      } else if (entry && entry.skipped === true) {
        cls += ' skipped-reason';
      } else {
        cls += ' missed';
      }
    } else {
      cls += ' missed';
    }
    bar += `<div class="${cls}" style="width:18px;height:28px;"></div>`;
  }
  return bar;
}
function renderCalendar(goal) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  let html = '<div class="goal-calendar">';
  // Header row
  html += '<div class="calendar-row">';
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  dayNames.forEach(d => html += `<div class="calendar-header-cell">${d}</div>`);
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

  let day = 1;
  let started = false;
  // Render each week as a row
  while (day <= daysInMonth) {
    html += '<div class="calendar-row">';
    for (let dow = 0; dow < 7; dow++) {
      if (!started && dow < firstDay) {
        html += '<div class="calendar-cell empty"></div>';
      } else if (day > daysInMonth) {
        html += '<div class="calendar-cell empty"></div>';
      } else {
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
        html += `<div class="${cellClass}" data-date="${dateStr}" data-day="${day}"${tooltip}>${day}</div>`;
        day++;
        started = true;
      }
    }
    html += '</div>';
  }
  html += '</div>';
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
  let longest = 0;
  goals.forEach(goal => {
    if (goal.streak > longest) longest = goal.streak;
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-card-header">
        <span class="goal-name">${goal.name}</span>
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
  statValue.textContent = longest;
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
      <textarea id="skip-reason-input" rows="3" style="width:100%;margin-top:0.7rem;margin-bottom:1.2rem;resize:vertical;" placeholder="Optional reason..."></textarea>
      <div style="display:flex;gap:1rem;justify-content:flex-end;">
        <button type="submit" class="skip-btn" style="min-width:100px;">Submit</button>
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
      <div class='add-goal-modal'>
        <form id="add-goal-form-modal">
          <label for="goal-input-modal">Add a New Goal</label>
          <input type="text" id="goal-input-modal" placeholder="e.g., Exercise daily" required>
          <button type="submit" class="mark-done-btn modal-btn">Add Goal</button>
        </form>
      </div>
    `);
    document.getElementById('add-goal-form-modal').onsubmit = function(ev) {
      ev.preventDefault();
      const name = document.getElementById('goal-input-modal').value.trim();
      if (!name) {
        closeModal();
        return;
      }
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

function loadUserName() {
  return localStorage.getItem(userNameKey) || 'User';
}
function saveUserName(name) {
  localStorage.setItem(userNameKey, name);
}

if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    let activeSection = 'profile';
    function renderSettingsContent(section) {
      if (section === 'profile') {
        return `
          <h2>Profile</h2>
          <div class="profile-actions">
            <label for="profile-name-input">Name:</label>
            <input type="text" id="profile-name-input" value="${loadUserName()}">
            <div style="display:flex;gap:1rem;align-items:center;">
              <button class="save-profile-btn">Save</button>
              <button class="delete-btn" style="background:#444;">Clear All Data</button>
            </div>
          </div>
          <hr class="settings-divider">
        `;
      } else if (section === 'goals') {
        const goals = loadGoals();
        return `
          <h2>Goals</h2>
          <ul class="settings-goal-list" style="list-style:none;padding:0;">
            ${goals.map(goal => `
              <li style="margin-bottom:1.2rem;display:flex;align-items:center;gap:1rem;">
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${goal.name}</span>
                <button class="edit-goal-btn" data-id="${goal.id}" style="background:#7c3aed;color:#fff;padding:0.3rem 1rem;border-radius:6px;border:none;cursor:pointer;font-size:0.95rem;">Edit</button>
              </li>
            `).join('')}
          </ul>
          <button class="delete-btn" style="background:#ef4444;">Reset All Goals</button>
        `;
      } else if (section === 'appearance') {
        return `
          <h2>Appearance</h2>
          <label style="display:flex;align-items:center;gap:1rem;font-weight:500;">
            <input type="checkbox" id="theme-toggle-switch" ${body.classList.contains('light-theme') ? '' : 'checked'}>
            Dark Mode
          </label>
          <div style="margin-top:2rem;color:#888;">(More features coming soon)</div>
        `;
      }
    }
    function renderSettingsModal(section) {
      openModal(`
        <div class="settings-sidebar">
          <nav class="settings-menu">
            <button class="settings-menu-item${section==='profile'?' active':''}" data-section="profile">Profile</button>
            <button class="settings-menu-item${section==='goals'?' active':''}" data-section="goals">Goals</button>
            <button class="settings-menu-item${section==='appearance'?' active':''}" data-section="appearance">Appearance</button>
          </nav>
          <div class="settings-content">${renderSettingsContent(section)}</div>
        </div>
      `);
      // Set modal theme class
      const modalEl = document.querySelector('.modal');
      if (body.classList.contains('light-theme')) {
        modalEl.classList.add('light-theme');
      } else {
        modalEl.classList.remove('light-theme');
      }
      // Sidebar navigation
      document.querySelectorAll('.settings-menu-item').forEach(btn => {
        btn.onclick = () => {
          activeSection = btn.getAttribute('data-section');
          renderSettingsModal(activeSection);
        };
      });
      // Profile section actions
      if (section === 'profile') {
        document.querySelector('.save-profile-btn').onclick = () => {
          const newName = document.getElementById('profile-name-input').value.trim();
          if (newName) {
            saveUserName(newName);
            renderSettingsModal('profile');
          } else {
            alert('Profile name cannot be empty.');
          }
        };
        document.querySelector('.delete-btn').onclick = () => {
          if (confirm('Clear all data and reload?')) {
            localStorage.clear();
            location.reload();
          }
        };
      }
      // Goals section actions
      if (section === 'goals') {
        document.querySelectorAll('.edit-goal-btn').forEach(btn => {
          btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            const goals = loadGoals();
            const goal = goals.find(g => g.id == id);
            if (!goal) return;
            openModal(`
              <h2>Edit Goal</h2>
              <label for="edit-goal-input">Name:</label>
              <input type="text" id="edit-goal-input" value="${goal.name}" style="width:100%;padding:0.5rem;margin-top:0.5rem;margin-bottom:0.5rem;border:1px solid #ccc;border-radius:4px;">
              <div style="display:flex;gap:1rem;justify-content:flex-end;margin-top:1.5rem;">
                <button class="save-goal-btn" style="background:#4f46e5;color:white;padding:0.5rem 1.2rem;border-radius:6px;border:none;cursor:pointer;font-size:0.95rem;" data-id="${goal.id}">Save</button>
                <button class="delete-goal-btn" style="background:#ef4444;color:white;padding:0.5rem 1.2rem;border-radius:6px;border:none;cursor:pointer;font-size:0.95rem;" data-id="${goal.id}">Delete</button>
              </div>
            `);
            // Set modal theme class for popup
            const modalEl = document.querySelector('.modal');
            if (body.classList.contains('light-theme')) {
              modalEl.classList.add('light-theme');
            } else {
              modalEl.classList.remove('light-theme');
            }
            document.querySelector('.save-goal-btn').onclick = () => {
              const newName = document.getElementById('edit-goal-input').value.trim();
              if (newName) {
                goal.name = newName;
                saveGoals(goals);
                renderSettingsModal('goals');
              } else {
                alert('Goal name cannot be empty.');
              }
            };
            document.querySelector('.delete-goal-btn').onclick = () => {
              if (confirm('Delete this goal?')) {
                const newGoals = goals.filter(g => g.id != id);
                saveGoals(newGoals);
                renderSettingsModal('goals');
              }
            };
          };
        });
        document.querySelector('.delete-btn').onclick = () => {
          if (confirm('Reset progress for all goals?')) {
            const goals = loadGoals();
            for (let goal of goals) {
              goal.history = [];
              goal.streak = 0;
              goal.lastDone = null;
            }
            saveGoals(goals);
            renderSettingsModal('goals');
          }
        };
      }
      // Appearance section actions
      if (section === 'appearance') {
        const themeSwitch = document.getElementById('theme-toggle-switch');
        themeSwitch.onchange = () => {
          if (themeSwitch.checked) {
            body.classList.remove('light-theme');
            localStorage.setItem(themeKey, 'dark');
          } else {
            body.classList.add('light-theme');
            localStorage.setItem(themeKey, 'light');
          }
          renderSettingsModal('appearance');
        };
      }
    }
    renderSettingsModal(activeSection);
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
    attachCalendarCellHandlers(goal);
  };
}

// Add calendar cell click handler for editing day status
function calendarCellClickHandler(goal) {
  return function(e) {
    const cell = e.target.closest('.calendar-cell');
    if (!cell || cell.classList.contains('empty') || cell.classList.contains('future')) return;
    const dateStr = cell.getAttribute('data-date');
    if (!dateStr) return;
    // Show modal for action selection
    openModal(`
      <div class='edit-day-modal'>
        <h2>Edit Day</h2>
        <div style="display:flex;flex-direction:column;gap:1.2rem;align-items:center;">
          <button class="edit-day-done modal-btn">Mark Done</button>
          <button class="edit-day-skip modal-btn">Skip</button>
          <button class="edit-day-missed modal-btn">Missed</button>
          <button class="edit-day-cancel modal-btn" id="cancel-edit-day">Cancel</button>
        </div>
      </div>
    `);
    document.querySelector('.edit-day-done').onclick = function() {
      updateGoalDayStatus(goal, dateStr, 'done');
    };
    document.querySelector('.edit-day-skip').onclick = function() {
      updateGoalDayStatus(goal, dateStr, 'skip');
    };
    document.querySelector('.edit-day-missed').onclick = function() {
      updateGoalDayStatus(goal, dateStr, 'missed');
    };
    document.getElementById('cancel-edit-day').onclick = function() {
      openModal(renderCalendar(goal));
      attachCalendarCellHandlers(goal);
    };
  };
}
function updateGoalDayStatus(goal, dateStr, status) {
  // Find the index in history for this date
  const created = new Date(goal.created);
  const idx = Math.floor((new Date(dateStr) - created) / (1000 * 60 * 60 * 24));
  if (idx < 0) return;
  // Ensure history array is long enough
  while (goal.history.length <= idx) goal.history.push(false);
  if (status === 'done') {
    goal.history[idx] = true;
  } else if (status === 'skip') {
    goal.history[idx] = { skipped: true, reason: '' };
  } else if (status === 'missed') {
    goal.history[idx] = false;
  }
  // Save and re-render
  const goals = loadGoals();
  const g = goals.find(g => g.id == goal.id);
  if (g) g.history = goal.history;
  saveGoals(goals);
  openModal(renderCalendar(goal));
  attachCalendarCellHandlers(goal);
}
function attachCalendarCellHandlers(goal) {
  document.querySelectorAll('.calendar-cell').forEach(cell => {
    if (!cell.classList.contains('empty') && !cell.classList.contains('future')) {
      cell.onclick = calendarCellClickHandler(goal);
    } else {
      cell.onclick = null;
    }
  });
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