# Phase 2 (deferred): 3D sun / room orientation assistant

This is **not implemented** in code yet. It is scoped as a follow-on to the current Nelexis behavior:

- **Today:** Sun exposure is **user-managed**. The app uses `plants.light_exposure` (`full_sun`, `partial`, `low`, `corner_dark`) plus **rule-based** `sunlight_reminder` care tasks. Arduino automation does **not** control natural sun.

## Future prototype (Vercel)

1. Small **Next.js** or static page on the same Vercel project (e.g. `/sun-planner`) with **Three.js** scene: room box, window normal (compass), plant positions.
2. User enters latitude and season; optional **OpenAI** call turns geometry + orientation into an **estimated** daily direct-light duration (clearly labeled **estimate**, not agronomic guarantee).
3. Output feeds **suggestions only** (copy into `nutrient_regimen_note` or future `sun_estimate_hours` column). **No** linkage to Arduino pump or Cloud automations.

## Safety

Keep all sun logic **advisory**. PAR/LUX sensors on the station remain the ground truth for supplemental lighting decisions where installed.
