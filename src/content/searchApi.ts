import { TradeLanguage, getTradeHost } from "./settings";

type SearchResult = { id: string; host: string };

function requestSearchIdOnce(
  leagueName: string,
  query: any,
  host: string
): Promise<SearchResult | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "createTradeSearch",
        host,
        leagueName,
        query
      },
      (response: any) => {
        if (!response || !response.ok || !response.id) {
          console.log("[poe2-ninja-trade] trade search error", response);
          resolve(null);
          return;
        }
        resolve({ id: response.id, host });
      }
    );
  });
}

export async function requestTradeSearchId(
  leagueName: string,
  query: any,
  language: TradeLanguage
): Promise<SearchResult | null> {
  const host = getTradeHost(language);
  return requestSearchIdOnce(leagueName, query, host);
}
