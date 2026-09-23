# History

Bugs fixed and behaviour deliberately changed, newest first.

- **Top Gear override no longer counts as a miss**: an override that moves top speed set `topSpeedMissed` and made `feasible` false, even though the user chose it. It is now reported as `topSpeedOverridden`, and `topSpeedMissed` covers only solve failures.
- **% Power Band Used is no longer clamped to 0–100**: a first shift landing below Peak Torque RPM (from a Target 1st Gear Speed solve) showed 100%, which hid it. The value now reads over 100% there, and below 0% when an overridden top gear lands above Max RPM. Both show in amber. The bar is still capped at 0–100.
- **Too-many-gears warning**: when the gear count can't fit Forza's limits, the warning now names the most gears that fit and has a USE N GEARS button. Top gear keeps missing the target in that case (decided, see KNOWN_ISSUES). Also fixed a negative dyno `<rect>` height while the graph is unmeasured.
- **Mobile layout**: ported SUSP.OS's drawer fixes. The drawer is 88% of the screen (capped at 360px), slides out
  instead of popping, is kept out of the tab order when closed, and closes on a leftward swipe, Escape or a backdrop tap.
  The top bar drops the subtitle under 600px (116px to 53px tall at 390px wide). Text fields are 16px under
  768px so iOS doesn't zoom on focus. On touch screens buttons, section headers and AUTO toggles are ≥ 36px and
  slider thumbs are 20px. None of this changes the desktop look.
- **Load a code in parts**: a pasted code or an opened `#g=` link no longer overwrites everything on arrival. It is staged in the SHARE pane with ENGINE / DESIRED TOP SPEED / GEARBOX tickboxes and applies only on APPLY SELECTED. The tickboxes are always on screen (showing your current values until a code is staged) and a load never moves them, so the choice made before pasting is the one that applies. Previously opening a link silently replaced every input.
- **Garage**: named saves (stored as share codes), LOAD / LINK / DELETE, and BACKUP / RESTORE to a JSON file.
- **Share codes**: added SHARE (copy code or link, load code). `DEFAULT_INPUTS` is now the single source of section defaults. See CODEC.md.

- **82fece4**: fixed the AUTO toggle, a crash on changing gear count, clamped-solve results, and summary bugs.
- **b0f3baa**: added a Tire Size/Radius toggle and a Top Gear Ratio override (replaces only the last gear; FD unchanged).
- **3a6ffd2**: reverted 0aaa553. % Powerband stays its own input rather than a Spacing Curve Bias AUTO mode. Reasons (reconstructed later) are in KNOWN_ISSUES.
- **0592502**: made Target 1st Gear Speed and AUTO % Powerband fully independent. % Powerband wins when both are set.
