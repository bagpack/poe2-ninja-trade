import { TradeLanguage } from "./settings";

let translationCache: Map<string, string> | null = null;
const JA_ITEMS_PATH = "data/items.ja.ndjson";

async function loadTranslationMap(language: TradeLanguage): Promise<Map<string, string>> {
  if (translationCache) return translationCache;
  if (language !== "ja") {
    translationCache = new Map();
    return translationCache;
  }
  const url = chrome.runtime.getURL(JA_ITEMS_PATH);
  const response = await fetch(url);
  const text = await response.text();
  const map = new Map<string, string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: any;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!entry.refName || !entry.name) continue;
    map.set(entry.refName, entry.name);
  }
  translationCache = map;
  return map;
}

export async function translateItemText(
  text: string | undefined,
  language: TradeLanguage
): Promise<string | undefined> {
  if (!text || language !== "ja") return text;
  const map = await loadTranslationMap(language);
  const translated = map.get(text);
  return translated || text;
}

export async function resolveJapaneseItemText(
  itemData: any,
  language: TradeLanguage
): Promise<{ type: string | undefined; name: string | undefined }> {
  if (language !== "ja") {
    return {
      type: itemData.baseType || itemData.typeLine,
      name: itemData.rarity === "Unique" ? itemData.name : undefined
    };
  }

  const map = await loadTranslationMap(language);

  const base = itemData.baseType || itemData.typeLine;
  const type = base ? map.get(base) || base : base;
  let name: string | undefined = undefined;
  if (itemData.rarity === "Unique" && itemData.name) {
    name = map.get(itemData.name) || itemData.name;
  }

  return { type, name };
}
