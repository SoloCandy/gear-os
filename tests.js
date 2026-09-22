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
const ctx = { localStorage: { getItem: () => null }, Math, JSON, Number, Array, String,
  btoa, atob, encodeURIComponent, decodeURIComponent };
vm.createContext(ctx);
vm.runInContext(html.slice(a, b) +
  '\n;this.api={computeGearing,maxFittingGears,speedAtRpm,parseTyre,clamp,round,' +
  'encodeInputs,decodeInputs,sanitizeGarage,garageUpsert,garageRemove,garageMerge,DEFAULT_INPUTS,CODEC_FIELDS,CODEC_VERSION,' +
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

// ── share codec ──
{
  const D = G.DEFAULT_INPUTS;
  const ids = G.CODEC_FIELDS.map(f => f.id);
  check('codec ids unique', new Set(ids).size === ids.length);
  check('codec covers every default input', Object.keys(D).every(k => G.CODEC_FIELDS.some(f => f.key === k)));
  const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const raw = s => Buffer.from(s).toString('base64');
  const throws = fn => { try { fn(); return null; } catch (e) { return e.message; } };

  const defCode = G.encodeInputs(D);
  check('defaults encode to version only', Buffer.from(defCode, 'base64').toString() === String(G.CODEC_VERSION));
  check('defaults round-trip', eq(G.decodeInputs(defCode), { ...D }));

  const full = {
    maxRpm: 9500, autoHp: false, hpRpm: 8800, autoTorque: false, torqueRpm: 6100, gearCount: 7,
    topSpeed: 212.5, tireRadius: 341.3, tireSize: '275/35R20', tireInputMode: 'radius',
    topGearOverride: 0.72, target1stSpeed: 58, target1stPct: 42, target1stMode: 'pct', tightnessBias: -35,
  };
  const code = G.encodeInputs(full);
  check('full round-trip', eq(G.decodeInputs(code), full), JSON.stringify(G.decodeInputs(code)));
  check('code is URL-safe', /^[A-Za-z0-9_-]+$/.test(code), code);
  check('share link accepted', eq(G.decodeInputs('https://x.io/gear-os/#g=' + code), full));
  check('whitespace tolerated', eq(G.decodeInputs('  ' + code + '\n'), full));
  check('null field round-trips', G.decodeInputs(G.encodeInputs({ ...full, topGearOverride: null })).topGearOverride === null);
  check('odd chars in tire size survive',
    G.decodeInputs(G.encodeInputs({ ...D, tireSize: 'a|b:c 1/2' })).tireSize === 'a|b:c 1/2');

  check('garbage rejected', !!throws(() => G.decodeInputs('%%%not base64%%%')));
  check('non-code base64 rejected', !!throws(() => G.decodeInputs(raw('hello|1:2'))));
  check('newer version rejected with message', /newer/.test(throws(() => G.decodeInputs(raw(`${G.CODEC_VERSION + 1}|1:9000`))) || ''));

  const d = G.decodeInputs(raw('1|99:5|1:9000|garbage|6:abc'));
  check('unknown id ignored', d.maxRpm === 9000);
  check('bad number falls back to default', d.gearCount === D.gearCount);
  const c = G.decodeInputs(raw('1|6:40|13:250|1:-5|10:9|2:7'));
  check('gearCount clamped', c.gearCount === 10);
  check('pct clamped', c.target1stPct === 100);
  check('maxRpm clamped', c.maxRpm === 1000);
  check('bad enum falls back', c.tireInputMode === D.tireInputMode);
  check('bad bool falls back', c.autoHp === D.autoHp);
  check('null on non-nullable ignored', G.decodeInputs(raw('1|1:n')).maxRpm === D.maxRpm);

  // Every decoded code must reach the solver without throwing.
  for (const s of [code, raw('1|6:40|13:250|1:-5'), raw('1|3:1|5:99999')]) {
    const v = G.decodeInputs(s);
    const out = G.computeGearing({ maxRpm: v.maxRpm, peakHpRpm: v.hpRpm, peakTorqueRpm: v.torqueRpm,
      gearCount: v.gearCount, topSpeedMph: v.topSpeed, tireRadius: v.tireRadius, target1stMph: null,
      target1stPct: v.target1stPct, tightnessBias: v.tightnessBias, topGearRatioOverride: v.topGearOverride });
    check('decoded code solves or errors cleanly', !!out.gears || typeof out.error === 'string');
  }
}

// ── garage ──
{
  const names = l => l.map(e => e.name).join(',');
  let g = [];
  g = G.garageUpsert(g, '  Supra ', 'AAA', 1);
  check('upsert trims name', g[0].name === 'Supra');
  g = G.garageUpsert(g, 'GTR', 'BBB', 2);
  check('newest first', names(g) === 'GTR,Supra');
  g = G.garageUpsert(g, 'supra', 'CCC', 3);
  check('same name (any case) replaces', g.length === 2 && g[0].code === 'CCC' && g[0].name === 'supra');
  check('blank name ignored', G.garageUpsert(g, '   ', 'X', 4) === g);
  check('long name truncated', G.garageUpsert([], 'x'.repeat(99), 'A', 1)[0].name.length === 40);
  check('remove is case-insensitive', names(G.garageRemove(g, 'SUPRA')) === 'GTR');

  const messy = [
    { name: 'ok', code: 'MQ', savedAt: 5 }, null, 42, { name: 'bad code', code: 'has space', savedAt: 1 },
    { name: '', code: 'MQ' }, { name: 'nocode' }, { name: 'OK', code: 'Mg', savedAt: 9 }, { name: 'old', code: 'MQ' },
  ];
  const clean = G.sanitizeGarage(messy);
  check('sanitize drops junk, dedupes keeping newest', names(clean) === 'OK,old', names(clean));
  check('sanitize missing savedAt → 0', clean[1].savedAt === 0);
  check('sanitize accepts backup object', G.sanitizeGarage({ app: 'gear-os', garage: messy }).length === 2);
  check('sanitize non-array → empty', G.sanitizeGarage('nope').length === 0 && G.sanitizeGarage(null).length === 0);

  const merged = G.garageMerge(
    [{ name: 'A', code: 'MQ', savedAt: 10 }, { name: 'B', code: 'MQ', savedAt: 1 }],
    { garage: [{ name: 'a', code: 'Mg', savedAt: 5 }, { name: 'b', code: 'Mg', savedAt: 7 }, { name: 'C', code: 'MQ', savedAt: 3 }] });
  check('merge: newer save wins clash', merged.find(e => e.name.toLowerCase() === 'a').code === 'MQ'
    && merged.find(e => e.name.toLowerCase() === 'b').code === 'Mg');
  check('merge: adds new names', merged.length === 3);
  // Garage codes come from encodeInputs, so every one must pass CODE_RE.
  check('real codes accepted', G.sanitizeGarage([{ name: 'x', code: G.encodeInputs({ ...G.DEFAULT_INPUTS, gearCount: 9 }), savedAt: 1 }]).length === 1);
}

// ── too many gears: top gear misses, warning suggests a count that fits ──
{
  const r10 = run({ gearCount: 10 });
  check('10 gears: top gear misses (too tall)', r10.topSpeedMissed && r10.actualTopSpeed > 180);
  check('10 gears: 1st gear kept at max ratio', r10.gears[0].ratio === G.GEAR_RATIO_MAX);
  check('10 gears: suggests 9', G.maxFittingGears({ ...BASE, gearCount: 10 }) === 9);
  check('suggested count really fits', run({ gearCount: 9 }).feasible);
  check('ignores top gear override', G.maxFittingGears({ ...BASE, gearCount: 10, topGearRatioOverride: 0.9 }) === 9);
  // Miss caused by the target itself (no gear count fixes it) → null
  check('unfixable miss → null', G.maxFittingGears({ ...BASE, gearCount: 6, topSpeedMph: 20 }) === null);
  check('2 gears → null (nothing lower)', G.maxFittingGears({ ...BASE, gearCount: 2 }) === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
