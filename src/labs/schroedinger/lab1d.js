// @ts-nocheck
/*
 * Schrödinger-Labor, übernommen aus Sepps Claude-Artefakt und an den
 * Physik-Workspace angepasst: läuft in einem Shadow-DOM, Formeln mit KaTeX,
 * Farben und Schriften aus der Gestaltung des Workspace. Die Physik (Numerov
 * bzw. Runge-Kutta, Termschema, Orbitale) ist unverändert.
 */
import katex from 'katex';
export function init1D(root,host,OPTS,life){'use strict';
/*CORE-START*/
const C=0.0380998212, KC=1.439964548, HC=1239.841984, HPL=4.135667696e-15;
const NG=2400;

function buildGrid(pot,p){
  const [a,b]=pot.domain(p), h=(b-a)/NG, x=new Float64Array(NG+1), V=new Float64Array(NG+1);
  for(let i=0;i<=NG;i++){
    x[i]=a+i*h;
    if(pot.smooth) V[i]=pot.V(x[i],p);
    else{ let s=0; for(let j=0;j<16;j++) s+=pot.V(x[i]+((j+.5)/16-.5)*h,p); V[i]=s/16; }
  }
  const series=pot.id==='coul'; if(series) V[0]=-1e9;
  return {a,b,h,x,V,series};
}
// Numerov von links nach rechts. Zählt Vorzeichenwechsel (= Anzahl der Eigenwerte unterhalb E).
function shoot(g,E,out){
  const V=g.V,h=g.h,q=h*h/12; let ym,y,i0,nodes=0;
  if(g.series){ const a0=2*C/KC, d=(2/(a0*a0)-E/C)/6, u=r=>r*(1+r*(-1/a0+r*d));
    ym=u(h); y=u(2*h); i0=2; if(out){out[0]=0;out[1]=ym;out[2]=y;} }
  else{ ym=0; y=1e-8; i0=1; if(out){out[0]=0;out[1]=y;} }
  let fm=(V[i0-1]-E)/C, f=(V[i0]-E)/C;
  for(let i=i0;i<NG;i++){
    const fp=(V[i+1]-E)/C;
    let yp=(2*(1+5*q*f)*y-(1-q*fm)*ym)/(1-q*fp);
    if(y!==0 && (yp>0)!==(y>0)) nodes++;
    if(Math.abs(yp)>1e120){ const s=1e-120; yp*=s; y*=s; if(out) for(let j=0;j<=i;j++) out[j]*=s; }
    if(out) out[i+1]=yp;
    ym=y; y=yp; fm=f; f=fp;
  }
  return {nodes,end:y};
}
function findLevels(g,lo,hi,maxK){
  const K=Math.min(maxK||60,shoot(g,hi).nodes), K0=shoot(g,lo).nodes, out=[]; let prev=lo;
  for(let k=K0;k<K;k++){ let a=prev,b=hi;
    for(let it=0;it<56;it++){ const m=0.5*(a+b); if(shoot(g,m).nodes>k) b=m; else a=m; }
    const E=0.5*(a+b); out.push({k,E,psi:null}); prev=E; }
  return out;
}
function lastAllowed(g,E){ let it=NG; while(it>=0 && !(g.V[it]<E)) it--; return it; }
function eigenfunction(g,E){
  const V=g.V,h=g.h,q=h*h/12,psi=new Float64Array(NG+1); shoot(g,E,psi);
  const it=lastAllowed(g,E);
  if(it>2 && it<NG-6){
    const R=new Float64Array(NG+1); R[NG]=0; R[NG-1]=1e-80;
    for(let i=NG-1;i>=it;i--){ const f=(V[i]-E)/C,fp=(V[i+1]-E)/C,fm=(V[i-1]-E)/C;
      R[i-1]=(2*(1+5*q*f)*R[i]-(1-q*fp)*R[i+1])/(1-q*fm); }
    const s=psi[it]/R[it]; for(let i=it+1;i<=NG;i++) psi[i]=R[i]*s;
  } else psi[NG]=0;
  let n=0; for(let i=0;i<=NG;i++) n+=psi[i]*psi[i]; n=Math.sqrt(n*h);
  let mx=0; for(let i=0;i<=NG;i++){ psi[i]/=n; const a=Math.abs(psi[i]); if(a>mx) mx=a; }
  return {psi,max:mx};
}
// Versuchslösung bei beliebiger Energie, skaliert auf den Bereich vor dem Weglaufen.
function trial(g,E){
  const psi=new Float64Array(NG+1), r=shoot(g,E,psi), it=lastAllowed(g,E);
  let is,mx=0;
  if(it<0){ is=Math.round(NG*0.55); mx=Math.abs(psi[is]); }
  else{ is=it; let mn=Math.abs(psi[it]); for(let i=it+1;i<=NG;i++){ const a=Math.abs(psi[i]); if(a<mn){mn=a;is=i;} }
    for(let i=0;i<=is;i++){ const a=Math.abs(psi[i]); if(a>mx) mx=a; } }
  if(!(mx>0)) mx=1;
  return {psi,scale:1/mx,nodes:r.nodes,endSign:psi[NG]>0?1:-1,allowed:it};
}
// Streuzustand an der Barriere: rechts nur auslaufende Welle, einfallende Amplitude 1.
function scatter(g,E){
  const V=g.V,h=g.h,x=g.x,q=h*h/12,k=Math.sqrt(E/C), re=new Float64Array(NG+1), im=new Float64Array(NG+1);
  for(const [arr,fn] of [[re,Math.cos],[im,Math.sin]]){
    arr[NG]=fn(k*x[NG]); arr[NG-1]=fn(k*x[NG-1]);
    for(let i=NG-1;i>0;i--){ const f=(V[i]-E)/C,fp=(V[i+1]-E)/C,fm=(V[i-1]-E)/C;
      arr[i-1]=(2*(1+5*q*f)*arr[i]-(1-q*fp)*arr[i+1])/(1-q*fm); } }
  const c0=Math.cos(k*x[0]),s0=Math.sin(k*x[0]),c1=Math.cos(k*x[1]),s1=Math.sin(k*x[1]);
  const nr=(re[0]*c1+im[0]*s1)-(re[1]*c0+im[1]*s0), ni=(im[0]*c1-re[0]*s1)-(im[1]*c0-re[1]*s0);
  const sn=2*Math.sin(k*h), Ar=-ni/sn, Ai=nr/sn;
  const A2=Ar*Ar+Ai*Ai;
  for(let i=0;i<=NG;i++){ const r=re[i],m=im[i]; re[i]=(r*Ar+m*Ai)/A2; im[i]=(m*Ar-r*Ai)/A2; }
  return {re,im,T:1/A2};
}
function bis(F,a,b){ for(let i=0;i<90;i++){ const m=0.5*(a+b); if(F(m)>0) b=m; else a=m; } return 0.5*(a+b); }
function finiteLevels(L,V0){ const k0=Math.sqrt(V0/C), out=[];
  for(let n=1;(n-1)*Math.PI<k0*L;n++){ const k=bis(k=>k*L-n*Math.PI+2*Math.asin(k/k0),0,k0); out.push({n,E:C*k*k}); }
  return out; }
function doubleLevels(w,b,V0){ const k0=Math.sqrt(V0/C), out=[], kmax=k0*(1-1e-12);
  for(const par of [1,-1]) for(let j=1;j<40;j++){
    const F=k=>{ const ka=Math.sqrt(Math.max(k0*k0-k*k,0)), th=Math.tanh(ka*b/2), r=ka/k;
      const second=par>0?Math.atan(r*th):(th<1e-9?Math.atan(2/(k*b)):Math.atan(r/th));
      return k*w-(j-1)*Math.PI-Math.atan(r)-second; };
    if(F(kmax)<=0) break; const k=bis(F,1e-9,kmax); out.push({E:C*k*k,par}); }
  out.sort((a,b)=>a.E-b.E); out.forEach((o,i)=>o.n=i+1); return out; }
function Tbar(E,V0,d){
  if(Math.abs(E-V0)<1e-9){ const k=Math.sqrt(E/C); return 1/(1+(k*d/2)**2); }
  if(E<V0){ const s=Math.sinh(Math.sqrt((V0-E)/C)*d); return 1/(1+V0*V0*s*s/(4*E*(V0-E))); }
  const s=Math.sin(Math.sqrt((E-V0)/C)*d); return 1/(1+V0*V0*s*s/(4*E*(E-V0))); }

const POTS={
 inf:{id:'inf',name:'Unendlicher Topf',n0:1,kind:'bound',smooth:true,walls:true,xl:'x',
  icon:'M8 1V17H28V1',note:'Ein Elektron zwischen zwei undurchdringlichen Wänden.',
  params:[{id:'L',label:'Breite',tex:'L',fb:'L',unit:'nm',min:0.3,max:2,step:0.05,val:1,d:2}],
  domain:p=>[-p.L/2,p.L/2], view:p=>[-1.3,1.3], V:()=>0,
  range:p=>{const E1=C*Math.PI**2/(p.L*p.L);return{lo:0,hi:+(31*E1).toPrecision(2),bound:Infinity};}},
 fin:{id:'fin',name:'Endlicher Topf',n0:1,kind:'bound',xl:'x',
  icon:'M1 5H9V17H27V5H35',note:'Wände endlicher Höhe: Die Wellenfunktion dringt ein Stück in die Wand ein.',
  params:[{id:'L',label:'Breite',tex:'L',fb:'L',unit:'nm',min:0.3,max:2,step:0.05,val:1,d:2},{id:'V0',label:'Wandhöhe',tex:'V_0',fb:'V₀',unit:'eV',min:2,max:20,step:0.5,val:10,d:1}],
  domain:p=>[-2,2], V:(x,p)=>Math.abs(x)<p.L/2?0:p.V0, range:p=>({lo:0,hi:1.25*p.V0,bound:p.V0})},
 harm:{id:'harm',name:'Harmonischer Oszillator',n0:0,kind:'bound',smooth:true,xl:'x',
  icon:'M3 2Q18 32 33 2',note:'Rücktreibende Kraft wie bei einer Feder, zum Beispiel bei Molekülschwingungen.',
  params:[{id:'hw',label:'Energiequant',tex:'\\hbar\\omega',fb:'ħω',unit:'eV',min:1,max:3,step:0.1,val:1.5,d:1}],
  domain:p=>[-1.5,1.5], V:(x,p)=>p.hw*p.hw/(4*C)*x*x, range:p=>({lo:0,hi:6.6*p.hw,bound:6.6*p.hw})},
 coul:{id:'coul',name:'Coulomb (H-Atom)',n0:1,kind:'bound',smooth:true,xl:'r',
  icon:'M4 19C5 8 10 4 34 3',note:'Elektron im Feld eines Protons. Gezeigt ist die radiale Funktion u(r) = r·ψ(r) für kugelsymmetrische Zustände.',
  params:[{id:'rmax',label:'Bildausschnitt bis',tex:'r',fb:'r',unit:'nm',min:0.4,max:3,step:0.1,val:3,d:1,viewOnly:true}],
  domain:p=>[0,3], view:p=>[0,p.rmax], V:(x)=>-KC/x, range:p=>({lo:-15,hi:0.6,bound:-0.64})},
 dbl:{id:'dbl',name:'Doppeltopf',n0:1,kind:'bound',xl:'x',
  icon:'M1 4H6V17H15V8H21V17H30V4H35',note:'Zwei Töpfe mit einer Trennwand: ein einfaches Modell für die Bindung im Molekül.',
  params:[{id:'w',label:'Topfbreite',tex:'w',fb:'w',unit:'nm',min:0.3,max:0.8,step:0.05,val:0.5,d:2},{id:'b',label:'Trennwand',tex:'b',fb:'b',unit:'nm',min:0.05,max:0.8,step:0.05,val:0.2,d:2},{id:'V0',label:'Wandhöhe',tex:'V_0',fb:'V₀',unit:'eV',min:2,max:20,step:0.5,val:10,d:1}],
  domain:p=>[-2,2], V:(x,p)=>{const a=Math.abs(x);return a<p.b/2?p.V0:a<p.b/2+p.w?0:p.V0;}, range:p=>({lo:0,hi:1.2*p.V0,bound:p.V0})},
 multi:{id:'multi',name:'Mehrfachtopf (Kristall)',n0:1,kind:'bound',xl:'x',
  icon:'M1 4H4V17H9V7H12V17H17V7H20V17H25V7H28V17H33V4H35',note:'Eine Kette gleicher Töpfe wie die Atome im Kristall: Aus einzelnen Niveaus werden Bänder.',
  params:[{id:'N',label:'Anzahl Töpfe',tex:'N',fb:'N',unit:'',min:2,max:8,step:1,val:5,d:0},{id:'w',label:'Topfbreite',tex:'w',fb:'w',unit:'nm',min:0.2,max:0.5,step:0.05,val:0.3,d:2},{id:'b',label:'Trennwand',tex:'b',fb:'b',unit:'nm',min:0.05,max:0.3,step:0.05,val:0.1,d:2},{id:'V0',label:'Wandhöhe',tex:'V_0',fb:'V₀',unit:'eV',min:5,max:20,step:0.5,val:10,d:1}],
  domain:p=>{const W=p.N*p.w+(p.N-1)*p.b;return[-W/2-0.8,W/2+0.8];},
  V:(x,p)=>{const W=p.N*p.w+(p.N-1)*p.b,u=x+W/2; if(u<0||u>W) return p.V0; const t=u%(p.w+p.b); return t<p.w?0:p.V0;},
  range:p=>({lo:0,hi:1.2*p.V0,bound:p.V0})},
 bar:{id:'bar',name:'Barriere (Tunneleffekt)',n0:1,kind:'scatter',xl:'x',
  icon:'M1 17H14V5H22V17H35',note:'Kein Topf, sondern ein Hindernis: Die Welle läuft von links ein, ein Teil kommt durch.',
  params:[{id:'d',label:'Dicke',tex:'d',fb:'d',unit:'nm',min:0.05,max:1,step:0.05,val:0.3,d:2},{id:'V0',label:'Höhe',tex:'V_0',fb:'V₀',unit:'eV',min:1,max:15,step:0.5,val:5,d:1}],
  domain:p=>[-1.5,1.5], V:(x,p)=>Math.abs(x)<p.d/2?p.V0:0, range:p=>({lo:0.02,hi:2.2*p.V0,bound:0})}
};
/*CORE-END*/
if(typeof document==='undefined') return;

// ---------- Hilfen
const $=id=>root.getElementById(id), R=String.raw;
const de=(x,d=3)=>x.toFixed(d).replace('.',',').replace('-','−');
const tn=(x,d=3)=>x.toFixed(d).replace('.','{,}');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=m=>m*m*(3-2*m);
const sci=(x,u)=>{const e=Math.floor(Math.log10(x)),m=x/10**e;return `${de(m,2)}·10<sup>${String(e).replace('-','−')}</sup> ${u}`;};
const reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

let MJ=true; const texCache=new Map();
function mj(tex,display){ const key=(display?'D':'I')+tex; let h=texCache.get(key);
  if(h===undefined){ try{ h=katex.renderToString(tex,{displayMode:!!display,throwOnError:false,output:'html',strict:'ignore'}); }catch(e){ h=null; } texCache.set(key,h); } return h; }
function I(tex,fb){ const h=MJ&&mj(tex,false); return h||(fb!==undefined?`<var>${fb}</var>`:`<code class="mfb">${esc(tex)}</code>`); }
function D(tex){ const h=MJ&&mj(tex,true); return `<div class="txd">${h||`<code>${esc(tex)}</code>`}</div>`; }

// ---------- Zustand
const ORDER=OPTS.order;
const S={pot:ORDER[0],P:{},Eby:{inf:1.2,fin:1,harm:1,coul:-10,dbl:1,multi:1,bar:3},E:1.2,view3d:false,m:0,alpha:-0.5,beta:0.22,
  playing:false,t:0,speed:1,show:{psi:true,prob:true,stored:true,proj:true},snap:true,saved:{},sel:[],sup:false,math:false};
for(const id of ORDER){ S.P[id]={}; POTS[id].params.forEach(q=>S.P[id][q.id]=q.val); S.saved[id]=[]; }
let pot,P,g,RG,LV=[],cur=null,fsPerSec=1, vx0,vx1,ve0,ve1;

function levelPsi(k){ const l=LV.find(l=>l.k===k); if(!l) return null; if(!l.psi){ const e=eigenfunction(g,l.E); l.psi=e.psi; l.max=e.max; } return l; }
function qn(k){ return k+pot.n0; }
function matchLevel(E){ const r=Math.round(E*1000); for(const l of LV) if(Math.round(l.E*1000)===r) return l; return null; }

function rebuild(){
  pot=POTS[S.pot]; P=S.P[S.pot]; g=buildGrid(pot,P); RG=pot.range(P);
  LV=pot.kind==='bound'?findLevels(g,RG.lo-(pot.id==='coul'?5:0),Math.min(RG.bound,RG.hi)-1e-6,60):[];
  [vx0,vx1]=(pot.view||pot.domain)(P);
  const sp=RG.hi-RG.lo; ve0=RG.lo-0.17*sp; ve1=RG.hi+0.13*sp;
  fsPerSec=2.5*4.1357/Math.max(Math.abs(RG.lo),Math.abs(RG.hi));
  const sl=$('eslider'); sl.min=RG.lo; sl.max=RG.hi;
  S.E=clamp(S.E,RG.lo,RG.hi); sl.value=S.E;
  compute(); renderSaved(); if(S.math) renderMath();
}
function compute(){
  S.Eby[S.pot]=S.E;
  if(pot.kind==='scatter') cur={type:'scatter',E:S.E,...scatter(g,S.E)};
  else if(S.sup&&S.sel.length===2){ const a=levelPsi(S.sel[0]),b=levelPsi(S.sel[1]); let mx=0;
    for(let i=0;i<=NG;i++){ const v=(Math.abs(a.psi[i])+Math.abs(b.psi[i]))*Math.SQRT1_2; if(v>mx) mx=v; }
    cur={type:'sup',a,b,scale:Math.SQRT1_2/mx,E:0.5*(a.E+b.E)}; }
  else{ const l=S.E<=RG.bound?matchLevel(S.E):null;
    if(l){ levelPsi(l.k); cur={type:'eig',lv:l,E:l.E,psi:l.psi,scale:1/l.max}; }
    else cur={type:'trial',E:S.E,...trial(g,S.E)}; }
  $('eout').innerHTML=`<var>E</var> = ${de(S.E,3)} eV`;
  renderStatus(); req();
  if(S.math&&pot.kind==='scatter'){ clearTimeout(mathTimer); mathTimer=setTimeout(renderMath,150); }
}
let mathTimer=0;
function setE(E,snap){
  E=clamp(E,RG.lo,RG.hi);
  if(snap&&S.snap&&LV.length){ const tol=(RG.hi-RG.lo)/300; let best=null,bd=tol;
    for(const l of LV){ const d=Math.abs(l.E-E); if(d<bd){bd=d;best=l;} } if(best) E=best.E; }
  E=Math.round(E*1000)/1000; if(S.sup){ S.sup=false; renderSaved(); }
  S.E=E; $('eslider').value=E; compute();
  // erreichte Niveaus von selbst eintragen, wie in den anderen Reitern
  if(OPTS.autoSave&&cur.type==='eig'){ const sv=S.saved[S.pot], k=cur.lv.k; if(!sv.some(q=>q.k===k)){ sv.push({k,E:cur.lv.E}); sv.sort((a,b)=>a.E-b.E); renderStatus(); renderSaved(); if(S.math) renderMath(); req(); } }
}

// ---------- Statuszeile
function renderStatus(){
  const st=$('status'), sv=$('save'); let cls='bad',html='',can=false;
  if(cur.type==='scatter'){ cls='info'; const T=cur.T;
    html=`<b>Kontinuum.</b> Ohne Topf ist jede Energie ${I('E>0','E > 0')} erlaubt. Durchgelassen: ${I('T','T')} = ${de(T*100,T<0.001?4:1)} %, reflektiert: ${de((1-T)*100,1)} %.`+(S.E<P.V0?` Klassisch käme bei ${I('E<V_0','E < V₀')} nichts durch.`:''); }
  else if(cur.type==='sup'){ cls='info'; const dE=Math.abs(cur.a.E-cur.b.E);
    html=`<b>Überlagerung</b> von ${I('n='+qn(cur.a.k),'n = '+qn(cur.a.k))} und ${I('n='+qn(cur.b.k),'n = '+qn(cur.b.k))}: Jetzt schwingt ${I(R`|\Psi|^2`,'|Ψ|²')} hin und her, mit ${I(R`f=\Delta E/h`,'f = ΔE/h')} = ${sci(dE/HPL,'Hz')}.`; }
  else if(cur.type==='eig'){ cls='ok'; const k=cur.lv.k; can=!S.saved[S.pot].some(s=>s.k===k);
    const twin=LV.find(l=>l!==cur.lv&&Math.round(l.E*1000)===Math.round(cur.lv.E*1000));
    html=`<b>Normierbar.</b> Gebundener Zustand ${I('n='+qn(k),'n = '+qn(k))} mit ${k} Knoten im Inneren, ${I(R`\int|\psi|^2\,\mathrm{d}x=1`,'∫|ψ|² dx = 1')}.`+(twin?` Der Nachbar ${I('n='+qn(twin.k),'n = '+qn(twin.k))} liegt weniger als 0,001 eV daneben.`:''); }
  else if(pot.id==='coul'&&S.E>RG.bound){ cls='warn';
    html=S.E<0?`<b>Zu dicht.</b> Hier drängen sich die Niveaus ab ${I('n=5','n = 5')}; dafür ist der gerechnete Bereich bis 3 nm zu klein.`
      :`<b>Ungebunden.</b> Bei ${I('E>0','E > 0')} ist das Atom ionisiert, jede Energie ist möglich.`; }
  else if(S.E>RG.bound){ cls='warn'; html=`<b>Ungebunden.</b> Bei ${I('E>V_0','E > V₀')} hält der Topf das Elektron nicht mehr, jede Energie ist möglich.`; }
  else if(pot.walls){ html=`<b>Nicht erlaubt.</b> ${I(R`\psi`,'ψ')} ist an der rechten Wand nicht null, die Randbedingung ist verletzt. Die Kurve hat ${cur.nodes} Nullstelle${cur.nodes===1?'':'n'}.`; }
  else{ html=`<b>Nicht normierbar.</b> ${I(R`\psi`,'ψ')} läuft rechts gegen ${cur.endSign>0?I(R`+\infty`,'+∞'):I(R`-\infty`,'−∞')}. Die Kurve hat ${cur.nodes} Nullstelle${cur.nodes===1?'':'n'}.`; }
  st.className='status '+cls; st.innerHTML=html;
  sv.disabled=!can; sv.textContent=cur.type==='eig'&&!can?'Gespeichert':'Niveau speichern';
  sv.hidden=pot.kind==='scatter';
}

// ---------- Farben
function wl2rgb(w){ let r=0,gr=0,b=0;
  if(w<380||w>750) return null;
  if(w<440){r=(440-w)/60;b=1}else if(w<490){gr=(w-440)/50;b=1}else if(w<510){gr=1;b=(510-w)/20}
  else if(w<580){r=(w-510)/70;gr=1}else if(w<645){r=1;gr=(645-w)/65}else r=1;
  const f=w<420?0.35+0.65*(w-380)/40:w>700?0.35+0.65*(750-w)/50:1, c=v=>Math.round(255*Math.pow(v*f,0.8));
  return `rgb(${c(r)},${c(gr)},${c(b)})`; }
function band(w){ if(w<10) return 'Röntgenstrahlung'; if(w<380) return 'Ultraviolett'; if(w>1e6) return 'Mikrowellen'; if(w>750) return 'Infrarot';
  return 'sichtbar, '+(w<430?'violett':w<490?'blau':w<570?'grün':w<600?'gelb':w<640?'orange':'rot'); }
const fmtWl=w=>w<1000?de(w,w<100?1:0)+' nm':w<1e6?de(w/1000,2)+' µm':de(w/1e6,2)+' mm';

// ---------- Termschema, Niveauliste, Übergang
function spread(ys,gap,hi){ const n=ys.length, idx=ys.map((_,i)=>i).sort((a,b)=>ys[a]-ys[b]), o=ys.slice();
  for(let j=1;j<n;j++) if(o[idx[j]]<o[idx[j-1]]+gap) o[idx[j]]=o[idx[j-1]]+gap;
  if(n&&o[idx[n-1]]>hi){ o[idx[n-1]]=hi; for(let j=n-2;j>=0;j--) if(o[idx[j]]>o[idx[j+1]]-gap) o[idx[j]]=o[idx[j+1]]-gap; }
  return o; }
function renderSaved(){
  const sv=S.saved[S.pot], term=$('term'), list=$('levels'), tr=$('trans');
  if(pot.kind==='scatter'){ term.innerHTML=`<p class="note">An der Barriere gibt es keine diskreten Niveaus: Das Elektron ist nicht eingesperrt, seine Energie kann jeden Wert annehmen. Beobachte stattdessen, wie viel von der Welle durchkommt.</p>`; list.innerHTML=''; tr.innerHTML=''; return; }
  if(!sv.length){ term.innerHTML=`<p class="note">Noch kein Niveau gespeichert. Suche eine Energie, bei der ${I(R`\psi`,'ψ')} normierbar ist, und speichere sie. Ab zwei Niveaus lassen sich Übergänge berechnen.</p>`; list.innerHTML=''; tr.innerHTML=''; return; }
  const H=230, y=E=>12+(RG.hi-E)/(RG.hi-RG.lo)*(H-24), ys=sv.map(s=>y(s.E)), ly=spread(ys,13,H-8);
  let s=`<svg viewBox="0 0 320 ${H}" role="img" aria-label="Termschema der gespeicherten Niveaus"><line x1="50" y1="8" x2="50" y2="${H-8}" stroke="var(--rule)"/>`;
  niceTicks(RG.lo,RG.hi,5).forEach(t=>{ s+=`<line x1="46" y1="${y(t)}" x2="50" y2="${y(t)}" stroke="var(--muted)"/><text class="ax" x="42" y="${y(t)+3.5}" text-anchor="end">${de(t,niceDec(RG.lo,RG.hi,5))}</text>`; });
  s+=`<text class="ax" x="6" y="10">eV</text>`;
  if(isFinite(RG.bound)&&RG.bound<RG.hi&&pot.id!=='harm'){ const yb=y(pot.id==='coul'?0:RG.bound); s+=`<line x1="50" y1="${yb}" x2="312" y2="${yb}" stroke="var(--muted)" stroke-dasharray="3 4"/>`; }
  if(S.sel.length===2){ const a=sv.find(q=>q.k===S.sel[0]),b=sv.find(q=>q.k===S.sel[1]);
    if(a&&b){ const yu=Math.min(y(a.E),y(b.E)), yl=Math.max(y(a.E),y(b.E)), col=wl2rgb(HC/Math.abs(a.E-b.E))||'var(--ink)';
      s+=`<line x1="150" y1="${yu}" x2="150" y2="${Math.max(yu,yl-7)}" stroke="${col}" stroke-width="2.5"/><path d="M150 ${yl}l-5 -8h10z" fill="${col}"/>`; } }
  sv.forEach((q,i)=>{ const yy=ys[i], on=S.sel.includes(q.k);
    s+=`<g data-k="${q.k}" style="cursor:pointer"><rect x="88" y="${yy-6}" width="130" height="12" fill="transparent"/>`+
       `<line x1="96" y1="${yy}" x2="208" y2="${yy}" stroke="var(--level)" stroke-width="${on?3.5:2}"/>`+
       `<path d="M208 ${yy}L216 ${ly[i]}M96 ${yy}L88 ${ly[i]}" stroke="var(--level)" stroke-width="1" fill="none" opacity=".6"/>`+
       `<text x="84" y="${ly[i]+4}" text-anchor="end" font-style="italic">n = ${qn(q.k)}</text>`+
       `<text x="220" y="${ly[i]+4}" style="font-family:var(--mono)">${de(q.E,3)} eV</text></g>`; });
  term.innerHTML=s+'</svg>';
  list.innerHTML=sv.slice().reverse().map(q=>`<div class="lvrow"><button type="button" class="lv" data-k="${q.k}" aria-pressed="${S.sel.includes(q.k)}"><span>n = ${qn(q.k)}</span><span>${de(q.E,3)} eV</span></button><button type="button" class="del" data-k="${q.k}" aria-label="Niveau n = ${qn(q.k)} löschen">×</button></div>`).join('');
  // Übergang
  let h='';
  if(S.sel.length===2){ const a=sv.find(q=>q.k===S.sel[0]),b=sv.find(q=>q.k===S.sel[1]); if(a&&b){ const up=a.E>b.E?a:b, dn=a.E>b.E?b:a, dE=up.E-dn.E, wl=HC/dE, col=wl2rgb(wl);
    h=`<div class="tr"><div class="trhead"><span class="sw" style="background:${col||'var(--surface-2)'}"></span>Übergang ${I(`n=${qn(up.k)}\\;\\rightarrow\\;n=${qn(dn.k)}`,`n = ${qn(up.k)} → n = ${qn(dn.k)}`)}</div>`+
      `<dl><dt>${I(R`\Delta E=E_{${qn(up.k)}}-E_{${qn(dn.k)}}`,'ΔE')}</dt><dd>${de(dE,3)} eV</dd>`+
      `<dt>${I(R`f=\dfrac{\Delta E}{h}`,'f = ΔE/h')}</dt><dd>${sci(dE/HPL,'Hz')}</dd>`+
      `<dt>${I(R`\lambda=\dfrac{h\,c}{\Delta E}`,'λ = hc/ΔE')}</dt><dd>${fmtWl(wl)}</dd>`+
      `<dt>Bereich</dt><dd style="font-family:var(--sans)">${band(wl)}</dd></dl>`+
      `<label><input type="checkbox" id="sup" ${S.sup?'checked':''}> <span>Überlagerung beider Zustände zeigen: So sieht das Elektron während des Übergangs aus.</span></label>`; } }
  else h=`<div class="tr"><p class="note">Zwei Niveaus anklicken, um das Photon des Übergangs zu berechnen.</p>`;
  if(sv.length>=2){ // Spektrum aller möglichen Übergänge
    const xw=w=>10+Math.log(clamp(w,80,3000)/80)/Math.log(3000/80)*300; let sp=`<svg id="spec" viewBox="0 0 320 44" role="img" aria-label="Spektrum der möglichen Übergänge"><rect x="10" y="6" width="300" height="20" fill="var(--surface-2)" stroke="var(--rule)"/>`;
    for(let i=0;i<48;i++){ const w0=380+i*370/48; sp+=`<rect x="${xw(w0)}" y="6.5" width="${xw(w0+370/48)-xw(w0)+0.3}" height="19" fill="${wl2rgb(w0+3.8)}"/>`; }
    [100,380,750,2000].forEach(w=>sp+=`<text x="${xw(w)}" y="40" text-anchor="middle">${w}</text>`); sp+=`<text x="310" y="40" text-anchor="end">nm</text>`;
    for(let i=0;i<sv.length;i++) for(let j=0;j<i;j++){ const w=HC/Math.abs(sv[i].E-sv[j].E), on=S.sel.length===2&&S.sel.includes(sv[i].k)&&S.sel.includes(sv[j].k), off=w<80||w>3000;
      sp+=off?`<path d="M${w<80?10:310} ${on?2:9}l${w<80?-6:6} 7l${w<80?6:-6} 7z" fill="var(--ink)" opacity="${on?1:.45}"/>`
        :`<line x1="${xw(w)}" y1="${on?1:6}" x2="${xw(w)}" y2="${on?31:26}" stroke="var(--ink)" stroke-width="${on?2.5:1.25}"/>`; }
    h+=sp+`</svg><p class="note">Alle Linien, die zwischen den gespeicherten Niveaus möglich sind.</p>`; }
  tr.innerHTML=h+(h?'</div>':'');
}
function toggleSel(k){ const i=S.sel.indexOf(k); if(i>=0) S.sel.splice(i,1); else{ S.sel.push(k); if(S.sel.length>2) S.sel.shift(); }
  if(S.sel.length<2&&S.sup) S.sup=false; compute(); renderSaved(); }

// ---------- Mathematik
const steps=a=>'<ol>'+a.map(s=>`<li>${s}</li>`).join('')+'</ol>';
const merke=s=>`<div class="merke"><b>Merke.</b> ${s}</div>`;
function tbl(cap,head,rows,note){ const sv=S.saved[S.pot];
  return `<div><h4>${cap}</h4><div class="tblwrap"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}<th>gefunden</th></tr></thead><tbody>`+
    rows.map(r=>{ const f=sv.some(s=>Math.abs(s.E-r.E)<0.003); return `<tr>${r.c.map(c=>`<td>${c}</td>`).join('')}<td class="found">${f?'✓':''}</td></tr>`; }).join('')+
    `</tbody></table></div>${note?`<p class="note" style="margin-top:8px">${note}</p>`:''}</div>`; }
const MATH={
 inf(p){ const E1=C*Math.PI**2/(p.L*p.L), rows=[]; for(let n=1;n<=6;n++) rows.push({E:E1*n*n,c:[n,de(E1*n*n,3)]});
  return [`<h3>Unendlich hoher Potenzialtopf</h3><p>Das Elektron ist zwischen zwei undurchdringlichen Wänden eingesperrt:</p>`+
   D(R`V(x)=\begin{cases}0 & \text{für } |x|<\tfrac{L}{2}\\[3pt] \infty & \text{sonst}\end{cases}`)+steps([
   `Im Topf ist ${I('V=0')}. Die Schrödingergleichung wird zu ${I(R`\psi''(x)=-k^2\,\psi(x)`)} mit ${I(R`k=\dfrac{\sqrt{2mE}}{\hbar}`)}. Ihre Lösungen sind Sinus- und Kosinusfunktionen:`+D(R`\psi(x)=A\,\sin(kx)+B\,\cos(kx)`),
   `In der Wand ist ${I(R`\psi=0`)}. Weil ${I(R`\psi`)} stetig sein muss, gilt ${I(R`\psi\!\left(\pm\tfrac{L}{2}\right)=0`)}. Das gelingt nur, wenn ganze Halbwellen in den Topf passen:`+D(R`k_n\,L=n\,\pi\quad\Longleftrightarrow\quad\lambda_n=\frac{2L}{n},\qquad n=1,2,3,\dots`),
   `Daraus folgen die erlaubten Energien:`+D(R`E_n=\frac{\hbar^2k_n^2}{2m}=\frac{h^2}{8\,m\,L^2}\cdot n^2`),
   `Die Normierung ${I(R`\int|\psi|^2\,\mathrm{d}x=1`)} legt die Amplitude fest:`+D(R`\psi_n(x)=\sqrt{\frac{2}{L}}\;\sin\!\left(\frac{n\pi}{L}\Big(x+\frac{L}{2}\Big)\right)`)])+
   merke(`Die Energien wachsen mit ${I('n^2')}, die Abstände werden nach oben größer. Schon der Grundzustand hat ${I('E_1>0')}: Ein eingesperrtes Teilchen kann nicht ruhen. Ein schmalerer Topf hebt alle Niveaus an, denn ${I(R`E_n\propto 1/L^2`)}.`),
   tbl(`Energieniveaus für ${I('L')} = ${de(p.L,2)} nm`,[I('n'),I(R`E_n\ \text{in eV}`)],rows,`${I(R`E_1=\dfrac{h^2}{8mL^2}`)} = ${de(E1,3)} eV`)]; },
 fin(p){ const lv=finiteLevels(p.L,p.V0), k0=Math.sqrt(p.V0/C), E1=C*Math.PI**2/(p.L*p.L);
  return [`<h3>Endlich hoher Potenzialtopf</h3>`+D(R`V(x)=\begin{cases}0 & \text{für } |x|<\tfrac{L}{2}\\[3pt] V_0 & \text{sonst}\end{cases}\qquad\text{gebunden für } 0<E<V_0`)+steps([
   `Im Topf schwingt die Lösung: ${I(R`\psi''=-k^2\psi`)} mit ${I(R`k=\dfrac{\sqrt{2mE}}{\hbar}`)}.`,
   `In der Wand ist ${I('E<V_0')}, dort gilt ${I(R`\psi''=+\kappa^2\psi`)} mit ${I(R`\kappa=\dfrac{\sqrt{2m(V_0-E)}}{\hbar}`)}. Die Lösungen sind ${I(R`e^{-\kappa|x|}`)} und ${I(R`e^{+\kappa|x|}`)}. Der anwachsende Anteil ist nicht normierbar und muss verschwinden. Genau das gelingt in der Simulation nur bei bestimmten Energien.`,
   `${I(R`\psi`)} und ${I(R`\psi'`)} müssen bei ${I(R`x=\pm\tfrac{L}{2}`)} stetig sein. Das ergibt je eine Bedingung für symmetrische und antisymmetrische Zustände:`+D(R`k\,\tan\frac{kL}{2}=\kappa\quad(\text{symmetrisch}),\qquad -k\,\cot\frac{kL}{2}=\kappa\quad(\text{antisymmetrisch})`),
   `Mit ${I(R`k^2+\kappa^2=k_0^2=\dfrac{2mV_0}{\hbar^2}`)} lassen sich beide zusammenfassen:`+D(R`k_n\,L=n\,\pi-2\arcsin\frac{k_n}{k_0},\qquad E_n=\frac{\hbar^2k_n^2}{2m},\qquad n=1,2,3,\dots`)+`Diese Gleichung hat keine geschlossene Lösung. Man löst sie grafisch oder numerisch.`,
   `Es gibt nur endlich viele gebundene Zustände:`+D(R`N=\left\lceil\frac{k_0L}{\pi}\right\rceil=\left\lceil ${tn(k0*p.L/Math.PI,2)}\right\rceil=${lv.length}`)])+
   merke(`Jedes Niveau liegt tiefer als im unendlich hohen Topf gleicher Breite, weil ${I(R`\psi`)} in die Wand eindringt und die Wellenlänge dadurch größer wird. Die Eindringtiefe ist ${I(R`1/\kappa`)}.`),
   tbl(`Energieniveaus für ${I('L')} = ${de(p.L,2)} nm, ${I('V_0')} = ${de(p.V0,1)} eV`,[I('n'),I(R`E_n\ \text{in eV}`),I(R`E_n^{\infty}\ \text{in eV}`)],lv.map(l=>({E:l.E,c:[l.n,de(l.E,3),de(E1*l.n*l.n,3)]})),`${I(R`E_n^{\infty}`)}: zum Vergleich der unendlich hohe Topf.`)]; },
 harm(p){ const x0=Math.sqrt(2*C/p.hw), rows=[]; for(let n=0;n<=6;n++) rows.push({E:p.hw*(n+.5),c:[n,de(p.hw*(n+.5),3)]});
  return [`<h3>Harmonischer Oszillator</h3>`+D(R`V(x)=\tfrac12\,m\,\omega^2x^2`)+steps([
   `Mit der Länge ${I(R`x_0=\sqrt{\dfrac{\hbar}{m\omega}}`)} und ${I(R`\xi=\dfrac{x}{x_0}`)} wird die Schrödingergleichung zu`+D(R`\frac{\mathrm{d}^2\psi}{\mathrm{d}\xi^2}=\left(\xi^2-\frac{2E}{\hbar\omega}\right)\psi`),
   `Für große ${I(R`|\xi|`)} verhält sich jede normierbare Lösung wie ${I(R`e^{-\xi^2/2}`)}. Ansatz: ${I(R`\psi(\xi)=H(\xi)\,e^{-\xi^2/2}`)} mit einem Polynom ${I('H')}.`,
   `Die Potenzreihe für ${I('H')} bricht nur dann ab, wenn ${I(R`\dfrac{2E}{\hbar\omega}=2n+1`)} ist. Sonst wächst ${I(R`\psi`)} wie ${I(R`e^{+\xi^2/2}`)} und ist nicht normierbar. Also:`+D(R`E_n=\hbar\omega\left(n+\tfrac12\right),\qquad n=0,1,2,\dots`),
   `Die zugehörigen Wellenfunktionen enthalten die Hermite-Polynome ${I('H_n')}:`+D(R`\psi_n(x)=\frac{1}{\sqrt{2^n\,n!\,\sqrt{\pi}\,x_0}}\;H_n(\xi)\;e^{-\xi^2/2}`)+D(R`H_0=1,\quad H_1=2\xi,\quad H_2=4\xi^2-2,\quad H_3=8\xi^3-12\xi`)])+
   merke(`Die Niveaus haben alle den gleichen Abstand ${I(R`\Delta E=\hbar\omega`)}. Der Grundzustand hat die Nullpunktsenergie ${I(R`E_0=\tfrac12\hbar\omega`)}. Hier zählt man ab ${I('n=0')}.`),
   tbl(`Energieniveaus für ${I(R`\hbar\omega`)} = ${de(p.hw,1)} eV`,[I('n'),I(R`E_n\ \text{in eV}`)],rows,`${I('x_0')} = ${de(x0,3)} nm`)]; },
 coul(p){ const rows=[]; for(let n=1;n<=6;n++) rows.push({E:-KC*KC/(4*C)/(n*n),c:[n,de(-KC*KC/(4*C)/(n*n),3)]});
  return [`<h3>Coulomb-Potenzial: Wasserstoffatom</h3>`+D(R`V(r)=-\frac{e^2}{4\pi\varepsilon_0}\cdot\frac{1}{r}`)+steps([
   `Für kugelsymmetrische Zustände setzt man ${I(R`\psi(r)=\dfrac{u(r)}{r}`)}. Für ${I('u')} gilt dann eine eindimensionale Schrödingergleichung mit ${I('u(0)=0')}:`+D(R`-\frac{\hbar^2}{2m}\,u''(r)-\frac{e^2}{4\pi\varepsilon_0\,r}\,u(r)=E\,u(r)`)+`Die Simulation zeigt ${I('u(r)')}. ${I('|u(r)|^2')} gibt an, wie wahrscheinlich das Elektron im Abstand ${I('r')} vom Kern ist.`,
   `Ansatz für den Grundzustand: ${I(R`u(r)=r\,e^{-r/a}`)}. Einsetzen liefert`+D(R`\left(\frac{\hbar^2}{m\,a}-\frac{e^2}{4\pi\varepsilon_0}\right)-\left(\frac{\hbar^2}{2m\,a^2}+E\right)r=0`)+`Beide Klammern müssen null sein.`,
   `Aus der ersten Klammer folgt der bohrsche Radius, aus der zweiten die Grundzustandsenergie:`+D(R`a_0=\frac{4\pi\varepsilon_0\hbar^2}{m\,e^2}=0{,}0529\,\mathrm{nm},\qquad E_1=-\frac{\hbar^2}{2m\,a_0^2}=-13{,}6\,\mathrm{eV}`),
   `Allgemein gilt:`+D(R`E_n=-\frac{m\,e^4}{8\,\varepsilon_0^2\,h^2}\cdot\frac{1}{n^2}=-\frac{13{,}6\,\mathrm{eV}}{n^2},\qquad n=1,2,3,\dots`)+D(R`u_1(r)=\frac{2}{a_0^{3/2}}\,r\,e^{-r/a_0},\qquad u_2(r)=\frac{1}{\sqrt2\,a_0^{3/2}}\,r\left(1-\frac{r}{2a_0}\right)e^{-r/(2a_0)}`),
   `Für das Photon beim Übergang von ${I('m')} nach ${I('n')} folgt die Rydberg-Formel:`+D(R`\frac{1}{\lambda}=R_\infty\left(\frac{1}{n^2}-\frac{1}{m^2}\right),\qquad R_\infty=\frac{13{,}6\,\mathrm{eV}}{h\,c}=1{,}097\cdot10^{7}\,\mathrm{m^{-1}}`)])+
   merke(`Die Niveaus rücken nach oben immer dichter zusammen und häufen sich bei ${I('E=0')}, der Ionisationsgrenze. Die Übergänge nach ${I('n=2')} (Balmer-Serie) liegen im sichtbaren Bereich. Bei negativer Energie dreht sich der Phasenzeiger in der 3D-Ansicht andersherum; messbar sind nur Energiedifferenzen.`),
   tbl('Energieniveaus',[I('n'),I(R`E_n\ \text{in eV}`)],rows,`Die Simulation rechnet bis ${I('r')} = 3 nm. Das reicht für ${I(R`n\le4`)}.`)]; },
 dbl(p){ const lv=doubleLevels(p.w,p.b,p.V0);
  return [`<h3>Doppeltopf</h3><p>Zwei Töpfe der Breite ${I('w')}, getrennt durch eine Wand der Dicke ${I('b')} und Höhe ${I('V_0')}.</p>`+steps([
   `In den Töpfen schwingt ${I(R`\psi`)} mit ${I(R`k=\dfrac{\sqrt{2mE}}{\hbar}`)}. In der Trennwand und außen gilt ${I(R`\psi''=\kappa^2\psi`)} mit ${I(R`\kappa=\dfrac{\sqrt{2m(V_0-E)}}{\hbar}`)}.`,
   `Das Potenzial ist symmetrisch, also ist jede Lösung symmetrisch oder antisymmetrisch. In der Trennwand heißt das:`+D(R`\psi(x)\propto\cosh(\kappa x)\quad(\text{symmetrisch}),\qquad \psi(x)\propto\sinh(\kappa x)\quad(\text{antisymmetrisch})`),
   `Stetigkeit von ${I(R`\psi`)} und ${I(R`\psi'`)} an allen Rändern führt auf`+D(R`k\,w=(j-1)\,\pi+\arctan\frac{\kappa}{k}+\arctan\!\left(\frac{\kappa}{k}\,\tanh\frac{\kappa b}{2}\right)\quad(\text{symmetrisch})`)+D(R`k\,w=(j-1)\,\pi+\arctan\frac{\kappa}{k}+\arctan\!\left(\frac{\kappa}{k}\,\coth\frac{\kappa b}{2}\right)\quad(\text{antisymmetrisch})`)+`mit ${I(R`j=1,2,\dots`)} Beide Gleichungen löst man numerisch.`,
   `Bei dicker Trennwand sind die Zustände näherungsweise Summe und Differenz der Einzeltopf-Zustände:`+D(R`\psi_\pm\approx\frac{1}{\sqrt2}\left(\psi_{\text{links}}\pm\psi_{\text{rechts}}\right),\qquad E_--E_+\;\propto\;e^{-\kappa b}`)])+
   merke(`Jedes Niveau des einzelnen Topfs spaltet in ein Paar auf. Der symmetrische Zustand liegt tiefer: Das Elektron hält sich auch zwischen den Töpfen auf, und das senkt die Energie. Das ist das Prinzip der chemischen Bindung. Je dünner die Wand, desto größer die Aufspaltung.`),
   tbl(`Energieniveaus für ${I('w')} = ${de(p.w,2)} nm, ${I('b')} = ${de(p.b,2)} nm, ${I('V_0')} = ${de(p.V0,1)} eV`,[I('n'),I(R`E_n\ \text{in eV}`),'Symmetrie'],lv.map(l=>({E:l.E,c:[l.n,de(l.E,3),l.par>0?'symmetrisch':'antisymm.']})))]; },
 multi(p){ return [`<h3>Mehrfachtopf: Modell eines Kristalls</h3><p>${I('N')} gleiche Töpfe in einer Reihe, wie die Atome in einem Kristall.</p>`+steps([
   `Ein einzelner Topf hätte wenige Niveaus ${I(R`E^{(1)},E^{(2)},\dots`)} Durch die dünnen Wände kann das Elektron von Topf zu Topf tunneln.`,
   `Die Zustände der ${I('N')} Töpfe überlagern sich. Aus jedem Einzelniveau werden ${I('N')} dicht benachbarte Niveaus. Für schwache Kopplung gilt näherungsweise`+D(R`E_j\approx\bar{E}-2\,\Delta\,\cos\frac{j\,\pi}{N+1},\qquad j=1,\dots,N,\qquad \Delta\propto e^{-\kappa b}`),
   `Der tiefste Zustand einer Gruppe hat in allen Töpfen das gleiche Vorzeichen, der höchste wechselt das Vorzeichen von Topf zu Topf.`,
   `Für ${I(R`N\to\infty`)} rücken die ${I('N')} Niveaus zu einem durchgehenden Energieband der Breite ${I(R`4\Delta`)} zusammen. Zwischen den Bändern liegen verbotene Zonen, die Bandlücken.`])+
   merke(`So entsteht das Bändermodell des Festkörpers. Ob ein Stoff Leiter, Halbleiter oder Isolator ist, hängt davon ab, wie die Bänder besetzt sind und wie groß die Bandlücke ist. Eine geschlossene Formel für die Niveaus gibt es hier nicht; die Tabelle ist numerisch berechnet.`),
   tbl(`Energieniveaus für ${I('N')} = ${p.N} (numerisch)`,[I('n'),I(R`E_n\ \text{in eV}`)],LV.map(l=>({E:l.E,c:[qn(l.k),de(l.E,3)]})))]; },
 bar(p){ const E=S.E,T=Tbar(E,p.V0,p.d),tun=E<p.V0,ka=Math.sqrt(Math.abs(p.V0-E)/C);
  return [`<h3>Potenzialbarriere und Tunneleffekt</h3>`+D(R`V(x)=\begin{cases}V_0 & \text{für } |x|<\tfrac{d}{2}\\[3pt] 0 & \text{sonst}\end{cases}`)+steps([
   `Links läuft eine Welle ein und wird teilweise reflektiert, rechts läuft nur eine Welle weg. Mit ${I(R`k=\dfrac{\sqrt{2mE}}{\hbar}`)}:`+D(R`\psi_{\text{links}}=e^{ikx}+r\,e^{-ikx},\qquad \psi_{\text{rechts}}=t\,e^{ikx}`),
   `In der Barriere gilt für ${I('E<V_0')}: ${I(R`\psi=a\,e^{\kappa x}+b\,e^{-\kappa x}`)} mit ${I(R`\kappa=\dfrac{\sqrt{2m(V_0-E)}}{\hbar}`)}. Dort fällt ${I(R`|\psi|`)} im Wesentlichen exponentiell ab, wird aber nicht null.`,
   `Stetigkeit von ${I(R`\psi`)} und ${I(R`\psi'`)} an beiden Rändern liefert vier Gleichungen für ${I('r,a,b,t')}. Daraus folgt die Transmissionswahrscheinlichkeit ${I(R`T=|t|^2`)}:`+D(R`T=\left[1+\frac{V_0^2\,\sinh^2(\kappa d)}{4E\,(V_0-E)}\right]^{-1}\qquad(E<V_0)`),
   `Für eine dicke oder hohe Barriere (${I(R`\kappa d\gg1`)}) bleibt`+D(R`T\approx\frac{16\,E\,(V_0-E)}{V_0^2}\;e^{-2\kappa d}`),
   `Für ${I('E>V_0')} ersetzt man ${I(R`\sinh(\kappa d)`)} durch ${I(R`\sin(k'd)`)} mit ${I(R`k'=\dfrac{\sqrt{2m(E-V_0)}}{\hbar}`)}. Auch dann wird ein Teil reflektiert, außer bei ${I(R`k'd=n\pi`)}.`])+
   merke(`Hier ist das Elektron nicht eingesperrt, deshalb gibt es keine Quantisierung: Jede Energie ${I('E>0')} ist erlaubt. Links überlagern sich einlaufende und reflektierte Welle zu einem Muster in ${I(R`|\psi|^2`)}, rechts ist ${I(R`|\psi|^2`)} konstant. ${I('T')} hängt exponentiell von der Dicke ab; darauf beruhen Rastertunnelmikroskop und Alphazerfall.`),
   `<div><h4>Werte bei ${I('E')} = ${de(E,3)} eV</h4><div class="tblwrap"><table><tbody>`+
   `<tr><td>${tun?I(R`\kappa`):I("k'")}</td><td>${de(ka,2)} nm⁻¹</td></tr><tr><td>${tun?I(R`\kappa d`):I("k'd")}</td><td>${de(ka*p.d,2)}</td></tr>`+
   `<tr><td>${I('T')} nach Formel</td><td>${de(T*100,T<0.001?5:2)} %</td></tr><tr><td>${I('T')} aus der Simulation</td><td>${cur&&cur.type==='scatter'?de(cur.T*100,cur.T<0.001?5:2):'–'} %</td></tr>`+
   `</tbody></table></div></div>`]; }
};
function renderMath(){ const [a,b]=MATH[S.pot](P);
  $('math').innerHTML=`<div>${a}</div><div><h4>Zugrunde liegt</h4>${D(R`-\frac{\hbar^2}{2m}\,\psi''(x)+V(x)\,\psi(x)=E\,\psi(x),\qquad\int_{-\infty}^{\infty}|\psi(x)|^2\,\mathrm{d}x=1`)}${b}</div>`; }

// ---------- Reiter und Parameter
function renderTabs(){ $('tabs').innerHTML=ORDER.map(id=>`<button type="button" role="tab" id="tab-${id}" data-id="${id}" aria-selected="${id===S.pot}"><svg viewBox="0 0 36 20" aria-hidden="true"><path d="${POTS[id].icon}"/></svg><span>${POTS[id].name}</span></button>`).join(''); }
function renderParams(){ const p=POTS[S.pot], v=S.P[S.pot];
  $('pnote').textContent=p.note;
  $('params').innerHTML=p.params.map(q=>`<div class="prm"><label for="p-${p.id}-${q.id}">${q.label} ${I(q.tex,q.fb)}</label><output id="o-${p.id}-${q.id}">${de(v[q.id],q.d)} ${q.unit}</output><input type="range" id="p-${p.id}-${q.id}" data-q="${q.id}" min="${q.min}" max="${q.max}" step="${q.step}" value="${v[q.id]}"></div>`).join(''); }
function selectPot(id){ S.pot=id; S.sel=[]; S.sup=false; S.E=S.Eby[id]; S.t=0;
  S.playing=!reduced&&(S.view3d||POTS[id].kind==='scatter');
  renderTabs(); renderParams(); rebuild(); syncPlay(); }

// ---------- Zeichnen
const cv=$('cv'), ctx=cv.getContext('2d'); let W=0,Hh=0,dpr=1,PR={l:0,t:0,w:1,h:1},K={},cx=0,cy=0,ca=1,sa=0,cb=1,sb=0,sc=1;
const M=600, bX=new Float64Array(M+1), bR=new Float64Array(M+1), bI=new Float64Array(M+1);
function readColors(){ const cs=getComputedStyle(host), v=n=>cs.getPropertyValue(n).trim();
  K={surface:v('--surface'),plot:v('--plot'),ink:v('--ink'),muted:v('--muted'),rule:v('--rule'),grid:v('--grid'),psi:v('--psi'),prob:v('--prob'),pot:v('--pot'),potfill:v('--pot-fill'),energy:v('--energy'),level:v('--level'),im:v('--im'),bad:v('--bad')}; }
function layout(){ const r=cv.getBoundingClientRect(); dpr=window.devicePixelRatio||1; W=r.width; Hh=r.height; if(W<10) return;
  cv.width=Math.round(W*dpr); cv.height=Math.round(Hh*dpr); const l=W<520?42:54;
  PR={l,t:14,w:W-l-12,h:Hh-14-36}; cx=PR.l+PR.w/2; cy=PR.t+PR.h/2; }
const X=x=>PR.l+(x-vx0)/(vx1-vx0)*PR.w, Y=E=>PR.t+PR.h-(E-ve0)/(ve1-ve0)*PR.h;
let _x=0,_y=0,_d=0;
function pj(x,y,z){ const dx=x-cx, dy=cy-y, X1=dx*ca+z*sa, Z1=-dx*sa+z*ca; _x=cx+sc*X1; _y=cy-sc*(dy*cb-Z1*sb); _d=dy*sb+Z1*cb; }
const mv=(x,y,z)=>{pj(x,y,z||0);ctx.moveTo(_x,_y);}, ln=(x,y,z)=>{pj(x,y,z||0);ctx.lineTo(_x,_y);};
function quad(){ ctx.beginPath(); mv(PR.l,PR.t); ln(PR.l+PR.w,PR.t); ln(PR.l+PR.w,PR.t+PR.h); ln(PR.l,PR.t+PR.h); ctx.closePath(); }
function niceStep(a,b,n){ const raw=(b-a)/n, p=10**Math.floor(Math.log10(raw)), f=raw/p; return (f<1.5?1:f<3.5?2:f<7.5?5:10)*p; }
function niceTicks(a,b,n){ const s=niceStep(a,b,n), o=[]; for(let t=Math.ceil(a/s-1e-9)*s;t<=b+1e-9;t+=s) o.push(Math.abs(t)<1e-12?0:t); return o; }
function niceDec(a,b,n){ return Math.max(0,-Math.floor(Math.log10(niceStep(a,b,n))+1e-9)); }
const FONT=(w,s)=>`${w} ${s}px "Atkinson Hyperlegible Next Variable",system-ui,sans-serif`;

function drawPlane(){ const c=ctx, top=PR.t-60, bot=PR.t+PR.h+60, L=PR.l-60, Rr=PR.l+PR.w+60, sp=ve1-ve0, cY=v=>Y(clamp(v,ve0-sp,ve1+sp));
  c.save(); quad(); c.fillStyle=K.plot; c.fill(); c.clip();
  c.strokeStyle=K.grid; c.lineWidth=1; c.beginPath();
  niceTicks(vx0,vx1,W<520?5:8).forEach(t=>{ mv(X(t),PR.t); ln(X(t),PR.t+PR.h); });
  niceTicks(ve0,ve1,7).forEach(t=>{ mv(PR.l,Y(t)); ln(PR.l+PR.w,Y(t)); }); c.stroke();
  // Potenzial: Fläche unterhalb von V ist für jede Energie verboten
  const path=close=>{ c.beginPath();
    if(pot.walls){ const xa=X(g.a),xb=X(g.b),y0=Y(0); mv(xa,top); ln(xa,y0); ln(xb,y0); ln(xb,top);
      if(close){ ln(Rr,top); ln(Rr,bot); ln(L,bot); ln(L,top); c.closePath(); } }
    else{ if(close) mv(X(g.a),bot); for(let i=0;i<=NG;i+=2){ const px=X(g.x[i]),py=cY(g.V[i]); (i===0&&!close)?mv(px,py):ln(px,py); }
      if(close){ ln(X(g.b),bot); c.closePath(); } } };
  path(true); c.fillStyle=K.potfill; c.fill();
  if(pot.walls){ c.strokeStyle=K.muted; c.globalAlpha=.45; c.lineWidth=1; c.beginPath();
    for(const [x0,x1] of [[PR.l,X(g.a)],[X(g.b),PR.l+PR.w]]) for(let s=x0-PR.h;s<x1;s+=9){ const a=Math.max(s,x0), b=Math.min(s+PR.h,x1); if(b>a){ mv(a,PR.t+PR.h-(a-s)); ln(b,PR.t+PR.h-(b-s)); } }
    c.stroke(); c.globalAlpha=1; }
  path(false); c.strokeStyle=K.pot; c.lineWidth=2; c.lineJoin='round'; c.stroke();
  // gespeicherte Niveaus
  const sv=S.saved[S.pot]; c.strokeStyle=K.level; c.lineWidth=1.5; c.beginPath();
  for(const q of sv){ const y=Y(q.E); let open=false; for(let i=0;i<=NG;i+=2){ const ok=g.V[i]<q.E; if(ok&&!open){ mv(X(g.x[i]),y); open=true; } else if(!ok&&open){ ln(X(g.x[i]),y); open=false; } } if(open) ln(X(g.b),y); }
  c.stroke();
  c.restore();
  quad(); c.strokeStyle=K.rule; c.lineWidth=1; c.stroke();
  // Achsenbeschriftung
  c.fillStyle=K.muted; c.font=FONT(400,11.5); c.textBaseline='top'; c.textAlign='center';
  const dx=niceDec(vx0,vx1,W<520?5:8), dy=niceDec(ve0,ve1,7);
  niceTicks(vx0,vx1,W<520?5:8).forEach(t=>{ pj(X(t),PR.t+PR.h+6,0); c.fillText(de(t,dx),_x,_y); });
  c.textAlign='right'; c.textBaseline='middle';
  niceTicks(ve0,ve1,7).forEach(t=>{ pj(PR.l-7,Y(t),0); c.fillText(de(t,dy),_x,_y); });
  c.font=FONT(500,12); c.fillStyle=K.ink; c.textAlign='right'; c.textBaseline='top'; pj(PR.l+PR.w,PR.t+PR.h+20,0); c.fillText(`${pot.xl} in nm`,_x,_y);
  c.textAlign='left'; c.textBaseline='top'; pj(PR.l+8,PR.t+6,0); c.fillText('E in eV',_x,_y);
}
// füllt bR/bI in Anzeige-Einheiten (1 = volle Höhe A)
function fillReal(psi,s,ph){ const co=Math.cos(ph)*s, si=-Math.sin(ph)*s, st=NG/M; for(let j=0;j<=M;j++){ const v=psi[j*st]; bR[j]=v*co; bI[j]=v*si; } }
function fillCur(ph){ const st=NG/M;
  if(cur.type==='scatter'){ const co=Math.cos(ph)*.5, si=Math.sin(ph)*.5; for(let j=0;j<=M;j++){ const r=cur.re[j*st],m=cur.im[j*st]; bR[j]=r*co+m*si; bI[j]=m*co-r*si; } }
  else if(cur.type==='sup'){ const pa=cur.a.E*S.t*1.519267, pb=cur.b.E*S.t*1.519267, s=cur.scale, ca_=Math.cos(pa),sa_=Math.sin(pa),cb_=Math.cos(pb),sb_=Math.sin(pb);
    for(let j=0;j<=M;j++){ const a=cur.a.psi[j*st],b=cur.b.psi[j*st]; bR[j]=s*(a*ca_+b*cb_); bI[j]=-s*(a*sa_+b*sb_); } }
  else fillReal(cur.psi,cur.scale,ph); }
const CL=2.7;
function curve3(y0,A,fr,fi,rot){ // Linienzug (x, Re, Im) mit Abbruch, wenn die Kurve wegläuft
  const c=ctx; let open=false, tip=null; c.beginPath();
  for(let j=0;j<=M;j++){ const x=bX[j], r=fr(j), i=fi(j), bad=x<PR.l-1||x>PR.l+PR.w+1||Math.abs(r)>CL||Math.abs(i)>CL;
    if(bad){ if(open&&x>=PR.l&&x<=PR.l+PR.w) tip=j; open=false; continue; }
    let yy=y0-A*r, zz=A*i; if(rot){ yy=y0-A*i*rot[0]; zz=A*i*rot[1]; }
    pj(x,yy,zz); open?c.lineTo(_x,_y):c.moveTo(_x,_y); open=true; }
  c.stroke(); return tip; }
function drawWave(y0,A,e,main){ const c=ctx, show=S.show;
  if(main){
    // |ψ|² in der Zeichenebene
    if(show.prob){ c.save(); quad(); c.clip(); c.beginPath(); let st=false,lx=0;
      for(let j=0;j<=M;j++){ const x=bX[j], p=bR[j]*bR[j]+bI[j]*bI[j];
        if(x<PR.l-1||x>PR.l+PR.w+1||p>CL){ if(st){ ln(lx,y0); c.closePath(); st=false; } continue; }
        if(!st){ mv(x,y0); st=true; } ln(x,y0-A*p); lx=x; }
      if(st){ ln(lx,y0); c.closePath(); }
      c.fillStyle=K.prob; c.globalAlpha=.2; c.fill(); c.globalAlpha=1;
      c.strokeStyle=K.prob; c.lineWidth=1.75; curve3(y0,A,j=>bR[j]*bR[j]+bI[j]*bI[j],()=>0); c.restore(); }
    if(e>0.01){ // Hüllkreise |ψ| und Zeiger: Die Kurve dreht sich auf dieser festen Fläche
      c.strokeStyle=K.psi; c.lineWidth=1; c.globalAlpha=.2*e; c.beginPath();
      for(let j=0;j<=M;j+=8){ const x=bX[j]; if(x<PR.l||x>PR.l+PR.w) continue; const r=A*Math.hypot(bR[j],bI[j]); if(r<1.5||r>A*CL) continue;
        for(let k=0;k<=20;k++){ const a=k/20*6.2832; pj(x,y0-r*Math.cos(a),r*Math.sin(a)); k?c.lineTo(_x,_y):c.moveTo(_x,_y); } }
      c.stroke();
      if(show.psi){ c.globalAlpha=.4*e; c.beginPath(); for(let j=0;j<=M;j+=8){ const x=bX[j]; if(x<PR.l||x>PR.l+PR.w||Math.abs(bR[j])>CL||Math.abs(bI[j])>CL) continue; mv(x,y0,0); ln(x,y0-A*bR[j],A*bI[j]); } c.stroke(); }
      c.globalAlpha=1; }
    if(show.proj){ let any=e>0.01; if(!any) for(let j=0;j<=M;j+=6) if(Math.abs(bI[j])>0.004){ any=true; break; }
      if(any){ c.lineWidth=1.25; c.setLineDash([5,4]);
        c.strokeStyle=K.im; const a=e*Math.PI/2; curve3(y0,A,()=>0,j=>bI[j],[Math.cos(a),Math.sin(a)]);
        if(e>0.01){ c.strokeStyle=K.psi; c.globalAlpha=e; curve3(y0,A,j=>bR[j],()=>0); c.globalAlpha=1; }
        c.setLineDash([]); } }
  }
  if(main&&!show.psi) return;
  c.strokeStyle=main?K.psi:K.level; c.lineJoin='round'; c.lineCap='round';
  if(!main){ c.lineWidth=1.25; c.globalAlpha=.75; curve3(y0,A,j=>bR[j],j=>bI[j]); c.globalAlpha=1; return; }
  if(e<0.01){ c.lineWidth=2.25; const tip=curve3(y0,A,j=>bR[j],j=>bI[j]);
    if(tip!==null&&cur.type==='trial'){ const up=bR[tip]>0, x=bX[tip-1], y=clamp(y0-A*bR[tip-1],PR.t+8,PR.t+PR.h-8); c.fillStyle=K.psi; c.beginPath(); c.moveTo(x,y+(up?-9:9)); c.lineTo(x-5,y); c.lineTo(x+5,y); c.closePath(); c.fill(); } }
  else{ // mit Tiefenwirkung: vorne kräftiger
    let px=0,py=0,ok=false; const dm=A*1.2;
    for(let j=0;j<=M;j++){ const x=bX[j], bad=x<PR.l-1||x>PR.l+PR.w+1||Math.abs(bR[j])>CL||Math.abs(bI[j])>CL; if(bad){ ok=false; continue; }
      pj(x,y0-A*bR[j],A*bI[j]); if(ok){ const d=clamp(.5+(A*bI[j]*ca*cb)/(2*dm),0,1); c.globalAlpha=.55+.45*d; c.lineWidth=1.6+1.3*d; c.beginPath(); c.moveTo(px,py); c.lineTo(_x,_y); c.stroke(); }
      px=_x; py=_y; ok=true; }
    c.globalAlpha=1; }
}
function draw(){ if(W<10||!g) return; const c=ctx, e=ease(S.m); ca=Math.cos(S.alpha*e); sa=Math.sin(S.alpha*e); cb=Math.cos(S.beta*e); sb=Math.sin(S.beta*e); sc=1-.2*e;
  c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,W,Hh);
  const st=NG/M; for(let j=0;j<=M;j++) bX[j]=X(g.x[j*st]);
  drawPlane(); const A=PR.h*0.1, w=1.519267*S.t, flat=e<0.01;
  if(flat){ c.save(); c.beginPath(); c.rect(PR.l,PR.t,PR.w,PR.h); c.clip(); }
  if(S.show.stored) for(const q of S.saved[S.pot]){ const l=levelPsi(q.k); if(!l) continue; fillReal(l.psi,1/l.max,l.E*w); drawWave(Y(l.E),A,e,false); }
  const y0=Y(cur.E);
  if(cur.type!=='sup'){ c.strokeStyle=K.energy; c.lineWidth=1.5; c.beginPath(); mv(PR.l,y0); ln(PR.l+PR.w,y0); c.stroke(); }
  fillCur(cur.E*w); drawWave(y0,A,e,true);
  if(flat) c.restore();
  if(pot.walls&&cur.type==='trial'&&flat){ c.strokeStyle=K.bad; c.fillStyle=K.plot; c.lineWidth=2; c.beginPath(); c.arc(X(g.b),clamp(y0-A*bR[M],PR.t+5,PR.t+PR.h-5),4.5,0,7); c.fill(); c.stroke(); }
  // Beschriftungen
  c.font=FONT(600,12.5); c.textBaseline='bottom'; c.textAlign='right'; c.fillStyle=K.energy;
  pj(PR.l+PR.w-8-46*e,y0-5,0); c.fillText(cur.type==='sup'?'Überlagerung':`E = ${de(S.E,3)} eV`,_x,clamp(_y,PR.t+16,Hh));
  c.font=FONT(500,11.5); c.textAlign='left'; c.fillStyle=K.level; let lastY=-99;
  for(const q of S.saved[S.pot]){ const y=Y(q.E); if(Math.abs(y-lastY)<12) continue; lastY=y; pj(pot.walls?X(g.a)+5:PR.l+6,y-3,0); c.fillText(`n = ${qn(q.k)}`,_x,_y); }
  if(e>0.01){ // Achsenkreuz der komplexen Ebene
    const ox=PR.l+PR.w-14, L=A*1.5; c.globalAlpha=e; c.lineWidth=1.25; c.font=FONT(600,12); c.textBaseline='middle';
    for(const [dy,dz,col,lab] of [[-L,0,K.psi,'Re'],[0,L,K.im,'Im']]){ c.strokeStyle=col; c.fillStyle=col; c.beginPath(); mv(ox,y0,0); ln(ox,y0+dy,dz); c.stroke(); pj(ox,y0+dy*1.12,dz*1.12); c.textAlign='center'; c.fillText(lab,_x,_y); }
    c.globalAlpha=1; }
  const hud=$('hud'), on=S.playing||S.t>0||S.view3d; hud.hidden=!on;
  if(on){ const txt=cur.type==='sup'?`t = ${de(S.t,2)} fs · Schwebung alle ${de(4.135668/Math.abs(cur.a.E-cur.b.E),2)} fs`
      :`t = ${de(S.t,2)} fs · Phase −E·t/ħ = ${de(-(((cur.E*w*180/Math.PI)%360)),0)}°`; if(hud.textContent!==txt) hud.textContent=txt; }
}

// ---------- Ablauf
let raf=0,last=0;
function req(){ if(!raf) raf=life.raf(tick); }
function tick(ts){ raf=0; const dt=last?Math.min(.05,(ts-last)/1000):0; last=ts; let again=false;
  const tg=S.view3d?1:0; if(S.m!==tg){ S.m=reduced?tg:clamp(S.m+Math.sign(tg-S.m)*dt/0.9,0,1); again=true; }
  if(S.playing){ S.t+=dt*fsPerSec*S.speed; again=true; }
  draw(); if(again) req(); else last=0; }
function syncPlay(){ $('play').textContent=S.playing?'⏸ Anhalten':'▶ Zeitentwicklung'; $('v2d').setAttribute('aria-pressed',!S.view3d); $('v3d').setAttribute('aria-pressed',S.view3d);
  cv.classList.toggle('rot',S.view3d); $('hint3d').hidden=!S.view3d; req(); }

// ---------- Bedienung
$('tabs').addEventListener('click',e=>{ const b=e.target.closest('button[data-id]'); if(b) selectPot(b.dataset.id); });
$('params').addEventListener('input',e=>{ const q=pot.params.find(q=>q.id===e.target.dataset.q); if(!q) return; P[q.id]=+e.target.value;
  $(`o-${pot.id}-${q.id}`).textContent=`${de(P[q.id],q.d)} ${q.unit}`;
  if(q.viewOnly){ [vx0,vx1]=pot.view(P); req(); return; }
  S.saved[S.pot]=[]; S.sel=[]; S.sup=false; rebuild(); });
const sl=$('eslider'); let slDrag=false;
sl.addEventListener('pointerdown',()=>slDrag=true); life.on(window,'pointerup',()=>slDrag=false);
sl.addEventListener('input',()=>setE(+sl.value,slDrag));
$('fine').addEventListener('click',e=>{ const b=e.target.closest('button[data-d]'); if(b) setE(S.E+ +b.dataset.d,false); });
$('snap').addEventListener('change',e=>S.snap=e.target.checked);
for(const [id,k] of [['showPsi','psi'],['showProb','prob'],['showStored','stored'],['showProj','proj']]) $(id).addEventListener('change',e=>{ S.show[k]=e.target.checked; req(); });
$('v2d').addEventListener('click',()=>{ S.view3d=false; if(cur.type!=='scatter'&&cur.type!=='sup'){ S.playing=false; S.t=0; } syncPlay(); });
$('v3d').addEventListener('click',()=>{ S.view3d=true; if(!reduced) S.playing=true; syncPlay(); });
$('play').addEventListener('click',()=>{ S.playing=!S.playing; syncPlay(); });
$('t0').addEventListener('click',()=>{ S.t=0; req(); });
$('speed').addEventListener('input',e=>S.speed=2**(+e.target.value));
$('save').addEventListener('click',()=>{ if(cur.type!=='eig') return; const sv=S.saved[S.pot], k=cur.lv.k; if(sv.some(s=>s.k===k)) return;
  sv.push({k,E:cur.lv.E}); sv.sort((a,b)=>a.E-b.E); renderStatus(); renderSaved(); if(S.math) renderMath(); req(); });
function onLevelClick(e){ const d=e.target.closest('.del'); if(d){ const k=+d.dataset.k; S.saved[S.pot]=S.saved[S.pot].filter(s=>s.k!==k); S.sel=S.sel.filter(x=>x!==k); if(S.sel.length<2) S.sup=false; compute(); renderSaved(); if(S.math) renderMath(); return; }
  const b=e.target.closest('[data-k]'); if(b) toggleSel(+b.dataset.k); }
$('levels').addEventListener('click',onLevelClick); $('term').addEventListener('click',onLevelClick);
$('trans').addEventListener('change',e=>{ if(e.target.id==='sup'){ S.sup=e.target.checked; if(S.sup&&!reduced) S.playing=true; compute(); syncPlay(); } });
$('mathBtn').addEventListener('click',()=>{ S.math=!S.math; $('math').hidden=!S.math; $('mathBtn').setAttribute('aria-expanded',S.math);
  $('mathBtn').textContent=S.math?'Mathematische Lösung ausblenden':'Mathematische Lösung einblenden'; if(S.math) renderMath(); });
let drag=null;
cv.addEventListener('pointerdown',e=>{ cv.setPointerCapture(e.pointerId); const r=cv.getBoundingClientRect(); drag={x:e.clientX,y:e.clientY,top:r.top}; if(!S.view3d&&S.m===0) eFromY(e.clientY-r.top); });
cv.addEventListener('pointermove',e=>{ if(!drag) return;
  if(S.view3d){ S.alpha=clamp(S.alpha+(e.clientX-drag.x)*.008,-1.45,1.45); S.beta=clamp(S.beta+(e.clientY-drag.y)*.006,-.25,1.2); drag.x=e.clientX; drag.y=e.clientY; req(); }
  else if(S.m===0) eFromY(e.clientY-drag.top); });
cv.addEventListener('pointerup',()=>drag=null); cv.addEventListener('pointercancel',()=>drag=null);
function eFromY(y){ setE(ve0+(PR.t+PR.h-y)/PR.h*(ve1-ve0),true); }

// ---------- Start
function onTheme(){ readColors(); req(); }
life.ro(()=>{ layout(); req(); }).observe(cv);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(req);
function mjReady(){ MJ=true; 
  root.querySelectorAll('[data-tex]').forEach(el=>{ const h=mj(el.dataset.tex,false); if(h) el.innerHTML=h; });
  renderParams(); renderStatus(); renderSaved(); if(S.math) renderMath(); }
readColors(); layout(); renderTabs(); renderParams(); selectPot(OPTS.start&&ORDER.includes(OPTS.start)?OPTS.start:ORDER[0]); syncPlay();
if(OPTS.tabs) $('tabs').hidden=false;
mjReady();
}
