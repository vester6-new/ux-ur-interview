# Accessibility Readiness Checklist

Use this checklist with `npm run a11y:check`, `npm run build`, and a manual browser pass before releasing dashboard or interview-builder changes.

## Keyboard
- Navigate `/dashboard`, `/dashboard/[slug]`, `/[slug]`, and `/interview/[slug]` using only Tab, Shift+Tab, Enter, Space, Escape, and arrow keys.
- Confirm visible focus is present on buttons, links, cards, inputs, selects, sliders, modal controls, drag handles, and field type choices.
- Confirm the interview modal traps focus while open, closes with Escape, and returns focus to the triggering control.
- Confirm field ordering works with both drag-and-drop and keyboard move controls.

## Screen Readers
- Confirm every form input has an accessible name and required fields are announced.
- Confirm selected emoji/tag choices expose state.
- Confirm validation errors are announced with `role="alert"` and identify the missing field.
- Confirm dashboard charts expose a text summary, not only visual bars.

## Visual
- Confirm text and interactive controls meet WCAG 2.2 AA contrast in normal, hover, selected, disabled, and focus states.
- Confirm UI remains usable at 200% browser zoom and on a mobile-width viewport.
- Confirm no information is conveyed by color alone.

## Motion
- Confirm drag-and-drop is optional and not the only way to reorder fields.
- Confirm interactions do not depend on hover-only behavior.
