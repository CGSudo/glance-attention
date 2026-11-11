# ShareX: analyze after capture

Start here: add a ShareX **Action**. `.sxcu` configures uploaders; it cannot configure this after-capture CLI action.

1. Open **Task settings → Actions → Add**.
2. For the Windows NSIS installer, set **File path** to `%LOCALAPPDATA%\Glance\glance.exe`. The MSI default is `%ProgramFiles%\Glance\glance.exe`. A custom installation folder requires browsing to its `glance.exe` sidecar.
3. Set **Arguments** to `analyze "$input" --open`. Leave **Output file name extension** empty; enable **Hidden window**. Save, then check the action's checkbox.
4. In **After capture tasks**, enable **Save image to file** and **Perform actions**. Disable upload tasks if screenshots must stay local.
5. Capture a region. Expected: Glance analyzes the saved image and opens its result. If nothing opens, run the same command in a terminal with a real image path to see CLI errors.

No HTTP server or bearer token needed. `--open` requires CLI support specified in SPEC.md; this integration cannot supply it.

## Importable example

`glance-action.json` is one ShareX `ExternalProgram` object, not a standalone ShareX uploader/import file. Import by merging it into your existing config; preserve unrelated settings.

1. Exit ShareX. Back up its `ApplicationConfig.json` (find the settings folder through **Application settings → Paths**).
2. Open that config and `glance-action.json`. Append the example object to `DefaultTaskSettings.ExternalPrograms`. Replace `Path` with the actual absolute executable path; double backslashes inside JSON. Do not replace the entire config.
3. Save, reopen ShareX, then enable the after-capture tasks from step 4 above. A hotkey using custom task settings must inherit default Actions or receive the same action.

Reference: [ShareX action setup](https://getsharex.com/actions); object fields match [ShareX ExternalProgram](https://github.com/ShareX/ShareX/blob/v17.0.0/ShareX.HelpersLib/ExternalProgram.cs).
