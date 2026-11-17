export type EventMemory = {
  id: string;
  eventId: string;
  createdAt: number;
  caption: string;
  pointId: string | null;
  photo: Blob;
};

function memoryRequest<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("event-buddies-memories", 1);
    request.onupgradeneeded = () => {
      request.result
        .createObjectStore("memories", { keyPath: "id" })
        .createIndex("eventId", "eventId");
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("memories", mode);
      let result: IDBRequest<T>;
      try {
        result = operation(transaction.objectStore("memories"));
      } catch (error) {
        db.close();
        reject(error);
        return;
      }
      transaction.oncomplete = () => {
        db.close();
        resolve(result.result);
      };
      transaction.onabort = transaction.onerror = () => {
        db.close();
        reject(transaction.error ?? new Error("Photo storage is unavailable"));
      };
    };
  });
}

export async function readMemories(eventId: string) {
  const rows = await memoryRequest<EventMemory[]>("readonly", (store) =>
    store.index("eventId").getAll(eventId),
  );
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveMemory(memory: EventMemory) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(memory.photo.type) ||
    memory.photo.size > 8 * 1024 * 1024
  )
    throw new Error("Choose a JPG, PNG or WebP photo up to 8 MB.");
  const source = URL.createObjectURL(memory.photo);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
  } catch {
    throw new Error("This photo couldn’t be read. Choose another JPG, PNG or WebP image.");
  } finally {
    URL.revokeObjectURL(source);
  }
  return memoryRequest("readwrite", (store) => store.put(memory));
}

export function removeMemory(id: string) {
  return memoryRequest("readwrite", (store) => store.delete(id));
}

export async function clearMemories(eventId: string) {
  // A single event-scoped transaction prevents partial deletion on failure.
  return memoryRequest("readwrite", (store) => {
    const cursor = store.index("eventId").openCursor(IDBKeyRange.only(eventId));
    cursor.onsuccess = () => {
      if (cursor.result) {
        cursor.result.delete();
        cursor.result.continue();
      }
    };
    return cursor;
  });
}
