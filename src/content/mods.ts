export function stripSlotPrefix(text: string): string {
  const idx = text.indexOf(": ");
  if (idx === -1) return text;
  const prefix = text.slice(0, idx).toLowerCase();
  const keywords = [
    "augment",
    "bonded",
    "armour",
    "armor",
    "body armour",
    "body armours",
    "helmet",
    "helmets",
    "gloves",
    "boots",
    "belt",
    "ring",
    "amulet",
    "weapon",
    "weapons",
    "offhand",
    "wand",
    "staff",
    "foci",
    "focus",
    "martial weapon",
    "martial weapons",
    "bow",
    "sword",
    "axe",
    "mace",
    "claw",
    "dagger",
    "sceptre",
    "scepter",
    "spear",
    "flail",
    "shield"
  ];
  if (!keywords.some((key) => prefix.includes(key))) return text;
  return text.slice(idx + 2).trim();
}

export function stripTags(raw: string): string {
  const withPipes = raw.replace(/\[([^|\]]+)\|([^\]]+)\]/g, "$2");
  return withPipes.replace(/\[([^\]]+)\]/g, "$1");
}

export function getModPrefix(raw: string): string | null {
  const withoutTags = stripTags(raw);
  const idx = withoutTags.indexOf(": ");
  if (idx === -1) return null;
  return withoutTags.slice(0, idx).toLowerCase().trim();
}

export function prefixMatchesSlot(prefix: string | null, itemData: any): boolean {
  if (!prefix) return true;
  const slot = itemData.inventoryId || "";
  const baseType = (itemData.baseType || "").toLowerCase();
  const typeLine = (itemData.typeLine || "").toLowerCase();

  const inSlot = (list: string[]) => list.some((key) => prefix.includes(key));
  const isWeaponSlot =
    slot === "Weapon" || slot === "Weapon2" || slot === "Offhand" || slot === "Offhand2";
  const isArmourSlot =
    slot === "Helm" || slot === "BodyArmour" || slot === "Gloves" || slot === "Boots";
  const isAccessorySlot =
    slot === "Ring" || slot === "Ring2" || slot === "Ring3" || slot === "Amulet" || slot === "Belt";

  if (inSlot(["body armour", "body armours"])) return slot === "BodyArmour";
  if (inSlot(["helmets", "helmet"])) return slot === "Helm";
  if (inSlot(["gloves"])) return slot === "Gloves";
  if (inSlot(["boots"])) return slot === "Boots";
  if (inSlot(["belt"])) return slot === "Belt";
  if (inSlot(["ring"])) return slot === "Ring" || slot === "Ring2" || slot === "Ring3";
  if (inSlot(["amulet"])) return slot === "Amulet";

  if (inSlot(["weapon", "weapons", "offhand"])) return isWeaponSlot;
  if (inSlot(["wand"]))
    return isWeaponSlot && (baseType.includes("wand") || typeLine.includes("wand"));
  if (inSlot(["staff"]))
    return isWeaponSlot && (baseType.includes("staff") || typeLine.includes("staff"));
  if (inSlot(["sceptre", "scepter"]))
    return isWeaponSlot && (baseType.includes("sceptre") || typeLine.includes("sceptre"));
  if (inSlot(["bow"]))
    return isWeaponSlot && (baseType.includes("bow") || typeLine.includes("bow"));
  if (inSlot(["sword"]))
    return isWeaponSlot && (baseType.includes("sword") || typeLine.includes("sword"));
  if (inSlot(["axe"]))
    return isWeaponSlot && (baseType.includes("axe") || typeLine.includes("axe"));
  if (inSlot(["mace"]))
    return isWeaponSlot && (baseType.includes("mace") || typeLine.includes("mace"));
  if (inSlot(["claw"]))
    return isWeaponSlot && (baseType.includes("claw") || typeLine.includes("claw"));
  if (inSlot(["dagger"]))
    return isWeaponSlot && (baseType.includes("dagger") || typeLine.includes("dagger"));
  if (inSlot(["spear"]))
    return isWeaponSlot && (baseType.includes("spear") || typeLine.includes("spear"));
  if (inSlot(["flail"]))
    return isWeaponSlot && (baseType.includes("flail") || typeLine.includes("flail"));
  if (inSlot(["martial weapon", "martial weapons"])) return isWeaponSlot;

  if (inSlot(["armour", "armor"])) return isArmourSlot || isAccessorySlot;
  if (inSlot(["focus", "foci"])) return slot === "Offhand" || slot === "Offhand2";

  return true;
}

export function normalizeModText(raw: string, stripPrefix: boolean = true): string {
  const withoutTags = stripTags(raw);
  const cleaned = stripPrefix ? stripSlotPrefix(withoutTags) : withoutTags;
  const normalized = cleaned.replace(/\s+/g, " ").trim();
  const withHashes = normalized.replace(/\d+(?:\.\d+)?/g, "#");
  return withHashes.replace(/\+\s*#/g, "#");
}

export function extractNumberRange(raw: string): { min?: number; max?: number } | null {
  const matches = raw.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches.map((val) => Number(val)).filter((val) => !Number.isNaN(val));
  if (nums.length === 0) return null;
  if (nums.length === 1) return { min: nums[0] };
  return { min: nums[0], max: nums[1] };
}

export function swapDecreaseToIncrease(text: string): string {
  if (!text) return text;
  return text.replace(/\breduced\b/g, "increased").replace(/\bless\b/g, "more");
}

export function applyNegate(range: { min?: number; max?: number } | null) {
  if (!range) return range;
  const next = { ...range };
  if (typeof next.min === "number") next.min *= -1;
  if (typeof next.max === "number") next.max *= -1;
  if (typeof next.min === "number" && typeof next.max === "number" && next.min > next.max) {
    const tmp = next.min;
    next.min = next.max;
    next.max = tmp;
  }
  return next;
}

export function shouldNegate(modText: string, statText: string | undefined): boolean {
  const mod = stripTags(modText || "").toLowerCase();
  const stat = stripTags(statText || "").toLowerCase();
  const modDecrease = mod.includes("reduced") || mod.includes("less");
  const modIncrease = mod.includes("increased") || mod.includes("more");
  const statDecrease = stat.includes("reduced") || stat.includes("less");
  const statIncrease = stat.includes("increased") || stat.includes("more");
  const modFewer = mod.includes("fewer");
  const statFewer = stat.includes("fewer");
  const modAdditional = mod.includes("additional");
  const statAdditional = stat.includes("additional");
  if (modDecrease && statIncrease) return true;
  if (modIncrease && statDecrease) return true;
  if (modFewer && statAdditional) return true;
  if (modAdditional && statFewer) return true;
  return false;
}
