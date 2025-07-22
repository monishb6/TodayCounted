document.addEventListener('DOMContentLoaded', () => {
    const habitsList = document.getElementById('habits-list');
    const addHabitButton = document.getElementById('add-habit-button');
    const habitInput = document.getElementById('habit-input');

    let habits = JSON.parse(localStorage.getItem('habits')) || [];

    // Migration: Ensure all habits have 'history' and 'startDate'
    habits = habits.map(habit => ({
        ...habit,
        history: Array.isArray(habit.history) ? habit.history : [],
        startDate: habit.startDate || new Date().toDateString(),
    }));

    function saveHabits() {
        localStorage.setItem('habits', JSON.stringify(habits));
    }

    function renderHabits() {
        habitsList.innerHTML = '';
        habits.forEach((habit, index) => {
            const habitElement = document.createElement('div');
            habitElement.classList.add('habit-tracker');

            const today = new Date();
            const doneToday = habit.history.includes(today.toDateString());

            // Recent activity bar (last 7 days, circles only)
            const recentDays = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                recentDays.push(d);
            }
            let recentBar = '<div class="recent-activity-bar">';
            recentDays.forEach(d => {
                const dateString = d.toDateString();
                let classes = 'recent-activity-day';
                if (habit.history.includes(dateString)) {
                    classes += ' completed';
                } else if (d < today && new Date(habit.startDate) <= d) {
                    classes += ' missed';
                }
                if (dateString === today.toDateString()) {
                    classes += ' today';
                }
                recentBar += `<div class="${classes}" title="${dateString}"></div>`;
            });
            recentBar += '</div>';

            // Show/hide calendar button and calendar container
            const calendarId = `calendar-${index}`;
            const showCalendarBtnId = `show-calendar-btn-${index}`;
            let calendarToggleBtn = `<button class="show-calendar-btn" id="${showCalendarBtnId}">Show Full Calendar</button>`;
            let calendarContainer = `<div class="calendar-container" id="${calendarId}" style="display:none;"></div>`;

            habitElement.innerHTML = `
                <div class="habit-info">
                    <span class="habit-name">${habit.name}</span>
                    <p>Count: <span class="habit-count">${habit.count}</span></p>
                    ${recentBar}
                    ${calendarToggleBtn}
                </div>
                <div class="habit-controls">
                    <button class="increment-button" data-index="${index}" ${doneToday ? 'disabled' : ''}>
                        ${doneToday ? 'Done!' : 'I did it!'}
                    </button>
                    <button class="delete-button" data-index="${index}">Delete</button>
                </div>
                ${calendarContainer}
            `;
            habitsList.appendChild(habitElement);
        });
        // Attach calendar toggle listeners after rendering
        habits.forEach((habit, index) => {
            const btn = document.getElementById(`show-calendar-btn-${index}`);
            const cal = document.getElementById(`calendar-${index}`);
            if (btn && cal) {
                let calState = { year: new Date().getFullYear(), month: new Date().getMonth() };
                btn.onclick = function() {
                    if (cal.style.display === 'none') {
                        renderCalendar(index, calState.year, calState.month);
                        cal.style.display = 'block';
                        btn.textContent = 'Hide Full Calendar';
                        btn.classList.add('active');
                    } else {
                        cal.style.display = 'none';
                        btn.textContent = 'Show Full Calendar';
                        btn.classList.remove('active');
                    }
                };
                // Calendar navigation
                cal.addEventListener('click', function(e) {
                    if (e.target.classList.contains('calendar-nav-btn')) {
                        if (e.target.dataset.dir === 'prev') {
                            calState.month--;
                            if (calState.month < 0) {
                                calState.month = 11;
                                calState.year--;
                            }
                        } else if (e.target.dataset.dir === 'next') {
                            calState.month++;
                            if (calState.month > 11) {
                                calState.month = 0;
                                calState.year++;
                            }
                        }
                        renderCalendar(index, calState.year, calState.month);
                    }
                });
            }
        });
    }

    function renderCalendar(habitIndex, year, month) {
        const habit = habits[habitIndex];
        const calendarContainer = document.getElementById(`calendar-${habitIndex}`);
        const today = new Date();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startingDay = firstDayOfMonth.getDay();
        const monthName = firstDayOfMonth.toLocaleString('default', { month: 'long' });

        let calendarHTML = '';
        calendarHTML += `<span class="calendar-start-date">Start Date: ${habit.startDate}</span>`;
        calendarHTML += `<div class="calendar-nav">
            <button class="calendar-nav-btn" data-dir="prev">&#8592; Prev</button>
            <span>${monthName} ${year}</span>
            <button class="calendar-nav-btn" data-dir="next">Next &#8594;</button>
        </div>`;
        calendarHTML += '<div class="calendar-grid">';
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(name => {
            calendarHTML += `<div class="calendar-day day-name">${name}</div>`;
        });

        for (let i = 0; i < startingDay; i++) {
            calendarHTML += '<div class="calendar-day day-cell empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const dateString = currentDate.toDateString();
            let classes = 'calendar-day day-cell';
            if (habit.history.includes(dateString)) {
                classes += ' completed';
            } else if (currentDate < today && new Date(habit.startDate) <= currentDate) {
                classes += ' missed';
            }
            if (dateString === today.toDateString()) {
                classes += ' today';
            }
            calendarHTML += `<div class="${classes}">${day}</div>`;
        }

        calendarHTML += '</div>';
        calendarContainer.innerHTML = calendarHTML;
    }

    addHabitButton.addEventListener('click', () => {
        const habitName = habitInput.value.trim();
        if (habitName && !habits.some(h => h.name === habitName)) {
            const today = new Date();
            habits.push({ 
                name: habitName, 
                count: 0, 
                startDate: today.toDateString(),
                history: [] 
            });
            habitInput.value = '';
            saveAndRender();
        } else if (habits.some(h => h.name === habitName)) {
            alert('This habit already exists.');
        }
    });

    habitsList.addEventListener('click', (e) => {
        const index = e.target.dataset.index;
        if (e.target.classList.contains('increment-button')) {
            const today = new Date().toDateString();
            if (!habits[index].history.includes(today)) {
                habits[index].count++;
                habits[index].history.push(today);
                saveAndRender();
            }
        }

        if (e.target.classList.contains('delete-button')) {
            if (confirm(`Are you sure you want to delete "${habits[index].name}"?`)) {
                habits.splice(index, 1);
                saveAndRender();
            }
        }
    });

    function saveAndRender() {
        saveHabits();
        renderHabits();
    }

    renderHabits();
}); 