# History

Bugs fixed and behaviour deliberately changed, newest first.

- **Share codes**: added SHARE (copy code or link, load code). `DEFAULT_INPUTS` is now the single source of section defaults. See CODEC.md.

- **82fece4**: fixed the AUTO toggle, a crash on changing gear count, clamped-solve results, and summary bugs.
- **b0f3baa**: added a Tire Size/Radius toggle and a Top Gear Ratio override (replaces only the last gear; FD unchanged).
- **3a6ffd2**: reverted 0aaa553. % Powerband stays its own input rather than a Spacing Curve Bias AUTO mode.
- **0592502**: made Target 1st Gear Speed and AUTO % Powerband fully independent. % Powerband wins when both are set.
