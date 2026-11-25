// @ts-nocheck
/*
 * Schrödinger-Labor, übernommen aus Sepps Claude-Artefakt und an den
 * Physik-Workspace angepasst: läuft in einem Shadow-DOM, Formeln mit KaTeX,
 * Farben und Schriften aus der Gestaltung des Workspace. Die Physik (Numerov
 * bzw. Runge-Kutta, Termschema, Orbitale) ist unverändert.
 */
import katex from 'katex';
import { init1D } from './lab1d.js';
export function initCoulomb(root,host,OPTS,life){'use strict';
/*CORE-START*/
// Einheiten nm und eV. C = ħ²/2m, KC = e²/4πε₀.
const C=0.0380998212, KC=1.439964548, A0=2*C/KC, RY=KC*KC/(4*C), HPL=4.135667696;
const NG=3000, RMAX=6, I0=40, NS=14;
// Gitter, das zum Kern hin dichter wird
const GR=new Float64Array(NG+1); for(let i=0;i<=NG;i++) GR[i]=RMAX*(i/NG)*(i/NG);
const gidx=r=>NG*Math.sqrt(r/RMAX);
// u(r) = r^s · w(r) mit s = l+1 (3D) bzw. |m|+1/2 (2D); w ist am Kern glatt.
const sOf=(dim,L)=>dim===3?L+1:L+0.5;
const Veff=(r,s)=>-KC/r+C*s*(s-1)/(r*r);
let _w=0,_p=0;
function rk4(r,h,w,p,s2,q,e){ // w'' = -(2s/r) w' - (q/r + e) w
  const rm=r+h/2, r1=r+h;
  const a1=-(s2/r)*p-(q/r+e)*w;
  const w2=w+h/2*p, p2=p+h/2*a1, a2=-(s2/rm)*p2-(q/rm+e)*w2;
  const w3=w+h/2*p2, p3=p+h/2*a2, a3=-(s2/rm)*p3-(q/rm+e)*w3;
  const w4=w+h*p3, p4=p+h*a3, a4=-(s2/r1)*p4-(q/r1+e)*w4;
  _w=w+h/6*(p+2*p2+2*p3+p4); _p=p+h/6*(a1+2*a2+2*a3+a4);
}
// Vom Kern nach außen. Zählt die Nullstellen (= Anzahl der Eigenwerte unterhalb von E).
function shoot(s,E,out){
  const q=2/A0, e=E/C, c=[1,-q/(2*s)]; let nodes=0;
  for(let k=2;k<NS;k++) c.push(-(q*c[k-1]+e*c[k-2])/(k*(k-1+2*s)));
  let w=1,p=0,prev=1;
  for(let i=0;i<=I0;i++){ const r=GR[i]; let a=0,b=0;
    for(let k=NS-1;k>=0;k--) a=a*r+c[k];
    for(let k=NS-1;k>=1;k--) b=b*r+k*c[k];
    w=a; p=b; if(out) out[i]=w; if(i>0&&(w>0)!==(prev>0)) nodes++; prev=w; }
  for(let i=I0;i<NG;i++){
    rk4(GR[i],GR[i+1]-GR[i],w,p,2*s,q,e);
    if((_w>0)!==(w>0)) nodes++;
    w=_w; p=_p;
    if(Math.abs(w)>1e200){ const f=1e-200; w*=f; p*=f; if(out) for(let j=0;j<=i;j++) out[j]*=f; }
    if(out) out[i+1]=w;
  }
  return {nodes,end:w};
}
// Von außen nach innen: die Lösung, die bei großem r abklingt.
function inward(s,E,out,stop){
  const q=2/A0, e=E/C; let w=0,p=-1e-150; out[NG]=0;
  for(let i=NG;i>stop;i--){
    rk4(GR[i],GR[i-1]-GR[i],w,p,2*s,q,e); w=_w; p=_p;
    if(Math.abs(w)>1e200){ const f=1e-200; w*=f; p*=f; for(let j=i;j<=NG;j++) out[j]*=f; }
    out[i-1]=w;
  }
}
function lastAllowed(s,E){ let i=NG; while(i>0&&!(Veff(GR[i],s)<E)) i--; return i; }
function findLevels(s,lo,hi,maxK){
  const K=Math.min(maxK,shoot(s,hi).nodes), K0=shoot(s,lo).nodes, out=[]; let prev=lo;
  for(let k=K0;k<K;k++){ let a=prev,b=hi;
    for(let it=0;it<60;it++){ const m=0.5*(a+b); if(shoot(s,m).nodes>k) b=m; else a=m; }
    const E=0.5*(a+b); out.push({k,E,dat:null}); prev=E; }
  return out;
}
function eigen(s,E){
  const W=new Float64Array(NG+1); shoot(s,E,W); const it=lastAllowed(s,E);
  if(it>I0&&it<NG-8){ const In=new Float64Array(NG+1); inward(s,E,In,it); const f=W[it]/In[it]; for(let i=it+1;i<=NG;i++) W[i]=In[i]*f; }
  else W[NG]=0;
  let n=0,pu=0; for(let i=1;i<=NG;i++){ const u=Math.pow(GR[i],s)*W[i]; n+=0.5*(u*u+pu*pu)*(GR[i]-GR[i-1]); pu=u; }
  n=Math.sqrt(n); let um=0; for(let i=0;i<=NG;i++){ W[i]/=n; const a=Math.abs(Math.pow(GR[i],s)*W[i]); if(a>um) um=a; }
  return {W,umax:um};
}
// Versuchslösung bei beliebiger Energie; "is" ist die Stelle, ab der sie wegläuft.
function trial(s,E){
  const W=new Float64Array(NG+1), r=shoot(s,E,W), it=lastAllowed(s,E), u=i=>Math.abs(Math.pow(GR[i],s)*W[i]);
  let is=-1,mx=0;
  if(it>0){ is=it; let mn=u(it); for(let i=it+1;i<=NG;i++){ const a=u(i); if(a<mn){mn=a;is=i;} }
    for(let i=0;i<=is;i++){ const a=u(i); if(a>mx) mx=a; } }
  return {W,nodes:r.nodes,endSign:r.end>0?1:-1,allowed:it,is,umax:mx};
}
function maxR(W,L,upto){ let m=0; for(let i=0;i<=upto;i++){ const a=Math.abs(Math.pow(GR[i],L)*W[i]); if(a>m) m=a; } return m; }
/*CORE-END*/
if(typeof document==='undefined'){ globalThis.__core={C,KC,A0,RY,sOf,findLevels,eigen,trial,shoot,GR,NG}; return; }

// ---------- Hilfen
const $=id=>root.getElementById(id), R=String.raw;
const de=(x,d=3)=>x.toFixed(d).replace('.',',').replace('-','−');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let MJ=true; const texCache=new Map();
function mj(tex,display){ const key=(display?'D':'I')+tex; let h=texCache.get(key);
  if(h===undefined){ try{ h=katex.renderToString(tex,{displayMode:!!display,throwOnError:false,output:'html',strict:'ignore'}); }catch(e){ h=null; } texCache.set(key,h); } return h; }
function I(tex,fb){ const h=MJ&&mj(tex,false); return h||(fb!==undefined?`<var>${fb}</var>`:`<code class="mfb">${esc(tex)}</code>`); }
function D(tex){ const h=MJ&&mj(tex,true); return `<div class="txd">${h||`<code>${esc(tex)}</code>`}</div>`; }

// ---------- Winkelanteile
// 3D: reelle Kugelflächenfunktionen als Polynome im Richtungsvektor (x, y, z)
const ORB={
 0:[{sub:'',f:()=>1}],
 1:[{sub:'z',f:(x,y,z)=>z},{sub:'x',f:(x,y,z)=>x},{sub:'y',f:(x,y,z)=>y}],
 2:[{sub:'z²',f:(x,y,z)=>1.5*z*z-0.5},{sub:'xz',f:(x,y,z)=>x*z},{sub:'yz',f:(x,y,z)=>y*z},{sub:'xy',f:(x,y,z)=>x*y},{sub:'x²−y²',f:(x,y,z)=>x*x-y*y}],
 3:[{sub:'z³',f:(x,y,z)=>z*(5*z*z-3)},{sub:'xz²',f:(x,y,z)=>x*(5*z*z-1)},{sub:'yz²',f:(x,y,z)=>y*(5*z*z-1)},{sub:'xyz',f:(x,y,z)=>x*y*z},
    {sub:'z(x²−y²)',f:(x,y,z)=>z*(x*x-y*y)},{sub:'x(x²−3y²)',f:(x,y,z)=>x*(x*x-3*y*y)},{sub:'y(3x²−y²)',f:(x,y,z)=>y*(3*x*x-y*y)}]};
function basis(az,el){ const ca=Math.cos(az),sa=Math.sin(az),ce=Math.cos(el),se=Math.sin(el);
  return {X:[ca,sa,0],Y:[-se*sa,se*ca,ce],V:[ce*sa,-ce*ca,se]}; }
// Schnittebenen durch den Kern, die im 2D-Fenster gezeigt werden
const PLANES=[{az:0,el:0,ax:['x','z']},{az:Math.PI/2,el:0,ax:['y','z']},{az:0,el:Math.PI/2,ax:['x','y']},{az:Math.PI/4,el:0,ax:['x = y','z']}];
const PLANES_X=[{az:3*Math.PI/4,el:0.6155,ax:['y − x','2z − x − y']},{az:Math.PI/2,el:Math.PI/4,ax:['y','z − x']}];
const VDEF=basis(-0.55,0.3).V;
function mkPlane(p){ const b=basis(p.az,p.el); let N=b.V; if(N[0]*VDEF[0]+N[1]*VDEF[1]+N[2]*VDEF[2]<0) N=[-N[0],-N[1],-N[2]]; return {X:b.X,Y:b.Y,N,ax:p.ax}; }
// 2D: stehende Welle cos(mφ) als Polynom in (x, y)
const P2=mkPlane(PLANES[2]);
const ANG2=[{f:()=>1},{f:(x,y)=>x},{f:(x,y)=>x*x-y*y},{f:(x,y)=>x*(x*x-3*y*y)}].map(o=>({f:o.f,norm:1,plane:P2,sub:''}));
(function prepOrbitals(){ const K=1200, dirs=[];
  for(let k=0;k<K;k++){ const z=1-2*(k+0.5)/K, rr=Math.sqrt(1-z*z), ph=k*2.399963229728653; dirs.push([rr*Math.cos(ph),rr*Math.sin(ph),z]); }
  for(const l in ORB) for(const o of ORB[l]){ let mx=0;
    for(let i=0;i<=60;i++){ const th=i/60*Math.PI, st=Math.sin(th), ct=Math.cos(th);
      for(let j=0;j<120;j++){ const ph=j/120*2*Math.PI, a=Math.abs(o.f(st*Math.cos(ph),st*Math.sin(ph),ct)); if(a>mx) mx=a; } }
    o.norm=1/mx;
    // sortierte Beträge über die Kugel: daraus folgt die Fläche, die 90 % der Wahrscheinlichkeit umschließt
    const as=dirs.map(d=>Math.min(1,Math.abs(o.f(d[0],d[1],d[2]))*o.norm)).sort((a,b)=>b-a); o.as=Float32Array.from(as);
    o.cum=new Float64Array(K); let c=0; for(let k=0;k<K;k++){ c+=as[k]*as[k]; o.cum[k]=c; }
    const rate=p=>{ const b=basis(p.az,p.el); let sc=0,ch=0,prev=0,first=0;
      for(let j=0;j<360;j++){ const a=(j+0.37)/360*2*Math.PI, cc=Math.cos(a), ss=Math.sin(a), v=o.f(b.X[0]*cc+b.Y[0]*ss,b.X[1]*cc+b.Y[1]*ss,b.X[2]*cc+b.Y[2]*ss)*o.norm, sg=v>1e-7?1:v<-1e-7?-1:0;
        sc+=v*v; if(sg){ if(prev&&sg!==prev) ch++; if(!first) first=sg; prev=sg; } }
      if(first&&prev&&first!==prev) ch++; return {sc,ch}; };
    let best=null;
    for(const p of PLANES){ const r=rate(p); if(!best||r.ch>best.ch||(r.ch===best.ch&&r.sc>best.sc*1.05)){ best=r; o.plane=mkPlane(p); } }
    if(best.ch<2*l) for(const p of PLANES_X){ const r=rate(p); if(r.ch>best.ch){ best=r; o.plane=mkPlane(p); } } } })();

// ---------- Zustand
const ZOOM={3:[-15,-3.8,-1],2:[-60,-6.8,-2.5]}, BOUND={3:-0.45,2:-0.55}, SEARCH={3:-20,2:-80}, LETTER='spdf';
const S={tab:2,dim:2,L:{2:0,3:0},ori:{0:0,1:0,2:0,3:0},Eby:{2:-50,3:-12.6},E:-12.6,zoom:{2:0,3:0},
  show:{u:true,prob:true,stored:true,r:true},mring:0,hmode:'psi',exag:true,omode:'iso',cut:true,snap:true,playing:false,t:0,
  saved:{2:[],3:[]},cmp:{2:[],3:[]},math:false,info:false,cam:{surf:{az:-0.6,el:0.62},orb:{az:-0.55,el:0.3}}};
const LVC={}, NT=640;
let s=1,LV=[],cur=null,lo=-15,hi=0.6,ve0=0,ve1=1,fsPerSec=1,SID=0,ringAnim=null;
const reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const curN=()=>cur&&cur.type==='eig'?nOf(cur.L,cur.lv.k):null;
// Im 2D-Reiter gleitet die Welle auf dem Kreis zum neuen m; unterwegs sieht man, dass sie sich dazwischen nicht schließt.
function ringTo(m){ if(S.dim!==2) return; if(reduced||(m===S.mring&&!ringAnim)){ S.mring=m; ringAnim=null; } else ringAnim={from:S.mring,to:m,t0:performance.now()}; }

const nOf=(L,k)=>k+L+1;
function nameOf(dim,L,k,ori){ const n=nOf(L,k);
  if(dim===3) return `${n}${LETTER[L]}`+(ori!==undefined&&L>0?`<sub>${ORB[L][ori].sub}</sub>`:'');
  return `n = ${n}, m = ${L?'±'+L:'0'}`; }
const angOf=(dim,L,ori)=>dim===2?ANG2[L]:ORB[L][ori];
function levelsOf(dim,L){ const key=dim+':'+L; return LVC[key]||(LVC[key]=findLevels(sOf(dim,L),SEARCH[dim],BOUND[dim],5-L)); }
function levelDat(dim,L,l){ if(!l.dat){ l.dat=eigen(sOf(dim,L),l.E); l.dat.Rmax=maxR(l.dat.W,L,NG); } return l.dat; }
function matchLevel(E){ const r=Math.round(E*1000); for(const l of LV) if(Math.round(l.E*1000)===r) return l; return null; }
function wAt(W,r){ const f=gidx(r), i=f>=NG?NG-1:f|0; return W[i]+(W[i+1]-W[i])*(f-i); }
const fmtLo=v=>de(v,Number.isInteger(v)?0:1);
const viewR=E=>E<0?Math.min(RMAX,KC/Math.max(-E,0.25)+4*Math.sqrt(C/Math.max(-E,0.25))):RMAX;
function fitZoom(dim,E){ const z=ZOOM[dim]; let k=0; for(let i=0;i<z.length;i++) if(z[i]<E*1.04) k=i; return k; }
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
function nodeText(dim,L,k){ return (dim===3?plural(k,'Knotenkugel','Knotenkugeln'):plural(k,'Knotenkreis','Knotenkreise'))+' und '+
  (dim===3?plural(L,'Knotenfläche','Knotenflächen'):plural(L,'Knotengerade','Knotengeraden'))+' durch den Kern'; }

// Ein Zustand mit allem, was die drei Fenster zum Zeichnen brauchen. lv gesetzt: exaktes Niveau, sonst Versuchslösung.
function buildScene(dim,L,ori,E,lv){
  const ss=sOf(dim,L), Ee=lv?lv.E:E, sc={id:++SID,dim,L,s:ss,E:Ee,rv:viewR(Ee),RT:new Float32Array(NT+2),FG:new Float32Array(NT+2),ang:angOf(dim,L,ori),iso:0,isoFor:null};
  const disc=KC*KC+4*Ee*C*ss*(ss-1); sc.rt=Ee<0&&disc>=0?(KC+Math.sqrt(disc))/(-2*Ee):null;
  if(lv){ const d=levelDat(dim,L,lv); Object.assign(sc,{type:'eig',lv,W:d.W,us:1/d.umax,Rs:1/d.Rmax,nodes:lv.k,is:NG}); }
  else{ const t=trial(ss,E); let um=t.umax,Rm;
    if(t.is<0){ const r=sc.rv*0.5, w=Math.abs(wAt(t.W,r)); um=Math.pow(r,ss)*w; Rm=Math.pow(r,L)*w; } else Rm=maxR(t.W,L,t.is);
    Object.assign(sc,{type:'trial',W:t.W,us:1/(um||1),Rs:1/(Rm||1),nodes:t.nodes,endSign:t.endSign,allowed:t.allowed,is:t.is}); }
  // Tabellen über r: R(r) und die Marke FG für den Bereich, in dem die Versuchslösung wegläuft
  const rtMax=sc.rtMax=Math.min(RMAX,sc.rv*1.45), away=sc.type==='trial'&&E<=BOUND[dim], rIs=sc.rIs=away?(sc.is>0?GR[sc.is]:0):Infinity;
  let fg=0,rEff=0;
  for(let j=0;j<=NT;j++){ const r=j*rtMax/NT, w=wAt(sc.W,r); let v=Math.pow(r,L)*w*sc.Rs; v=clamp(v,-1e6,1e6); sc.RT[j]=v;
    if(r>rIs) fg=Math.max(fg,clamp((Math.abs(Math.pow(r,ss)*w)*sc.us-0.3)/0.9,0,1)); sc.FG[j]=fg;
    if(Math.abs(v)>0.004||fg>0) rEff=r; }
  sc.RT[NT+1]=sc.RT[NT]; sc.FG[NT+1]=sc.FG[NT]; sc.rEff=Math.min(rtMax,rEff+rtMax/NT*2);
  return sc;
}
// Wert von |ψ|, dessen Fläche 90 % der Aufenthaltswahrscheinlichkeit umschließt
function isoLevel(sc){ if(sc.isoFor===sc.ang) return sc.iso;
  const o=sc.ang, as=o.as, cum=o.cum, K=as.length, T=sc.RT, dr=sc.rtMax/NT, jm=Math.min(NT,isFinite(sc.rIs)?Math.floor(sc.rIs/dr):NT);
  let tot=0; for(let j=1;j<=jm;j++) tot+=j*j*T[j]*T[j]; tot*=cum[K-1];
  let iso=0.3;
  if(tot>0){ const P=tau=>{ let p=0; for(let j=1;j<=jm;j++){ const Rj=Math.abs(T[j]); if(Rj<=tau) continue; const need=tau/Rj; let a=0,b=K;
        while(a<b){ const m=(a+b)>>1; if(as[m]>=need) a=m+1; else b=m; } if(a>0) p+=j*j*Rj*Rj*cum[a-1]; } return p; };
    let a=0,b=1; for(let it=0;it<26;it++){ const m=0.5*(a+b); if(P(m)>0.9*tot) a=m; else b=m; } iso=Math.max(0.5*(a+b),0.004); }
  sc.iso=iso; sc.isoFor=o; return iso; }

function rebuild(){
  const dim=S.dim, L=S.L[dim]; s=sOf(dim,L); LV=levelsOf(dim,L);
  lo=ZOOM[dim][S.zoom[dim]]; hi=-0.04*lo; const sp=hi-lo; ve0=lo-0.14*sp; ve1=hi+0.14*sp;
  fsPerSec=1.2*HPL/Math.abs(lo);
  const sl=$('eslider'); sl.min=lo; sl.max=hi; S.E=clamp(S.E,lo,hi); sl.value=S.E;
  $('zoomseg').innerHTML=ZOOM[dim].map((v,i)=>`<button type="button" data-z="${i}" aria-pressed="${i===S.zoom[dim]}">ab ${fmtLo(v)} eV</button>`).join('');
  renderLegend(); renderInfo(); compute(); if(S.math) renderMath();
}
function compute(){
  const dim=S.dim, L=S.L[dim], E=S.E; S.Eby[dim]=E;
  cur=buildScene(dim,L,S.ori[L],E,E<=BOUND[dim]?matchLevel(E):null);
  if(cur.type==='eig'){ const sv=S.saved[dim], k=cur.lv.k;   // erreichte Niveaus werden von selbst ins Termschema eingetragen
    if(!sv.some(q=>q.L===L&&q.k===k)){ sv.push({L,k,E:cur.lv.E}); sv.sort((a,b)=>a.E-b.E||a.L-b.L); if(S.math) renderMath(); } }
  $('eout').innerHTML=`<var>E</var> = ${de(E,3)} eV`; const n=curN(); $('nout').textContent=n?'n = '+n:'\u00a0';
  renderStatus(); renderQN(); renderTerm(); touch();
}
// Einrasten: tol ist der Fangbereich in eV, tmin sein Mindestwert. Zwischen eng benachbarten Niveaus schrumpft er, damit dazwischen frei wählbare Energien bleiben.
function setE(E,snap,tol,tmin){
  E=clamp(E,lo,hi);
  if(snap&&S.snap&&LV.length){ if(tol===undefined){ tol=(hi-lo)/300; tmin=tol; } let best=null,bd=Infinity;
    for(let i=0;i<LV.length;i++){ const l=LV[i], gap=Math.min(i>0?l.E-LV[i-1].E:Infinity,i<LV.length-1?LV[i+1].E-l.E:Infinity), d=Math.abs(l.E-E);
      if(d<Math.max(tmin,Math.min(tol,0.45*gap))&&d<bd){bd=d;best=l;} } if(best) E=best.E; }
  S.E=Math.round(E*1000)/1000; $('eslider').value=S.E; compute();
}
function setL(L){ const dim=S.dim; S.L[dim]=L; ringTo(L); const lv=levelsOf(dim,L); if(lv.length) S.zoom[dim]=fitZoom(dim,lv[0].E); rebuild(); }
function gotoLevel(L,k,ori){ const dim=S.dim; S.L[dim]=L; ringTo(L); if(dim===3&&ori!==undefined) S.ori[L]=ori;
  const l=levelsOf(dim,L).find(q=>q.k===k); if(!l) return;
  if(l.E<ZOOM[dim][S.zoom[dim]]||S.zoom[dim]>fitZoom(dim,l.E)) S.zoom[dim]=fitZoom(dim,l.E);
  S.E=Math.round(l.E*1000)/1000; rebuild(); }
let lab1dReady=false;
function selectDim(dim){ S.tab=dim; 
  const one=dim===1; $('coul').hidden=one; $('lab1d').hidden=!one; renderTabs();
  if(one){ S.playing=false;   // das 1D-Labor wird erst beim ersten Öffnen aufgebaut
    if(!lab1dReady){ lab1dReady=true; const r1=$('lab1d').attachShadow({mode:'open'}); r1.appendChild(OPTS.styleEl()); r1.appendChild($('tpl1d').content.cloneNode(true)); init1D(r1,host,{order:['coul'],autoSave:true},life); } return; }
  S.dim=dim; S.E=S.Eby[dim]; S.t=0; S.mring=S.L[2]; ringAnim=null; syncUI(); layout(); rebuild(); }

// ---------- Statuszeile
function renderStatus(){
  const st=$('status'), dim=S.dim, L=S.L[dim]; let cls='bad',html='';
  if(cur.type==='eig'){ cls='ok'; const k=cur.lv.k, n=nOf(L,k);
    html=`<b>Stehende Welle.</b> Zustand ${dim===3?`<strong>${nameOf(3,L,k,S.ori[L])}</strong>`:I(`n=${n},\\ m=${L?'\\pm'+L:'0'}`,nameOf(2,L,k))}: ${I('u(r)','u(r)')} klingt außen ab und ist normierbar. ${nodeText(dim,L,k)}, zusammen ${I('n-1='+(n-1),'n − 1 = '+(n-1))}.`; }
  else if(S.E>=0){ cls='warn'; html=`<b>Ungebunden.</b> Bei ${I('E>0','E > 0')} ist das Atom ionisiert. Die Welle reicht bis ins Unendliche, jede Energie ist möglich.`; }
  else if(S.E>BOUND[dim]){ cls='warn'; html=`<b>Zu dicht.</b> Hier drängen sich die Niveaus ab ${I('n=6','n = 6')} immer enger vor ${I('E=0','E = 0')}; dafür ist der gerechnete Bereich bis 6 nm zu klein.`; }
  else if(cur.allowed<=0){ html=`<b>Zu tief.</b> Die Energie liegt überall unter ${I(R`V_{\mathrm{eff}}`,'V_eff')}. Es gibt keinen Bereich, in dem die Welle schwingen kann.`; }
  else{ html=`<b>Nicht normierbar.</b> ${I('u(r)','u(r)')} läuft außen gegen ${cur.endSign>0?I(R`+\infty`,'+∞'):I(R`-\infty`,'−∞')}: Bei dieser Energie passt keine stehende Welle in das Potenzial. Die Kurve hat ${plural(cur.nodes,'Nullstelle','Nullstellen')}.`; }
  // unsichtbare Platzhalter mit den längsten Meldungen halten die Höhe des Kastens fest
  const d3=dim===3, sizer=[`Stehende Welle. Zustand ${d3?'4f z(x²−y²)':'n = 5, m = ±3'}: u(r) klingt außen ab und ist normierbar. 1 ${d3?'Knotenkugel und 3 Knotenflächen':'Knotenkreis und 3 Knotengeraden'} durch den Kern, zusammen n − 1 = 4. xxxx`,
    'Nicht normierbar. u(r) läuft außen gegen +∞: Bei dieser Energie passt keine stehende Welle in das Potenzial. Die Kurve hat 3 Nullstellen. xxxx',
    'Zu dicht. Hier drängen sich die Niveaus ab n = 6 immer enger vor E = 0; dafür ist der gerechnete Bereich bis 6 nm zu klein. xxxx'];
  st.className='status '+cls; st.innerHTML=`<span class="on">${html}</span>`+sizer.map(t=>`<span aria-hidden="true">${t}</span>`).join('');
}

// ---------- Reiter, Quantenzahlen, Bedienelemente
const TABS=[{dim:1,name:'1D · Coulombpotenzial',icon:'M4 19C5 8 10 4 34 3'},
            {dim:2,name:'2D · Elektron in der Ebene',icon:'M4 10a14 6 0 1 0 28 0a14 6 0 1 0-28 0M17.4 10h1.2'},
            {dim:3,name:'3D · Wasserstoffatom',icon:'M8.5 10a9.5 8.5 0 1 0 19 0a9.5 8.5 0 1 0-19 0M8.5 10c0 4 19 4 19 0M17.4 10h1.2'}];
function renderTabs(){ $('tabs').innerHTML=TABS.map(t=>`<button type="button" role="tab" data-dim="${t.dim}" aria-selected="${t.dim===S.tab}"><svg viewBox="0 0 36 20" aria-hidden="true"><path d="${t.icon}"/></svg><span>${t.name}</span></button>`).join(''); }
let qnKey='', shKey='';
// Drehimpuls-Karte: Steht die Energie auf einem Niveau n, sind nur die Werte wählbar, für die die n − 1 Knoten reichen.
function renderQN(force){ const dim=S.dim, L=S.L[dim], n=curN(), d3=dim===3, key=[dim,L,S.ori[L],n].join('|'); if(!force&&key===qnKey) return; qnKey=key;
  const lmax=n?Math.min(n-1,3):3;
  const ntext=q=>q?(q===1?`Grundzustand: Es gibt keine ${d3?'Knotenfläche':'Knotenlinie'}.`:`${plural(q-1,d3?'Knotenfläche':'Knotenlinie',d3?'Knotenflächen':'Knotenlinien')} ${q===2?'ist':'sind'} zu verteilen: ${d3?'Kugeln um den Kern oder Flächen durch den Kern':'Kreise um den Kern oder Geraden durch den Kern'}.`):'Noch steht die Energie auf keinem Niveau. Bis dahin ist jeder Drehimpuls wählbar.';
  let h=`<div class="nline"><span class="nbig${n?'':' off'}">n = ${n||'?'}</span><span class="note nstack"><span class="on">${ntext(n)}</span>`+[null,1,2,4].map(q=>`<span aria-hidden="true">${ntext(q)}</span>`).join('')+`</span></div>`;
  h+=`<div class="lopts" role="group" aria-label="${d3?'Bahndrehimpuls':'Drehimpuls'}">`+[0,1,2,3].map(l=>{ const ok=l<=lmax;
    const dots=ok?(n?'<i class="dr"></i>'.repeat(n-1-l):'')+'<i class="da"></i>'.repeat(l):'';
    return `<button type="button" class="lopt" data-l="${l}" aria-pressed="${l===L}" ${ok?'':`disabled title="Passt nicht zu n = ${n}: Es sind nur ${plural(n-1,'Knoten','Knoten')} zu verteilen."`}>`+
      `<span class="lname">${d3?`${LETTER[l]}<small>l = ${l}</small>`:`${l?'±'+l:'0'}<small>m</small>`}</span><span class="dots">${ok?(dots||'–'):'passt nicht'}</span></button>`; }).join('')+`</div>`;
  h+=`<p class="note dotleg"><span><i class="dr"></i>Knoten${d3?'kugel':'kreis'} um den Kern</span><span><i class="da"></i>Knoten${d3?'fläche':'gerade'} durch den Kern</span></p>`;
  if(d3&&L>0) h+=`<div class="qgrp"><span class="qlab">Ausrichtung</span><div class="oris">`+
      ORB[L].map((o,i)=>`<button type="button" class="ori" data-o="${i}" aria-pressed="${i===S.ori[L]}">${LETTER[L]}<sub>${o.sub}</sub></button>`).join('')+`</div></div>`;
  $('qn').innerHTML=h; }
// Anzeige der Hauptquantenzahl neben den Reitern; gefundene Niveaus lassen sich direkt anwählen
function renderShells(){ const dim=S.dim, n=curN(), found=new Set(S.saved[dim].map(q=>nOf(q.L,q.k))), key=[dim,n,[...found].sort().join(',')].join('|'); if(key===shKey) return; shKey=key;
  $('shells').innerHTML=`<span class="qlab">Hauptquantenzahl</span><div class="shrow">`+[1,2,3,4,5].map(i=>`<button type="button" class="sh${i===n?' cur':found.has(i)?' found':''}" data-n="${i}" ${i===n||found.has(i)?'':'disabled'} aria-label="n = ${i}${i===n?', eingestellt':found.has(i)?', gefunden':', noch nicht gefunden'}">${i}</button>`).join('')+
    `</div><span class="shtxt${n?' on':''}">${n?'n = '+n:'zwischen den Niveaus'}</span>`; }
const CT_H=`<div class="seg" role="group" aria-label="Höhe der Fläche"><button type="button" data-set="hmode:abs">|ψ|</button><button type="button" data-set="hmode:psi">ψ</button><button type="button" data-set="hmode:prob">|ψ|²</button><button type="button" data-set="hmode:u" title="|u| = r·|ψ|, die Größe aus dem 1D-Fenster">|u|</button></div><button type="button" class="tog" data-set="exag:toggle" title="Höhe strecken, damit auch schwache Bäuche sichtbar werden">überhöht</button>`;
const CT_O=`<div class="seg" role="group" aria-label="Darstellung des Orbitals"><button type="button" data-set="omode:iso">Fläche</button><button type="button" data-set="omode:cloud">Wolke</button></div><button type="button" class="tog" data-set="cut:toggle">aufgeschnitten</button>`;
function syncSets(){ root.querySelectorAll('[data-set]').forEach(b=>{ const [k,v]=b.dataset.set.split(':'); b.setAttribute('aria-pressed',v==='toggle'?!!S[k]:S[k]===v); }); }
function syncUI(){ const d3=S.dim===3;
  $('views').classList.toggle('two',!d3); $('h3').hidden=!d3; $('c3').hidden=!d3; $('lower').classList.toggle('duo',!d3);
  const qc=$('qcard'); if(d3){ if(qc.parentNode!==$('lower')) $('lower').insertBefore(qc,$('tcard')); } else if(qc.parentNode!==$('views')) $('views').appendChild(qc);
  $('qnTitle').innerHTML=d3?'<b>l</b>Bahndrehimpuls bei diesem n':'<b>m</b>Drehimpuls bei diesem n';
  $('ringnote').textContent=d3?'Der Kreis liegt in der Schnittebene des 2D-Bilds. Jede Knotenfläche durch den Kern schneidet ihn zweimal: l Wellenlängen ergeben 2l Nullstellen auf dem Kreis, aber nur l Knotenflächen.':'Jede Knotengerade durch den Kern schneidet den Kreis zweimal: m Wellenlängen ergeben 2m Nullstellen auf dem Kreis, aber nur m Knotengeraden. Beim Wechsel sieht man, dass sich die Welle dazwischen nicht schließt.';
  $('t2').textContent=d3?'Schnittebene durch den Kern':'Welle in der Ebene'; $('lblR').textContent=d3?'ψ = u/r':'ψ = u/√r';
  $('play').textContent=S.playing?'⏸ Anhalten':'▶ Schwingung zeigen'; syncSets(); }
const ICON_INFO=`<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="var(--info)"/><rect x="9" y="8.6" width="2" height="6" rx="1" fill="var(--surface)"/><circle cx="10" cy="5.9" r="1.25" fill="var(--surface)"/></svg>`;
function renderLegend(){ const lam=s*(s-1), d3=S.dim===3;
  $('legend').innerHTML=`<button type="button" class="infobtn" id="infoBtn" aria-expanded="${S.info}" aria-controls="info">${ICON_INFO}Was zeigt die graue Fläche?</button>`+
    `<span><i class="lg-pot"></i>E &lt; V<sub>eff</sub>: Welle kann nicht schwingen</span><span><i class="lg-line"></i>V<sub>eff</sub></span>`+
    (Math.abs(lam)>1e-9?`<span><i class="lg-dot"></i>reines Coulombpotenzial</span>`:'')+
    `<span><i class="lg-dash"></i>äußerer Umkehrpunkt</span><span><i class="lg-pos"></i>ψ &gt; 0 <i class="lg-neg" style="margin-left:6px"></i>ψ &lt; 0</span><span><i class="lg-bad"></i>Welle läuft weg</span>`+
    `<span><i class="lg-rad"></i>radiale Welle im 2D-Bild${S.hmode==='u'?', dieselbe wie u im 1D-Bild':S.hmode==='prob'?'':', dieselbe wie ψ = u/'+(d3?'r':'√r')+' im 1D-Bild'}</span>`+(d3?`<span>Die Schnittfläche im 3D-Bild ist die Ebene des 2D-Bilds.</span>`:''); }
// Erklärung zum effektiven Potenzial, mit einer Skizze für den gewählten Drehimpuls
function renderInfo(){ const el=$('info'); el.hidden=!S.info; if(!S.info) return;
  const dim=S.dim, L=S.L[dim], lam=s*(s-1), has=Math.abs(lam)>1e-9, r0=lam>0?lam*A0:A0, V0=lam>0?RY/lam:RY, rm=5*r0, vlo=-2.3*V0, vhi=1.5*V0, Wd=340, Hd=196;
  const X=r=>40+r/rm*(Wd-52), Y=v=>12+(vhi-v)/(vhi-vlo)*(Hd-38);
  const path=fn=>{ let d='',open=false; for(let i=1;i<=160;i++){ const r=rm*i/160, v=fn(r); if(v<vlo||v>vhi){ open=false; continue; } d+=(open?'L':'M')+X(r).toFixed(1)+' '+Y(v).toFixed(1); open=true; } return d; };
  let area=`M${X(0)} ${Y(vlo)}`; for(let i=1;i<=160;i++){ const r=rm*i/160; area+=`L${X(r).toFixed(1)} ${Y(clamp(Veff(r,s),vlo,vhi)).toFixed(1)}`; } area+=`L${X(rm)} ${Y(vlo)}Z`;
  const lab=(fn,frac,dy,txt,col)=>{ const r=rm*frac, v=clamp(fn(r),vlo,vhi); return `<text x="${X(r).toFixed(1)}" y="${(Y(v)+dy).toFixed(1)}" fill="${col}">${txt}</text>`; };
  let svg=`<svg class="sk" viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Skizze: Coulombpotenzial, Zentrifugalbarriere und ihre Summe"><path d="${area}" fill="var(--pot-fill)"/>`+
    `<line x1="40" y1="${Y(0)}" x2="${Wd-12}" y2="${Y(0)}" stroke="var(--rule)"/><line x1="40" y1="12" x2="40" y2="${Hd-26}" stroke="var(--rule)"/>`+
    `<text x="34" y="${Y(0)+4}" text-anchor="end" fill="var(--muted)">0</text><text x="${Wd-12}" y="${Hd-8}" text-anchor="end" fill="var(--muted)">Abstand r vom Kern</text><text x="6" y="20" fill="var(--muted)">E</text>`;
  if(has){ svg+=`<path d="${path(r=>-KC/r)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="1.5 4"/>`+
      `<path d="${path(r=>C*lam/(r*r))}" fill="none" stroke="var(--cent)" stroke-width="2" stroke-dasharray="6 4"/>`+
      lab(r=>-KC/r,0.5,lam>0?16:-8,'Coulomb','var(--muted)')+lab(r=>C*lam/(r*r),lam>0?0.42:0.3,lam>0?-8:16,lam>0?'Zentrifugalbarriere':'Zusatzterm','var(--cent)'); }
  svg+=`<path d="${path(r=>Veff(r,s))}" fill="none" stroke="var(--pot)" stroke-width="2.25"/>`+lab(r=>Veff(r,s),0.72,has&&lam>0?16:-8,'V<tspan dy="3" font-size="8.5">eff</tspan>','var(--pot)')+`</svg>`;
  const cent=dim===3?I(R`\dfrac{\hbar^2\,l(l+1)}{2m\,r^2}`,'ħ²l(l+1)/2mr²'):I(R`\dfrac{\hbar^2\left(m^2-\frac14\right)}{2m\,r^2}`,'ħ²(m²−¼)/2mr²');
  const now=dim===3?(L===0?`Gerade ist ${I('l=0','l = 0')} gewählt: Es gibt keine Barriere, ${I(R`V_{\mathrm{eff}}`,'V_eff')} ist das reine Coulombpotenzial. Wähle p, d oder f, um die Barriere zu sehen.`
      :`Gerade ist ${I('l='+L,'l = '+L)} gewählt, also ${I(`l(l+1)=${L*(L+1)}`,`l(l+1) = ${L*(L+1)}`)}. Der tiefste Punkt von ${I(R`V_{\mathrm{eff}}`,'V_eff')} liegt bei ${I('r','r')} = ${de(r0,3)} nm und ${de(-V0,2)} eV.`)
    :(L===0?`Gerade ist ${I('m=0','m = 0')} gewählt. In der Ebene bleibt dann ein kleiner anziehender Zusatzterm ${I(R`-\dfrac{\hbar^2}{8m\,r^2}`,'−ħ²/8mr²')}: ${I(R`V_{\mathrm{eff}}`,'V_eff')} liegt etwas unter dem Coulombpotenzial.`
      :`Gerade ist ${I('m=\\pm'+L,'m = ±'+L)} gewählt. Der tiefste Punkt von ${I(R`V_{\mathrm{eff}}`,'V_eff')} liegt bei ${I('r','r')} = ${de(r0,3)} nm und ${de(-V0,2)} eV.`);
  el.innerHTML=`<div>${svg}</div><div><h3>Das Potenzial, das die radiale Welle spürt</h3><ul class="infolist">`+
    `<li><i class="lg-line"></i><span><b>${I(R`V_{\mathrm{eff}}(r)`,'V_eff(r)')}</b>, durchgezogen: die Summe aus Coulombpotenzial und Zentrifugalbarriere. Nur diese Summe steht in der radialen Gleichung.</span></li>`+
    `<li><i class="lg-dot"></i><span><b>Coulombpotenzial</b> ${I(R`-\dfrac{e^2}{4\pi\varepsilon_0\,r}`,'−e²/4πε₀r')}, gepunktet: die Anziehung durch den Kern. Sie ist für jeden Drehimpuls gleich.</span></li>`+
    `<li><i class="lg-cent"></i><span><b>Zentrifugalbarriere</b> ${cent}, in der Skizze gestrichelt: Sie wächst zum Kern hin steil an und wird mit dem Drehimpuls größer.</span></li>`+
    `<li><i class="lg-pot"></i><span><b>Graue Fläche</b>: alle Energien unterhalb von ${I(R`V_{\mathrm{eff}}`,'V_eff')}. Wo die Energielinie durch Grau läuft, ist ${I(R`E<V_{\mathrm{eff}}`,'E < V_eff')}. Klassisch dürfte das Elektron dort nicht sein. Die Welle schwingt dort nicht, sie klingt ab oder läuft weg.</span></li></ul>`+
    `<p><b>Warum ändert sich die Kurve mit dem Drehimpuls?</b> Ein Elektron mit Drehimpuls läuft um den Kern. Je näher es dem Kern kommt, desto schneller muss es umlaufen, weil der Drehimpuls erhalten bleibt. Die Energie dieser Umlaufbewegung fehlt der radialen Bewegung und wirkt deshalb wie ein zusätzliches abstoßendes Potenzial. Die Welle wird vom Kern weggedrückt, und die graue Fläche reicht am Kern bis ganz nach oben.</p><p>${now}</p></div>`; }

// ---------- Termschema (klein, neben dem Energie-Regler)
function renderTerm(){ renderShells();
  const dim=S.dim, sv=S.saved[dim], L0=S.L[dim], H=dim===3?250:236, top=dim===3?48:34, bot=H-12, l0=ZOOM[dim][0], ex=dim===3?0.5:1/3;
  const y=E=>top+(bot-top)*Math.pow(clamp(-E/-l0,0,1),ex), cx=L=>88+62*L;
  let h=`<svg viewBox="0 0 320 ${H}" aria-hidden="true">`;
  h+=`<rect x="${cx(L0)-28}" y="4" width="56" height="${H-8}" rx="4" fill="var(--surface-2)"/>`;
  for(let L=0;L<4;L++) h+=dim===3?`<text x="${cx(L)}" y="21" text-anchor="middle" font-weight="600" style="font-size:16px;fill:${L===L0?'var(--ink)':'var(--muted)'}">${LETTER[L]}</text><text class="ax" x="${cx(L)}" y="36" text-anchor="middle">l = ${L}</text>`
    :`<text x="${cx(L)}" y="19" text-anchor="middle" font-weight="${L===L0?600:400}" style="fill:${L===L0?'var(--ink)':'var(--muted)'}">m = ${L?'±'+L:'0'}</text>`;
  h+=`<line x1="44" y1="${top}" x2="44" y2="${bot}" stroke="var(--rule)"/><line x1="44" y1="${top}" x2="312" y2="${top}" stroke="var(--muted)" stroke-dasharray="3 4"/><text class="ax" x="6" y="${top-15}">eV</text>`;
  (dim===3?[0,-0.5,-1,-2,-4,-8,-15]:[0,-0.5,-2,-5,-15,-30,-60]).forEach(t=>{ h+=`<line x1="40" y1="${y(t)}" x2="44" y2="${y(t)}" stroke="var(--muted)"/><text class="ax" x="37" y="${y(t)+3.5}" text-anchor="end">${de(t,t>-1&&t<0?1:0)}</text>`; });
  const seen=[]; for(const q of sv){ if(seen.some(e=>Math.abs(e-q.E)<0.003)) continue; seen.push(q.E);
    const g=sv.filter(p=>Math.abs(p.E-q.E)<0.003).map(p=>p.L); if(g.length>1) h+=`<line x1="${cx(Math.min(...g))}" y1="${y(q.E)}" x2="${cx(Math.max(...g))}" y2="${y(q.E)}" stroke="var(--level)" stroke-dasharray="1.5 3.5"/>`; }
  for(const q of sv){ const yy=y(q.E), on=cur&&cur.type==='eig'&&q.L===L0&&q.k===cur.lv.k;
    h+=`<g data-l="${q.L}" data-k="${q.k}"><rect x="${cx(q.L)-28}" y="${yy-6}" width="56" height="12" fill="transparent"/>`+
       `<line x1="${cx(q.L)-24}" y1="${yy}" x2="${cx(q.L)+8}" y2="${yy}" stroke="var(--level)" stroke-width="${on?3.5:2}"/>`+
       `<text x="${cx(q.L)+12}" y="${yy+3.5}" style="font-size:10.5px">${dim===3?nOf(q.L,q.k)+LETTER[q.L]:'n='+nOf(q.L,q.k)}</text></g>`; }
  if(S.E<0){ const yy=y(S.E); h+=`<line x1="${cx(L0)-27}" y1="${yy}" x2="${cx(L0)+8}" y2="${yy}" stroke="var(--energy)" stroke-width="1.25"/><path d="M${cx(L0)-28} ${yy}l-6 -3.5v7z" fill="var(--energy)"/>`; }
  $('term').innerHTML=h+'</svg>';
  { const tn=['Anklicken öffnet das Termschema groß. Dort lässt sich jedes gefundene Niveau in mehreren Ansichten ansehen und mit einem zweiten vergleichen.','Noch kein Niveau gefunden. Suche eine Energie, bei der die Welle stehen bleibt. Sie wird hier von selbst eingetragen.'], k=sv.length?0:1; $('termnote').innerHTML=`<span class="nstack"><span class="on">${tn[k]}</span><span aria-hidden="true">${tn[1-k]}</span></span>`; }
}

// ---------- Herleitung
const steps=a=>'<ol>'+a.map(x=>`<li>${x}</li>`).join('')+'</ol>';
const merke=x=>`<div class="merke"><b>Merke.</b> ${x}</div>`;
function tbl(dim){ const sv=S.saved[dim]; let rows='';
  for(let n=1;n<=5;n++){ const E=dim===3?-RY/(n*n):-RY/((n-0.5)*(n-0.5)), st=[];
    for(let L=0;L<=Math.min(n-1,3);L++){ const f=sv.some(q=>q.L===L&&q.k===n-L-1), nm=dim===3?n+LETTER[L]:(L?'±'+L:'0'); st.push(`<span class="${f?'f':'nf'}">${nm}${f?' ✓':''}</span>`); }
    rows+=`<tr><td>${n}</td><td>${de(E,3)}</td><td>${st.join(', ')}</td></tr>`; }
  return `<div><h4>Energieniveaus</h4><div class="tblwrap"><table><thead><tr><th>${I('n','n')}</th><th>${I(R`E_n\ \text{in eV}`,'Eₙ in eV')}</th><th>${dim===3?'Zustände':'Werte von '+I('m','m')}</th></tr></thead><tbody>${rows}</tbody></table></div>`+
    `<p class="note" style="margin-top:8px">Grün mit Haken: in der Simulation gefunden.${dim===3?' Die Simulation zeigt Zustände bis '+I('l=3','l = 3')+'.':''}</p></div>`; }
const MATH={
 3(){ return [`<h3>Wasserstoffatom: Coulombpotenzial im Raum</h3>`+D(R`V(r)=-\frac{e^2}{4\pi\varepsilon_0}\cdot\frac{1}{r}`)+steps([
   `Das Potenzial hängt nur vom Abstand ${I('r')} zum Kern ab. Deshalb zerfällt die Wellenfunktion in einen radialen Anteil und einen Winkelanteil:`+D(R`\psi(r,\vartheta,\varphi)=\frac{u(r)}{r}\cdot Y_{lm}(\vartheta,\varphi)`)+`Der Winkelanteil ist eine stehende Welle auf der Kugeloberfläche. Sie schließt sich nur für ganzzahlige ${I(R`l=0,1,2,\dots`)} und ${I(R`m=-l,\dots,l`)} und hat ${I('l')} Knotenlinien.`,
   `Für den radialen Anteil bleibt eine eindimensionale Schrödingergleichung mit einem effektiven Potenzial:`+D(R`-\frac{\hbar^2}{2m}\,u''(r)+V_{\mathrm{eff}}(r)\,u(r)=E\,u(r),\qquad V_{\mathrm{eff}}(r)=-\frac{e^2}{4\pi\varepsilon_0\,r}+\frac{\hbar^2\,l(l+1)}{2m\,r^2}`)+`Der zweite Summand ist die Zentrifugalbarriere: Ein Elektron mit Drehimpuls wird vom Kern ferngehalten.`,
   `Am Kern muss ${I('u(0)=0')} gelten. Weit außen ist ${I(R`E<V_{\mathrm{eff}}`)}, dort hat die Gleichung zwei Lösungen:`+D(R`u(r)\approx A\,e^{-\kappa r}+B\,e^{+\kappa r},\qquad \kappa=\frac{\sqrt{-2mE}}{\hbar}`)+`Die Simulation startet am Kern und rechnet nach außen. Bei beliebiger Energie ist ${I(R`B\neq 0`)}, und ${I('u')} läuft weg. Nur bei bestimmten Energien ist ${I('B=0')}: Dann passt eine stehende Welle zwischen Kern und Potenzialwand.`,
   `Der Ansatz ${I(R`u(r)=r^{\,l+1}\,e^{-\kappa r}\cdot P(r)`)} mit einem Polynom ${I('P')} führt auf eine Bedingung, unter der das Polynom abbricht. Hat es den Grad ${I('n_r')}, so gilt`+D(R`E_n=-\frac{m\,e^4}{8\,\varepsilon_0^2\,h^2}\cdot\frac{1}{n^2}=-\frac{13{,}6\,\mathrm{eV}}{n^2},\qquad n=n_r+l+1`)+`${I(R`n_r=0,1,2,\dots`)} ist die Zahl der Nullstellen von ${I('u(r)')} zwischen Kern und Unendlich.`,
   `Die einfachsten Lösungen, mit dem bohrschen Radius ${I(R`a_0=\dfrac{4\pi\varepsilon_0\hbar^2}{m\,e^2}=0{,}0529\,\mathrm{nm}`)}:`+D(R`u_{1s}(r)\propto r\,e^{-r/a_0},\qquad u_{2s}(r)\propto r\left(1-\frac{r}{2a_0}\right)e^{-r/(2a_0)},\qquad u_{2p}(r)\propto r^2\,e^{-r/(2a_0)}`)])+
   merke(`Die Energie hängt nur von ${I('n=n_r+l+1')} ab. Ein Knoten mehr in radialer Richtung kostet genauso viel Energie wie eine Knotenfläche mehr im Winkelanteil. Deshalb liegen 2s und 2p auf gleicher Höhe, ebenso 3s, 3p und 3d. Zu jedem ${I('n')} gehören ${I('n^2')} Zustände.`), tbl(3)]; },
 2(){ return [`<h3>Coulombpotenzial in der Ebene</h3><p>Das Elektron kann sich nur in einer Ebene bewegen. Das Potenzial ist dasselbe wie im Raum:</p>`+D(R`V(r)=-\frac{e^2}{4\pi\varepsilon_0}\cdot\frac{1}{r}`)+steps([
   `In Polarkoordinaten zerfällt die Wellenfunktion in einen radialen Anteil und einen Winkelanteil:`+D(R`\psi(r,\varphi)=\frac{u(r)}{\sqrt{r}}\cdot e^{\,i m\varphi}`)+`Nach einem Umlauf um den Kern muss die Welle wieder an sich selbst anschließen:`+D(R`e^{\,im(\varphi+2\pi)}=e^{\,im\varphi}\quad\Longleftrightarrow\quad m=0,\pm1,\pm2,\dots`)+`Auf einen Umlauf passen also genau ${I('|m|')} Wellenlängen. Die Simulation zeigt die reelle stehende Welle ${I(R`\cos(m\varphi)`)}.`,
   `Für den radialen Anteil bleibt eine eindimensionale Schrödingergleichung mit einem effektiven Potenzial:`+D(R`-\frac{\hbar^2}{2m}\,u''(r)+V_{\mathrm{eff}}(r)\,u(r)=E\,u(r),\qquad V_{\mathrm{eff}}(r)=-\frac{e^2}{4\pi\varepsilon_0\,r}+\frac{\hbar^2\left(m^2-\frac14\right)}{2m\,r^2}`),
   `Weit außen ist ${I(R`E<V_{\mathrm{eff}}`)}, dort hat die Gleichung zwei Lösungen:`+D(R`u(r)\approx A\,e^{-\kappa r}+B\,e^{+\kappa r},\qquad \kappa=\frac{\sqrt{-2mE}}{\hbar}`)+`Die Simulation startet am Kern und rechnet nach außen. Nur bei bestimmten Energien ist ${I('B=0')}, und die Welle bleibt zwischen Kern und Potenzialwand stehen.`,
   `Der Ansatz ${I(R`u(r)=r^{\,|m|+1/2}\,e^{-\kappa r}\cdot P(r)`)} mit einem Polynom vom Grad ${I('n_r')} liefert`+D(R`E_n=-\frac{13{,}6\,\mathrm{eV}}{\left(n-\frac12\right)^2},\qquad n=n_r+|m|+1`),
   `Der Grundzustand:`+D(R`\psi_1(r)\propto e^{-2r/a_0},\qquad E_1=-4\cdot 13{,}6\,\mathrm{eV}=-54{,}4\,\mathrm{eV}`)])+
   merke(`In der Ebene ist das Elektron viermal so fest gebunden wie im Raum, weil es dem Kern in einer Richtung weniger ausweichen kann. Auch hier hängt die Energie nur von ${I('n=n_r+|m|+1')} ab. Zu jedem ${I('n')} gehören ${I('2n-1')} Zustände.`), tbl(2)]; }
};
function renderMath(){ const [a,b]=MATH[S.dim]();
  $('math').innerHTML=`<div>${a}</div><div><h4>Zugrunde liegt</h4>${D(R`-\frac{\hbar^2}{2m}\,\Delta\psi+V(r)\,\psi=E\,\psi,\qquad\int|\psi|^2\,\mathrm{d}V=1`)}${b}</div>`; }


// ---------- Zeichnen: gemeinsame Hilfen
const cv=$('cv'), ctx=cv.getContext('2d'), sf=$('sf'), sctx=sf.getContext('2d'), ob=$('ob'), octx2=ob.getContext('2d'), rg=$('rg'), rctx=rg.getContext('2d');
let dpr=1,COL={},RGB={},THEMEV=0,PRm={l:0,t:0,w:1,h:1};
const M=480, bU=new Float64Array(M+1), CL=2.7, KCL=7;
const hex=h=>{ h=h.replace('#',''); if(h.length===3) h=h.replace(/./g,'$&$&'); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; };
function readColors(){ const cs=getComputedStyle(host), v=n=>cs.getPropertyValue(n).trim();
  COL={plot:v('--plot'),ink:v('--ink'),muted:v('--muted'),rule:v('--rule'),grid:v('--grid'),psi:v('--psi'),neg:v('--neg'),prob:v('--prob'),pot:v('--pot'),potfill:v('--pot-fill'),energy:v('--energy'),level:v('--level'),bad:v('--bad'),surface:v('--surface'),cent:v('--cent')};
  RGB={plot:hex(COL.plot),psi:hex(COL.psi),neg:hex(COL.neg),prob:hex(COL.prob),bad:hex(COL.bad),sheet:hex(v('--sheet')),muted:hex(COL.muted)}; THEMEV++; }
function fit(c){ const r=c.getBoundingClientRect(), w=Math.round(r.width*dpr), h=Math.round(r.height*dpr); if(r.width>4&&(c.width!==w||c.height!==h)){ c.width=w; c.height=h; } return r; }
function layout(){ dpr=window.devicePixelRatio||1; fit(cv); fit(sf); fit(ob); fit(rg); }
function niceStep(a,b,n){ const raw=(b-a)/n, p=10**Math.floor(Math.log10(raw)), f=raw/p; return (f<1.5?1:f<3.5?2:f<7.5?5:10)*p; }
function niceTicks(a,b,n){ const st=niceStep(a,b,n), o=[]; for(let t=Math.ceil(a/st-1e-9)*st;t<=b+1e-9;t+=st) o.push(Math.abs(t)<1e-12?0:t); return o; }
function niceDec(a,b,n){ return Math.max(0,-Math.floor(Math.log10(niceStep(a,b,n))+1e-9)); }
const FONT=(w,sz)=>`${w} ${sz}px "Atkinson Hyperlegible Next Variable",system-ui,sans-serif`;
function halo(c,txt,x,y){ const f=c.fillStyle; c.strokeStyle=COL.plot; c.lineWidth=3.5; c.lineJoin='round'; c.globalAlpha=.85; c.strokeText(txt,x,y); c.globalAlpha=1; c.fillStyle=f; c.fillText(txt,x,y); }
function gizmo(c,gx,gy,B,axes){ const ax=axes.map(a=>({lab:a[3],u:a[0]*B.X[0]+a[1]*B.X[1]+a[2]*B.X[2],v:a[0]*B.Y[0]+a[1]*B.Y[1]+a[2]*B.Y[2],d:a[0]*B.V[0]+a[1]*B.V[1]+a[2]*B.V[2]})).sort((a,b)=>a.d-b.d);
  c.font=FONT(600,11); c.textAlign='center'; c.textBaseline='middle';
  for(const a of ax){ if(Math.hypot(a.u,a.v)<0.12) continue; c.globalAlpha=0.5+0.5*(a.d+1)/2; c.strokeStyle=COL.ink; c.fillStyle=COL.ink; c.lineWidth=1.25; c.beginPath(); c.moveTo(gx,gy); c.lineTo(gx+a.u*17,gy-a.v*17); c.stroke(); c.fillText(a.lab,gx+a.u*25,gy-a.v*25); }
  c.globalAlpha=1; }
function stateLabel(c,x,y,sc){ c.textAlign='left'; c.textBaseline='top';
  if(sc.type==='eig'){ const L=sc.L, k=sc.lv.k; c.fillStyle=COL.level; c.font=FONT(600,15);
    if(sc.dim===3){ const a=nOf(L,k)+LETTER[L]; halo(c,a,x,y); if(L>0){ const wd=c.measureText(a).width; c.font=FONT(600,11); halo(c,sc.ang.sub,x+1+wd,y+7); } }
    else halo(c,`n = ${nOf(L,k)}, m = ${L?'±'+L:'0'}`,x,y); }
  else{ c.fillStyle=COL.muted; c.font=FONT(500,12.5); halo(c,'Versuchslösung',x,y); } }

// ---------- Fenster 1D: radiale Welle im effektiven Potenzial
function fillU(sc,W,scale,ex=sc.s){ for(let j=0;j<=M;j++){ const r=sc.rv*j/M; bU[j]=Math.pow(r,ex)*wAt(W,r)*scale; } }
function strokeCurve(c,l,w,y0,A,fn){ const dx=w/M; let open=false,tip=-1; c.beginPath();
  for(let j=0;j<=M;j++){ const v=fn(bU[j]); if(!(Math.abs(v)<=CL)){ if(open) tip=j; open=false; continue; }
    const x=l+j*dx, y=y0-A*v; if(open) c.lineTo(x,y); else c.moveTo(x,y); open=true; }
  c.stroke(); return tip; }
function drawRadial(c,cw,ch,sc,o){ const l=cw<420?42:52, t=24, w=cw-l-10, h=ch-24-34, rv=sc.rv, ss=sc.s, v0=o.ve0, v1=o.ve1, sp=v1-v0;
  const X=r=>l+r/rv*w, Y=E=>t+h-(E-v0)/sp*h, cY=v=>Y(clamp(v,v0-sp,v1+sp)), lam=ss*(ss-1);
  c.save(); c.beginPath(); c.rect(l,t,w,h); c.fillStyle=COL.plot; c.fill(); c.clip();
  const nx=cw<420?4:6;
  c.strokeStyle=COL.grid; c.lineWidth=1; c.beginPath();
  niceTicks(0,rv,nx).forEach(q=>{ c.moveTo(X(q),t); c.lineTo(X(q),t+h); });
  niceTicks(v0,v1,7).forEach(q=>{ c.moveTo(l,Y(q)); c.lineTo(l+w,Y(q)); }); c.stroke();
  // verbotene Fläche unterhalb von V_eff
  const path=close=>{ c.beginPath(); if(close) c.moveTo(l,t+h+8);
    for(let px=0;px<=w;px+=1.5){ const r=Math.max(1e-7,px/w*rv), yy=cY(Veff(r,ss)); if(px===0&&!close) c.moveTo(l,yy); else c.lineTo(l+px,yy); }
    if(close){ c.lineTo(l+w,t+h+8); c.closePath(); } };
  path(true); c.fillStyle=COL.potfill; c.fill();
  if(Math.abs(lam)>1e-9){ c.strokeStyle=COL.muted; c.lineWidth=1.25; c.setLineDash([1.5,4]); c.beginPath();
    for(let px=0;px<=w;px+=2){ const r=Math.max(1e-7,px/w*rv), yy=cY(-KC/r); if(px===0) c.moveTo(l,yy); else c.lineTo(l+px,yy); } c.stroke(); c.setLineDash([]); }
  path(false); c.strokeStyle=COL.pot; c.lineWidth=2; c.lineJoin='round'; c.stroke();
  { let r=rv*0.5; if(sc.rt!==null&&Math.abs(X(sc.rt)-X(r))<34) r=rv*0.68; const yy=Y(Veff(r,ss))+16;
    if(yy<t+h-4&&yy>t+14){ c.fillStyle=COL.muted; c.font=FONT(500,12); c.textAlign='left'; c.textBaseline='middle'; c.fillText('V',X(r),yy); c.font=FONT(500,9.5); c.fillText('eff',X(r)+8,yy+4); } }
  const A=h*0.105, wt=o.wt;
  // gespeicherte Niveaus dieser Spalte
  c.strokeStyle=COL.level; c.lineWidth=1.5; c.beginPath();
  for(const q of o.saved){ const yy=Y(q.E), disc=KC*KC+4*q.E*C*lam, r1=disc>=0?(KC+Math.sqrt(disc))/(-2*q.E):0, r0=disc>=0&&lam>1e-9?(KC-Math.sqrt(disc))/(-2*q.E):0;
    c.moveTo(X(r0),yy); c.lineTo(Math.min(l+w,X(r1)),yy); } c.stroke();
  if(o.stored) for(const q of o.saved){ const lv=levelsOf(sc.dim,sc.L).find(p=>p.k===q.k); if(!lv||(sc.type==='eig'&&sc.lv===lv)) continue; const d=levelDat(sc.dim,sc.L,lv);
    fillU(sc,d.W,Math.cos(lv.E*wt)/d.umax); c.strokeStyle=COL.level; c.lineWidth=1.25; c.globalAlpha=.75; strokeCurve(c,l,w,Y(lv.E),A,v=>v); c.globalAlpha=1; }
  // Energie und Umkehrpunkt
  const y0=Y(sc.E);
  if(sc.rt!==null&&sc.rt<rv){ c.strokeStyle=COL.muted; c.lineWidth=1.25; c.setLineDash([5,4]); c.beginPath(); c.moveTo(X(sc.rt),t); c.lineTo(X(sc.rt),t+h); c.stroke(); c.setLineDash([]); }
  c.strokeStyle=COL.energy; c.lineWidth=1.5; c.beginPath(); c.moveTo(l,y0); c.lineTo(l+w,y0); c.stroke();
  // Welle
  const tf=Math.cos(sc.E*wt), dx=w/M;
  // ψ(r) selbst: das Profil der Fläche im 2D-Fenster entlang eines Strahls vom Kern nach außen
  if(o.showR){ fillU(sc,sc.W,sc.Rs,sc.L); c.strokeStyle=COL.cent; c.lineWidth=2; c.setLineDash([6,4]); strokeCurve(c,l,w,y0,A,v=>v*tf); c.setLineDash([]); }
  fillU(sc,sc.W,sc.us);
  if(o.showProb){ c.beginPath(); let st=false,lx=0;
    for(let j=0;j<=M;j++){ const p=bU[j]*bU[j], x=l+j*dx; if(!(p<=CL)){ if(st){ c.lineTo(lx,y0); c.closePath(); st=false; } continue; }
      if(!st){ c.moveTo(x,y0); st=true; } c.lineTo(x,y0-A*p); lx=x; }
    if(st){ c.lineTo(lx,y0); c.closePath(); }
    c.fillStyle=COL.prob; c.globalAlpha=.2; c.fill(); c.globalAlpha=1; c.strokeStyle=COL.prob; c.lineWidth=1.75; strokeCurve(c,l,w,y0,A,v=>v*v); }
  if(o.showU){ c.strokeStyle=COL.psi; c.lineWidth=2.25; c.lineJoin='round'; c.lineCap='round'; const tip=strokeCurve(c,l,w,y0,A,v=>v*tf);
    if(tip>0&&sc.type==='trial'&&Math.abs(tf)>0.3){ const up=bU[tip]*tf>0, x=l+(tip-1)*dx, yy=clamp(y0-A*bU[tip-1]*tf,t+8,t+h-8);
      c.fillStyle=COL.psi; c.beginPath(); c.moveTo(x,yy+(up?-9:9)); c.lineTo(x-5,yy); c.lineTo(x+5,yy); c.closePath(); c.fill(); } }
  c.font=FONT(600,12.5); c.textBaseline='bottom'; c.textAlign='right'; c.fillStyle=COL.energy; halo(c,`E = ${de(o.Eshow,3)} eV`+(sc.type==='eig'?` · n = ${nOf(sc.L,sc.lv.k)}`:''),l+w-8,clamp(y0-5,t+16,t+h));
  c.font=FONT(600,11.5); c.textAlign='right'; c.textBaseline='top'; c.fillStyle=COL.level; let lastY=-99;
  for(const q of o.saved){ const yy=Y(q.E); if(Math.abs(yy-lastY)<13||yy>t+h-16) continue; lastY=yy; halo(c,sc.dim===3?nOf(sc.L,q.k)+LETTER[sc.L]:'n = '+nOf(sc.L,q.k),l+w-8,yy+4); }
  c.restore();
  c.strokeStyle=COL.rule; c.lineWidth=1; c.strokeRect(l+.5,t+.5,w-1,h-1);
  c.fillStyle=COL.muted; c.font=FONT(400,11.5); c.textBaseline='top'; c.textAlign='center';
  const ddx=niceDec(0,rv,nx), ddy=niceDec(v0,v1,7);
  niceTicks(0,rv,nx).forEach(q=>c.fillText(de(q,ddx),X(q),t+h+6));
  c.textAlign='right'; c.textBaseline='middle'; niceTicks(v0,v1,7).forEach(q=>c.fillText(de(q,ddy),l-7,Y(q)));
  c.font=FONT(500,12); c.fillStyle=COL.ink; c.textAlign='right'; c.textBaseline='top'; c.fillText('r in nm',l+w,t+h+20);
  c.textAlign='left'; c.textBaseline='bottom'; c.fillText('E in eV',l,t-5);
  return {l,t,w,h};
}

// ---------- Fenster 2D: ψ in der Ebene als Fläche, Höhe = Amplitude
const SNR=46, SNP=72, SV=(SNR+1)*SNP, SQ=SNR*SNP;
const sX=new Float32Array(SV), sY=new Float32Array(SV), sD=new Float32Array(SV), sL=new Float32Array(SV*3), sVl=new Float32Array(SV), sF=new Float32Array(SV), qD=new Float32Array(SQ);
const qI=Array.from({length:SQ},(_,i)=>i), COSP=new Float32Array(SNP), SINP=new Float32Array(SNP);
for(let k=0;k<SNP;k++){ COSP[k]=Math.cos(k/SNP*2*Math.PI); SINP[k]=Math.sin(k/SNP*2*Math.PI); }
function surfGain(sc,hmode){ if(!S.exag||hmode==='u') return 1;
  const T=sc.RT, dr=sc.rtMax/NT, jm=Math.min(NT-1,isFinite(sc.rIs)?Math.floor(sc.rIs/dr):NT-1), a=j=>{ const v=Math.abs(T[j]); return hmode==='prob'?v*v:v; };
  let n=0,mn=1; const add=v=>{ if(v>0.002){ n++; if(v<mn) mn=v; } };
  if(a(0)>a(1)) add(a(0)); for(let j=1;j<jm;j++) if(a(j)>a(j-1)&&a(j)>=a(j+1)) add(a(j));
  if(n<2) return 1; const g=0.45/mn; let out=1; for(const q of [1.5,2,3,4,6,8,12]) if(q<=g) out=q; return out; }
function drawSurface(c,x0,y0,sz,sc,cam,hmode,tf,gain=1){
  const B=basis(cam.az,cam.el), P=sc.ang.plane, f=sc.ang.f, nrm=sc.ang.norm, inv=NT/sc.rtMax, rv=sc.rv, HZ=0.5, Sx=sz*0.39, cx=x0+sz/2, cy=y0+sz*(hmode==='psi'?0.54:0.6), atf=Math.abs(tf);
  const Xx=B.X[0],Xy=B.X[1],Xz=B.X[2],Yx=B.Y[0],Yy=B.Y[1],Yz=B.Y[2],Vx=B.V[0],Vy=B.V[1],Vz=B.V[2];
  const px=(a,b,z)=>cx+(a*Xx+b*Xy+z*Xz)*Sx, py=(a,b,z)=>cy-(a*Yx+b*Yy+z*Yz)*Sx;
  let clip=false;
  for(let i=0,p=0;i<=SNR;i++){ const rr=i/SNR, q=Math.min(rv*rr*inv,NT-1e-3), j=q|0, Rv=sc.RT[j]+(sc.RT[j+1]-sc.RT[j])*(q-j), fg=sc.FG[j], Uv=hmode==='u'?clamp(Math.pow(rv*rr,sc.s)*wAt(sc.W,rv*rr)*sc.us,-1e6,1e6):0;
    for(let k=0;k<SNP;k++,p++){ const ca=COSP[k], sa=SINP[k];
      const an=f(ca*P.X[0]+sa*P.Y[0],ca*P.X[1]+sa*P.Y[1],ca*P.X[2]+sa*P.Y[2])*nrm, v0=Rv*an, v=v0*(1-fg), uv=Uv*an*(1-fg);
      let hg=(hmode==='abs'?Math.abs(v)*atf:hmode==='psi'?v*tf:hmode==='u'?Math.abs(uv)*atf:v*v)*gain; if(hg>1.3||hg<-1.3){ hg=hg>0?1.3:-1.3; if(fg<=0) clip=true; }
      if(fg>0) hg=hg*(1-fg)+(hmode==='psi'&&v0*tf<0?-1:1)*fg*1.3;
      const a=rr*ca, b=rr*sa, z=hg*HZ; sL[3*p]=a; sL[3*p+1]=b; sL[3*p+2]=z;
      sX[p]=px(a,b,z); sY[p]=py(a,b,z); sD[p]=a*Vx+b*Vy+z*Vz; sVl[p]=hmode==='prob'?Math.abs(v):hmode==='u'?uv*tf:v*tf; sF[p]=fg; } }
  // hinter der Fläche: Nullebene und Höhenachse am hinteren Rand
  c.strokeStyle=COL.muted; c.lineWidth=1; c.globalAlpha=.6; c.beginPath(); for(let k=0;k<=SNP;k++){ const a=COSP[k%SNP], b=SINP[k%SNP]; if(k) c.lineTo(px(a,b,0),py(a,b,0)); else c.moveTo(px(a,b,0),py(a,b,0)); } c.stroke(); c.globalAlpha=1;
  { const hl=Math.hypot(Vx,Vy)||1, a=-Vx/hl*1.04, b=-Vy/hl*1.04, z0=hmode==='psi'?-HZ:0;
    c.strokeStyle=COL.ink; c.lineWidth=1.25; c.beginPath(); c.moveTo(px(a,b,z0),py(a,b,z0)); c.lineTo(px(a,b,HZ),py(a,b,HZ)); c.stroke();
    c.beginPath(); for(const z of hmode==='psi'?[-HZ,0,HZ]:[0,HZ]){ c.moveTo(px(a,b,z)-4,py(a,b,z)); c.lineTo(px(a,b,z)+4,py(a,b,z)); } c.stroke();
    c.fillStyle=COL.ink; c.font=FONT(600,12); c.textAlign='center'; c.textBaseline='bottom'; c.fillText((hmode==='abs'?'|ψ|':hmode==='psi'?'ψ':hmode==='u'?(sc.dim===3?'|u| = r·|ψ|':'|u| = √r·|ψ|'):'|ψ|²')+(gain>1?` · ${de(gain,gain%1?1:0)}-fach`:''),px(a,b,HZ),py(a,b,HZ)-5); }
  const axes=back=>{ for(const [a,b,lab] of [[1,0,P.ax[0]],[0,1,P.ax[1]]]){ if((a*Vx+b*Vy<0)!==back) continue;
      c.strokeStyle=COL.ink; c.lineWidth=1.25; c.beginPath(); c.moveTo(px(a*1.03,b*1.03,0),py(a*1.03,b*1.03,0)); c.lineTo(px(a*1.2,b*1.2,0),py(a*1.2,b*1.2,0)); c.stroke();
      c.fillStyle=COL.ink; c.font=FONT(600,11.5); c.textAlign='center'; c.textBaseline='middle'; halo(c,lab,px(a*1.33,b*1.33,0),py(a*1.33,b*1.33,0)); } };
  axes(true);
  // Flächenstücke von hinten nach vorn
  for(let i=0,qn=0;i<SNR;i++) for(let k=0;k<SNP;k++,qn++){ const a=i*SNP+k, b=a+SNP, k2=(k+1)%SNP; qD[qn]=sD[a]+sD[b]+sD[(i+1)*SNP+k2]+sD[i*SNP+k2]; }
  qI.sort((a,b)=>qD[a]-qD[b]);
  const base=RGB.sheet, bad=RGB.bad, dens=hmode==='prob'; c.lineWidth=0.6; c.lineJoin='round';
  for(let n=0;n<SQ;n++){ const qn=qI[n], i=(qn/SNP)|0, k=qn-i*SNP, k2=(k+1)%SNP, a=i*SNP+k, b=a+SNP, d=i*SNP+k2, e=(i+1)*SNP+k2;
    const v=(sVl[a]+sVl[b]+sVl[d]+sVl[e])*0.25, fg=(sF[a]+sF[b]+sF[d]+sF[e])*0.25, av=Math.min(1,v<0?-v:v), m=dens?Math.pow(av,1.1):Math.pow(av,0.6), col=dens?RGB.prob:(v>0?RGB.psi:RGB.neg);
    const ux=sL[3*e]-sL[3*a], uy=sL[3*e+1]-sL[3*a+1], uz=sL[3*e+2]-sL[3*a+2], wx=sL[3*d]-sL[3*b], wy=sL[3*d+1]-sL[3*b+1], wz=sL[3*d+2]-sL[3*b+2];
    let nx=uy*wz-uz*wy, ny=uz*wx-ux*wz, nz=ux*wy-uy*wx; const nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1; if(nz<0){ nx=-nx; ny=-ny; nz=-nz; }
    const sh=0.68+0.32*Math.max(0,(-0.35*nx-0.45*ny+0.82*nz)/nl);
    let r_=base[0]+(col[0]-base[0])*m, g_=base[1]+(col[1]-base[1])*m, b_=base[2]+(col[2]-base[2])*m;
    if(fg>0){ const tt=fg*0.85; r_+=(bad[0]-r_)*tt; g_+=(bad[1]-g_)*tt; b_+=(bad[2]-b_)*tt; }
    r_=(r_*sh)|0; g_=(g_*sh)|0; b_=(b_*sh)|0;
    c.fillStyle=`rgb(${r_},${g_},${b_})`; c.strokeStyle=`rgb(${(r_*0.9)|0},${(g_*0.9)|0},${(b_*0.9)|0})`;
    c.beginPath(); c.moveTo(sX[a],sY[a]); c.lineTo(sX[b],sY[b]); c.lineTo(sX[e],sY[e]); c.lineTo(sX[d],sY[d]); c.closePath(); c.fill(); c.stroke(); }
  // radiale Welle: Schnitt durch die Fläche entlang eines Strahls vom Kern nach außen, dort wo der Winkelanteil am größten ist.
  // Die Richtung hängt nur vom Zustand ab, nicht vom Blickwinkel: Die Linie liegt fest auf der Fläche und dreht sich mit ihr.
  // Bei gleich guten Richtungen (s-Zustände) ist es die erste Achse der Ebene.
  { let bk=0,bs=-1e9; for(let k=0;k<SNP;k++){ const sco=Math.abs(f(COSP[k]*P.X[0]+SINP[k]*P.Y[0],COSP[k]*P.X[1]+SINP[k]*P.Y[1],COSP[k]*P.X[2]+SINP[k]*P.Y[2]))*nrm-1e-6*k; if(sco>bs){ bs=sco; bk=k; } }
    const ca=COSP[bk], sa=SINP[bk], an=f(ca*P.X[0]+sa*P.Y[0],ca*P.X[1]+sa*P.Y[1],ca*P.X[2]+sa*P.Y[2])*nrm, NL=140; c.beginPath();
    for(let i=0;i<=NL;i++){ const rr=i/NL, q=Math.min(rv*rr*inv,NT-1e-3), j=q|0, fg=sc.FG[j], v0=(sc.RT[j]+(sc.RT[j+1]-sc.RT[j])*(q-j))*an, v=v0*(1-fg);
      const uv=hmode==='u'?clamp(Math.pow(rv*rr,sc.s)*wAt(sc.W,rv*rr)*sc.us,-1e6,1e6)*an*(1-fg):0;
      let hg=clamp((hmode==='abs'?Math.abs(v)*atf:hmode==='psi'?v*tf:hmode==='u'?Math.abs(uv)*atf:v*v)*gain,-1.3,1.3);
      if(fg>0) hg=hg*(1-fg)+(hmode==='psi'&&v0*tf<0?-1:1)*fg*1.3;
      const x=px(rr*ca,rr*sa,hg*HZ), y=py(rr*ca,rr*sa,hg*HZ); if(i) c.lineTo(x,y); else c.moveTo(x,y); }
    c.lineJoin='round'; c.lineCap='round'; c.strokeStyle=COL.plot; c.lineWidth=5.5; c.globalAlpha=.8; c.stroke(); c.globalAlpha=1; c.strokeStyle=COL.cent; c.lineWidth=2.75; c.stroke(); }
  // Umkehrpunkt auf der Fläche, Achsen der Ebene
  if(sc.rt!==null&&sc.rt<rv){ const i=Math.round(sc.rt/rv*SNR); c.strokeStyle=COL.ink; c.lineWidth=1.25; c.setLineDash([5,4]); c.beginPath();
    for(let k=0;k<=SNP;k++){ const p=i*SNP+k%SNP; if(k) c.lineTo(sX[p],sY[p]); else c.moveTo(sX[p],sY[p]); } c.stroke(); c.setLineDash([]); }
  axes(false);
  c.fillStyle=COL.muted; c.font=FONT(500,11.5); c.textAlign='left'; c.textBaseline='bottom'; c.fillText(`Radius der Scheibe: ${de(rv,rv<0.2?3:2)} nm`,x0+10,y0+sz-8);
  if(gain>1) c.fillText(`Höhe ${de(gain,gain%1?1:0)}-fach überhöht${clip?', Spitze abgeschnitten':''}`,x0+10,y0+sz-24);
}

// ---------- Fenster 3D: Orbital als Fläche oder Wolke, auf Wunsch aufgeschnitten
const mkBuf=()=>{ const off=document.createElement('canvas'); return {off,octx:off.getContext('2d'),img:null,key:''}; };
const mainBuf=mkBuf(), thumbBuf=mkBuf(), cmpBufs=[mkBuf(),mkBuf()];
function renderOrb(buf,n,sc,B,mode,cut,ks,tf){
  if(buf.off.width!==n||!buf.img){ buf.off.width=n; buf.off.height=n; buf.img=buf.octx.createImageData(n,n); }
  const d=buf.img.data, bg=RGB.plot, cp=RGB.psi, cn=RGB.neg, cb=RGB.bad, gy=RGB.muted;
  const f=sc.ang.f, nrm=sc.ang.norm, tab=sc.RT, fgt=sc.FG, inv=NT/sc.rtMax, R0=sc.rv, N=sc.ang.plane.N, Nx=N[0],Ny=N[1],Nz=N[2];
  const Xx=B.X[0],Xy=B.X[1],Xz=B.X[2],Yx=B.Y[0],Yy=B.Y[1],Yz=B.Y[2],Vx=B.V[0],Vy=B.V[1],Vz=B.V[2], bn=Vx*Nx+Vy*Ny+Vz*Nz;
  const Sr=Math.min(R0*1.42,sc.rEff), S2=Sr*Sr, ds=2*Sr/ks, dsn=ds/R0, atf=Math.abs(tf), pos=tf>=0, iso=mode==='iso'?isoLevel(sc):0, del=R0*0.012;
  // Licht von links oben vorn, im Raum ausgedrückt
  const Lx=-0.4*Xx+0.55*Yx+0.73*Vx, Ly=-0.4*Xy+0.55*Yy+0.73*Vy, Lz=-0.4*Xz+0.55*Yz+0.73*Vz;
  let Hx=Lx+Vx, Hy=Ly+Vy, Hz=Lz+Vz; const hl=Math.sqrt(Hx*Hx+Hy*Hy+Hz*Hz); Hx/=hl; Hy/=hl; Hz/=hl;
  const tm=Math.sqrt(atf), cpT=[0,1,2].map(i=>gy[i]+(cp[i]-gy[i])*tm), cnT=[0,1,2].map(i=>gy[i]+(cn[i]-gy[i])*tm);
  const val=(x,y,z)=>{ const r=Math.sqrt(x*x+y*y+z*z), q=r*inv; if(q>=NT) return 0; const j=q|0, ir=1/(r+1e-12);
    return (tab[j]+(tab[j+1]-tab[j])*(q-j))*f(x*ir,y*ir,z*ir)*nrm*(1-fgt[j]); };
  let o=0;
  for(let py=0;py<n;py++){ const sy=(1-2*(py+.5)/n)*R0;
    for(let px=0;px<n;px++,o+=4){ const sx=(2*(px+.5)/n-1)*R0, rho2=sx*sx+sy*sy;
      let r_=bg[0],g_=bg[1],b_=bg[2];
      const ox=sx*Xx+sy*Yx, oy=sx*Xy+sy*Yy, oz=sx*Xz+sy*Yz;
      if(mode==='slice'){ const v=val(ox,oy,oz), a0=Math.min(1,(v<0?-v:v)*atf), al=Math.pow(a0,0.6), col=(v>0)===pos?cp:cn;
        r_+=(col[0]-r_)*al; g_+=(col[1]-g_)*al; b_+=(col[2]-b_)*al; }
      else if(rho2<S2){ const tc=Math.sqrt(S2-rho2); let t0=tc, t1=-tc, face=false;
        if(cut){ const a=ox*Nx+oy*Ny+oz*Nz; if(bn>1e-6){ const tk=-a/bn; if(tk<t0){ t0=tk; face=true; } } else if(bn<-1e-6){ const tk=-a/bn; if(tk>t1) t1=tk; } else if(a>0) t0=t1; }
        if(t0>t1){ let T=1,ar=0,ag=0,ab=0,done=false,ap=0;
          if(face){ const v=val(ox+t0*Vx,oy+t0*Vy,oz+t0*Vz), a0=v<0?-v:v; ap=a0;
            if(mode==='iso'){ if(a0>=iso){ const al=0.22+0.78*Math.pow(Math.min(1,a0),0.6), col=(v>0)===pos?cpT:cnT; r_=bg[0]+(col[0]-bg[0])*al; g_=bg[1]+(col[1]-bg[1])*al; b_=bg[2]+(col[2]-bg[2])*al; done=true; } }
            else{ const al=Math.pow(Math.min(1,a0*atf),0.6), col=(v>0)===pos?cp:cn; ar=al*col[0]; ag=al*col[1]; ab=al*col[2]; T=1-al; } }
          if(!done&&mode==='cloud'){
            for(let t=t0-ds*0.5;t>t1;t-=ds){ const v=val(ox+t*Vx,oy+t*Vy,oz+t*Vz); let a0=v<0?-v:v; if(a0>1.2) a0=1.2; const av=a0*atf; if(av<0.004) continue;
              const dn=av*Math.sqrt(Math.sqrt(av)), tau=KCL*dn*dsn, al=tau/(1+tau), wg=T*al, col=(v>0)===pos?cp:cn;
              ar+=wg*col[0]; ag+=wg*col[1]; ab+=wg*col[2]; T*=1-al; if(T<0.02) break; }
            r_=ar+T*bg[0]; g_=ag+T*bg[1]; b_=ab+T*bg[2]; }
          else if(!done){ let tp=t0;
            for(let t=t0-ds*0.5;t>t1;t-=ds){ const v=val(ox+t*Vx,oy+t*Vy,oz+t*Vz), a0=v<0?-v:v;
              if(a0>=iso){ const th=a0>ap?tp+(t-tp)*(iso-ap)/(a0-ap):t, hx=ox+th*Vx, hy=oy+th*Vy, hz=oz+th*Vz;
                let gx=Math.abs(val(hx-del,hy,hz))-Math.abs(val(hx+del,hy,hz)), g2=Math.abs(val(hx,hy-del,hz))-Math.abs(val(hx,hy+del,hz)), g3=Math.abs(val(hx,hy,hz-del))-Math.abs(val(hx,hy,hz+del));
                const gl=Math.sqrt(gx*gx+g2*g2+g3*g3)||1; gx/=gl; g2/=gl; g3/=gl;
                const nl=Math.max(0,gx*Lx+g2*Ly+g3*Lz), sp=Math.pow(Math.max(0,gx*Hx+g2*Hy+g3*Hz),28)*70, sh=0.5+0.72*nl, col=(v>0)===pos?cpT:cnT;
                r_=Math.min(255,col[0]*sh+sp); g_=Math.min(255,col[1]*sh+sp); b_=Math.min(255,col[2]*sh+sp); break; }
              tp=t; ap=a0; } } } }
      // Rand, an dem die Welle wegläuft
      const qf=Math.sqrt(rho2)*inv, fg0=fgt[qf<NT?qf|0:NT];
      if(fg0>0){ const tt=fg0*0.9*(((px+py)*13/n%1)<0.5?1:0.5); r_+=(cb[0]-r_)*tt; g_+=(cb[1]-g_)*tt; b_+=(cb[2]-b_)*tt; }
      d[o]=r_; d[o+1]=g_; d[o+2]=b_; d[o+3]=255;
    } }
  buf.octx.putImageData(buf.img,0,0);
}
function drawOrbWin(c,x0,y0,sz,sc,cam,o){ const B=basis(cam.az,cam.el), n=o.hiq?336:124, ks=o.hiq?92:44;
  const key=[n,o.mode,o.cut,sc.id,sc.ang.sub,cam.az,cam.el,o.tf,THEMEV].join('|');
  if(key!==o.buf.key){ renderOrb(o.buf,n,sc,B,o.mode,o.cut,ks,o.tf); o.buf.key=key; }
  c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; c.drawImage(o.buf.off,0,0,n,n,x0,y0,sz,sz);
  const mx=x0+sz/2, my=y0+sz/2, pxn=sz/2/sc.rv;
  if(sc.rt!==null&&sc.rt<sc.rv*1.4){ c.strokeStyle=COL.muted; c.lineWidth=1.25; c.setLineDash([5,4]); c.beginPath(); c.arc(mx,my,sc.rt*pxn,0,6.2832); c.stroke(); c.setLineDash([]); }
  const stp=niceStep(0,sc.rv*0.7,1.6), bl=stp*pxn; c.strokeStyle=COL.ink; c.lineWidth=1.5; c.beginPath(); c.moveTo(x0+12,y0+sz-14); c.lineTo(x0+12+bl,y0+sz-14); c.moveTo(x0+12,y0+sz-18); c.lineTo(x0+12,y0+sz-10); c.moveTo(x0+12+bl,y0+sz-18); c.lineTo(x0+12+bl,y0+sz-10); c.stroke();
  c.fillStyle=COL.ink; c.font=FONT(500,11.5); c.textAlign='left'; c.textBaseline='bottom'; c.fillText(`${de(stp,Math.max(0,-Math.floor(Math.log10(stp)+1e-9)))} nm`,x0+12,y0+sz-21);
  gizmo(c,x0+sz-32,y0+sz-32,B,[[1,0,0,'x'],[0,1,0,'y'],[0,0,1,'z']]);
}

// ---------- Karte Drehimpuls: die Welle auf einem Kreis um den Kern (Bild von de Broglie)
// 2D: cos(mφ), beim Wechsel auch mit Zwischenwerten von m. 3D: der Winkelanteil des Orbitals auf einem Kreis in der Schnittebene.
let ringTxt='';
function ringText(sc,m){ const d3=sc.dim===3, L=sc.L, ok=d3||Math.abs(m-Math.round(m))<1e-6, mi=Math.round(m), nw=d3?L:mi, sub=d3&&L>0?sc.ang.sub:'';
  let h=`<b>${d3?`l = ${L} · ${LETTER[L]}${sub?`<sub>${sub}</sub>`:''}`:'m = '+(ok?(mi?'±'+mi:'0'):de(m,2))}</b>`;
  if(!ok) h+=`<span class="rbad">Dazwischen schließt sich die Welle nicht.</span>`;
  else if(nw===0) h+=`<span class="rok">Rundum gleich, keine Nullstelle · L = 0</span>`;
  else h+=`<span class="rok">${plural(nw,'Wellenlänge','Wellenlängen')} auf einem Umlauf · ${d3?`|L| = √${L*(L+1)}·ħ`:`L = ${nw===1?'':nw}ħ`}</span>`+
    `<span>${2*nw} Nullstellen auf dem Kreis = ${plural(nw,d3?'Knotenfläche':'Knotengerade',d3?'Knotenflächen':'Knotengeraden')} durch den Kern</span>`;
  return h; }
function drawRing(c,x0,y0,sz,sc,m,tf){
  const d3=sc.dim===3, P=sc.ang.plane, f=sc.ang.f, TAU=2*Math.PI, K=360;
  const raw=ph=>{ const ca=Math.cos(ph), sa=Math.sin(ph); return f(ca*P.X[0]+sa*P.Y[0],ca*P.X[1]+sa*P.Y[1],ca*P.X[2]+sa*P.Y[2]); };
  let vm=1; if(d3){ vm=0; for(let i=0;i<K;i++){ const a=Math.abs(raw(i/K*TAU)); if(a>vm) vm=a; } vm=vm||1; }
  const wave=d3?ph=>raw(ph)/vm:ph=>Math.cos(m*ph), ok=d3||Math.abs(m-Math.round(m))<1e-6, v0=wave(0), ve=d3?v0:Math.cos(TAU*m);
  const cx=x0+sz/2, cy=y0+sz*0.41, R0=sz*0.225, A=sz*0.075;
  const pt=(ph,v)=>{ const r=R0+A*v*tf; return [cx+r*Math.cos(ph),cy-r*Math.sin(ph),v]; };
  const signed=(n,fn)=>{ let prev=null,ps=0; c.beginPath();
    for(let i=0;i<=n;i++){ const q=fn(i), sg=q[2]*tf>=0?1:-1;
      if(prev&&sg!==ps){ c.lineTo(q[0],q[1]); c.strokeStyle=ps>0?COL.psi:COL.neg; c.stroke(); c.beginPath(); c.moveTo(q[0],q[1]); }
      else if(prev) c.lineTo(q[0],q[1]); else c.moveTo(q[0],q[1]);
      prev=q; ps=sg; }
    c.strokeStyle=ps>0?COL.psi:COL.neg; c.stroke(); };
  const dot=(q,col)=>{ c.fillStyle=col; c.beginPath(); c.arc(q[0],q[1],4,0,7); c.fill(); };
  c.lineJoin='round'; c.lineCap='round';
  // Kreis um den Kern, Achsen der Ebene, Umlaufsinn
  c.strokeStyle=COL.muted; c.lineWidth=1; c.setLineDash([4,4]); c.beginPath(); c.arc(cx,cy,R0,0,TAU); c.stroke(); c.setLineDash([]);
  c.strokeStyle=COL.rule; c.beginPath(); c.moveTo(cx,cy); c.lineTo(cx+R0+A+14,cy); c.moveTo(cx,cy); c.lineTo(cx,cy-R0-A-10); c.stroke();
  c.fillStyle=COL.muted; c.font=FONT(500,11.5); c.textAlign='left'; c.textBaseline='middle'; c.fillText(P.ax[0],cx+R0+A+18,cy);
  c.textAlign='center'; c.textBaseline='bottom'; c.fillText(P.ax[1],cx,cy-R0-A-12);
  { const ra=R0+A+11; c.strokeStyle=COL.muted; c.lineWidth=1.25; c.beginPath(); c.arc(cx,cy,ra,-0.14,-0.62,true); c.stroke();
    const ex=cx+ra*Math.cos(0.62), ey=cy-ra*Math.sin(0.62); c.beginPath(); c.moveTo(ex-7,ey-1.5); c.lineTo(ex+3.5,ey-5.5); c.lineTo(ex+1.5,ey+5.5); c.closePath(); c.fill(); }
  // Knotenlinien durch den Kern: jede trifft den Kreis an zwei Nullstellen der Welle
  const zeros=[]; if(ok){ let pv=wave(0.003); for(let i=1;i<=K;i++){ const ph=0.003+i/K*TAU, v=wave(ph); if((v>0)!==(pv>0)) zeros.push(ph-TAU/K*v/(v-pv)); pv=v; } }
  c.strokeStyle=COL.ink; c.lineWidth=1; c.globalAlpha=.55; c.setLineDash([3,3]); c.beginPath();
  for(const z of zeros){ if(z>Math.PI+0.01) continue; const ex=(R0+A+9)*Math.cos(z), ey=(R0+A+9)*Math.sin(z); c.moveTo(cx-ex,cy+ey); c.lineTo(cx+ex,cy-ey); }
  c.stroke(); c.setLineDash([]); c.globalAlpha=1;
  c.fillStyle=COL.ink; c.beginPath(); c.arc(cx,cy,2.5,0,7); c.fill();
  // zweiter Umlauf: läuft nur bei ganzzahligem m wieder auf derselben Spur
  if(!ok){ c.lineWidth=1.5; c.globalAlpha=.32; signed(K,i=>{ const ph=TAU+i/K*TAU; return pt(ph,wave(ph)); }); c.globalAlpha=1; }
  c.lineWidth=2.75; signed(K,i=>{ const ph=i/K*TAU; return pt(ph,wave(ph)); });
  c.lineWidth=1.5; for(const z of zeros){ c.strokeStyle=COL.ink; c.fillStyle=COL.plot; c.beginPath(); c.arc(cx+R0*Math.cos(z),cy-R0*Math.sin(z),3.5,0,7); c.fill(); c.stroke(); }
  const p0=pt(0,v0), p1=pt(TAU,ve);
  if(!ok){ c.strokeStyle=COL.bad; c.lineWidth=3; c.beginPath(); c.moveTo(p0[0],p0[1]); c.lineTo(p1[0],p1[1]); c.stroke(); dot(p1,COL.bad); }
  dot(p0,COL.ink);
  // derselbe Umlauf abgerollt
  const ux0=x0+30, ux1=x0+sz-30, uy=y0+sz*0.875, ua=sz*0.045, X=q=>ux0+q*(ux1-ux0), full=Math.floor(m+1e-9);
  if(!ok&&m>0){ c.fillStyle=COL.bad; c.globalAlpha=.13; c.fillRect(X(full/m),uy-ua-6,X(1)-X(full/m),2*ua+12); c.globalAlpha=1; }
  c.strokeStyle=COL.rule; c.lineWidth=1; c.beginPath(); c.moveTo(ux0,uy); c.lineTo(ux1,uy); c.stroke();
  c.strokeStyle=COL.muted; c.globalAlpha=.6; c.beginPath(); c.moveTo(X(0),uy-ua-6); c.lineTo(X(0),uy+ua+6); c.moveTo(X(1),uy-ua-6); c.lineTo(X(1),uy+ua+6);
  if(!d3&&m>0) for(let k=1;k<=full;k++){ c.moveTo(X(k/m),uy-ua-6); c.lineTo(X(k/m),uy+ua+6); } c.stroke(); c.globalAlpha=1;
  c.lineWidth=2.25; signed(K,i=>{ const q=i/K, v=wave(q*TAU); return [X(q),uy-ua*v*tf,v]; });
  c.lineWidth=1.5; for(const z of zeros){ c.strokeStyle=COL.ink; c.fillStyle=COL.plot; c.beginPath(); c.arc(X((z%TAU)/TAU),uy,3,0,7); c.fill(); c.stroke(); }
  const q0=[ux0,uy-ua*v0*tf], q1=[ux1,uy-ua*ve*tf];
  if(!ok){ c.strokeStyle=COL.muted; c.lineWidth=1; c.setLineDash([3,4]); c.beginPath(); c.moveTo(ux0,q0[1]); c.lineTo(ux1,q0[1]); c.stroke(); c.setLineDash([]);
    c.strokeStyle=COL.bad; c.lineWidth=3; c.beginPath(); c.moveTo(ux1,q0[1]); c.lineTo(ux1,q1[1]); c.stroke(); dot(q1,COL.bad); }
  dot(q0,COL.ink);
  c.fillStyle=COL.muted; c.font=FONT(500,11.5); c.textBaseline='top'; c.textAlign='left'; c.fillText('Start',ux0-4,uy+ua+9);
  c.textAlign='right'; c.fillText('nach einem Umlauf',ux1+4,uy+ua+9);
  c.textAlign='left'; c.textBaseline='bottom'; c.fillText('Derselbe Umlauf abgerollt',ux0-4,uy-ua-9);
}

// ---------- Ablauf
let raf=0,last=0,lastInt=0,refT=0;
const dlg=$('dlg');
function req(){ if(!raf) raf=life.raf(tick); }
function touch(){ lastInt=performance.now(); req(); }
function sq(c,cnv){ const r=cnv.getBoundingClientRect(), sz=Math.min(r.width,r.height); c.setTransform(dpr,0,0,dpr,0,0); c.fillStyle=COL.plot; c.fillRect(0,0,r.width,r.height); return {x0:(r.width-sz)/2,y0:(r.height-sz)/2,sz,w:r.width,h:r.height}; }
function drawMain(hiq){ const dim=S.dim, L=S.L[dim], wt=1.519267*S.t, tf=Math.cos(cur.E*wt);
  let r=cv.getBoundingClientRect();
  if(r.width>10){ ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,r.width,r.height);
    PRm=drawRadial(ctx,r.width,r.height,cur,{ve0,ve1,saved:S.saved[dim].filter(q=>q.L===L),stored:S.show.stored,showU:S.show.u,showProb:S.show.prob,showR:S.show.r,wt,Eshow:S.E}); }
  let g=sq(sctx,sf); if(g.sz>10){ drawSurface(sctx,g.x0,g.y0,g.sz,cur,S.cam.surf,S.hmode,tf,surfGain(cur,S.hmode)); stateLabel(sctx,12,10,cur); }
  if(dim===3){ g=sq(octx2,ob); if(g.sz>10){ drawOrbWin(octx2,g.x0,g.y0,g.sz,cur,S.cam.orb,{mode:S.omode,cut:S.cut,hiq,tf,buf:mainBuf}); stateLabel(octx2,g.x0+12,g.y0+10,cur); } }
  g=sq(rctx,rg); if(g.sz>10) drawRing(rctx,g.x0,g.y0,g.sz,cur,S.mring,tf);
  const rt=ringText(cur,S.mring); if(rt!==ringTxt){ ringTxt=rt; $('ringtxt').innerHTML=rt; }
  const hud=$('hud'), on=S.playing||S.t>0; hud.hidden=!on; if(on){ const txt=`t = ${de(S.t,3)} fs`; if(hud.textContent!==txt) hud.textContent=txt; }
}
function tick(ts){ raf=0; const dt=last?Math.min(.05,(ts-last)/1000):0; last=ts; const open=dlg.open;
  if(S.playing&&!open) S.t+=dt*fsPerSec;
  if(ringAnim){ const q=(performance.now()-ringAnim.t0)/700; if(q>=1){ S.mring=ringAnim.to; ringAnim=null; } else S.mring=ringAnim.from+(ringAnim.to-ringAnim.from)*q*q*(3-2*q); }
  const low=S.dim===3&&((S.playing&&!open)||performance.now()-lastInt<140);
  if(open) drawCmp(!low); else drawMain(!low);
  if((S.playing&&!open)||ringAnim) req(); else{ last=0; if(low){ clearTimeout(refT); refT=setTimeout(req,170); } } }

