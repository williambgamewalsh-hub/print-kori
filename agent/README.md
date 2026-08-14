# PrintKori Windows Agent

The Windows agent connects one approved PrintKori job at a time to the printer attached to that computer. It is intentionally transparent: the shop owner pairs it with a one-time code, chooses the Windows printer, can view it in the dashboard, and can stop or remove it at any time.

## First-time pairing

1. In the dashboard, open **Agent pairing** and generate a one-time code.
2. Copy the `agent` directory to the Windows printer computer.
3. Run PowerShell and execute:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\PrintKoriAgent.ps1
   ```

4. Enter the deployed PrintKori site address, the one-time code, and the exact Windows printer name when prompted.
5. The agent creates `%APPDATA%\PrintKoriAgent\agent.json` and starts polling. Keep the window open for the first test print.

## Optional background startup

After confirming a successful test print, run the agent one time with the startup option:

```powershell
powershell -ExecutionPolicy Bypass -File .\PrintKoriAgent.ps1 -InstallStartup
```

This creates a clearly named **PrintKori Agent** task that starts at the current user’s Windows sign-in. It remains visible in Task Scheduler and can be disabled or removed by the shop owner.

## Supported files

The agent sends PDF and image files through Windows’ configured print handler. For `.doc` and `.docx`, the computer must have Microsoft Word installed because the agent uses Word’s local print command.
