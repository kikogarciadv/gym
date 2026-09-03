/* Bitácora de Fuerza — funciona sin cobertura.
   La página siempre se intenta traer de la red (así las mejoras llegan solas);
   si no hay conexión, se sirve la última copia guardada. */
var CACHE = "bitacora-v1";
var BASE = ["./", "./index.html", "./icon.png", "./manifest.webmanifest"];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(BASE).catch(function(){}); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;

  var esPagina = req.mode === "navigate" ||
                 (req.headers.get("accept") || "").indexOf("text/html") > -1;

  if(esPagina){
    /* red primero: si hay señal, siempre la versión más nueva */
    e.respondWith(
      fetch(req).then(function(res){
        var copia = res.clone();
        caches.open(CACHE).then(function(c){ c.put("./index.html", copia); });
        return res;
      }).catch(function(){
        return caches.match("./index.html").then(function(r){ return r || caches.match("./"); });
      })
    );
    return;
  }

  if(new URL(req.url).origin !== location.origin) return;

  /* iconos y manifiesto: de la caché, y se refrescan por detrás */
  e.respondWith(
    caches.match(req).then(function(hit){
      var red = fetch(req).then(function(res){
        if(res && res.status === 200){
          var copia = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || red;
    })
  );
});
