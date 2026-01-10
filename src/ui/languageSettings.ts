type TradeLanguage = "en" | "ja";

const STORAGE_KEY = "tradeLanguage";
const DEFAULT_LANGUAGE: TradeLanguage = "en";

function applyI18n(root: Document = document): void {
  const nodes = root.querySelectorAll<HTMLElement>("[data-i18n]");
  nodes.forEach((node) => {
    const key = node.dataset.i18n;
    if (!key) return;
    const message = chrome.i18n.getMessage(key);
    if (message) node.textContent = message;
  });
}

function getSelectedLanguage(root: Document = document): TradeLanguage {
  const checked = root.querySelector<HTMLInputElement>("input[name=tradeLanguage]:checked");
  return (checked?.value as TradeLanguage) || DEFAULT_LANGUAGE;
}

async function loadLanguage(): Promise<TradeLanguage> {
  const result = await chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_LANGUAGE });
  return result[STORAGE_KEY] as TradeLanguage;
}

async function saveLanguage(value: TradeLanguage): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: value });
}

export async function initLanguageSettings(root: Document = document): Promise<void> {
  applyI18n(root);
  const current = await loadLanguage();
  const target = root.querySelector<HTMLInputElement>(
    `input[name=tradeLanguage][value="${current}"]`
  );
  if (target) target.checked = true;

  const inputs = root.querySelectorAll<HTMLInputElement>("input[name=tradeLanguage]");
  inputs.forEach((input) => {
    input.addEventListener("change", async () => {
      const value = getSelectedLanguage(root);
      await saveLanguage(value);
    });
  });
}
