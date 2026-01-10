import { observeCharacterApiUrl } from "./api";
import { bindGridHandlers } from "./gridBindings";
import { observeEquipmentGrid, observeGridMutations } from "./dom";
import { bindJewelListHandlers, observeJewelListMutations } from "./jewels";
import { setApiWeaponSetIndex } from "./weaponTabs";

async function init() {
  const [grid, apiUrl] = await Promise.all([observeEquipmentGrid(), observeCharacterApiUrl()]);

  if (!grid || !apiUrl) return;

  let data: any;
  try {
    const response = await fetch(apiUrl, { credentials: "omit" });
    data = await response.json();
  } catch {
    return;
  }

  const leagueName = data.league;
  if (!leagueName) return;

  const itemMap = new Map<string, any>();
  const items = (data.items || []).concat(data.jewels || []);
  const flasks = data.flasks || [];
  const jewels = data.jewels || [];

  if (typeof data.useSecondWeaponSet === "boolean") {
    setApiWeaponSetIndex(data.useSecondWeaponSet);
  } else {
    setApiWeaponSetIndex(false);
  }

  for (const item of items) {
    const inventoryId = item.itemData && item.itemData.inventoryId;
    if (!inventoryId) continue;
    itemMap.set(inventoryId, item.itemData);
  }

  bindGridHandlers(grid, itemMap, items, flasks, leagueName);
  observeGridMutations(grid, () => bindGridHandlers(grid, itemMap, items, flasks, leagueName));
  bindJewelListHandlers(jewels, leagueName);
  observeJewelListMutations(jewels, leagueName);
}

init();
