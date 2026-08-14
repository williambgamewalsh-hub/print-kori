# PrintKori Pre-publication Validation Notes

## 14 August 2026

The managed development preview is responding again at the project preview address. The public landing route returned HTTP 200, and visual checks at desktop (1280 × 720) and mobile (390 × 844) showed the International Typographic Style layout rendering cleanly without visible overflow or clipped controls.

The temporary owner review link was rechecked and is reachable from an external browser. It is a development preview rather than a published site, so its address is only intended for testing and can change when the development server is restarted.

The dashboard entry correctly redirects to the PrintKori authentication page. Completing the authenticated dashboard check requires the shop owner to pass the account sign-in and CAPTCHA challenge; this validation session cannot complete that private step without owner-provided evidence.

The dashboard-entry OAuth request was rechecked after the fix. Its signed return path is now `/dashboard` rather than `/`, so a successful sign-in is routed to the dashboard instead of returning to the landing page. The remaining authenticated browser check is retained separately because it requires the owner’s private sign-in.

The owner has indicated that the requested real-world test sequence is done. Before closing the related browser-validation items, a screenshot or other observable result is still needed to verify the authenticated dashboard, customer order page, job-status screen, and agent outcome.

The post-publication stale-job schedule is intentionally still pending. It can only be created after the owner publishes the application.

## Post-publication Monitoring Activation

The published production site was confirmed reachable at `https://printkori-lwdj5kys.manus.space/`. The project-level Heartbeat named `printkori-stale-print-jobs` is enabled with task UID `LLPJzUAmuBAsMYnGH4a2Eo`. It sends a `POST` request to `/api/scheduled/stale-print-jobs` on the UTC cron schedule `0 */5 * * * *` (every five minutes) and marks stale `Printing` jobs as failed according to each shop’s configured timeout.

The first two automatic production runs both completed successfully with HTTP 200 responses. Each reported the expected authenticated task UID and completed the check without finding any stale printing jobs.

## Landing Page Expansion

The public landing page now includes a featured three-role PrintKori capability section, a Why PrintKori value grid, a three-step operating flow, a printer-availability message, two dashboard setup calls to action, and a responsive footer. Full-page desktop and mobile checks confirmed that the expanded sections stack and remain readable at both widths.

Immediately after the expansion checkpoint, the production domain continued to serve the prior hero-only page even when a cache-busting query parameter was used. After the deployment success notification, the production domain was rechecked and confirmed to serve the expanded landing page, including the See the flow action, featured capability content, value sections, workflow, and footer.

The production dashboard entry was also rechecked. Its OAuth request carries `/dashboard` as the signed return path, so the published login flow now preserves the intended post-authentication destination. Completing sign-in itself remains an owner-only browser action.

## Landing Page Spacing Refinement

The featured, Why PrintKori, operating-flow, availability, setup, and footer bands were given larger section padding and more relaxed internal spacing. Revised full-page desktop and mobile checks confirmed a clearer visual cadence, while retaining the sharp red, black, and white operational grid.

## Landing Page Motion Refinement

The landing page now uses restrained reveal motion for lower content bands, a short staggered hero entrance, and tactile call-to-action hover feedback. Motion is limited to opacity and transform, with `prefers-reduced-motion` rendering the same content immediately without animation. Desktop and mobile visual checks confirmed that the revealed state remains legible and preserves the expanded spacing.

## Landing Page Copy Edit Verification

The hero actions now read **Get Started** and **See how it works**. Duplicate trailing number labels were removed from the three featured capability rows while retaining their primary left-side indices. The final desktop visual check confirmed that the revised copy and simplified labels fit the layout cleanly.
