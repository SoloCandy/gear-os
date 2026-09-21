// GEAR.OS solver tests
// Run with: node tests.js
// No dependencies required.
//
// The solver is pulled straight out of index.html (the block from
// "---- Forza ratio limits ----" to the Hint component) and evaluated here,
// so these tests always exercise the shipped code — no mirrored copy to drift.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const START = '// ---- Forza ratio limits ----';
const END = '// Hover (mouse) or tap (touch) info icon';
const a = html.indexOf(START), b = html.indexOf(END);
if (a < 0 || b < 0 || b < a) {
  console.error('Could not locate the solver block in index.html (markers moved?)');
  process.exit(1);
}
const ctx = { localStorage: { getItem: () => null }, Math, JSON, Number, Array, String };
vm.createContext(ctx);
vm.runInContext(html.slice(a, b) +
  '\n;this.api={computeGearing,speedAtRpm,parseTyre,clamp,round,' +
  'GEAR_RATIO_MIN,GEAR_RATIO_MAX,FINAL_DRIVE_MIN,FINAL_DRIVE_MAX};', ctx);
const G = ctx.api;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++;
  console.log(`FAIL  ${name}${detail ? '  — ' + detail : ''}`);
}
const near = (x, y, tol) => Math.abs(x - y) <= tol;

const BASE = {
  maxRpm: 8000, peakHpRpm: 7000, peakTorqueRpm: 5000, gearCount: 6,
  topSpeedMph: 180, tireRadius: 330, target1stMph: null, target1stPct: null,
  tightnessBias: 0, topGearRatioOverride: null,
};
const run = over => G.computeGearing({ ...BASE, ...over });

function inLimits(name, r) {
  check(`${name}: FD in range`, r.finalDrive >= G.FINAL_DRIVE_MIN - 1e-9 && r.finalDrive <= G.FINAL_DRIVE_MAX + 1e-9, `FD=${r.finalDrive}`);
  for (const g of r.gears)
    check(`${name}: gear ${g.gear} in range`, g.ratio >= G.GEAR_RATIO_MIN - 1e-9 && g.ratio <= G.GEAR_RATIO_MAX + 1e-9, `ratio=${g.ratio}`);
}
function wellFormed(name, r, N) {
  check(`${name}: no error`, !r.error, r.error);
  if (r.error) return false;
  check(`${name}: ${N} gears`, r.gears.length === N);
  check(`${name}: ${N - 1} shifts`, r.shifts.length === N - 1);
  const finite = [r.finalDrive, ...r.gears.map(g => g.ratio), ...r.gears.map(g => g.speedAtRedline),
    ...r.shifts.map(s => s.landingRpm), ...r.shifts.map(s => s.powerBandPct)].every(Number.isFinite);
  check(`${name}: all numbers finite`, finite);
  return true;
}

// ── speedAtRpm ──
{
  // 8000 rpm, ratio*FD = 3.0, r=330mm: 8000/3*2π*0.33 m/min → mph
  const expect = 8000 / 3 * 2 * Math.PI * 330 * 60 / 1609344;
  check('speedAtRpm formula', near(G.speedAtRpm(8000, 1, 3, 330), expect, 1e-9));
  check('speedAtRpm depends only on ratio*FD', near(G.speedAtRpm(8000, 2, 1.5, 330), G.speedAtRpm(8000, 1, 3, 330), 1e-9));
}

// ── parseTyre ──
{
  const t = G.parseTyre('255/40R19');
  check('parseTyre full size', t && near(t.radius, (19 * 25.4 + 2 * 255 * 0.4) / 2, 1e-9));
  check('parseTyre width only', G.parseTyre('255').radius === null);
  check('parseTyre blank', G.parseTyre('') === null);
  check('parseTyre bad width', G.parseTyre('20/40R19') === null);
  check('parseTyre bad rim', G.parseTyre('255/40R40') === null);
}

// ── input validation ──
{
  const bad = [
    ['gear count 1', { gearCount: 1 }], ['gear count 11', { gearCount: 11 }],
    ['gear count non-integer', { gearCount: 5.5 }], ['gear count NaN', { gearCount: NaN }],
    ['max rpm 0', { maxRpm: 0 }], ['top speed 0', { topSpeedMph: 0 }], ['tire 0', { tireRadius: 0 }],
    ['torque >= hp', { peakTorqueRpm: 7000 }], ['hp > max', { peakHpRpm: 8500 }],
    ['1st target >= top', { target1stMph: 180 }], ['1st target 0', { target1stMph: 0 }],
    ['pct > 100', { target1stPct: 101 }], ['pct < 0', { target1stPct: -1 }],
  ];
  for (const [n, o] of bad) check(`rejects ${n}`, typeof run(o).error === 'string');
}

