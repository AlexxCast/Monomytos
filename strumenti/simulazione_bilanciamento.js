// Simula partite tra bot: node strumenti/simulazione_bilanciamento.js <cartella gioco> <partite> <eroi>
// VILLAIN0=1: il primo eroe parte già Villain (Percorso del Velo della Storia)
// Override facoltativo delle manopole: BIL='{"scalaVita":0.5}' node strumenti/simulazione_bilanciamento.js . 200 3
const vm=require('vm'),fs=require('fs');
const dir=process.argv[2]; const N=+process.argv[3]||200; const SQ=+process.argv[4]||3;
const res={heroes:0,threat:0,villain:0,stuck:0}; let acts=[[],[],[]], firstVil=[], vilCount=0, games=0, turnsPerRound=[], finalRound=[], actReached=[0,0,0];
for(let i=0;i<N;i++){
  const q=[]; const ctx={console:{log(){},warn(){},error:console.error},Math,JSON,Object,Array,String,Set,Map,parseInt,Date,setTimeout:(f)=>q.push(f)};
  ctx.window=ctx; ctx.MONOMYTHOS_BILANCIAMENTO=JSON.parse(process.env.BIL||'{}'); vm.createContext(ctx);
  for(const f of ['cards_data.js','morale.js','minacce_effetti.js','effects.js','bilanciamento.js','engine.js','collezione.js']) { try { vm.runInContext(fs.readFileSync(dir+'/js/'+f,'utf8'),ctx); } catch(e) { if (f !== 'collezione.js') throw e; } } // collezione.js: mazzi precon veri come nel gioco
  const E=ctx.GameEngine;
  const names=Object.keys(ctx.MONOMYTHOS_DATA.chars_meta).filter(n=>n!=='Custom Hero');
  const h=names.sort(()=>Math.random()-.5).slice(0,SQ);
  let actStart=1, fv=null;
  E.on('defense_window_opened',()=>q.push(()=>E.respondToDefense({type:'bot_fallback'})));
  E.on('act_advanced',(ev,d,st)=>{acts[st.actIndex-1].push(st.round-actStart+1); actStart=st.round+1;});
  E.on('player_corrupted',(ev,p,st)=>{vilCount++; if(fv===null) fv=st.round;});
  E.startMatch({heroes:h.map((n,k)=>({name:n,isBot:true,isLocal:false,villain:k===0&&!!process.env.VILLAIN0})), threatPool: process.env.POOL ? JSON.parse(process.env.POOL) : null, actThreats: process.env.ATTI ? JSON.parse(process.env.ATTI) : null, story: process.env.ATTI ? 'sim' : null, difficolta: +process.env.DIFF || 1});
  let steps=0; while(q.length&&steps<300000&&E.state.phase!=='gameover'){q.shift()();steps++;}
  if(E.state.phase==='gameover'){res[E.state.winner]++; games++; finalRound.push(E.state.round); actReached[E.state.actIndex]++; if(E.state.winner==='heroes') acts[2].push(E.state.round-actStart+1); if(fv!==null) firstVil.push(fv);} else res.stuck++;
}
const avg=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):'-';
console.log(res,'round totali',avg(finalRound),'| round per atto',acts.map(avg).join(' / '),'| atto raggiunto',actReached.join('/'));
console.log('partite con villain',firstVil.length+'/'+games,'primo villain al round',avg(firstVil),'villain per partita',(vilCount/games).toFixed(2));