// ---------- Termschema groß: Orbitale ansehen und vergleichen
const SCN=new Map(), THUMBS=new Map(), THUMBCAM=basis(-0.55,0.3), TOPCAM=basis(0,Math.PI/2);
function levelScene(dim,L,k,ori){ const key=`${dim}:${L}:${k}:${ori}`; let sc=SCN.get(key);
  if(!sc){ const lv=levelsOf(dim,L).find(l=>l.k===k); sc=buildScene(dim,L,ori,lv.E,lv); SCN.set(key,sc); } return sc; }
function thumb(dim,L,k,ori){ const key=`${dim}:${L}:${k}:${ori}:${THEMEV}`; let t=THUMBS.get(key);
  if(!t){ const sc=levelScene(dim,L,k,ori); renderOrb(thumbBuf,92,sc,dim===3?THUMBCAM:TOPCAM,dim===3?'iso':'slice',false,46,1);
    t=document.createElement('canvas'); t.width=92; t.height=92; t.getContext('2d').drawImage(thumbBuf.off,0,0); thumbBuf.key=''; THUMBS.set(key,t); } return t; }
function addCmp(L,k,ori){ const a=S.cmp[S.dim], e=a.find(q=>q.L===L&&q.k===k);
  if(e){ if(ori!==undefined) e.ori=ori; } else{ a.push({L,k,ori:ori!==undefined?ori:(S.dim===3?S.ori[L]:0)}); if(a.length>2) a.shift(); } }
