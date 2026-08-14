# Interactive Agent Test Checklist

The PrintKori web application was type-checked, tested, and built successfully. The final printer test must run on a **Windows computer with a real configured printer**, because the sandbox does not include PowerShell or Windows printer drivers.

| Check | Expected outcome |
|---|---|
| Open `PrintKoriAgent.ps1` without arguments | A black PowerShell screen shows the numbered main menu. |
| Choose `1` | Installed Windows printers appear with a number and a READY, DEFAULT, or OFFLINE status. |
| Choose `2` | The script asks for the PrintKori address, one-time code, and printer number, then confirms pairing. |
| Choose `4` | The saved address, selected printer, pairing time, and current printer state appear. |
| Choose `5` | Windows accepts a test page for the selected printer. |
| Choose `3` | The prior pairing is removed and a new printer can be selected. |
| Choose `6` | The worker waits for an approved job and only changes a claimed job from **Approved** to **Printing**. |
| Choose `7` | A clearly named current-user startup task is created without an administrator prompt. |
| Choose `8` | The script explains the system-wide task, requires typing `YES`, and only then asks Windows for administrator approval. |

For the first test, do not use automatic startup. Keep the worker window visible. Submit a small PDF, approve it in the dashboard, and keep the PowerShell window open until the job becomes **Completed** or shows a clear error.
