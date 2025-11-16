// serviceworker.js - الإصدار النهائي المتكامل
const CACHE_NAME = 'barber-app-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  // الصور الأساسية
  './f1.jpg',
  './c1.jpg',
  // أيقونات التواصل الاجتماعي
  './whats.png',
  './inst.png', 
  './teleg.png',
  './tel.png',
  // صور الخدمات (يمكن إضافتها حسب الحاجة)
  './p1.jpg',
  './p2.jpg',
  './p3.jpg'
];

// حدث التثبيت
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Install Completed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation Failed', error);
      })
  );
});

// حدث التفعيل
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Deleting Old Cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activate Completed');
      return self.clients.claim();
    })
  );
});

// حدث جلب البيانات
self.addEventListener('fetch', (event) => {
  // استبعاد طلبات Firebase
  if (event.request.url.includes('firebaseio.com')) {
    return;
  }
  
  // استبعاد طلبات الصور الديناميكية (يمكن تعديل هذا حسب الحاجة)
  if (event.request.url.match(/\.(jpg|png|jpeg|gif)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // إذا كانت الصورة موجودة في الكاش، استخدمها
          if (response) {
            return response;
          }
          
          // إذا لم تكن في الكاش، حملها من الشبكة وخزنها
          return fetch(event.request)
            .then((fetchResponse) => {
              if (!fetchResponse || fetchResponse.status !== 200) {
                return fetchResponse;
              }
              
              // تخزين الاستجابة الجديدة في الكاش
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return fetchResponse;
            })
            .catch(() => {
              // في حالة فشل التحميل، يمكن إرجاع صورة بديلة
              if (event.request.destination === 'image') {
                return new Response(
                  '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1a2a3a"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="#fff" text-anchor="middle" dy=".3em">Image Not Available</text></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
            });
        })
    );
  } else {
    // للطلبات الأخرى (HTML, CSS, JS, إلخ)
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // استخدم الكاش إذا كان متاحاً
          if (response) {
            return response;
          }
          
          // استخدم الشبكة كخيار ثاني
          return fetch(event.request)
            .then((fetchResponse) => {
              // تحقق من الاستجابة الصالحة
              if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                return fetchResponse;
              }
              
              // استنساخ الاستجابة
              const responseToCache = fetchResponse.clone();
              
              // فتح الكاش وتخزين الاستجابة
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return fetchResponse;
            })
            .catch(() => {
              // معالجة حالات عدم الاتصال
              if (event.request.destination === 'document') {
                return caches.match('./index.html');
              }
              
              // للطلبات الأخرى، يمكن إرجاع رسالة خطأ
              return new Response('You are offline, and this resource is not cached.', {
                status: 408,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
});

// معالجة رسائل الخلفية
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// معالجة تحديث المحتوى
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background Sync');
    event.waitUntil(doBackgroundSync());
  }
});

// مزامنة الخلفية (يمكن تطويرها حسب الحاجة)
function doBackgroundSync() {
  return new Promise((resolve) => {
    console.log('Service Worker: Performing Background Sync');
    // هنا يمكن إضافة منطق المزامنة
    resolve();
  });
}

// معالجة الإشعارات (يمكن تطويرها حسب الحاجة)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from Barber App',
    icon: './icon.png',
    badge: './icon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: './icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Barber App', options)
  );
});

// معالجة النقر على الإشعارات
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received.');
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === self.location.origin && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});

// معالجة إغلاق الإشعارات
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed', event.notification);
});

// معالجة الأخطاء
self.addEventListener('error', (event) => {
  console.error('Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker Unhandled Rejection:', event.reason);
});

// وظيفة مساعدة لتحديث الكاش
function updateCache(request, response) {
  if (response.ok) {
    const responseClone = response.clone();
    caches.open(CACHE_NAME)
      .then((cache) => {
        cache.put(request, responseClone);
      });
  }
  return response;
}

// وظيفة مساعدة للتحقق من صحة الكاش
function isValidCacheResponse(response) {
  return response && response.status === 200 && response.type === 'basic';
}

console.log('Service Worker: Loaded Successfully');
