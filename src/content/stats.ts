import {
  applyNegate,
  extractNumberRange,
  getModPrefix,
  normalizeModText,
  prefixMatchesSlot,
  shouldNegate,
  swapDecreaseToIncrease
} from "./mods";
import { getRuneSocketCount, isFlaskItem, isRuneItem } from "./items";

let statsMapPromise: Promise<Map<string, any>> | null = null;

type ModEntry = { text: string; type: string };

function formatPropertyLine(prop: any): string | null {
  const name = prop && prop.name;
  if (!name || !name.includes("{")) return null;
  const values = (prop.values || []).map((value: any) => value && value[0]).filter(Boolean);
  if (values.length === 0) return null;
  let result = name;
  values.forEach((value: string, index: number) => {
    result = result.replace(new RegExp(`\\{${index}\\}`, "g"), value);
  });
  return result;
}

function shouldPreferLocalDefense(itemData: any): boolean {
  const slot = itemData?.inventoryId || "";
  const baseType = (itemData?.baseType || "").toLowerCase();
  const typeLine = (itemData?.typeLine || "").toLowerCase();
  const isArmourSlot =
    slot === "Helm" || slot === "BodyArmour" || slot === "Gloves" || slot === "Boots";
  const isShield = baseType.includes("shield") || typeLine.includes("shield");
  return isArmourSlot || isShield;
}

function buildStatKeyCandidates(text: string, itemData: any): string[] {
  const base = normalizeModText(text, true);
  const raw = normalizeModText(text, false);
  const candidates: string[] = [];
  const preferLocal = shouldPreferLocalDefense(itemData);
  const localBase = base
    .replace(/ to Armour\b/g, " to Armour (Local)")
    .replace(/ to Evasion Rating\b/g, " to Evasion Rating (Local)")
    .replace(/ to Energy Shield\b/g, " to maximum Energy Shield (Local)")
    .replace(/ to maximum Energy Shield\b/g, " to maximum Energy Shield (Local)")
    .replace(/% increased Armour\b/g, "% increased Armour (Local)")
    .replace(/% increased Evasion Rating\b/g, "% increased Evasion Rating (Local)")
    .replace(/% increased Energy Shield\b/g, "% increased Energy Shield (Local)");
  const localRaw = raw
    .replace(/ to Armour\b/g, " to Armour (Local)")
    .replace(/ to Evasion Rating\b/g, " to Evasion Rating (Local)")
    .replace(/ to Energy Shield\b/g, " to maximum Energy Shield (Local)")
    .replace(/ to maximum Energy Shield\b/g, " to maximum Energy Shield (Local)")
    .replace(/% increased Armour\b/g, "% increased Armour (Local)")
    .replace(/% increased Evasion Rating\b/g, "% increased Evasion Rating (Local)")
    .replace(/% increased Energy Shield\b/g, "% increased Energy Shield (Local)");
  if (preferLocal) {
    if (localBase !== base) candidates.push(localBase);
    if (localRaw !== raw) candidates.push(localRaw);
  }
  candidates.push(base, raw);
  if (!preferLocal) {
    if (localBase !== base) candidates.push(localBase);
    if (localRaw !== raw) candidates.push(localRaw);
  }
  const requireBase = base.replace(/^Requires\b/, "Require");
  if (requireBase !== base) candidates.push(requireBase);
  const requireRaw = raw.replace(/^Requires\b/, "Require");
  if (requireRaw !== raw) candidates.push(requireRaw);
  const fewerBase = base.replace(/\bfewer\b/g, "additional");
  if (fewerBase !== base) candidates.push(fewerBase);
  const fewerRaw = raw.replace(/\bfewer\b/g, "additional");
  if (fewerRaw !== raw) candidates.push(fewerRaw);
  const costEff = base.replace(/ Cost Efficiency\b/g, " Cost");
  if (costEff !== base) candidates.push(costEff);
  if (base.includes("Charges per use")) {
    const swappedBase = swapDecreaseToIncrease(base);
    if (swappedBase !== base) candidates.push(swappedBase);
    const swappedRaw = swapDecreaseToIncrease(raw);
    if (swappedRaw !== raw) candidates.push(swappedRaw);
  }
  if (isFlaskItem(itemData) && base.includes("Charges per use")) {
    candidates.push(base.replace("Charges per use", "Flask Charges used"));
  }
  return candidates;
}

async function getStatsMap(): Promise<Map<string, any>> {
  if (!statsMapPromise) {
    statsMapPromise = new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "getTradeStats" }, (response: any) => {
        if (!response || !response.ok || !response.map) {
          resolve(new Map());
          return;
        }
        const map = new Map(Object.entries(response.map));
        resolve(map);
      });
    });
  }
  return statsMapPromise;
}

