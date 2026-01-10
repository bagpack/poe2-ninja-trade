import { SLOT_TO_INVENTORY_IDS, WEAPON_SET_PRIMARY, WEAPON_SET_SECONDARY } from "./constants";
import { getActiveWeaponSetIndex } from "./weaponTabs";

export function isFlaskItem(itemData: any): boolean {
  if (!itemData) return false;
  if ((itemData.inventoryId || "").toLowerCase().includes("flask")) return true;
  const props = itemData.properties || [];
  return props.some((prop: any) => /flask/i.test(prop.name || ""));
}

export function isCharmItemData(itemData: any): boolean {
  if (!itemData) return false;
  const inventoryId = itemData.inventoryId || "";
  const typeLine = (itemData.typeLine || "").toLowerCase();
  const baseType = (itemData.baseType || "").toLowerCase();
  const descrText = (itemData.descrText || "").toLowerCase();
  const props = itemData.properties || [];
  const propHasCharm = props.some((prop: any) => /charm/i.test(prop.name || ""));
  return (
    inventoryId.startsWith("Charm") ||
    typeLine.includes("charm") ||
    baseType.includes("charm") ||
    descrText.includes("charm") ||
    propHasCharm
  );
}

export function getRuneSocketCount(itemData: any): number {
  return (itemData.sockets || []).filter((socket: any) => socket.type === "rune").length;
}

export function isRuneItem(item: any): boolean {
  const typeLine = item.typeLine || "";
  const baseType = item.baseType || "";
  const descrText = item.descrText || "";
  const props = item.properties || [];
  const hasRuneProperty = props.some((prop: any) => /rune/i.test(prop.name || ""));
  return (
    /rune/i.test(typeLine) ||
    /rune/i.test(baseType) ||
    /soul core/i.test(typeLine) ||
    /soul core/i.test(baseType) ||
    /augment/i.test(descrText) ||
    /idol/i.test(typeLine) ||
    /idol/i.test(baseType) ||
    /talisman/i.test(typeLine) ||
    /talisman/i.test(baseType) ||
    hasRuneProperty
  );
}

export function pickFlask(slotName: string, flasks: any[]): any | null {
  if (!flasks || flasks.length === 0) return null;
  const matchText = slotName === "LifeFlask" ? "life" : "mana";
  const byText = flasks.find((flask: any) => {
    const data = flask.itemData || {};
    const typeLine = (data.typeLine || "").toLowerCase();
    const baseType = (data.baseType || "").toLowerCase();
    const name = (data.name || "").toLowerCase();
    return typeLine.includes(matchText) || baseType.includes(matchText) || name.includes(matchText);
  });
  if (byText) return byText.itemData;
  return slotName === "LifeFlask" ? flasks[0].itemData : flasks[1]?.itemData || null;
}

export function resolveItemForSlot(
  slotName: string,
  itemMap: Map<string, any>,
  slotIndex: number,
  allItems: any[],
  flasks: any[]
): any | null {
  if (slotName === "LifeFlask" || slotName === "ManaFlask") {
    const direct = itemMap.get(slotName);
    if (direct) return direct;
    return pickFlask(slotName, flasks);
  }
  if (slotName === "Charms") {
    const fromFlasks = (flasks || []).filter((item) => isCharmItemData(item.itemData));
    const charms =
      fromFlasks.length > 0
        ? fromFlasks
        : allItems.filter((item) => isCharmItemData(item.itemData));
    const withPosition = charms.filter(
      (item) => Number.isFinite(item.itemData?.x) && Number.isFinite(item.itemData?.y)
    );
    const withSlot = charms.filter((item) => Number.isFinite(item.itemSlot));
    let ordered = charms;
    if (withPosition.length > 0) {
      ordered = [...withPosition].sort((a, b) => {
        if (a.itemData.y !== b.itemData.y) return a.itemData.y - b.itemData.y;
        return a.itemData.x - b.itemData.x;
      });
    } else if (withSlot.length > 0) {
      ordered = [...withSlot].sort((a, b) => a.itemSlot - b.itemSlot);
    }
    return ordered[slotIndex]?.itemData || null;
  }

  if (slotName === "Weapon" || slotName === "Offhand") {
    const activeWeaponSet = getActiveWeaponSetIndex();
    const ids = SLOT_TO_INVENTORY_IDS.get(slotName) || [slotName];
    const primary = ids[0];
    const secondary = ids[1];
    if (activeWeaponSet === WEAPON_SET_SECONDARY) {
      if (secondary && itemMap.has(secondary)) return itemMap.get(secondary);
      return null;
    }
    if (activeWeaponSet === WEAPON_SET_PRIMARY) {
      if (primary && itemMap.has(primary)) return itemMap.get(primary);
      return null;
    }
    if (primary && itemMap.has(primary)) return itemMap.get(primary);
    if (secondary && itemMap.has(secondary)) return itemMap.get(secondary);
  }
  const candidates = SLOT_TO_INVENTORY_IDS.get(slotName) || [slotName];
  for (const id of candidates) {
    if (itemMap.has(id)) return itemMap.get(id);
  }
  return null;
}
