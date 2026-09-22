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
  The reasons were not recorded at the time. Fill them in if they are known.
