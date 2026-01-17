// _worker.js - required to enable Cloudflare Pages Functions/Worker mode
// OpenNext's real worker will override this
addEventListener('fetch', event => {
  event.respondWith(new Response('Worker active', { status: 200 }));
});
