export const API_URL_PATTERN = /\/poe2\/api\/builds\/[^/]+\/character\?/;
export const GRID_SLOT_IGNORE = new Set([".", "WTab", "OTab"]);
export const DEFAULT_OBSERVER_TIMEOUT_MS = 10000;
export const WEAPON_TAB_DIM_CLASS = "opacity-35";

export const WEAPON_SET_PRIMARY = 0;
export const WEAPON_SET_SECONDARY = 1;

export const SLOT_TO_CATEGORY = new Map([
  ["Helm", "armour.helmet"],
  ["BodyArmour", "armour.chest"],
  ["Gloves", "armour.gloves"],
  ["Boots", "armour.boots"],
  ["Belt", "accessory.belt"],
  ["Amulet", "accessory.amulet"],
  ["Ring", "accessory.ring"],
  ["Ring2", "accessory.ring"],
  ["Ring3", "accessory.ring"],
  ["Jewel", "jewel"]
]);

export const SLOT_TO_INVENTORY_IDS = new Map([
  ["Weapon", ["Weapon", "Weapon2"]],
  ["Offhand", ["Offhand", "Offhand2"]],
  ["Helm", ["Helm"]],
  ["BodyArmour", ["BodyArmour"]],
  ["Gloves", ["Gloves"]],
  ["Boots", ["Boots"]],
  ["Belt", ["Belt"]],
  ["Amulet", ["Amulet"]],
  ["Ring", ["Ring", "Ring1"]],
  ["Ring2", ["Ring2"]],
  ["Ring3", ["Ring3"]],
  ["Trinket", ["Trinket"]],
  ["LifeFlask", ["LifeFlask", "Flask", "Flask1"]],
  ["ManaFlask", ["ManaFlask", "Flask2"]]
]);
