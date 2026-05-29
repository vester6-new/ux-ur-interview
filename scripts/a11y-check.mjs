import { readFileSync } from "node:fs";

const source = [
  "src/app/app.component.ts",
  "src/app/dashboard.component.ts",
  "src/app/interview-dashboard.component.ts",
  "src/app/public-interview.component.ts",
  "src/styles.scss",
].map(path => readFileSync(path, "utf8")).join("\n");

const checks = [
  {
    name: "Modal exposes dialog semantics",
    pass: /role="dialog"/.test(source) && /aria-modal="true"/.test(source) && /aria-labelledby=/.test(source),
  },
  {
    name: "Interactive selection controls expose state",
    pass: /aria-checked/.test(source),
  },
  {
    name: "Form validation errors are announced",
    pass: /role="alert"/.test(source),
  },
  {
    name: "Progress summaries expose text values",
    pass: /<progress/.test(source) && /\{\{ field\.percent \}\}%/.test(source),
  },
  {
    name: "Keyboard focus styles are present",
    pass: /:focus-visible/.test(source),
  },
  {
    name: "Dashboard links use semantic anchors",
    pass: /routerLink/.test(source) && /<a class="ur-button/.test(source),
  },
  {
    name: "Drag-and-drop exposes a labelled handle",
    pass: /cdkDragHandle/.test(source) && /aria-label="Drag field"/.test(source),
  },
];

const failures = checks.filter(check => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} accessibility readiness check(s) failed.`);
  process.exit(1);
}