function renderDlg(){ const dim=S.dim, sv=S.saved[dim], cmp=S.cmp[dim], d3=dim===3;
  $('dlgTitle').textContent=d3?'Termschema des Wasserstoffatoms':'Termschema für das Elektron in der Ebene';
  let h='<div class="colh"></div>';
  for(let L=0;L<4;L++) h+=`<div class="colh">${d3?`<b>${LETTER[L]}</b><small>l = ${L}</small>`:`m = ${L?'±'+L:'0'}`}</div>`;
  for(let n=5;n>=1;n--){ const found=sv.filter(q=>nOf(q.L,q.k)===n);
    h+=`<div class="rowh"><span>n = ${n}</span><small>${found.length?de(found[0].E,3)+' eV':'&nbsp;'}</small></div>`;
    for(let L=0;L<4;L++){ const k=n-L-1; if(k<0){ h+='<div class="tcell"></div>'; continue; }
      if(!sv.some(q=>q.L===L&&q.k===k)){ h+=`<div class="tcell none"><div class="tname">?</div><div class="tline"></div></div>`; continue; }
      const sel=cmp.find(q=>q.L===L&&q.k===k), oris=d3?ORB[L].map((_,i)=>i):[0];
      h+=`<div class="tcell${sel?' sel':''}"><div class="thumbs">`+oris.map(o=>`<button type="button" class="th" data-th="${L}:${k}:${o}" aria-pressed="${!!(sel&&sel.ori===o)}" aria-label="${d3?n+LETTER[L]+' '+ORB[L][o].sub:'n = '+n}"><canvas width="92" height="92"></canvas></button>`).join('')+
        `</div><div class="tname">${d3?n+LETTER[L]:'n = '+n}</div><div class="tline"></div></div>`; } }
  const g=$('tgrid'); g.innerHTML=h;
  g.querySelectorAll('.th').forEach(b=>{ const [L,k,o]=b.dataset.th.split(':').map(Number); b.firstChild.getContext('2d').drawImage(thumb(dim,L,k,o),0,0); });
  $('tnote').textContent=sv.length?'Nicht maßstäblich: Die Zeilen haben gleichen Abstand. Eingetragen sind die Niveaus, die im Labor gefunden wurden. Ein Klick auf ein Orbital zeigt es unten in drei Ansichten. Ein zweites Niveau wird zum Vergleich daruntergestellt.'
    :'Noch ist kein Niveau gefunden. Finde im Labor Energien, bei denen die Welle stehen bleibt; sie werden von selbst eingetragen. Für einen schnellen Überblick trägt „Alle Niveaus eintragen“ sie ein.';
  $('cmpbar').innerHTML=`<span class="elabel">Darstellung</span><span class="qgrp"><span class="note">Höhe im 2D-Bild</span>${CT_H}</span>`+(d3?`<span class="qgrp"><span class="note">3D-Bild</span>${CT_O}</span>`:'')+`<span class="note">Ziehen dreht die Bilder.</span>`;
  $('cmpbar').hidden=!cmp.length;
  $('cmp').innerHTML=cmp.map((q,i)=>{ const n=nOf(q.L,q.k), lv=levelsOf(dim,q.L).find(l=>l.k===q.k);
    return `<div class="cmprow"><div class="cmphead"><span class="cname">${d3?nameOf(3,q.L,q.k,q.ori):'n = '+n+', m = '+(q.L?'±'+q.L:'0')}</span>`+
      `<span class="cmeta">${d3?`n = ${n}, l = ${q.L} · `:''}E = ${de(lv.E,3)} eV · ${nodeText(dim,q.L,q.k)}</span>`+
      `<span class="sp"><button type="button" class="btn" data-goto="${i}">Im Labor einstellen</button><button type="button" class="xbtn" data-rm="${i}" aria-label="Aus dem Vergleich entfernen">×</button></span></div>`+
      (d3&&q.L>0?`<div class="oris">`+ORB[q.L].map((o,j)=>`<button type="button" class="ori" data-cori="${i}:${j}" aria-pressed="${j===q.ori}">${LETTER[q.L]}<sub>${o.sub}</sub></button>`).join('')+`</div>`:'')+
      `<div class="cmpcv${d3?'':' two'}"><figure><div class="cvwrap"><canvas data-c="rad" data-i="${i}"></canvas></div><figcaption>1D · radiale Welle u(r) und |u|² im effektiven Potenzial</figcaption></figure>`+
      `<figure><div class="cvwrap"><canvas class="rot" data-c="surf" data-i="${i}"></canvas></div><figcaption>2D · ${d3?'ψ in der Schnittebene durch den Kern':'ψ in der Ebene'}, Höhe = Amplitude</figcaption></figure>`+
      (d3?`<figure><div class="cvwrap"><canvas class="rot" data-c="orb" data-i="${i}"></canvas></div><figcaption>3D · Orbital${S.omode==='iso'?', Fläche umschließt 90 % der Aufenthaltswahrscheinlichkeit':' als Wolke'}</figcaption></figure>`:'')+`</div></div>`; }).join('');
  syncSets(); cmpBufs.forEach(b=>b.key=''); touch();
}
function drawCmp(hiq){ const dim=S.dim, cmp=S.cmp[dim];
  $('cmp').querySelectorAll('canvas').forEach(cn=>{ const q=cmp[+cn.dataset.i]; if(!q) return; const sc=levelScene(dim,q.L,q.k,q.ori), r=fit(cn), c=cn.getContext('2d'); if(r.width<10) return;
    c.setTransform(dpr,0,0,dpr,0,0); c.fillStyle=COL.plot; c.fillRect(0,0,r.width,r.height); const sz=Math.min(r.width,r.height), x0=(r.width-sz)/2, y0=(r.height-sz)/2;
    if(cn.dataset.c==='rad'){ const zl=ZOOM[dim][fitZoom(dim,sc.E)], zh=-0.04*zl, sp=zh-zl; drawRadial(c,r.width,r.height,sc,{ve0:zl-0.14*sp,ve1:zh+0.14*sp,saved:[],stored:false,showU:true,showProb:true,showR:S.show.r,wt:0,Eshow:sc.E}); }
    else if(cn.dataset.c==='surf') drawSurface(c,x0,y0,sz,sc,S.cam.surf,S.hmode,1,surfGain(sc,S.hmode));
    else drawOrbWin(c,x0,y0,sz,sc,S.cam.orb,{mode:S.omode,cut:S.cut,hiq,tf:1,buf:cmpBufs[+cn.dataset.i]}); }); }
