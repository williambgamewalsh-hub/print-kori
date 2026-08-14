# Windows Agent Design Notes

The interactive agent should run as the signed-in shop user by default. Microsoft documents `Get-CimInstance -Class Win32_Printer` as the straightforward way to list printers installed on Windows, and the `Win32_Printer` class exposes useful operational information such as printer name, default state, offline state, status, and the `PrintTestPage` method.[1][2]

The normal menu therefore does **not** need administrator rights for discovering printers, pairing the agent, showing status, running a test page, or printing approved jobs. Administrator elevation should be optional and explained only for a machine-wide startup task. Microsoft’s scheduled-task guidance explicitly distinguishes the least-privileged `Limited` run level from the `Highest` run level, which runs with elevated rights.[3]

| Menu action | Expected privilege | Reason |
|---|---|---|
| Detect printers | Standard user | Reads local `Win32_Printer` information. |
| Pair or re-pair | Standard user | Saves agent configuration under the current user profile. |
| Show status and test a printer | Standard user | Uses the selected Windows printer under the shop user’s session. |
| Run the agent now | Standard user | Maintains a visible interactive session for first testing. |
| Add startup task | Optional elevation only if needed | A standard-user login task should be attempted first; request elevation only for a system-wide/highest-privilege task. |

## References

[1] [Microsoft Learn — Working with printers in Windows](https://learn.microsoft.com/en-us/powershell/scripting/samples/working-with-printers?view=powershell-7.6)

[2] [Microsoft Learn — Win32_Printer class](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-printer)

[3] [Microsoft Learn — New-ScheduledTaskPrincipal](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtaskprincipal?view=windowsserver2025-ps)
