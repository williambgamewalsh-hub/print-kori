# Project TODO

- [x] Define the PrintKori domain model for shops, staff, print jobs, agents, one-time pairing codes, shop rates, and configurable stale-job timeout.
- [x] Create and apply database schema migrations for shops, staff membership, print jobs, agent installations, and setup data.
- [x] Add secure backend procedures for shop onboarding, public shop lookup, pricing calculation, job submission, job status lookup, dashboard inbox, job approval/cancellation, and agent operations.
- [x] Add secure document upload storage and retain file metadata rather than file bytes in the database.
- [x] Build the mobile-first QR customer frontend with shop branding, upload, print options, calculated pricing, confirmation, and public job-status tracking.
- [x] Build the owner login entry and first-use setup wizard with the required ordered steps: shop name, logo, pricing rates, available paper options, and staff accounts.
- [x] Build the shop dashboard with pending-job inbox, print-option summary, file access, one-click Approve/Cancel actions, job history, and exact state-machine labels.
- [x] Generate a unique downloadable QR code for every shop, linking to that shop's public customer route.
- [x] Implement a one-time-code print-agent pairing workflow and secure agent API for claiming only one Approved job at a time.
- [x] Implement agent heartbeat, job progress, completion, and error reporting with exact job state transitions.
- [x] Add owner alerts for newly submitted jobs and failed print jobs.
- [ ] Add configurable stale-job monitoring through a platform-managed recurring heartbeat that marks abandoned Printing jobs as Failed. The authenticated callback is implemented; the schedule must be created after the owner publishes the site.
- [x] Apply the International Typographic Style visual system: white canvas, bold red square accents, black sans-serif typography, fine dividers, and asymmetric grid.
- [x] Add Vitest coverage for pricing, job state transitions, agent claim behavior, and stale-job failure logic.
- [ ] Complete browser-level validation of the dashboard and customer frontend at desktop and mobile widths. The code builds and type-checks, but the managed preview port is currently held by an unresponsive process.
- [ ] Push the completed source code to the user-provided GitHub repository.
