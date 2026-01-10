import { getTradeLanguage } from "./settings";
import { requestTradeSearchId } from "./searchApi";
import { buildTradeQuery, buildTradeResultUrl, buildTradeUrl } from "./trade";

function buildJewelAltSet(jewels: any[]): Set<string> {
  const set = new Set<string>();
  for (const jewel of jewels) {
    const item = jewel.itemData || {};
    const name = item.name || "";
    const baseType = item.baseType || "";
    const typeLine = item.typeLine || "";
    const candidates = new Set<string>();
    if (name && baseType) candidates.add(`${name} ${baseType}`.trim());
    if (typeLine) candidates.add(typeLine);
    if (baseType) candidates.add(baseType);
    if (name) candidates.add(name);
    for (const candidate of candidates) {
      if (candidate) set.add(candidate);
    }
  }
  return set;
}

function findJewelCells(jewelAltSet: Set<string>): Array<{ el: Element; alt: string }> {
  const cells = Array.from(document.querySelectorAll("div.w-16"));
  return cells
    .map((el) => {
      const img = el.querySelector("img[alt]");
      const alt = ((img && img.getAttribute("alt")) || "").trim();
      return { el, alt };
    })
    .filter((row) => row.alt && jewelAltSet.has(row.alt));
}

function buildJewelAltMap(jewels: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const jewel of jewels) {
    const item = jewel.itemData || {};
    const name = item.name || "";
    const baseType = item.baseType || "";
    const typeLine = item.typeLine || "";
    const candidates = new Set<string>();
    if (name && baseType) candidates.add(`${name} ${baseType}`.trim());
    if (typeLine) candidates.add(typeLine);
    if (baseType) candidates.add(baseType);
    if (name) candidates.add(name);
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (!map.has(candidate)) map.set(candidate, []);
      map.get(candidate)?.push(jewel);
    }
  }
  return map;
}

export function bindJewelListHandlers(jewels: any[], leagueName: string): void {
  if (!jewels || jewels.length === 0) return;
  const jewelAltSet = buildJewelAltSet(jewels);
  const jewelAltMap = buildJewelAltMap(jewels);
  const cells = findJewelCells(jewelAltSet);
  for (const { el, alt } of cells) {
    if ((el as HTMLElement).dataset.poe2NinjaTradeBound === "1") continue;
    const list = jewelAltMap.get(alt) || [];
    const itemData = list.shift()?.itemData;
    if (!itemData) break;
    jewelAltMap.set(alt, list);
    (el as HTMLElement).dataset.poe2NinjaTradeBound = "1";

    el.addEventListener("click", async () => {
      const language = await getTradeLanguage();
      const { query } = await buildTradeQuery(itemData, "Jewel", leagueName, language);
      let url = buildTradeUrl(leagueName, query, language);
      if (language === "ja") {
        const searchId = await requestTradeSearchId(leagueName, query, language);
        if (searchId) {
          url = buildTradeResultUrl(leagueName, searchId.id, language, searchId.host);
        }
      }
      window.open(url, "_blank", "noopener");
    });
  }
}

export function observeJewelListMutations(jewels: any[], leagueName: string): void {
  const observer = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.addedNodes && mutation.addedNodes.length > 0)) {
      return;
    }
    bindJewelListHandlers(jewels, leagueName);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
