const REMINDER_CACHE='ravi-os-reminders-v1'
const REMINDER_URL='/api/reminders'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', event => {
  const url=new URL(event.request.url)
  if(url.origin!==self.location.origin||url.pathname!==REMINDER_URL)return

  if(event.request.method==='GET'){
    event.respondWith((async()=>{
      const cache=await caches.open(REMINDER_CACHE)
      const cached=await cache.match(REMINDER_URL)
      const refresh=fetch(event.request).then(async response=>{
        if(response.ok)await cache.put(REMINDER_URL,response.clone())
        return response
      }).catch(()=>null)
      if(cached){event.waitUntil(refresh);return cached}
      const fresh=await refresh
      return fresh||new Response(JSON.stringify({reminders:[]}),{status:503,headers:{'Content-Type':'application/json'}})
    })())
    return
  }

  if(['POST','PUT','PATCH','DELETE'].includes(event.request.method)){
    event.respondWith((async()=>{
      const response=await fetch(event.request)
      if(response.ok){const cache=await caches.open(REMINDER_CACHE);await cache.delete(REMINDER_URL)}
      return response
    })())
  }
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification?.data?.url || '/reminders'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(client => 'focus' in client)
      if (existing) {
        existing.navigate(target)
        return existing.focus()
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined
    })
  )
})
