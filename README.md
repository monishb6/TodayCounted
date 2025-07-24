# TodayCounted

TodayCounted is a modern, customizable web application to help you track your daily goals. It features a dark/light mode, a calendar view to visualize your progress, and the ability to record reasons for skipped days.

## Features

- Add, edit, and delete daily goals ("goals" instead of "habits")
- Mark goals as done or skipped each day
- When skipping, you can enter a reason (displayed as a tooltip in the calendar)
- Visual streak bar for each goal
- Calendar popup for each goal, showing:
  - Green: days completed
  - Orange: days skipped with a reason (hover to see reason)
  - Red: days missed
  - Gray: future days
- Responsive, modern UI with modal popups for all actions
- Dark and light theme toggle
- All data is stored locally in your browser (no account needed)

## How to Use

1. Open the `index.html` file in your web browser.
2. To add a new goal, click the "+" button and enter your goal name.
3. Your new goal will appear in the list. Each day, you can:
   - Click "Mark Done" to record completion
   - Click "Skip" to enter a reason for skipping (optional)
4. Click the streak bar to open the calendar popup and review your history. Hover over orange days to see skip reasons.
5. Use the settings button (gear icon) to switch themes or clear all data.

## Data Model

- Each goal is stored with:
  - `id`, `name`, `streak`, `history` (array), `created`, `lastDone`
- `history` entries can be:
  - `true` (done)
  - `{ skipped: true, reason: "..." }` (skipped with reason)
  - `false` (missed)

## Development

- All logic is in `script.js`, styles in `style.css`.
- No backend required; works entirely in the browser.
- To reset, use the "Clear All Data" button in settings or clear your browser's localStorage for this site.

## License

MIT 