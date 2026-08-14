# PrintKori Pre-publication Validation Notes

## 14 August 2026

The managed development preview is responding again at the project preview address. The public landing route returned HTTP 200, and visual checks at desktop (1280 × 720) and mobile (390 × 844) showed the International Typographic Style layout rendering cleanly without visible overflow or clipped controls.

The dashboard entry correctly redirects to the PrintKori authentication page. Completing the authenticated dashboard check requires the shop owner to pass the account sign-in and CAPTCHA challenge; this validation session cannot complete that private step.

The database currently has no configured shop rows. Consequently, no real QR/customer order route or job-status token exists for browser verification. A real owner setup and Windows-agent pairing are required to validate the printer-unavailable message, customer order submission, job status screen, and terminal-history Remove action end-to-end.

The post-publication stale-job schedule is intentionally still pending. It can only be created after the owner publishes the application.
