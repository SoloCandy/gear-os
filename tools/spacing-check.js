// Spacing check: compares GEAR.OS's shift spacing with the fastest possible spacing
// under a simple power/drag model. Run: node tools/spacing-check.js
// See KNOWN_ISSUES.md ("Equal time per gear" / "Minimum-time spacing") for the result.
// Prototype: choose middle gears to minimise time from 1st gear at peak-torque RPM
// to 95% of top speed. 1st gear (from the current solver) and top gear stay fixed.
// Shifts happen at max RPM (the app's premise). v[g] = speed at max RPM in gear g.
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const a=html.indexOf('// ---- Forza ratio limits ----'),b=html.indexOf('// Hover (mouse) or tap (touch) info icon');
const ctx={localStorage:{getItem:()=>null},Math,JSON,Number,Array,String,btoa,atob,encodeURIComponent,decodeURIComponent};
vm.createContext(ctx);vm.runInContext(html.slice(a,b)+';this.cg=computeGearing;',ctx);
const powerFn=(rt,rh)=>{const d=rh-rt,k=1/(d*d+2*rh*d);return r=>r*Math.max(0,1-k*(r-rt)**2);};

function mk(cfg){
  const P=powerFn(cfg.peakTorqueRpm,cfg.peakHpRpm),M=cfg.maxRpm,c=P(M)/cfg.topSpeedMph**3;
  const seg=(lo,hi,vg)=>{let s=0,n=300;for(let i=0;i<n;i++){const v=lo+(hi-lo)*(i+.5)/n,acc=P(M*v/vg)/v-c*v*v;
    if(acc<=0)return Infinity;s+=(hi-lo)/n/acc;}return s;};
  const total=v=>{const N=v.length-1,end=.95*cfg.topSpeedMph;let t=0,from=v[1]*cfg.peakTorqueRpm/M;
    for(let g=1;g<=N;g++){const to=Math.min(v[g],end);if(to>from){t+=seg(from,to,v[g]);from=to;}if(from>=end)break;}
    return t;};
  const times=v=>{const N=v.length-1,end=.95*cfg.topSpeedMph,out=[];let from=v[1]*cfg.peakTorqueRpm/M;
    for(let g=1;g<=N;g++){const to=Math.min(v[g],end);out.push(to>from?seg(from,to,v[g]):0);from=Math.max(from,to);}return out;};
  return {total,times,M};
}
function optimise(v,m){ // coordinate descent on log v[2..N-1], keeping order
  v=v.slice();const N=v.length-1;let best=m.total(v);
  for(let step=0.2;step>1e-4;step/=2){let improved=true;
    while(improved){improved=false;
      for(let g=2;g<N;g++)for(const d of[step,-step]){const w=v.slice();w[g]=v[g]*Math.exp(d);
        if(!(w[g]>w[g-1]&&w[g]<w[g+1]))continue;const t=m.total(w);if(t<best-1e-12){best=t;v=w;improved=true;}}}}
  return {v,best};
}
function report(name,cfg){
  const N=cfg.gearCount,m=mk(cfg),M=m.M;
  const r=ctx.cg({...cfg,tireRadius:330,target1stMph:null,target1stPct:null,tightnessBias:0,topGearRatioOverride:null});
  const p=r.gears.map(g=>g.ratio),v0=[0,...p.map(x=>cfg.topSpeedMph*p[N-1]/x)];
  const tCur=m.total(v0),{v,best}=optimise(v0,m);
  const land=v=>{const o=[];for(let g=1;g<N;g++)o.push(Math.round(M*v[g]/v[g+1]));return o.join(', ');};
  const tt=v=>m.times(v).map(x=>x.toFixed(2)).join(' ');
  console.log(`\n${name}  (peaks: torque ${cfg.peakTorqueRpm}, HP ${cfg.peakHpRpm})`);
  console.log(`  current  landings ${land(v0)}   gear times ${tt(v0)}   total ${tCur.toFixed(3)}`);
  console.log(`  min-time landings ${land(v)}   gear times ${tt(v)}   total ${best.toFixed(3)}  (${((1-best/tCur)*100).toFixed(1)}% faster)`);
  console.log(`  gear top speeds  current ${v0.slice(1).map(x=>x.toFixed(0))}  min-time ${v.slice(1).map(x=>x.toFixed(0))}`);
}
report('6sp default 8000 180mph',{maxRpm:8000,peakHpRpm:7000,peakTorqueRpm:5000,gearCount:6,topSpeedMph:180});
report('8sp same engine',{maxRpm:8000,peakHpRpm:7000,peakTorqueRpm:5000,gearCount:8,topSpeedMph:180});
report('6sp revvy 9000 200mph',{maxRpm:9000,peakHpRpm:8100,peakTorqueRpm:5850,gearCount:6,topSpeedMph:200});
report('5sp torquey 6500 160mph',{maxRpm:6500,peakHpRpm:5500,peakTorqueRpm:3500,gearCount:5,topSpeedMph:160});
