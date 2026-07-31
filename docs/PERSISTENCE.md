# GEAR.OS — localStorage Persistence

Unlike SUSP.OS (which splits state across several keys — chassis, tune,
drivetrain, alignment — because those are meaningfully separate concerns),
GEAR.OS has one flat set of inputs describing a single gearing setup, so it
uses a single combined key.

| Key | Holds | Default |
|---|---|---|
| `gearos_inputs_v1` | Every input: `metricUnits`, `maxRpm`, `autoHp`, `hpRpm`, `autoTorque`, `torqueRpm`, `gearCount`, `topSpeed`, `tireRadius`, `tireSize`, `tireInputMode`, `topGearOverride`, `target1stSpeed`, `target1stPct`, `target1stMode`, `tightnessBias`, `dynoScale` | See `index.html`'s `useState` initializers |

## How it works

On mount, `loadPersisted()` reads and JSON-parses the key once (via
`useState(loadPersisted)`, whose lazy-initializer form React guarantees runs
exactly once). Each input's `useState` then falls back to its own default
with `saved.field ?? default` — so a field missing from an old save (e.g.
after adding a new input) just uses its default, no migration step needed.

A single `useEffect` watching every input re-serializes the whole object to
`localStorage` on any change — including RESET, which needs no special
handling since it's just another state update the same effect picks up.

Both the read and the write are wrapped in `try/catch` and silently no-op
on failure (private browsing, quota, or a corrupt/foreign value under the
key) — falls back to defaults rather than throwing.

## When to bump the version suffix

Same policy as SUSP.OS (see its own `docs/PERSISTENCE.md`): bump
`_v1` → `_v2` only when a field's *meaning* changes such that an old stored
value would now be misread (different unit, different valid range, a
renamed enum) — not for adding a new field with a sensible default.
