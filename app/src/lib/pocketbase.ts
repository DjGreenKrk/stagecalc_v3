import PocketBase from 'pocketbase';

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

// In browser, default store is in-memory. Let's make it persistent.
export const pb = new PocketBase(url);

// Sync with localStorage if in browser
if (typeof window !== 'undefined') {
    const savedAuth = localStorage.getItem('pb_auth');
    if (savedAuth) {
        pb.authStore.loadFromCookie(savedAuth);
    }
    pb.authStore.onChange(() => {
        localStorage.setItem('pb_auth', pb.authStore.exportToCookie());
    }, true);
}

pb.autoCancellation(false);