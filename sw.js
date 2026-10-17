// Guarda a página no celular para abrir mesmo sem internet.
// Ao mudar a página, troque o número da versão abaixo.
const VERSAO = 'localizador-v17';
const OCR = 'localizador-ocr-v1';   // leitor de números offline (arquivos grandes, não mudam de versão)
const ARQUIVOS = ['./', 'index.html', 'manifest.json', 'icone-192.png', 'icone-512.png'];
const ehOCR = u => u.hostname === 'cdn.jsdelivr.net';   // leitor de números (versões fixas)

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO && k !== OCR).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (ehOCR(url)) {   // leitor offline: usa a cópia guardada; baixa só na primeira vez
    e.respondWith(caches.open(OCR).then(c => c.match(e.request.url).then(r => r || fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') c.put(e.request.url, res.clone());
      return res;
    }))));
    return;
  }
  if (url.origin !== location.origin) return; // dados do Google não passam aqui
  // tenta a internet primeiro (pega versão nova da tela); sem sinal, usa a cópia guardada
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache' }).then(r => {
      if (r.ok && !url.search) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request.url, copia)); }
      return r;
    }).catch(() => caches.match(e.request.url, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
