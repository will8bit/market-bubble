"use client";

import { useEffect, useState } from "react";

const cache: Record<string, string> = {};
const inFlight = new Set<string>();
const subscribers = new Set<() => void>();

function load(url: string) {
  if (!url || cache[url] || inFlight.has(url)) return;
  inFlight.add(url);
  fetch(url)
    .then((r) => r.blob())
    .then((blob) => {
      cache[url] = URL.createObjectURL(blob);
      subscribers.forEach((fn) => fn());
    })
    .catch(() => {})
    .finally(() => inFlight.delete(url));
}

export function preloadAvatars(urls: string[]) {
  urls.forEach(load);
}

export function getAvatar(url: string): string {
  load(url);
  return cache[url] || url;
}

export function useAvatar(url: string): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (cache[url]) return;
    load(url);
    const fn = () => setTick((n) => n + 1);
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, [url]);
  return cache[url] || url;
}
