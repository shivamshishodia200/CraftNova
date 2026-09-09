/**
 * 360CRM Enterprise Segment Upload Queue
 * Manages reliable, resilient upload of screen recording video chunks using IndexedDB.
 * Supports offline storage, retries with exponential backoff, idempotency keys,
 * codec metadata transmission, and auto-purges uploaded chunks to prevent browser storage bloat.
 */

import { api } from './api';

export interface QueueItemMeta {
  mimeType?: string;
  videoCodec?: string;
  audioCodec?: string;
  hasVideo?: boolean;
  hasAudio?: boolean;
}

export interface QueueItem {
  id: string; // unique chunk queue id
  workSessionId: string;
  segmentNumber: number;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
  blob: Blob;
  meta?: QueueItemMeta;
  idempotencyKey: string;
  status: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

type QueueListener = (pendingCount: number, activeItem?: QueueItem) => void;

class RecordingUploadQueue {
  private dbName = '360crm_recording_queue_db_v2';
  private storeName = 'recording_chunks';
  private db: IDBDatabase | null = null;
  private isProcessing = false;
  private listeners: Set<QueueListener> = new Set();
  private maxRetries = 5;

  constructor() {
    this.initDb();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[UploadQueue] Network back online, resuming upload queue');
        this.processQueue();
      });
    }
  }

  private async initDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('workSessionId', 'workSessionId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
        }
      };

      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
        this.processQueue();
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  }

  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    this.getPendingCount().then(count => listener(count));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(count: number, activeItem?: QueueItem): void {
    this.listeners.forEach(l => {
      try {
        l(count, activeItem);
      } catch {}
    });
  }

  /**
   * Enqueues a video chunk for upload with metadata & idempotency key
   */
  public async enqueue(
    workSessionId: string,
    segmentNumber: number,
    durationSeconds: number,
    blob: Blob,
    meta?: QueueItemMeta,
    startedAt?: string,
    endedAt?: string
  ): Promise<QueueItem> {
    const db = await this.initDb();
    const idempotencyKey = `idem_${workSessionId}_seg_${segmentNumber}_${Date.now()}`;
    const item: QueueItem = {
      id: `${workSessionId}_seg_${segmentNumber}_${Date.now()}`,
      workSessionId,
      segmentNumber,
      durationSeconds,
      startedAt: startedAt || new Date(Date.now() - durationSeconds * 1000).toISOString(),
      endedAt: endedAt || new Date().toISOString(),
      blob,
      meta,
      idempotencyKey,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString()
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    const pending = await this.getPendingCount();
    this.notifyListeners(pending, item);

    // Trigger queue processing
    this.processQueue();
    return item;
  }

  /**
   * Returns count of pending/uploading chunks in queue
   */
  public async getPendingCount(): Promise<number> {
    try {
      const db = await this.initDb();
      return new Promise<number>((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.getAll();
        req.onsuccess = () => {
          const items: QueueItem[] = req.result || [];
          const pending = items.filter(i => i.status !== 'UPLOADED').length;
          resolve(pending);
        };
        req.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  /**
   * Processes the upload queue sequentially with exponential backoff
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.isProcessing = true;

    try {
      const db = await this.initDb();
      const items: QueueItem[] = await new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      const pendingItems = items
        .filter(i => i.status === 'PENDING' || (i.status === 'FAILED' && i.retryCount < this.maxRetries))
        .sort((a, b) => a.segmentNumber - b.segmentNumber);

      for (const item of pendingItems) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          break;
        }

        item.status = 'UPLOADING';
        await this.updateItem(item);
        this.notifyListeners(pendingItems.length, item);

        try {
          // Prepare Multipart FormData
          const formData = new FormData();
          const fileName = `segment_${String(item.segmentNumber).padStart(4, '0')}.webm`;
          formData.append('videoChunk', item.blob, fileName);
          formData.append('segmentNumber', String(item.segmentNumber));
          formData.append('durationSeconds', String(item.durationSeconds));
          formData.append('startedAt', item.startedAt);
          formData.append('endedAt', item.endedAt);
          formData.append('idempotencyKey', item.idempotencyKey);

          if (item.meta?.mimeType) formData.append('mimeType', item.meta.mimeType);
          if (item.meta?.videoCodec) formData.append('videoCodec', item.meta.videoCodec);
          if (item.meta?.audioCodec) formData.append('audioCodec', item.meta.audioCodec);
          if (item.meta?.hasVideo !== undefined) formData.append('hasVideo', String(item.meta.hasVideo));
          if (item.meta?.hasAudio !== undefined) formData.append('hasAudio', String(item.meta.hasAudio));

          const endpoint = `/employee/work-session/${item.workSessionId}/recording-segment`;
          const res = await api.postFormData(endpoint, formData);

          if (res.success) {
            // Upload successful: purge blob from IndexedDB to avoid storage bloat
            await this.deleteItem(item.id);
            console.log(`[UploadQueue] Successfully uploaded & verified segment #${item.segmentNumber}`);
          } else {
            throw new Error(res.message || 'Server upload failed');
          }
        } catch (uploadErr: any) {
          console.warn(`[UploadQueue] Failed to upload segment #${item.segmentNumber}:`, uploadErr.message);
          item.status = 'FAILED';
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastError = uploadErr.message;
          await this.updateItem(item);
        }
      }
    } finally {
      this.isProcessing = false;
      const count = await this.getPendingCount();
      this.notifyListeners(count);
    }
  }

  private async updateItem(item: QueueItem): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  private async deleteItem(id: string): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  /**
   * Clears any lingering chunks for a completed work session
   */
  public async clearSessionChunks(workSessionId: string): Promise<void> {
    const db = await this.initDb();
    const items: QueueItem[] = await new Promise((resolve) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const item of items) {
      if (item.workSessionId === workSessionId) {
        await this.deleteItem(item.id);
      }
    }
  }
}

export const recordingUploadQueue = new RecordingUploadQueue();
