const SW_VERSION = 'job-khoj-sw-v4';
const CACHE = SW_VERSION;
self.addEventListener('install', event => event.waitUntil((async()=>{ const c=await caches.open(CACHE); try{await c.addAll(['/','/index.html','/manifest.webmanifest']);}catch{} await self.skipWaiting(); })()));
self.addEventListener('activate', event => event.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))); await self.clients.claim(); })()));
self.addEventListener('fetch', event => {
  const req=event.request; if(req.method!=='GET') return;
  const u=new URL(req.url); if(u.origin!==self.location.origin) return;
  event.respondWith((async()=>{
    try { const res=await fetch(req,{cache:'no-store'}); if(res.ok){const c=await caches.open(CACHE); c.put(req,res.clone());} return res; }
    catch { return (await caches.match(req)) || (await caches.match('/index.html')); }
  })());
});
self.addEventListener('push', event => {
  let data={}; try{data=event.data?event.data.json():{}}catch{data={title:'JOB KHOJ',body:event.data?.text()||'New job update available.'};}
  const rawUrl=typeof data.url==='string'?data.url:'/'; let url='/'; try{const u=new URL(rawUrl,self.location.origin); if(u.origin===self.location.origin) url=u.pathname+u.search+u.hash;}catch{}
  event.waitUntil(self.registration.showNotification(String(data.title||'JOB KHOJ').slice(0,120),{body:String(data.body||'New job update available.').slice(0,500),icon:'/favicon.svg',badge:'/favicon.svg',data:{url}}));
});
self.addEventListener('notificationclick', event => { event.notification.close(); const url=event.notification.data?.url||'/'; event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{const existing=list.find(c=>new URL(c.url).origin===self.location.origin);if(existing){existing.navigate(url);return existing.focus();}return clients.openWindow(url);})); });
