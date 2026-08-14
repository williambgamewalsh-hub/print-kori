# PrintKori Windows Agent

The Windows agent connects one approved PrintKori job at a time to the printer attached to that computer. It is intentionally transparent: the shop owner pairs it with a one-time code, chooses the Windows printer, can view it in the dashboard, and can stop or remove it at any time.

## First-time pairing

1. In the dashboard, open **Agent pairing** and first download `PrintKoriAgent.ps1`.
2. Copy the script to the Windows printer computer.
3. Open PowerShell in the script folder and list the printers that the agent can see:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PrintKoriAgent.ps1 -ListPrinters
   ```

4. Back in the dashboard, generate a one-time pairing code. Then run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PrintKoriAgent.ps1 -PairOnly
   ```

5. Enter the PrintKori site address and one-time code. The agent shows the detected printers and lets you choose one by number.
6. The agent writes the selected printer and encrypted agent credentials to `%APPDATA%\PrintKoriAgent\agent.json`. Pairing-only mode exits after saving this configuration.
7. Start the worker only after checking the selected printer:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PrintKoriAgent.ps1
   ```

   Keep this first worker window visible while you submit and approve a small test PDF.

## Optional background startup

After confirming a successful test print, run the agent one time with the startup option:

```powershell
powershell -ExecutionPolicy Bypass -File .\PrintKoriAgent.ps1 -InstallStartup
```

This creates a clearly named **PrintKori Agent** task that starts at the current user’s Windows sign-in. It remains visible in Task Scheduler and can be disabled or removed by the shop owner.

## Supported files

The agent sends PDF and image files through Windows’ configured print handler. For `.doc` and `.docx`, the computer must have Microsoft Word installed because the agent uses Word’s local print command.
