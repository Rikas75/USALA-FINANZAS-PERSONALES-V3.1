// USALA Suite — Service Worker v3
var CACHE = 'usala-v3';
var ASSETS = [
  '/index.html',
  '/css/estilos.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/transacciones.js',
  '/js/dashboard.js',
  '/config/supabase.js',
  '/manifest.json'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  // No cachear Supabase — datos siempre frescos
  if(e.request.url.indexOf('supabase.co')>-1){
    e.respondWith(fetch(e.request).catch(function(){ return new Response('[]',{headers:{'Content-Type':'application/json'}}); }));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(resp){
        if(resp && resp.status===200 && resp.type==='basic'){
          var clone=resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request,clone); });
        }
        return resp;
      }).catch(function(){
        if(e.request.destination==='document') return caches.match('/index.html');
      });
    })
  );
});
