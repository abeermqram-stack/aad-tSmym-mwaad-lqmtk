self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'موعد لقمتك';
  const options = {
    body: payload.body || payload.message || 'حان وقت وجبتك. خذ استراحة لطيفة.',
    icon: payload.icon || './icon-192.png',
    badge: payload.badge || './icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    tag: payload.tag || 'meal-reminder',
    data: { url: payload.url || './app' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || './app', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.registration.scope) && 'focus' in client);
    if (existing) {
      existing.navigate(destination);
      return existing.focus();
    }
    return self.clients.openWindow(destination);
  }));
});
