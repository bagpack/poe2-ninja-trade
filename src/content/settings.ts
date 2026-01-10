export type TradeLanguage = "en" | "ja";

const STORAGE_KEY = "tradeLanguage";
const DEFAULT_LANGUAGE: TradeLanguage = "en";

export async function getTradeLanguage(): Promise<TradeLanguage> {
  const result = await chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_LANGUAGE });
  return result[STORAGE_KEY] as TradeLanguage;
}

export function getTradeHost(language: TradeLanguage): string {
  return language === "ja" ? "jp.pathofexile.com" : "www.pathofexile.com";
}
