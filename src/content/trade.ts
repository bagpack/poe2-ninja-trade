import { SLOT_TO_CATEGORY } from "./constants";
import { getTradeHost, TradeLanguage } from "./settings";
import { resolveJapaneseItemText, translateItemText } from "./itemTranslations";
import { buildStatFilters } from "./stats";

export async function buildTradeQuery(
  itemData: any,
  slotName: string,
  leagueName: string,
  language: TradeLanguage
) {
  const resolved = await resolveJapaneseItemText(itemData, language);
  const type = resolved.type || itemData.baseType || itemData.typeLine;
  const query: any = {
    query: {
      status: { option: "securable" },
      type,
      stats: [
        {
          type: "and",
          filters: []
        }
      ],
      filters: {
        trade_filters: {
          filters: {
            price: { min: 1 }
          }
        }
      }
    },
    sort: { price: "asc" }
  };

  if (itemData.rarity === "Unique") {
    if (resolved.name) {
      query.query.name = resolved.name;
    } else if (itemData.name) {
      query.query.name = await translateItemText(itemData.name, language);
    }
  }

  if (language === "ja") {
    console.log("[poe2-ninja-trade] trade type/name", {
      type,
      name: query.query.name
    });
  }

  const category = SLOT_TO_CATEGORY.get(slotName);
  if (category) {
    query.query.filters.type_filters = {
      filters: {
        category: { option: category }
      }
    };
  }

  query.query.stats[0].filters = await buildStatFilters(itemData);

  return { leagueName, query };
}

export function buildTradeUrl(leagueName: string, query: any, language: TradeLanguage): string {
  const encoded = encodeURIComponent(JSON.stringify(query));
  const host = getTradeHost(language);
  return `https://${host}/trade2/search/poe2/${encodeURIComponent(leagueName)}?q=${encoded}`;
}

export function buildTradeResultUrl(
  leagueName: string,
  searchId: string,
  language: TradeLanguage,
  hostOverride?: string
): string {
  const host = hostOverride || getTradeHost(language);
  return `https://${host}/trade2/search/poe2/${encodeURIComponent(leagueName)}/${searchId}`;
}
