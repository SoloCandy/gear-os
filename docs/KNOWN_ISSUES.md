# Known Issues & Rejected Designs

Only what is still true.

## Limitations

- **Too many gears for the engine: top gear misses, by design.** When the gear spread
  needs more than Forza's limits allow (e.g. 10 gears with a wide torque→HP band at 180 mph),
  1st gear stays at 6.00 and the top gear is clamped at 0.48. Top gear comes out too tall
  (≈211 mph instead of 180) and the last shift barely drops the revs. We chose this over the
  alternative, keeping top speed and squashing the low gears into near-duplicate 1st/2nd gears,
  because either way one gear is wasted. The warning names the most gears that fit
  (`maxFittingGears`) and offers a USE N GEARS button.
- **Tire radius from a tire size is approximate.** Forza's effective rolling radius
  has been seen 1% above to 10% below the static geometry. Use the Top Gear
  override or nudge the radius to match the in-game Top Speed stat.

## Rejected designs

- **`display:none` for the closed mobile drawer.** It looks like a tidy simplification, but a
  transform can't animate out of `display:none`, so the slide stops working. The drawer
  stays mounted and hides with a delayed `visibility:hidden` instead.
- **Letting a swipe start on a control.** The swipe-to-close ignores touches that start on
  `input`, `select`, `textarea` or the dyno `svg`. Without that, dragging a slider or a
  dyno marker left would close the drawer mid-drag.

- **% Powerband as a Spacing Curve Bias AUTO mode** (0aaa553, reverted in 3a6ffd2).
  % Powerband stays a mode of 1st Gear Target (SPEED / % POWERBAND). No reason was
  recorded at the time; these were reconstructed from the diffs in Sep 2026:
  1. **Different job.** Spacing Curve Bias reshapes the RPM drops *between* the fixed
     1st→2nd and last shift points and never moves either one. % Powerband *moves* the
     1st→2nd shift, so it is a 1st-gear target, not a curve shape.
  2. **Hidden input still applied.** In AUTO the bias slider was hidden, but
     `tightnessBias` was still passed to `computeGearing`, so a value you could not see
     or reset kept shaping the result.
  3. **Two controls for one decision.** Target 1st Gear Speed and AUTO % Powerband lived
     in different sections but both set where 1st gear ends, with one silently overriding
     the other. That needed special cases in the infeasibility banner and summary line,
     plus 0592502. One toggle in one section makes them mutually exclusive by construction.
