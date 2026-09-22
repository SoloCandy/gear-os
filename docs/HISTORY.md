# History

Bugs fixed and behaviour deliberately changed, newest first.

- **Mobile layout**: ported SUSP.OS's drawer fixes. The drawer is 88% of the screen (capped at 360px), slides out
  instead of popping, is kept out of the tab order when closed, and closes on a leftward swipe, Escape or a backdrop tap.
  The top bar drops the subtitle under 600px (116px to 53px tall at 390px wide). Text fields are 16px under
  768px so iOS doesn't zoom on focus. On touch screens buttons, section headers and AUTO toggles are ≥ 36px and
  slider thumbs are 20px. None of this changes the desktop look.
- **Garage**: named saves (stored as share codes), LOAD / LINK / DELETE, and BACKUP / RESTORE to a JSON file.
- **Share codes**: added SHARE (copy code or link, load code). `DEFAULT_INPUTS` is now the single source of section defaults. See CODEC.md.

- **82fece4**: fixed the AUTO toggle, a crash on changing gear count, clamped-solve results, and summary bugs.
- **b0f3baa**: added a Tire Size/Radius toggle and a Top Gear Ratio override (replaces only the last gear; FD unchanged).
- **3a6ffd2**: reverted 0aaa553. % Powerband stays its own input rather than a Spacing Curve Bias AUTO mode.
- **0592502**: made Target 1st Gear Speed and AUTO % Powerband fully independent. % Powerband wins when both are set.
