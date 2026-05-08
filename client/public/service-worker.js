/* eslint-disable no-restricted-globals */

// MAONI 100.04 - Service Worker for Offline Support

const CACHE_NAME = 'maoni-v100.04-v1';
const RUNTIME_CACHE = 'maoni-runtime-v1';

// Resources to pre-cache
const PRE_CACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/images/logo-drc-map.png',
  '/images/default-avatar.png',
  '/images/gallery/president-tshisekedi-rdc-fr.jpg',
  '/manifest.json'
];

// Install event - Pre-cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching assets');
        return cache.addAll(PRE_CACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Install complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - Clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName)
        );
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            console.log('[Service Worker] Deleting old cache:', cacheToDelete);
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip Supabase API calls (let them fail gracefully)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(async () => {
        // Try cache first
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If HTML request, show offline page
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/offline.html');
        }
        
        // Return a simple offline response for other requests
        return new Response(
          JSON.stringify({ 
            error: 'Vous êtes hors ligne', 
            offline: true,
            message: 'Cette fonctionnalité nécessite une connexion internet.'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-votes') {
    event.waitUntil(syncPendingVotes());
  } else if (event.tag === 'sync-proposals') {
    event.waitUntil(syncPendingProposals());
  }
});

// Sync pending votes
async function syncPendingVotes() {
  try {
    const db = await openIndexedDB();
    const pendingVotes = await db.getAll('pending-votes');
    
    for (const vote of pendingVotes) {
      try {
        const response = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vote)
        });
        
        if (response.ok) {
          await db.delete('pending-votes', vote.id);
        }
      } catch (error) {
        console.error('Failed to sync vote:', error);
      }
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Sync pending proposals
async function syncPendingProposals() {
  try {
    const db = await openIndexedDB();
    const pendingProposals = await db.getAll('pending-proposals');
    
    for (const proposal of pendingProposals) {
      try {
        const response = await fetch('/api/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proposal)
        });
        
        if (response.ok) {
          await db.delete('pending-proposals', proposal.id);
        }
      } catch (error) {
        console.error('Failed to sync proposal:', error);
      }
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Open IndexedDB for offline storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('maoni-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending-votes')) {
        db.createObjectStore('pending-votes', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('pending-proposals')) {
        db.createObjectStore('pending-proposals', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('cached-proposals')) {
        db.createObjectStore('cached-proposals', { keyPath: 'id' });
      }
    };
  });
}

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'Nouvelle activité sur MAONI',
    icon: '/images/logo-drc-map.png',
    badge: '/images/logo-drc-map.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'MAONI - Réforme Constitutionnelle',
      options
    )
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // If a window is already open, focus it
          for (const client of clientList) {
            if (client.url.includes(url) && 'focus' in client) {
              return client.focus();
            }
          }
          // Otherwise open a new window
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});