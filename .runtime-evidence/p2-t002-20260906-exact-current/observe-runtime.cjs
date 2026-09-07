// Evidence observer only: no evaluation, mutation, or credential capture.
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, 'runtime-network.jsonl');
const log = value => fs.appendFileSync(out, JSON.stringify({atUtc:new Date().toISOString(), ...value})+'\n');
(async () => {
  const pages = await (await fetch('http://127.0.0.1:8081/json/list')).json();
  const page = pages.find(p => p.appId === 'com.anonymous.tripwisemobile');
  if (!page) throw Error('TripWise debugger missing');
  const ws = new WebSocket(page.webSocketDebuggerUrl.replace('localhost','127.0.0.1'));
  let id = 0;
  const pending = new Map(), requests = new Map();
  const send = (method, params={}) => { const n=++id; pending.set(n,method); ws.send(JSON.stringify({id:n,method,params})); };
  ws.onopen = () => { log({event:'connected',appId:page.appId}); send('Network.enable'); send('Debugger.enable'); };
  ws.onmessage = event => {
    const m=JSON.parse(event.data);
    if (m.id) {
      const method=pending.get(m.id); pending.delete(m.id);
      if (m.error) log({event:'protocolError',method,error:m.error});
      else if (method?.startsWith('body:')) {
        try {
          const body=JSON.parse(m.result.base64Encoded?Buffer.from(m.result.body,'base64').toString():m.result.body);
          const graph=body?.data || body;
          log({event:'responseBody',requestId:method.slice(5),graph:graph?.days?{id:graph.id,revision:graph.workspaceRevision,days:graph.days.map(d=>({id:d.id,dayNumber:d.dayNumber,items:d.items.map(i=>({id:i.id,position:i.position,resolution:i.resolution}))}))}: {revision:graph?.revision,noOp:graph?.noOp}});
        } catch { log({event:'bodyUnavailable',requestId:method.slice(5)}); }
      }
      return;
    }
    const p=m.params;
    if(m.method==='Debugger.scriptParsed' && p.url && /bundle/.test(p.url)) log({event:'bundle',url:p.url.split('?')[0],hash:p.hash});
    if(m.method==='Network.requestWillBeSent' && /\/rest\/v1\/rpc\/(move_travel_workspace_item|get_saved_trip_detail)$/.test(p.request.url)) {
      const url=new URL(p.request.url); requests.set(p.requestId,true);
      let command; try { const b=JSON.parse(p.request.postData); command=b.p_command || {tripId:b.p_trip_id}; } catch {}
      log({event:'request',requestId:p.requestId,host:url.hostname,path:url.pathname,command});
    }
    if(m.method==='Network.responseReceived' && requests.has(p.requestId)) log({event:'response',requestId:p.requestId,status:p.response.status});
    if(m.method==='Network.loadingFinished' && requests.has(p.requestId)) {
      const n=++id; pending.set(n,'body:'+p.requestId); ws.send(JSON.stringify({id:n,method:'Network.getResponseBody',params:{requestId:p.requestId}}));
    }
  };
  setTimeout(()=>{ws.close();process.exit(0);},720000);
})();
