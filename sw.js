// ===== SERVICE WORKER =====
const CACHE_NAME = 'minhas-financas-v1';

// Arquivos para cache (essenciais)
const urlsToCache = [
  '/',
  '/index.html',
  '/bancos.html',
  '/receitas.html',
  '/despesas.html',
  '/cartao.html',
  '/RelatorioFamilia.html',
  '/backup.html',
  '/css/style.css',
  '/js/script.js',
  '/js/bancos.js',
  '/js/receitas.js',
  '/js/despesas.js',
  '/js/cartao.js',
  '/js/index.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js'
];

// Instalação - salva arquivos em cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepta requisições - busca do cache ou rede
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se tem no cache, retorna do cache
        if (response) {
          return response;
        }
        
        // Se não, busca da rede
        return fetch(event.request)
          .then(response => {
            // Verifica se é resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona a resposta
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
  );
});

// Limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});