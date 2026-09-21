# Known Issues & Rejected Designs

Only what is still true.

## Limitations

- **Over-wide spreads miss top speed, not 1st gear.** When the ratio spread needed
  is wider than Forza allows (6.00 / 0.48 = 12.5, e.g. 10 gears with the default
  engine), normalization pins 1st gear at 6.00 and clamps top gear up to 0.48.
  Top speed comes out high (≈211 vs 180 mph in the test case). It is flagged
  (`topSpeedMissed`), not hidden. Whether to give up 1st gear instead is still open.
- **Tire radius from a tire size is approximate.** Forza's effective rolling radius
  has been seen 1% above to 10% below the static geometry. Use the Top Gear
  override or nudge the radius to match the in-game Top Speed stat.

## Rejected designs

- **% Powerband as a Spacing Curve Bias AUTO mode** (0aaa553, reverted in 3a6ffd2).
  The reasons were not recorded at the time. Fill them in if they are known.