function openDlg(L,k){ if(L!==undefined) addCmp(L,k); else if(!S.cmp[S.dim].length&&cur.type==='eig'&&S.saved[S.dim].some(q=>q.L===cur.L&&q.k===cur.lv.k)) addCmp(cur.L,cur.lv.k,S.dim===3?S.ori[cur.L]:0);
  if(!dlg.open) dlg.showModal(); renderDlg(); }
function closeDlg(){ if(dlg.open) dlg.close(); }
dlg.addEventListener('close',()=>{ mainBuf.key=''; touch(); });
dlg.addEventListener('click',e=>{ if(e.target===dlg){ closeDlg(); return; }
  const dim=S.dim, cmp=S.cmp[dim], t=e.target.closest('button'); if(!t) return;
  if(t.id==='dlgClose') closeDlg();
  else if(t.id==='fillAll'){ const sv=S.saved[dim]; for(let L=0;L<4;L++) for(const l of levelsOf(dim,L)) if(!sv.some(q=>q.L===L&&q.k===l.k)) sv.push({L,k:l.k,E:l.E});
    sv.sort((a,b)=>a.E-b.E||a.L-b.L); renderStatus(); renderTerm(); if(S.math) renderMath(); renderDlg(); }
  else if(t.id==='resetAll'){ S.saved[dim]=[]; S.cmp[dim]=[]; renderStatus(); renderTerm(); if(S.math) renderMath(); renderDlg(); }
  else if(t.dataset.th){ const [L,k,o]=t.dataset.th.split(':').map(Number); addCmp(L,k,o); renderDlg(); }
  else if(t.dataset.cori){ const [i,o]=t.dataset.cori.split(':').map(Number); cmp[i].ori=o; renderDlg(); }
  else if(t.dataset.rm!==undefined){ cmp.splice(+t.dataset.rm,1); renderDlg(); }
  else if(t.dataset.goto!==undefined){ const q=cmp[+t.dataset.goto]; closeDlg(); gotoLevel(q.L,q.k,q.ori); } });

