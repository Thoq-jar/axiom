import { useEffect, useState } from "preact/hooks";
import { connectWebSocket, SystemData } from "./websocket.ts";

type Subscriber = (data: SystemData) => void;

let cachedData: SystemData = {};
const subscribers = new Set<Subscriber>();

function notifySubscribers(data: SystemData): void {
  cachedData = data;
  for (const subscriber of subscribers) {
    subscriber(data);
  }
}

export function initGlobalDataStore(): void {
  connectWebSocket((data) => {
    notifySubscribers(data);
  });
}

export function subscribeToSystemData(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);
  if (Object.keys(cachedData).length > 0) {
    subscriber(cachedData);
  }
  return () => {
    subscribers.delete(subscriber);
  };
}

export function getCachedSystemData(): SystemData {
  return cachedData;
}

export function useSystemData(): SystemData {
  const [data, setData] = useState<SystemData>(() => cachedData);

  useEffect(() => {
    const unsubscribe = subscribeToSystemData(setData);
    return unsubscribe;
  }, []);

  return data;
}
