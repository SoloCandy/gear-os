# GEAR.OS — Project Guidance

Single-file app: everything lives in `index.html` (React + Babel from CDN, no build).
Companion to SUSP.OS (`../susp-os`), which is the reference for conventions.

## After a major change, update the docs in the same commit

| Changed | Update |
|---|---|
| Solver method, limits, normalization, AUTO modes, bias curve | `README.md` (Method section) |
| Share-code fields, ids, enums, `DEFAULT_INPUTS` | `docs/CODEC.md`. Ids are permanent: retire them, never reuse |
| localStorage key, persisted shape, garage/backup format | `docs/PERSISTENCE.md` |
| A bug fixed, or a behaviour deliberately changed | `docs/HISTORY.md` |
| A limitation found, or a design deliberately rejected | `docs/KNOWN_ISSUES.md` — only what is still true |

Record *why* a design was rejected in KNOWN_ISSUES.md. The powerband/spacing
work has flip-flopped (0aaa553 → reverted in 3a6ffd2) because nothing said so.

## Verify before you finish

```
node tests.js
```

`tests.js` extracts the solver block from `index.html` — everything between
`// ---- Forza ratio limits ----` and `// Hover (mouse) or tap (touch) info icon`
— and runs it in a `vm` context. There is no mirrored copy to keep in sync, but:

- Keep those two marker comments intact, and keep the solver block free of
  React/DOM code, or the suite can't load it.
- Any change to `computeGearing`, `speedAtRpm`, `parseTyre`, the codec, the garage helpers or the ratio limits
  needs a test. Bug fix → add the regression case first.

The suite covers the math only, not UI wiring (AUTO toggles, persistence,
unit switching). For those, open `index.html` in the browser and check them.

## Invariants the tests guard

- Every gear ratio in 0.48–6.00, Final Drive in 2.20–6.10 (Forza's limits).
- Normalization only rescales ratio×FD pairs, so speeds and shift points are unchanged.
- First shift lands at peak torque RPM, last at peak HP RPM (unless 1st-gear targets move it).
- When clamping makes a target unreachable, `feasible`/`*Missed` say so. Never hide a miss.
- Every input in `DEFAULT_INPUTS` has a codec field. A decoded code is always sanitized.
- The Top Gear override replaces only the last ratio. FD and the other gears stay put.