// ── default solve, every gear count ──
for (let N = 2; N <= 10; N++) {
  const name = `default N=${N}`;
  const r = run({ gearCount: N });
  if (!wellFormed(name, r, N)) continue;
  inLimits(name, r);
  // Spread wider than Forza allows (6.00/0.48 = 12.5) can't be hit — must be flagged, not hidden.
  const spread = r.gears[0].ratio / r.gears[N - 1].ratio;
  const clamped = r.gears[0].ratio >= G.GEAR_RATIO_MAX - 1e-9 && r.gears[N - 1].ratio <= G.GEAR_RATIO_MIN + 1e-9;
  if (clamped) {
    check(`${name}: over-wide spread flagged`, !r.feasible && r.topSpeedMissed);
    continue;
  }
  check(`${name}: hits top speed`, near(r.actualTopSpeed, 180, 0.5), `got ${r.actualTopSpeed}`);
  check(`${name}: feasible`, r.feasible, `spread ${spread}`);
  for (let i = 1; i < N; i++)
    check(`${name}: ratios descend at gear ${i + 1}`, r.gears[i].ratio < r.gears[i - 1].ratio);
  // Variable Power Band: first shift lands at peak torque, last at peak HP.
  check(`${name}: first shift at torque peak`, near(r.shifts[0].landingRpm, 5000, 1),
    `got ${r.shifts[0].landingRpm}`);
  if (N > 2) check(`${name}: last shift at HP peak`, near(r.shifts[N - 2].landingRpm, 7000, 1),
    `got ${r.shifts[N - 2].landingRpm}`);
  for (let i = 1; i < r.shifts.length; i++)
    check(`${name}: landing RPM rises at shift ${i + 1}`, r.shifts[i].landingRpm >= r.shifts[i - 1].landingRpm - 1e-6);
}

// ── spacing curve bias ──
for (const bias of [-100, -50, 50, 100]) {
  const name = `bias ${bias}`;
  const r = run({ tightnessBias: bias });
  if (!wellFormed(name, r, 6)) continue;
  inLimits(name, r);
  check(`${name}: endpoints unchanged (torque)`, near(r.shifts[0].landingRpm, 5000, 1));
  check(`${name}: endpoints unchanged (HP)`, near(r.shifts[4].landingRpm, 7000, 1));
  check(`${name}: hits top speed`, near(r.actualTopSpeed, 180, 0.5));
}
{
  const lo = run({ tightnessBias: -100 }), hi = run({ tightnessBias: 100 });
  check('bias<0 tightens middle shifts sooner', lo.shifts[2].landingRpm > hi.shifts[2].landingRpm);
}

// ── Target 1st Gear Speed ──
for (const t1 of [40, 55, 70]) {
  const name = `target1st ${t1}mph`;
  const r = run({ target1stMph: t1 });
  if (!wellFormed(name, r, 6)) continue;
  inLimits(name, r);
  if (r.feasible) {
    check(`${name}: hits 1st speed`, near(r.actualFirstGearSpeed, t1, Math.max(0.5, t1 * 0.01)), `got ${r.actualFirstGearSpeed}`);
    check(`${name}: hits top speed`, near(r.actualTopSpeed, 180, 1.8));
  } else {
    check(`${name}: infeasible is flagged`, r.firstGearMissed || r.topSpeedMissed);
  }
}

// ── % Powerband ──
{
  const r = run({ target1stPct: 100 });
  check('pct 100: first shift lands at torque peak', near(r.shifts[0].landingRpm, 5000, 1));
  const r2 = run({ target1stPct: 50 });
  check('pct 50: first shift lands halfway', near(r2.shifts[0].landingRpm, 6500, 1), `got ${r2.shifts[0].landingRpm}`);
  check('pct 50: reported pct matches', near(r2.shifts[0].powerBandPct, 50, 0.1));
  check('pct 0: no crash', wellFormed('pct 0', run({ target1stPct: 0 }), 6));
  // % Powerband is independent of Target 1st Gear Speed (pct wins when both set).
  const both = run({ target1stPct: 50, target1stMph: 60 });
  check('pct overrides 1st mph', near(both.shifts[0].landingRpm, 6500, 1));
}

// ── top gear override ──
{
  const base = run({});
  const r = run({ topGearRatioOverride: 0.70 });
  check('override sets top ratio', near(r.gears[5].ratio, 0.70, 1e-9));
  check('override keeps FD', near(r.finalDrive, base.finalDrive, 1e-9));
  for (let i = 0; i < 5; i++) check(`override keeps gear ${i + 1}`, near(r.gears[i].ratio, base.gears[i].ratio, 1e-9));
  check('override landing derived from ratios', near(r.shifts[4].landingRpm, 8000 * 0.70 / r.gears[4].ratio, 1e-6));
  const c = run({ topGearRatioOverride: 99 });
  check('override clamps high', c.gears[5].ratio === G.GEAR_RATIO_MAX);
  const c2 = run({ topGearRatioOverride: 0.01 });
  check('override clamps low', c2.gears[5].ratio === G.GEAR_RATIO_MIN);
}

// ── clamping / infeasible extremes ──
{
  const cases = [
    ['very low top speed', { topSpeedMph: 20 }],
    ['very high top speed', { topSpeedMph: 400 }],
    ['10 gears narrow band', { gearCount: 10, peakTorqueRpm: 2000, peakHpRpm: 7900 }],
    ['tiny tire', { tireRadius: 150 }],
    ['huge tire', { tireRadius: 600 }],
  ];
  for (const [n, o] of cases) {
    const N = o.gearCount || 6;
    const r = run(o);
    if (!wellFormed(n, r, N)) continue;
    inLimits(n, r);
    check(`${n}: feasible flag honest`, r.feasible === (!r.topSpeedMissed && !r.firstGearMissed));
    const tgt = o.topSpeedMph ?? 180;
    check(`${n}: topSpeedMissed honest`,
      r.topSpeedMissed === (Math.abs(r.actualTopSpeed - tgt) > Math.max(0.5, tgt * 0.01)));
    for (const s of r.shifts) check(`${n}: pct within 0..100`, s.powerBandPct >= 0 && s.powerBandPct <= 100);
  }
}

// ── scale invariance: ratio*FD products determine speeds ──
{
  const r = run({});
  for (const g of r.gears)
    check(`gear ${g.gear} speed matches ratio*FD`, near(g.speedAtRedline, G.speedAtRpm(8000, g.ratio, r.finalDrive, 330), 1e-9));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
