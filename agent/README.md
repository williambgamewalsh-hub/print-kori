# PrintKori Windows Agent

`PrintKoriAgent.ps1` is an interactive Windows terminal tool for the computer physically connected to the shop printer. It is deliberately visible during setup and prints only jobs that the shop dashboard has marked **Approved**.

## Start the agent menu

Copy `PrintKoriAgent.ps1` to the Windows printer computer. Open PowerShell in the folder containing the file and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\PrintKoriAgent.ps1
```

The black PowerShell screen opens a numbered menu. It shows whether the computer is paired and the selected printer.

| Option | Use it for |
|---|---|
| `1` | Detect installed Windows printers, including offline/default status. |
| `2` | Pair this computer with the one-time code from the PrintKori dashboard. |
| `3` | Re-pair or choose a different printer later. |
| `4` | See the saved PrintKori address, selected printer, and printer readiness. |
| `5` | Send a Windows test page to the selected printer. |
| `6` | Start the worker that claims and prints only approved PrintKori jobs. |
| `7` | Create an automatic startup task for the current Windows user; no administrator approval is requested. |
| `8` | Optional system-wide startup. It clearly asks for confirmation and then Windows administrator approval. |
| `0` | Exit the terminal tool. |

## First-time setup

First choose option `1` to check that Windows sees the printer. Then, in PrintKori dashboard, create a one-time pairing code. Choose option `2`, enter the PrintKori address and code, then select the printer number. Finally choose option `5` to print a Windows test page. Once that works, choose option `6` and approve a small PDF in PrintKori.

## Privileges

Printer discovery, pairing, re-pairing, status, test printing, and normal print work use the signed-in shop user and do not require administrator permission. The optional option `8` is the only menu choice that requests Windows elevation because it creates a system-wide high-privilege startup task. Prefer option `7` for normal shop use.

See [`INSTALLATION_GUIDE.md`](INSTALLATION_GUIDE.md) for a screen-by-screen guide and [`RESEARCH_NOTES.md`](RESEARCH_NOTES.md) for the Windows design basis.
