/* 一次性迁移：注销旧 Service Worker，清理其页面资源缓存，之后交给正常浏览器缓存。 */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('sz-school-district-')).map(key => caches.delete(key)));
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  await Promise.all(clients.map(client => client.navigate(client.url)));
})()));
