# StaticWeb — Task Manager (HTML)

Accessible, responsive static task manager (HTML/CSS/JS). Open the app at [docs/index.html](docs/index.html).

Quick start

1. Open [docs/index.html](docs/index.html) in your browser (or serve the `docs/` folder with a static server).
2. Add, delete, and toggle tasks. Data is saved to `localStorage` in your browser.

Accessibility & features

- Semantic HTML and ARIA live region for announcements.
- Keyboard accessible controls and visible focus states.
- Responsive layout for mobile and desktop.
- Manual task entry plus CSV, XLS, and XLSX task import.

Import file formats

- Header-based CSV example: [docs/sample-import.csv](docs/sample-import.csv)
- Headerless CSV example: [docs/sample-import-headerless.csv](docs/sample-import-headerless.csv)
- Excel-compatible worksheet structure: use the first sheet and include one task per row, or use columns named `task` or `title` for task names.
- Optional completion columns: `completed`, `done`, or `status` with values like `true`, `yes`, `1`, `done`, or `completed`.

Excel-style example

Copy this table into the first sheet of an Excel workbook, then save it as `.xlsx` or `.xls` before importing:

| task | completed |
| --- | --- |
| Review quarterly roadmap | false |
| Send team update | true |
| Reconcile support backlog | false |

Files

- [docs/index.html](docs/index.html)
- [docs/styles.css](docs/styles.css)
- [docs/app.js](docs/app.js)
- [docs/sample-import.csv](docs/sample-import.csv)
- [docs/sample-import-headerless.csv](docs/sample-import-headerless.csv)

Dev

To view the app quickly from the command line (Node must be installed):

```bash
npx serve docs
```