// ---------- Bedienung
$('tabs').addEventListener('click',e=>{ const b=e.target.closest('button[data-dim]'); if(b) selectDim(+b.dataset.dim); });
$('qn').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||b.disabled) return;
  if(b.dataset.l!==undefined){ const l=+b.dataset.l, n=curN(); if(n) gotoLevel(l,n-1-l); else setL(l); }   // auf einem Niveau: gleiches n, also gleiche Energie
  else if(b.dataset.o!==undefined){ S.ori[S.L[3]]=+b.dataset.o; compute(); } });
$('shells').addEventListener('click',e=>{ const b=e.target.closest('.sh'); if(!b||b.disabled) return; const n=+b.dataset.n, L=S.L[S.dim]<=n-1?S.L[S.dim]:0; gotoLevel(L,n-1-L); });
root.addEventListener('click',e=>{ const b=e.target.closest('[data-set]'); if(!b) return; const [k,v]=b.dataset.set.split(':');
  S[k]=v==='toggle'?!S[k]:v; syncSets(); if(k==='hmode') renderLegend(); if(dlg.open&&k==='omode') renderDlg(); else touch(); });
$('legend').addEventListener('click',e=>{ if(e.target.closest('#infoBtn')){ S.info=!S.info; renderLegend(); renderInfo(); } });
const sl=$('eslider'); let slDrag=false;
let slTouch=false; sl.addEventListener('pointerdown',e=>{ slDrag=true; slTouch=e.pointerType!=='mouse'; }); life.on(window,'pointerup',()=>slDrag=false);
sl.addEventListener('input',()=>{ const px=(hi-lo)/Math.max(sl.clientWidth,100); setE(+sl.value,slDrag,px*(slTouch?11:6),px*(slTouch?5:3)); });
$('fine').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.d!==undefined) setE(S.E+ +b.dataset.d,false);
  else if(b.dataset.z!==undefined){ S.zoom[S.dim]=+b.dataset.z; rebuild(); } });
