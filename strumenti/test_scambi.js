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
  where:(f,op,v)=>{const w=(q._w||[]).concat([[f,v]]);const q2={...q,_w:w};q2.where=(f2,o2,v2)=>{q2._w=q2._w.concat([[f2,v2]]);return q2;};q2.limit=()=>q2;q2.onSnapshot=(cb)=>{const l={match:p=>p.startsWith(path+'/'),fire:()=>cb({docs:Object.keys(store).filter(k=>k.startsWith(path+'/')&&k.split('/').length===2&&q2._w.every(([a,b])=>store[k][a]===b)).map(k=>({id:k.split('/')[1],data:()=>clone(store[k])}))})};listeners.push(l);l.fire();return()=>{};};q2.get=async()=>({docs:Object.keys(store).filter(k=>k.startsWith(path+'/')&&k.split('/').length===2&&q2._w.every(([a,b])=>store[k][a]===b)).map(k=>({id:k.split('/')[1],data:()=>clone(store[k])}))});return q2;},
  onSnapshot:(cb)=>{const seen=new Set();const l={match:p=>p.startsWith(path+'/')&&p.split('/').length===path.split('/').length+1,fire:()=>{const ch=Object.keys(store).filter(k=>l.match(k)&&!seen.has(k)).sort((a,b)=>store[a].ts-store[b].ts).map(k=>{seen.add(k);return{type:'added',doc:{data:()=>clone(store[k])}}});cb({docChanges:()=>ch});}};listeners.push(l);l.fire();return()=>{};}
};return q;}
const db={collection:colRef,runTransaction:async(fn)=>fn({get:r=>r.get(),update:(r,d)=>r.update(d)})};

function client(uid,name){
  const ls={};const ctx={console:{log(){},warn(){},error:(...a)=>console.error(uid,...a)},Math,JSON,Object,Array,String,Set,Map,parseInt,Date,Promise,setTimeout,clearTimeout,setImmediate,
    localStorage:{getItem:k=>ls[k]||null,setItem:(k,v)=>ls[k]=v,removeItem:k=>delete ls[k]},confirm:()=>true,addEventListener(){},
    document:{getElementById:id=>ctx._els[id]||null,querySelectorAll:()=>[]}};
  ctx.window=ctx; ctx._els={}; ctx.firebase={firestore:{FieldValue:{serverTimestamp:()=>SERVER_TS}}};
  vm.createContext(ctx);
  for(const f of ['cards_data.js','progression.js','collezione.js','scambi.js']) vm.runInContext(fs.readFileSync(dir+'/js/'+f,'utf8'),ctx);
  const log=[];ctx.Account={db,user:{uid},nickname:()=>name,queueSave(){}};
  ctx.UI={showToast:t=>log.push(t),showScreen(){},showModal(){},renderShopView(){}};
  ctx.Collezione.migra();ctx.Collezione.scegliStarter('Neon Phantom');
  return {ctx,log,P:ctx.Progression};
}
(async()=>{
  const A=client('ua','Ale'),B=client('ub','Bea');
  const ca=await A.ctx.Scambi.codiceAmico(), cb=await B.ctx.Scambi.codiceAmico();
  A.ctx.Scambi.avvia();B.ctx.Scambi.avvia();
  const give=Object.keys(A.P.data.unlockedCards)[0]; A.P.data.unlockedCards[give]=4;
  const want='ironaegis_1'; B.P.data.unlockedCards[want]=3;
  const before=[A.P.data.unlockedCards[give],A.P.data.unlockedCards[want]||0,B.P.data.unlockedCards[give]||0,B.P.data.unlockedCards[want]];
  A.ctx._els={scambioCodice:{value:cb},scambioDai:{value:give},scambioVuoi:{value:want}};
  await A.ctx.Scambi.proponi();
  await new Promise(r=>setTimeout(r,50));
  console.log('A dopo proposta (in sospeso)',A.P.data.unlockedCards[give],'B ricevuti',B.ctx.Scambi.ricevuti.length);
  await B.ctx.Scambi.rispondi(B.ctx.Scambi.ricevuti[0].id,true);
  await new Promise(r=>setTimeout(r,100));
  const after=[A.P.data.unlockedCards[give],A.P.data.unlockedCards[want]||0,B.P.data.unlockedCards[give]||0,B.P.data.unlockedCards[want]];
  console.log('prima A(dai,vuoi) B(dai,vuoi)',before,'dopo',after);
  console.log('stato',Object.entries(store).filter(([k])=>k.startsWith('scambi/')).map(([k,v])=>v.stato+'/'+v.esito));
  // rifiuto: la carta torna
  A.ctx._els={scambioCodice:{value:cb},scambioDai:{value:give},scambioVuoi:{value:want}};
  await A.ctx.Scambi.proponi(); await new Promise(r=>setTimeout(r,50));
  const pre=A.P.data.unlockedCards[give];
  await B.ctx.Scambi.rispondi(B.ctx.Scambi.ricevuti[0].id,false); await new Promise(r=>setTimeout(r,100));
  console.log('rifiuto: A dai prima/dopo',pre,A.P.data.unlockedCards[give]);
  console.log('log A',A.log.slice(-3));
  process.exit(0);
})();
