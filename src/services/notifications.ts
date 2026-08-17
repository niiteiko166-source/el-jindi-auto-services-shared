export type NotificationCallback = (n: any) => void;

let es: any = null;
let callbacks: NotificationCallback[] = [];

export function connectNotifications() {
  if (es) return;
  try {
    // Use the browser EventSource when available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ES = (globalThis as any).EventSource || (window as any).EventSource;
    if (!ES) return;
    es = new ES('/api/notifications/stream');
    es.onmessage = (ev: any) => {
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        callbacks.forEach((cb) => cb(data));
      } catch (err) {
        console.warn('Invalid notification payload', err);
      }
    };
    es.onerror = (_err: any) => {
      try {
        es.close();
      } catch {}
      es = null;
      setTimeout(() => connectNotifications(), 3000);
    };
  } catch (e) {
    // silent
  }
}

export function subscribeNotifications(cb: NotificationCallback) {
  callbacks.push(cb);
  if (!es) connectNotifications();
  return () => {
    const idx = callbacks.indexOf(cb);
    if (idx !== -1) callbacks.splice(idx, 1);
  };
}

export async function postNotification(notif: any) {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif),
    });
  } catch (e) {
    // ignore
  }
}
