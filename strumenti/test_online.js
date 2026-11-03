// Prova del protocollo online (partita casuale + partita intera) con due giocatori e un Firestore finto: node strumenti/test_online.js .
const vm=require('vm'),fs=require('fs');const dir=process.argv[2];
// ---- mock Firestore condiviso ----
const store={}; const listeners=[]; let tsN=0;
const clone=o=>JSON.parse(JSON.stringify(o));
const SERVER_TS={__ts:1};
function fixTs(o){for(const k in o){if(o[k]===SERVER_TS)o[k]=++tsN;}return o;}
function notify(path){setImmediate(()=>listeners.forEach(l=>l.match(path)&&l.fire()));}
function docRef(path){return{path,
  get:async()=>({exists:!!store[path],data:()=>clone(store[path])}),
  set:async(d)=>{store[path]=fixTs(clone(d));notify(path);},
  update:async(d)=>{if(!store[path])throw new Error('nodoc');Object.assign(store[path],fixTs(clone(d)));notify(path);},
  collection:(n)=>colRef(path+'/'+n),
  onSnapshot:(cb)=>{const l={match:p=>p===path,fire:()=>cb({exists:!!store[path],data:()=>clone(store[path])})};listeners.push(l);l.fire();return()=>listeners.splice(listeners.indexOf(l),1);}
};}
function colRef(path){const q={path,
  doc:(id)=>docRef(path+'/'+id),
  add:async(d)=>{const id='a'+(++tsN);store[path+'/'+id]=fixTs(clone(d));notify(path+'/'+id);return docRef(path+'/'+id);},
  orderBy:()=>q,
  where:(f,op,v)=>{const w=(q._w||[]).concat([[f,v]]);const q2={...q,_w:w};q2.where=(f2,o2,v2)=>{q2._w=q2._w.concat([[f2,v2]]);return q2;};q2.limit=()=>q2;q2.get=async()=>({docs:Object.keys(store).filter(k=>k.startsWith(path+'/')&&k.split('/').length===2&&q2._w.every(([a,b])=>store[k][a]===b)).map(k=>({id:k.split('/')[1],data:()=>clone(store[k])}))});return q2;},
  onSnapshot:(cb)=>{const seen=new Set();const l={match:p=>p.startsWith(path+'/')&&p.split('/').length===path.split('/').length+1,fire:()=>{const ch=Object.keys(store).filter(k=>l.match(k)&&!seen.has(k)).sort((a,b)=>store[a].ts-store[b].ts).map(k=>{seen.add(k);return{type:'added',doc:{data:()=>clone(store[k])}}});cb({docChanges:()=>ch});}};listeners.push(l);l.fire();return()=>{};}
};return q;}
const db={collection:colRef,runTransaction:async(fn)=>fn({get:r=>r.get(),update:(r,d)=>r.update(d)})};
// ---- due client ----
function client(uid,name){
  const ctx={console:{log(){},warn(){},error:(...a)=>console.error(uid,...a)},Math,JSON,Object,Array,String,Set,Map,parseInt,Date,Promise,
    setTimeout:(f,t)=>setTimeout(f,Math.min(t||0,5)),clearTimeout,setImmediate, location:{origin:'x',pathname:'/'},
    document:{getElementById:()=>null,querySelectorAll:()=>[]}};
  ctx.window=ctx; ctx.firebase={firestore:{FieldValue:{serverTimestamp:()=>SERVER_TS}}};
  vm.createContext(ctx);
  for(const f of ['cards_data.js','effects.js','bilanciamento.js','engine.js','online.js']) vm.runInContext(fs.readFileSync(dir+'/js/'+f,'utf8'),ctx);
  const log=[];
  ctx.Account={db,user:{uid},nickname:()=>name};
  ctx.UI={showToast:t=>log.push('toast:'+t),showScreen:s=>log.push('screen:'+s),renderGameView(){},playMatchIntroLoading:(t,cb)=>cb(),openDefenseWindow:d=>{log.push('defense');setTimeout(()=>ctx.GameEngine.respondToDefense({type:'bot_fallback'}),5);},selectedHero:'Iron Aegis'};
  ctx.GameEngine.on('defense_window_opened',()=>setTimeout(()=>ctx.GameEngine.respondToDefense({type:'bot_fallback'}),5));
  return {ctx,log};
}
(async()=>{
  const H=client('host1','Ale'), G=client('guest1','Amico');
  H.ctx.Collezione={mazzoMinacce:()=>['Blackout Ostile','Torneo Clandestino','Cultisti del Velo'],registraMinaccia(){}};
  G.ctx.Collezione={mazzoMinacce:()=>["Il Colosso di Rovina","L'Eco Senza Nome"],registraMinaccia(){}};
  await H.ctx.Online.cercaPartita('Iron Aegis');
  const code=H.ctx.Online.code; console.log('host public room',code,store['rooms/'+code].public);
  await G.ctx.Online.cercaPartita('Neon Phantom');
  console.log('guest joined',G.ctx.Online.code===code);
  await new Promise(r=>setTimeout(r,800));
  console.log('status after autostart',store['rooms/'+code].status, 'acts', JSON.parse(store['rooms/'+code].stateJson||'{}').actThreats?.map(t=>t.livello+':'+t.nome));
  console.log('lobby players',store['rooms/'+code].players.map(p=>p.name+':'+p.hero));
  // giocatori "umani" automatici: quando è il proprio turno giocano come un bot
  const autoplay=(C,isGuest)=>setInterval(()=>{const E=C.ctx.GameEngine;const st=E.state;if(!st||st.phase!=='action')return;const me=st.players.find(p=>p.isLocal);const act=st.players[st.turnIndex];
    if(!me||!act||act.id!==me.id||C._busy===st.round+':'+st.turnIndex)return;C._busy=st.round+':'+st.turnIndex;
    const c=me.hand.find(c=>E.getPlayerSlot(me,c.cat)>=c.valore);
    if(c){const t=E.getValidTargetsForCard(me.id,c);const v=(t.candidates||[]).find(x=>x.isValid);E.playCardEffect(me.id,c.uid,v?v.id:'threat_boss');}
    setTimeout(()=>{ if(!c && me.hand.length) E.survivalDiscard(me.id); E.endTurn(); },20);
  },15);
  const iH=autoplay(H,false);autoplay(G,true);
  if(process.env.MIGRA){ // l'host esce a metà partita: l'ospite deve prenderne il posto
    setTimeout(async()=>{clearInterval(iH);console.log('HOST ESCE al round',H.ctx.GameEngine.state.round);await H.ctx.Online.esci();const w=setInterval(()=>{if(G.ctx.Online.isHost){G._busy=null;clearInterval(w);console.log('ospite ora host');}},20);},+process.env.MIGRA);
  }
  const t0=Date.now();
  while(Date.now()-t0<(+process.env.DUR||20000)){await new Promise(r=>setTimeout(r,200)); if((Date.now()-t0)%10000<200){const s=H.ctx.GameEngine.state;console.log('t',Math.round((Date.now()-t0)/1000),'round',s.round,'act',s.actIndex,'turn',s.turnIndex,'phase',s.phase,'def',!!H.ctx.Online._defense,'pend',!!H.ctx.GameEngine.pendingDefense);}if(H.ctx.GameEngine.state.phase==='gameover')break;}
  await new Promise(r=>setTimeout(r,1500));
  if(process.env.MIGRA){const r=store['rooms/'+code];const gs=G.ctx.GameEngine.state;
    console.log('nuovo host',r.host,'ospite isHost',G.ctx.Online.isHost,'stato',r.status,'fase',gs.phase,'round',gs.round,'vincitore',gs.winner,'vecchio host bot',gs.players.find(p=>p.uid==='host1').isBot,'log',G.log.filter(x=>x.startsWith('toast')));process.exit(0);}
  const hs=H.ctx.GameEngine.state, gs=G.ctx.GameEngine.state;
  console.log('host phase',hs.phase,'winner',hs.winner,'round',hs.round,'act',hs.actIndex);
  console.log('guest phase',gs.phase,'round',gs.round,'local player',gs.players[0].name, gs.players[0].isLocal,'vita host/guest view',hs.players[1].vita,gs.players[0].vita);
  const actions=Object.keys(store).filter(k=>k.includes('/actions/')).length;
  console.log('azioni ospite',actions,'stato json KB',(store['rooms/'+code].stateJson.length/1024).toFixed(1),'seq',store['rooms/'+code].seq,'status',store['rooms/'+code].status);
  console.log('stored phase',JSON.parse(store['rooms/'+code].stateJson).phase,'guest lastSeq',G.ctx.Online.lastSeq);
  console.log('guest log',G.log.filter(x=>!x.startsWith('screen')).slice(0,5), 'defense shown', G.log.filter(x=>x==='defense').length);
  process.exit(0);
})();
