# GEAR.OS — Forza Gear Ratio Calculator

[![Live Demo](https://img.shields.io/badge/live%20demo-solocandy.github.io%2Fgear--os-e2e8f0?style=flat-square)](https://solocandy.github.io/gear-os/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

A single-file gear ratio calculator for **Forza Horizon** and **Forza Motorsport**, built
around a **Variable Power Band** gearing philosophy. Enter your engine's RPM range, gear
count, target top speed, and tire radius — GEAR.OS outputs a Final Drive and per-gear
ratios ready to enter in-game, plus a shift analysis showing exactly where each shift lands.

A companion tool to [SUSP.OS](https://github.com/solocandy/susp-os).

---

## Quick Start

**[Open the live app](https://solocandy.github.io/gear-os/)** — or download `index.html`
and open it in any browser. No install, no server, no build step.

> **Offline note:** React and Babel load from a CDN on first use. Once cached, the app
> works fully offline. For a fully air-gapped setup, open it once with internet access,
> then it works without a connection.

---

## The Idea: Variable Power Band

As speed increases, aerodynamic drag eats more of the engine's acceleration budget.
Gearing should respond to that:

- **Low gears (1st, 2nd):** drag is negligible, so it's fine to let RPM drop further
  after a shift — closer to **peak torque** — to use a wider slice of the power curve.
- **High gears (5th, 6th…):** drag dominates, so RPM should stay high after a shift —
  closer to **peak horsepower** — to keep average power near its maximum.

GEAR.OS linearly interpolates a **target landing RPM** for every shift, moving from the
torque peak (first shift) to the HP peak (last shift), then back-solves gear ratios from
the top gear down to hit those landing points. It only needs the peak HP/torque figures
and their RPMs — the numbers Forza actually shows you — not a full dyno curve, which the
game doesn't expose.

### Method

1. **Boundaries:** `Start_RPM = Peak Torque RPM` (1st→2nd shift), `End_RPM = Peak HP RPM`
   (2nd-to-last→last shift).
2. **Interpolate:** linearly compute a target landing RPM for every shift in between.
3. **Back-solve ratios:** starting from the top gear (temporarily set to 1.00), walk
   backwards — `Previous_Gear = Current_Gear × (Max_RPM / Target_Landing_RPM)` — down to
   1st. This step is scale-invariant: only the ratio *between* adjacent gears matters, so
   the absolute scale can be fixed independently.
4. **Solve Final Drive** from the top-speed target: with the top gear ratio fixed, Final
   Drive is whatever makes the car hit your desired top speed at Max RPM.
5. **Normalize:** if any gear or the Final Drive would fall outside Forza's valid range,
   uniformly rescale every gear ratio (and inversely rescale Final Drive) until they fit.
   This preserves every shift point and the top speed exactly, since only the
   `ratio × Final Drive` product — not the individual numbers — determines RPM/speed
   behavior.

### Shift Analysis

For each shift, GEAR.OS reports the RPM you land at and how much of the "power band"
(the RPM range from peak torque to redline) is still ahead of that landing point — i.e.
how much of it the next gear actually gets to use:

```
% Power Band Used = (Max RPM − Landing RPM) / (Max RPM − Peak Torque RPM)
```

Early shifts land at the torque peak, so the next gear gets the full band (100%). Later
shifts land closer to redline, leaving less band ahead — this percentage shrinks from low
gears to high gears by design, even though those later gears are the ones staying closer
to peak power.

---

An **IMP / MET** toggle in the top-right of the header switches Desired Top Speed and every
displayed speed between mph and km/h. Tire Radius always stays in mm regardless of the
toggle, matching Forza's own tuning menu (and [SUSP.OS](https://github.com/solocandy/susp-os),
which also works in tire *radius*, not diameter).

## Inputs

| Input | Notes |
|---|---|
| Max RPM (Redline) | |
| Peak HP RPM | AUTO defaults to 90% of Max RPM if you don't know the exact figure |
| Peak Torque RPM | AUTO defaults to 65% of Max RPM if you don't know the exact figure |
| Gear Count | 2–10 |
| Desired Top Speed | mph or km/h (IMP/MET toggle), at Max RPM in top gear |
| Tire Radius | mm, rolling radius (not diameter, not rim size) — always mm, unaffected by IMP/MET |
| Target 1st Gear Speed | Optional, mph or km/h. Leave blank for default behavior (below) |

### Target 1st Gear Speed

1st gear's speed and top gear's speed can't both be chosen independently — their ratio is
already fixed by the Variable Power Band's RPM interpolation once Max RPM, Peak HP/Torque
RPM, and Gear Count are set. Left blank, GEAR.OS solves Final Drive so **top gear** hits
Desired Top Speed at redline, same as always.

Set a value here — e.g. because wheelspin off the line or a corner-exit speed matters more
than outright top speed — and it takes over as the target instead: Final Drive is solved so
**1st gear** hits this speed at redline, and top gear's resulting speed becomes whatever
falls out (shown in the Gear Ratios table, with a note above Final Drive stating which gear
was solved for).

## Outputs

- **Final Drive**
- **RPM vs Speed chart** — the classic sawtooth: each gear climbs from its landing RPM to
  redline as speed rises, then drops straight back down at that same speed the instant you
  shift. Dashed lines mark Redline, Peak HP RPM, and Peak Torque RPM.
- **Gear Ratios** (1 → N), each with its theoretical top speed at redline
- **Shift Analysis** — landing RPM and % power band used for every shift

---

## Ratio Ranges

Confirmed in-game (Race transmission, sliders dragged to their stops):

| Range | Min | Max |
|---|---|---|
| Per-gear ratio | 0.48 | 6.00 |
| Final Drive | 2.20 | 6.10 |

If a solve can't fit both the requested top speed and every ratio inside these ranges,
GEAR.OS clamps to what's achievable and reports the actual top speed you'll get instead —
see [`GEAR_RATIO_MIN/MAX` and `FINAL_DRIVE_MIN/MAX`](index.html) in `index.html`.

---

## Known Limitations

- **No power/drag curve.** Only peak HP/torque and their RPMs are used — GEAR.OS can't
  tell you whether the car actually has enough power to *reach* redline in top gear
  before drag caps it out at a lower speed. Treat "Desired Top Speed" as a target to
  gear for, not a guaranteed outcome.
- **Shift-at-redline assumption.** All shifts are assumed to happen exactly at Max RPM.

---

## License

MIT — see [LICENSE](LICENSE).
