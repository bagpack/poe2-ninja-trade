import { DEFAULT_OBSERVER_TIMEOUT_MS, GRID_SLOT_IGNORE } from "./constants";

export function findEquipmentGrid(root: Document | Element = document): Element | null {
  return (
    Array.from(root.querySelectorAll("div,section")).find((el) => {
      const style = getComputedStyle(el);
      return (
        style.display === "grid" &&
        style.gridTemplateAreas.includes("Weapon") &&
        style.gridTemplateAreas.includes("Offhand")
      );
    }) || null
  );
}

export function getGridAreaName(el: Element): string | null {
  const raw = getComputedStyle(el).gridArea;
  if (!raw) return null;
  const area = raw.split("/")[0].trim().replace(/"/g, "");
  if (!area || area === "auto") return null;
  return area;
}

export function extractGridArea(el: Element): string | null {
  const area = getGridAreaName(el);
  if (!area || GRID_SLOT_IGNORE.has(area)) return null;
  return area;
}

export function collectGridCells(grid: Element): Array<{ el: Element; slotName: string }> {
  return Array.from(grid.querySelectorAll("*"))
    .map((el) => ({ el, slotName: extractGridArea(el) }))
    .filter((row) => row.slotName);
}

export function observeEquipmentGrid(
  timeoutMs: number = DEFAULT_OBSERVER_TIMEOUT_MS
): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = findEquipmentGrid();
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const grid = findEquipmentGrid();
      if (grid) {
        observer.disconnect();
        resolve(grid);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}

export function observeGridMutations(grid: Element, onMutate: () => void): void {
  const observer = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.addedNodes && mutation.addedNodes.length > 0)) {
      return;
    }
    onMutate();
  });

  observer.observe(grid, { childList: true, subtree: true });
}