function collectModEntries(itemData: any): ModEntry[] {
  const entries: ModEntry[] = [];
  for (const mod of itemData.explicitMods || []) {
    entries.push({ text: mod, type: "explicit" });
  }
  for (const mod of itemData.mutatedMods || []) {
    entries.push({ text: mod, type: "explicit" });
  }
  for (const mod of itemData.implicitMods || []) {
    entries.push({ text: mod, type: "implicit" });
  }
  for (const mod of itemData.fracturedMods || []) {
    entries.push({ text: mod, type: "fractured" });
  }
  for (const mod of itemData.enchantMods || []) {
    entries.push({ text: mod, type: "enchant" });
  }
  for (const mod of itemData.runeMods || []) {
    const prefix = getModPrefix(mod);
    if (!prefixMatchesSlot(prefix, itemData)) continue;
    entries.push({ text: mod, type: "augment" });
  }
  for (const mod of itemData.desecratedMods || []) {
    entries.push({ text: mod, type: "desecrated" });
  }

  for (const prop of itemData.properties || []) {
    const line = formatPropertyLine(prop);
    if (line) entries.push({ text: line, type: "explicit" });
  }
  for (const prop of itemData.additionalProperties || []) {
    const line = formatPropertyLine(prop);
    if (line) entries.push({ text: line, type: "explicit" });
  }

  const runeSocketCount = getRuneSocketCount(itemData);
  if (runeSocketCount > 0) {
    const socketedItems = itemData.socketedItems || [];
    const runeItems = socketedItems.filter(isRuneItem).slice(0, runeSocketCount);
    for (const socketed of runeItems) {
      for (const mod of socketed.explicitMods || []) {
        const prefix = getModPrefix(mod);
        if (!prefixMatchesSlot(prefix, itemData)) continue;
        entries.push({ text: mod, type: "augment" });
      }
      for (const mod of socketed.implicitMods || []) {
        const prefix = getModPrefix(mod);
        if (!prefixMatchesSlot(prefix, itemData)) continue;
        entries.push({ text: mod, type: "augment" });
      }
      for (const mod of socketed.enchantMods || []) {
        const prefix = getModPrefix(mod);
        if (!prefixMatchesSlot(prefix, itemData)) continue;
        entries.push({ text: mod, type: "augment" });
      }
      for (const mod of socketed.runeMods || []) {
        const prefix = getModPrefix(mod);
        if (!prefixMatchesSlot(prefix, itemData)) continue;
        entries.push({ text: mod, type: "augment" });
      }
    }
  }

  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.type}::${entry.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickStatId(typeMap: any, preferredType: string): any | null {
  if (!typeMap) return null;
  if (typeMap[preferredType]) return typeMap[preferredType];
  if (preferredType === "augment") {
    if (typeMap.rune) return typeMap.rune;
    const runeEntry = Object.values(typeMap).find((entry: any) =>
      String(entry.id).startsWith("rune.")
    );
    return runeEntry || null;
  }
  if (preferredType === "rune") {
    const runeEntry = Object.values(typeMap).find((entry: any) =>
      String(entry.id).startsWith("rune.")
    );
    return runeEntry || null;
  }
  return (
    typeMap.explicit ||
    typeMap.implicit ||
    typeMap.fractured ||
    typeMap.enchant ||
    typeMap.rune ||
    typeMap.desecrated ||
    typeMap.pseudo ||
    Object.values(typeMap)[0] ||
    null
  );
}

export async function buildStatFilters(itemData: any): Promise<Array<{ id: string; value?: any }>> {
  const statsMap = await getStatsMap();
  const filtersById = new Map<string, { id: string; value?: any }>();
  for (const entry of collectModEntries(itemData)) {
    const keys = buildStatKeyCandidates(entry.text, itemData);
    let typeMap: any = null;
    for (const key of keys) {
      typeMap = statsMap.get(key);
      if (typeMap) break;
    }
    const picked = pickStatId(typeMap, entry.type);
    if (!picked) continue;
    const id = picked.id || picked;
    const range = extractNumberRange(entry.text);
    const allowsValue = picked.hasValue === true;
    const isNegated = shouldNegate(entry.text, picked.text);
    let maybeRange = isNegated ? applyNegate(range) : range;
    if (
      isNegated &&
      maybeRange &&
      typeof maybeRange.min === "number" &&
      typeof maybeRange.max !== "number"
    ) {
      maybeRange = { max: maybeRange.min };
    }
    const existing = filtersById.get(id);
    if (!existing) {
      if (maybeRange && allowsValue) {
        filtersById.set(id, { id, value: maybeRange });
      } else {
        filtersById.set(id, { id });
      }
      continue;
    }
    if (!maybeRange || !existing.value || !allowsValue) continue;
    const next = { ...existing.value };
    if (typeof maybeRange.min === "number") {
      next.min = typeof next.min === "number" ? Math.max(next.min, maybeRange.min) : maybeRange.min;
    }
    if (typeof maybeRange.max === "number") {
      next.max = typeof next.max === "number" ? Math.min(next.max, maybeRange.max) : maybeRange.max;
    }
    existing.value = next;
  }
  return Array.from(filtersById.values());
}
