/* Service worker ПрогноCIка. Данные счёта не кэшируем никогда: /api идёт только в сеть.
   Кэшируем только неизменяемую статику (/assets с хэшем в имени, иконки) и страницу «Нет связи». */
const VERSION = "v1";
const STATIC = `prognocik-static-${VERSION}`;
const SHELL = ["/offline.html", "/icon-192.png", "/favicon.svg"];

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(STATIC).then((cache) => cache.addAll(SHELL)));
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k.startsWith("prognocik-") && k !== STATIC).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

	// Страницы: всегда из сети (свежая версия), без сети — экран «Нет связи»
	if (request.mode === "navigate") {
		event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
		return;
	}

	// Файлы сборки с хэшем в имени не меняются — отдаём из кэша
	if (url.pathname.startsWith("/assets/")) {
		event.respondWith(
			caches.match(request).then(
				(hit) =>
					hit ||
					fetch(request).then((rs) => {
						if (rs.ok) {
							const copy = rs.clone();
							caches.open(STATIC).then((cache) => cache.put(request, copy));
						}
						return rs;
					})
			)
		);
	}
});
