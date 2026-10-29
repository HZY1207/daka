/**
 * sw.js —— 离线缓存
 *
 * 每次重新部署,请把 CACHE_VERSION 改一个值(例如 v1.0.1),
 * 旧的 daka-* 缓存在 activate 阶段会被整体删除。
 */

const CACHE_VERSION = "v1.0.0";
const CACHE_NAME = `daka-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/main.js",
  "./js/model.js",
  "./js/storage.js",
  "./js/theme.js",
  "./js/items.js",
  "./js/calendar.js",
  "./js/stats.js",
  "./js/toast.js",
  "./js/io.js",
  "./js/shortcuts.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // cache: "reload" 绕过浏览器 HTTP 缓存,确保部署后拿到的是新文件
      await cache.addAll(ASSETS.map((url) => new Request(url, { cache: "reload" })));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith("daka-") && key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航:网络优先,断网/网关报错时回退到缓存的首页
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          // 502/503 这类"有响应但没内容"的情况也走缓存
          if (fresh.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put("./index.html", fresh.clone());
            return fresh;
          }
        } catch {
          /* 离线:落到下面的缓存 */
        }
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match("./index.html")) ||
          (await cache.match("./")) ||
          Response.error()
        );
      })()
    );
    return;
  }

  // 静态资源:缓存优先,未命中再请求网络并补进缓存
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(request, { ignoreSearch: true });
      if (hit) return hit;

      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })()
  );
});
