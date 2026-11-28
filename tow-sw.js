'use strict';
const PREFIX = 'towcalculator-static-';
const CACHE = PREFIX + '2026-11-28-v1';
const SHELL = [
  '/', '/assets/tow-modern.css', '/assets/calculator.js', '/assets/tow-app.js',
  '/assets/tow-mark.svg', '/assets/hitch-diagram.svg', '/manifest.webmanifest',
  '/assets/tow-192.png', '/assets/tow-512.png', '/assets/tow-maskable-512.png',
  '/assets/tow-touch-180.png', '/favicon.ico'
];
const STATIC = new Set(SHELL.filter(p => p !== '/'));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new Request(path,{ cache:'reload' })))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const rootNavigation = request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html');
  const knownStatic = url.search === '' && STATIC.has(url.pathname);
  if (rootNavigation || knownStatic) {
    event.respondWith(fetch(request).catch(async () => (await (await caches.open(CACHE)).match(rootNavigation ? '/' : url.pathname)) || Response.error()));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · TowCalculator</title><main style="max-width:38rem;margin:3rem auto;padding:1rem;font:1.1rem system-ui"><h1>This page needs a connection.</h1><p>The towing calculator is still available offline.</p><p><a href="/">Back to the calculator</a></p></main>',
      {status:503,headers:{'content-type':'text/html;charset=utf-8'}}
    )));
  }
});
