(() => {
  "use strict";

  const STATS_DATA_URL = "https://www.pathofexile.com/api/trade2/data/stats";
  let statsCache = null;
  let statsPromise = null;

  function stripSlotPrefix(text) {
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

  function stripTags(raw) {
    const withPipes = raw.replace(/\[([^|\]]+)\|([^\]]+)\]/g, "$2");
    return withPipes.replace(/\[([^\]]+)\]/g, "$1");
  }

  function normalizeModText(raw, stripPrefix = true) {
    const withoutTags = stripTags(raw);
    const cleaned = stripPrefix ? stripSlotPrefix(withoutTags) : withoutTags;
    const normalized = cleaned.replace(/\s+/g, " ").trim();
    const withHashes = normalized.replace(/\d+(?:\.\d+)?/g, "#");
    return withHashes.replace(/\+\s*#/g, "#");
  }

  async function loadStatsMap() {
    if (statsCache) return statsCache;
    if (!statsPromise) {
      statsPromise = fetch(STATS_DATA_URL)
        .then((response) => response.json())
        .then((data) => {
          const map = {};
          for (const group of data.result || []) {
            for (const entry of group.entries || []) {
              if (!entry.text || !entry.id) continue;
              const hasValue = entry.text.includes("#");
              const keys = [
                normalizeModText(entry.text, true),
                normalizeModText(entry.text, false)
              ].filter(Boolean);
              const type = entry.type || "unknown";
              for (const key of keys) {
                if (!map[key]) map[key] = {};
                if (!map[key][type]) {
                  map[key][type] = { id: entry.id, hasValue, text: entry.text };
                }
              }
            }
          }
          statsCache = map;
          return map;
        })
        .catch(() => {
          statsCache = {};
          return statsCache;
        });
    }
    return statsPromise;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return;
    if (message.type === "getTradeStats") {
      loadStatsMap().then((map) => sendResponse({ ok: true, map }));
      return true;
    }
    if (message.type === "createTradeSearch") {
      const host = message.host || "www.pathofexile.com";
      const leagueName = message.leagueName || "";
      const query = message.query || {};
      const url = `https://${host}/api/trade2/search/poe2/${encodeURIComponent(leagueName)}`;
      fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(query)
      })
        .then(async (response) => {
          const text = await response.text();
          let data = null;
          try {
            data = JSON.parse(text);
          } catch {
            data = null;
          }
          if (!response.ok) {
            sendResponse({ ok: false, status: response.status, body: text });
            return;
          }
          sendResponse({ ok: true, id: data && data.id });
        })
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }
    return true;
  });
})();