$('snap').addEventListener('change',e=>S.snap=e.target.checked);
for(const [id,k] of [['showU','u'],['showProb','prob'],['showStored','stored'],['showR','r']]) $(id).addEventListener('change',e=>{ S.show[k]=e.target.checked; req(); });
$('play').addEventListener('click',()=>{ S.playing=!S.playing; syncUI(); touch(); });
$('t0').addEventListener('click',()=>{ S.t=0; touch(); });
$('term').addEventListener('click',e=>{ const g=e.target.closest('[data-k]'); if(g) openDlg(+g.dataset.l,+g.dataset.k); else openDlg(); });
$('term').addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openDlg(); } });
$('openDlg').addEventListener('click',()=>openDlg());
$('mathBtn').addEventListener('click',()=>{ S.math=!S.math; $('math').hidden=!S.math; $('mathBtn').setAttribute('aria-expanded',S.math);
  $('mathBtn').textContent=S.math?'Herleitung ausblenden':'Herleitung einblenden'; if(S.math) renderMath(); });
let drag=null;
cv.addEventListener('pointerdown',e=>{ cv.setPointerCapture(e.pointerId); const r=cv.getBoundingClientRect(); drag={top:r.top,touch:e.pointerType!=='mouse'}; eFromY(e.clientY-r.top); });
cv.addEventListener('pointermove',e=>{ if(drag) eFromY(e.clientY-drag.top); });
cv.addEventListener('pointerup',()=>drag=null); cv.addEventListener('pointercancel',()=>drag=null);
function eFromY(y){ const px=(ve1-ve0)/PRm.h, t=drag&&drag.touch; setE(ve0+(PRm.t+PRm.h-y)*px,true,px*(t?15:8),px*(t?6:4)); }
// Drehen: gilt für die Bilder im Labor und im Vergleich
let rot=null;
root.addEventListener('pointerdown',e=>{ const cn=e.target.closest&&e.target.closest('canvas.rot'); if(!cn) return; cn.setPointerCapture(e.pointerId);
  rot={x:e.clientX,y:e.clientY,cam:(cn.id==='sf'||cn.dataset.c==='surf')?S.cam.surf:S.cam.orb,surf:cn.id==='sf'||cn.dataset.c==='surf'}; });
