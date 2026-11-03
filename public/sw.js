/* AXION X Web Push service worker. */
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") payload = parsed;
    } catch { payload = { body: event.data.text() }; }
  }
  const title = typeof payload.title === "string" && payload.title.trim()
    ? payload.title.slice(0, 120)
    : "AXION X";
  const options = {
    body: typeof payload.body === "string" ? payload.body.slice(0, 500) : "У вас новое уведомление.",
    icon: "/brand/axion-x-mark.png",
    badge: "/brand/axion-x-mark.png",
    data: { url: typeof payload.url === "string" && payload.url.startsWith("/") && !payload.url.startsWith("//") ? payload.url : "/notifications" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedTarget = new URL(event.notification.data?.url || "/notifications", self.location.origin);
  const target = requestedTarget.origin === self.location.origin
    ? requestedTarget.href
    : new URL("/notifications", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
