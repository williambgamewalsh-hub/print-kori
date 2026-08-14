# PrintKori

PrintKori is a cloud-connected print-shop management platform. It separates the customer’s QR ordering experience, the shop owner’s operating dashboard, and a transparent Windows print agent while keeping every print job in one controlled state machine.

## Product flow

The owner signs in to the dashboard and completes the required first-use sequence in this exact order: **shop name**, **logo**, **pricing rates**, **available paper options**, and **staff accounts**. The dashboard then generates a downloadable QR code. A customer scans that QR code to open `/s/{shop-slug}`, uploads a file, chooses color or grayscale, copies, paper, and single- or double-sided printing, then sees a calculated price before submitting the request.

The customer request moves from **Submitted** to **Pending**. The shop confirms cash payment and chooses **Approve**, which moves the job to **Approved**. A paired Windows agent can claim one approved job at a time, switching it to **Printing**. The agent reports **Completed** or **Failed**. The shop can also set a pending job to **Cancelled**. These are the complete and exact status labels used throughout the platform.

## Main components

| Component | Purpose |
|---|---|
| Customer QR frontend | Mobile-first public route with shop branding, file upload, print choices, price summary, request confirmation, and live status tracking. |
| Shop dashboard | Authenticated owner workspace for guided setup, QR download, job inbox, payment approval, staff, agent pairing, and state history. |
| Backend and storage | Typed API, MySQL data model, secure document storage, pricing calculations, notifications, and exact state-transition rules. |
| Windows agent | A transparent PowerShell companion that pairs with a one-time code, polls for one approved job, invokes the selected Windows printer, and reports results. |

## Local development

Install dependencies and run the application with:

```bash
pnpm install
pnpm dev
```

Run the automated checks with:

```bash
pnpm test
pnpm check
pnpm build
```

## Windows print agent

See [`agent/README.md`](agent/README.md) for the pairing and startup instructions. The agent runs under a clearly named scheduled Windows task only when the shop owner explicitly chooses the startup option. It does not print any job until the dashboard has marked that job **Approved**.

## Stale-job recovery

The protected callback at `/api/scheduled/stale-print-jobs` checks all **Printing** jobs. It uses each shop’s configurable stale-job timeout and changes an abandoned job to **Failed**, with an owner alert. The site must be published before the recurring platform schedule can be created. After publishing, create it once with:

```bash
manus-heartbeat create \
  --name printkori-stale-print-jobs \
  --cron "0 */5 * * * *" \
  --path /api/scheduled/stale-print-jobs \
  --description "Mark Printing jobs as Failed when their agent heartbeat exceeds the shop timeout"
```

The command runs every five minutes. The handler itself is idempotent and checks the job’s current state before marking it failed.
