import { WEAPON_SET_PRIMARY, WEAPON_SET_SECONDARY, WEAPON_TAB_DIM_CLASS } from "./constants";
import { getGridAreaName } from "./dom";

let apiWeaponSetIndex = WEAPON_SET_PRIMARY;

export function setApiWeaponSetIndex(useSecondWeaponSet: boolean): void {
  apiWeaponSetIndex = useSecondWeaponSet ? WEAPON_SET_SECONDARY : WEAPON_SET_PRIMARY;
}

export function getActiveWeaponSetIndex(): number {
  const tabs = findWeaponSetTabs();
  if (!tabs) return apiWeaponSetIndex;
  const children = Array.from(tabs.children);
  if (children.length < 2) return apiWeaponSetIndex;
  const dimIndex = children.findIndex((child) => child.classList.contains(WEAPON_TAB_DIM_CLASS));
  if (dimIndex >= 0) {
    return dimIndex === 0 ? WEAPON_SET_SECONDARY : WEAPON_SET_PRIMARY;
  }
  return apiWeaponSetIndex;
}

function findWeaponSetTabs(root: Document | Element = document): Element | null {
  return (
    Array.from(root.querySelectorAll("div")).find((el) => getGridAreaName(el) === "WTab") || null
  );
}
