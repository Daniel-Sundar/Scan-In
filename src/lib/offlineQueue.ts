/** Tiny IndexedDB queue for scans taken while offline. Keyed by clientScanId so
 *  replays are idempotent (server has a unique index on the same id). */
export interface QueuedScan {
  clientScanId: string;
  allocationId: string;
  rollNo: string;
  clientScannedAt: string;
}

const DB = 'scanin';
const STORE = 'scan_queue';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'clientScanId' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

export const enqueueScan = (s: QueuedScan) => tx('readwrite', (st) => st.put(s)).then(() => undefined);
export const listQueue = () => tx<QueuedScan[]>('readonly', (st) => st.getAll());
export const removeQueued = (id: string) => tx('readwrite', (st) => st.delete(id)).then(() => undefined);
export const queueSize = () => tx<number>('readonly', (st) => st.count());
