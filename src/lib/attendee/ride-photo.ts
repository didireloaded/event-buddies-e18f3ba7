export function photoStore(
  eventId: string,
  action: "read" | "save" | "remove",
  file?: File,
): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("event-buddies-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("rides");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("rides", action === "read" ? "readonly" : "readwrite");
      const store = transaction.objectStore("rides");
      const operation =
        action === "read"
          ? store.get(eventId)
          : action === "remove"
            ? store.delete(eventId)
            : store.put(file, eventId);
      let photo: Blob | null = null;
      operation.onsuccess = () => {
        photo =
          action === "read" && operation.result instanceof Blob ? operation.result : (file ?? null);
      };
      transaction.oncomplete = () => {
        db.close();
        resolve(photo);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}