root.addEventListener('pointermove',e=>{ if(!rot) return; const cm=rot.cam;
  cm.az-=(e.clientX-rot.x)*0.01; cm.el=clamp(cm.el+(e.clientY-rot.y)*0.01,rot.surf?0.06:-Math.PI/2,Math.PI/2); rot.x=e.clientX; rot.y=e.clientY; touch(); });
root.addEventListener('pointerup',()=>rot=null); root.addEventListener('pointercancel',()=>rot=null);

// ---------- Start
function onTheme(){ readColors(); if(dlg.open) renderDlg(); req(); }
const ro=life.ro(()=>{ layout(); touch(); }); ro.observe(cv); ro.observe(sf); ro.observe(ob); ro.observe(rg); ro.observe(dlg);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(req);
function mjReady(){ MJ=true; 
  root.querySelectorAll('[data-tex]').forEach(el=>{ const h=mj(el.dataset.tex,false); if(h) el.innerHTML=h; });
  renderQN(true); renderStatus(); renderInfo(); if(S.math) renderMath(); }
root.querySelector('[data-ctl="h"]').innerHTML=CT_H; root.querySelector('[data-ctl="o"]').innerHTML=CT_O;
readColors(); let tab0=[1,2,3].includes(OPTS.tab)?OPTS.tab:2;
selectDim(tab0===1?2:tab0); if(tab0===1) selectDim(1);
mjReady();
}
