# PrintKori Windows Agent: Interactive Setup Guide

Use this guide on the **Windows computer physically connected to the printer**.

| Step | What the shop owner does |
|---|---|
| 1 | In PrintKori dashboard, click **Download agent script**. The browser saves `PrintKoriAgent.ps1`. |
| 2 | Move the file to the Windows computer connected to the printer. |
| 3 | Open PowerShell in the folder containing the file. |
| 4 | Run `powershell -ExecutionPolicy Bypass -File .\PrintKoriAgent.ps1`. A black interactive menu opens. |
| 5 | Choose `1` to detect Windows printers. Confirm that the required printer appears and is not offline. |
| 6 | Return to PrintKori dashboard and generate a one-time pairing code. |
| 7 | Return to the terminal and choose `2`. Enter the PrintKori web address, pairing code, then choose the detected printer number. |
| 8 | Choose `5` to ask Windows to print a test page. Fix any printer issue before continuing. |
| 9 | Choose `6` to start the PrintKori worker. Keep this window visible for the first real test. |
| 10 | Submit a small PDF through the customer page, approve it in the dashboard, and confirm the state changes from **Approved** to **Printing** to **Completed**. |

## Going back or changing a printer

The main menu always remains available after an action. Choose `3` whenever the shop changes printers, needs to re-pair, or made a mistake during setup. Choose `0` to exit without changing anything.

## Automatic startup

After a successful real print, choose `7` to create a startup task for the current Windows user. This option does not require administrator rights. Choose `8` only if the owner explicitly needs a system-wide startup task; Windows will explain and request administrator approval then.
