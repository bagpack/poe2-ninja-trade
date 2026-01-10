import { collectGridCells } from "./dom";
import { resolveItemForSlot } from "./items";
import { getTradeLanguage } from "./settings";
import { requestTradeSearchId } from "./searchApi";
import { buildTradeQuery, buildTradeResultUrl, buildTradeUrl } from "./trade";

function bindSlotElement(
  el: Element,
  slotName: string,
  index: number,
  itemMap: Map<string, any>,
  allItems: any[],
  flasks: any[],
  leagueName: string
): void {
  const htmlEl = el as HTMLElement;
  if (htmlEl.dataset.poe2NinjaTradeBound === "1") return;
  htmlEl.dataset.poe2NinjaTradeBound = "1";
  htmlEl.dataset.poe2NinjaSlot = slotName;
  htmlEl.dataset.poe2NinjaSlotIndex = String(index);

  htmlEl.addEventListener("click", async (event) => {
    const target = event.currentTarget as HTMLElement;
    const targetSlot = target.dataset.poe2NinjaSlot;
    const targetIndex = Number(target.dataset.poe2NinjaSlotIndex || "0");
    if (!targetSlot) return;
    const itemData = resolveItemForSlot(targetSlot, itemMap, targetIndex, allItems, flasks);
    if (!itemData) return;

    const language = await getTradeLanguage();
    const { query } = await buildTradeQuery(itemData, targetSlot, leagueName, language);
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

export function bindGridHandlers(
  grid: Element,
  itemMap: Map<string, any>,
  allItems: any[],
  flasks: any[],
  leagueName: string
): void {
  const cells = collectGridCells(grid);
  const slotCounters = new Map<string, number>();
  for (const { el, slotName } of cells) {
    if (slotName === "Charms") {
      const charmCells = Array.from(el.children);
      for (const charmCell of charmCells) {
        const index = slotCounters.get(slotName) || 0;
        slotCounters.set(slotName, index + 1);
        bindSlotElement(charmCell, slotName, index, itemMap, allItems, flasks, leagueName);
      }
      continue;
    }

    const index = slotCounters.get(slotName) || 0;
    slotCounters.set(slotName, index + 1);
    bindSlotElement(el, slotName, index, itemMap, allItems, flasks, leagueName);
  }
}
