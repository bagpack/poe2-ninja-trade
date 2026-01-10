import { API_URL_PATTERN, DEFAULT_OBSERVER_TIMEOUT_MS } from "./constants";

function findApiUrlFromEntries(entries: PerformanceEntryList): string | null {
  for (const entry of entries) {
    const url = (entry as any).name || "";
    if (API_URL_PATTERN.test(url)) return url;
  }
  return null;
}

export function observeCharacterApiUrl(
  timeoutMs: number = DEFAULT_OBSERVER_TIMEOUT_MS
): Promise<string | null> {
  return new Promise((resolve) => {
    const initial = findApiUrlFromEntries(performance.getEntriesByType("resource"));
    if (initial) {
      resolve(initial);
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const url = findApiUrlFromEntries(list.getEntries());
      if (url) {
        observer.disconnect();
        resolve(url);
      }
    });
    observer.observe({ type: "resource", buffered: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}
