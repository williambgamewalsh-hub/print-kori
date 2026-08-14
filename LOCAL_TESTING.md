# Local Agent Test Guide

Use this guide to test the complete PrintKori workflow before publishing the project.

## Temporary test address

For the current test session, use this address in both the browser and the Windows agent:

```text
https://3100-izfyw29u9argpor5tweew-7b7b93ef.us2.manus.computer
```

This is an unpublished, temporary test server. Do not use it as the permanent shop address. The owner dashboard is at `/dashboard`.

## Test sequence

1. Open `https://3100-izfyw29u9argpor5tweew-7b7b93ef.us2.manus.computer/dashboard` in your browser and sign in.
2. Complete the setup steps in order: shop name, logo, pricing rates, paper options, and staff accounts.
3. In **Shop QR code**, download the QR code or copy the customer address.
4. Open the customer address in a second browser or on a phone, submit a small PDF or image, and confirm that its state is **Pending**.
5. Return to the dashboard and generate a **one-time agent pairing code**.
6. On the Windows computer that has the real printer, download the `agent` folder from the GitHub repository. Open PowerShell in that folder and run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PrintKoriAgent.ps1
   ```

7. When prompted, enter the temporary test address above, the one-time code from the dashboard, and the exact name of the Windows printer.
8. Return to the dashboard and click **Approve** on the pending job after confirming the test payment. The agent should claim the job, moving the state to **Printing**, and then report **Completed** or **Failed**.

## Important limits

The first agent run remains visible in a PowerShell window so you can observe errors. Only after a successful test print should you use `-InstallStartup` to make it launch at Windows sign-in. The agent only prints jobs that are in the exact **Approved** state.
