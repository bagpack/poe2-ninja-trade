# PoE2トレードサイトのクエリー作成メモ（Exiled-Exchange-2解析）

## 目的

Exiled-Exchange-2 の実装をもとに、PoE2トレードサイト（trade2）の検索クエリーをどのように組み立てるかを整理する。

## 参照元（Exiled-Exchange-2）

- `renderer/src/web/price-check/trade/pathofexile-trade.ts`
- `renderer/src/web/price-check/trade/TradeListing.vue`
- `renderer/src/web/price-check/trade/pathofexile-bulk.ts`
- `renderer/src/web/price-check/filters/interfaces.ts`
- `renderer/public/data/*/stats.ndjson`

## 1. エンドポイントとURL形式

### 1.1 Web UI（ブラウザ）向けURL

- 検索URL（結果ID無し）
  - `https://{tradeEndpoint}/trade2/search/poe2/{league}?q={JSON}`
  - `q` に検索クエリーのJSON（後述）を文字列化して渡す
- 検索URL（結果IDあり）
  - `https://{tradeEndpoint}/trade2/search/poe2/{league}/{searchId}`

`{tradeEndpoint}` は設定値（`getTradeEndpoint()`）で、デフォルトは `pathofexile.com` 系のドメインになる。

### 1.2 API 呼び出し

- 検索
  - `POST https://{tradeEndpoint}/api/trade2/search/{league}`
  - ボディにクエリーJSONを送る
- 取得
  - `GET https://{tradeEndpoint}/api/trade2/fetch/{resultIds}?query={searchId}`
- バルク取引（通貨等）
  - `POST https://{tradeEndpoint}/api/trade2/exchange/{league}`

## 2. 検索クエリーの基本構造

Exiled-Exchange-2 の `createTradeRequest` が生成する構造（主要部）は次の通り。

```json
{
  "query": {
    "status": { "option": "available" },
    "name": "item name or object",
    "type": "base type or object",
    "stats": [
      {
        "type": "and",
        "filters": [{ "id": "explicit.stat_xxx", "value": { "min": 10, "max": 20 } }]
      }
    ],
    "filters": {
      "type_filters": { "filters": { "category": { "option": "weapon.sword" } } },
      "equipment_filters": { "filters": { "dps": { "min": 200 } } },
      "req_filters": { "filters": { "lvl": { "max": 80 } } },
      "map_filters": { "filters": { "map_tier": { "min": 10, "max": 10 } } },
      "misc_filters": { "filters": { "identified": { "option": "false" } } },
      "trade_filters": { "filters": { "price": { "option": "divine" } } }
    }
  },
  "sort": { "price": "asc" }
}
```

### 2.1 status

- `query.status.option`: `available | securable | online | any`

### 2.2 name/type

- `query.name` と `query.type` は文字列か `{ discriminator, option }` 形式
- `discriminator` は `filters.discriminator.trade` が設定されているときのみ使用

### 2.3 stats

- `query.stats` は複数グループ（`and`, `count`, `not` など）を持てる
- 通常は `type: "and"` のグループに stat フィルターを追加
- 1つの stat に複数 tradeId がある場合は `type: "count"` グループで `min: 1` を使う

### 2.4 filters

- `filters` は以下のカテゴリに分割される
  - `type_filters`
  - `equipment_filters`
  - `req_filters`
  - `map_filters`
  - `misc_filters`
  - `trade_filters`

## 3. 主要フィルターのマッピング（createTradeRequest）

`renderer/src/web/price-check/trade/pathofexile-trade.ts` の `createTradeRequest` が実際のマッピングを行う。

### 3.1 trade_filters

- 価格通貨: `trade_filters.filters.price.option = filters.trade.currency`
- INSTANT BUYOUT: `trade_filters.filters.price.min = 1` を指定（価格がある出品のみ）
- 検索インデックス: `trade_filters.filters.indexed.option = filters.trade.listed`
- API側でまとめる: `trade_filters.filters.collapse.option = "true"`

### 3.2 type_filters

- カテゴリ: `type_filters.filters.category.option`
  - `CATEGORY_TO_TRADE_ID` で `ItemCategory` を trade カテゴリIDに変換
- レアリティ: `type_filters.filters.rarity.option`
  - `uniquefoil` などの特別ケースを含む
- アイテムレベル: `type_filters.filters.ilvl.min/max`
- 品質: `type_filters.filters.quality.min`

### 3.3 equipment_filters

- DPS, armour, evasion などは内部IDから `equipment_filters` に変換される
  - 例: `item.total_dps` → `equipment_filters.filters.dps`

### 3.4 req_filters

- レベル制限: `req_filters.filters.lvl.max`

### 3.5 map_filters

- マップティア: `map_filters.filters.map_tier.min/max`

### 3.6 misc_filters

- gem_level, gem_sockets, area_level, identified, corrupted, mirrored, sanctified, veiled など
- `identified` は `false` のみをセットする（未鑑定検索）

## 4. Statフィルターの組み立て

### 4.1 tradeId の由来

- `stats.ndjson` に収録された stat 情報を `STAT_BY_REF` で参照
- `stat.tradeId`（複数可）をクエリーに展開

### 4.2 tradeId → query.stats への変換

- 単一 ID: `query.stats[0].filters.push({ id, value })`
- 複数 ID: `query.stats.push({ type: "count", value: { min: 1 }, filters: [...] })`
- `value` は `min/max` を使い、`tradeInvert` で逆転するケースに対応

### 4.3 内部IDの特別処理

`INTERNAL_TRADE_IDS` は通常の stat ではなく、以下のように `filters` 側に落とし込む。

- 例
  - `item.armour` → `equipment_filters.filters.ar`
  - `item.total_dps` → `equipment_filters.filters.dps`
  - `item.map_revives` → `map_filters.filters.map_revives`

### 4.4 特殊ロジック

- `item.has_empty_modifier`: `# Empty Modifiers` などに変換して `type: "count"` を生成
- `item.elemental_dps` + 属性指定: 選択された属性以外を `type: "not"` で除外
- `Only affects Passives in # Ring`: `id|{index}` の複数IDを使って `count` を作る
- `usesRemaining`: タブレット用途のカスタム疑似フィルター

## 5. PoE2トレードサイト向けクエリー作成の流れ

1. 対象アイテムから `ItemFilters` と `StatFilter[]` を作成
2. `createTradeRequest(filters, stats, item)` で `TradeRequest` を生成
3. UIリンクなら `https://{endpoint}/trade2/search/poe2/{league}?q={JSON}` を作成
4. API利用なら `POST /api/trade2/search/{league}` にJSONを送る

## 6. 実装上のポイント（まとめ）

- `filters.searchRelaxed` が有効なら優先して `name/type` を決める
- tradeId は `stats.ndjson` に依存するため、PoE2のデータ更新に追随が必要
- `trade_filters` は UI の絞り込み（通貨・掲載期間・まとめ表示）を担当
- `query.stats` は `and`/`count`/`not` の組み合わせで表現する

## 7. poe.ninja APIのitems/jewelsからクエリーを組み立てられるか

結論: **概ね可能**だが、`tradeId` のマッピングが必須で、追加の変換層が必要。

### 7.1 poe.ninjaレスポンスから取得できる主な情報

`items[]` と `jewels[]` はどちらも `itemData` を持ち、以下が参照可能。

- `name`, `typeLine`, `baseType`, `rarity`, `frameType`
- `ilvl`, `identified`, `corrupted`, `fractured`, `synthesised`
- `explicitMods`, `implicitMods`, `enchantMods`, `runeMods`, `desecratedMods`
- `properties` (Quality/ES/Armour等), `requirements` (Level/Str/Dex/Int)

この情報だけで **name/type/rarity/ilvl/品質/未鑑定/腐敗** といった `filters` は構築できる。

### 7.2 クエリーに必要だが追加変換が必要な情報

PoE2トレード検索は `query.stats[].filters[].id` に **tradeId** を要求する。
poe.ninjaの `explicitMods` は文字列なので、以下の変換が必須になる。

1. `explicitMods` などの mod 文字列からタグを除去（例: `[CriticalDamageBonus|Critical Damage Bonus]` → `Critical Damage Bonus`）
2. 正規化したテキストを `stats.ndjson` の `text` と照合して `trade.ids` を取得
3. 値がある場合は min/max を抽出して `value` を作成

Exiled-Exchange-2 では `stats.ndjson` とパーサー（`renderer/src/parser/*`）で同等の処理を行っているため、同様の処理が必要。

### 7.3 カテゴリ（type_filters.category）の決定

poe.ninjaの `itemData` には `ItemCategory` が直接入っていないため、次のいずれかの手段が必要。

- `baseType` を `items.ndjson` に照合してカテゴリを決定
- `properties[0].name`（例: `Boots`, `Jewel`）をカテゴリへマップする
- `itemSlot`（Weapon/Helmet等）を補助的に使用

### 7.4 変換フロー（実装イメージ）

1. poe.ninjaレスポンスの `items[]` / `jewels[]` から `itemData` を抽出
2. `name/typeLine/baseType` から `query.name` / `query.type` を決定
3. `rarity/ilvl/quality/identified/corrupted` などを `filters` に反映
4. `explicitMods` 等の文字列を正規化 → `stats.ndjson` と照合 → `tradeId` を取得
5. `tradeId` と min/max を `query.stats` に展開してクエリー完成

### 7.5 限界・注意点

- `tradeId` マッピングはデータ依存で、PoE2の仕様変更に追随が必要
- jewel系の「範囲効果」系は特殊ロジック（複数ID）になりやすい
- クエリーが複雑になりすぎると `Query is too complex.` のエラーが出る可能性がある

## 8. mod文字列の最小正規化関数（案）

poe.ninja の mod 文字列はタグが混ざるため、`stats.ndjson` の `text` と照合する前に正規化する。

```ts
function normalizeModText(raw: string): string {
  // 1) 角括弧タグを除去: [Tag|Display] -> Display
  const withoutTags = raw.replace(/\[([^|\]]+)\|([^\]]+)\]/g, "$2");
  // 2) 余分な空白と改行を整理
  return withoutTags.replace(/\s+/g, " ").trim();
}
```

この関数で `explicitMods` / `implicitMods` / `enchantMods` / `runeMods` / `desecratedMods` を正規化し、
`stats.ndjson` の `text` と一致する行を探して `trade.ids` を取得する。

## 9. カテゴリ判定の具体ルール（案）

カテゴリは精度優先で決める。

1. `baseType` を `items.ndjson` に照合（最優先）
2. `properties[0].name` によるマップ（例）
   - `Boots` → `armour.boots`
   - `Gloves` → `armour.gloves`
   - `Helmet` → `armour.helmet`
   - `Body Armour` → `armour.chest`
   - `Ring` → `accessory.ring`
   - `Amulet` → `accessory.amulet`
   - `Belt` → `accessory.belt`
   - `Jewel` → `jewel`
3. `itemSlot` を補助的に使う（Weapon/Helmet/Boots 等の大枠）

## 10. poe.ninjaアイテムからのサンプルクエリー（最小構成）

例: `Sekhema Sandals`（Boots, Rare, ilvl などが判明しているケース）

```json
{
  "query": {
    "status": { "option": "securable" },
    "type": "Sekhema Sandals",
    "stats": [
      {
        "type": "and",
        "filters": [{ "id": "explicit.stat_xxx", "value": { "min": 30 } }]
      }
    ],
    "filters": {
      "type_filters": {
        "filters": {
          "category": { "option": "armour.boots" },
          "rarity": { "option": "nonunique" },
          "ilvl": { "min": 70 }
        }
      },
      "misc_filters": {
        "filters": {
          "identified": { "option": "true" },
          "corrupted": { "option": "false" }
        }
      }
    }
  },
  "sort": { "price": "asc" }
}
```

`explicit.stat_xxx` は `stats.ndjson` から対応する `tradeId` を引いて置き換える。

## 11. stats.ndjson を使った tradeId 解決の実装方針

Exiled-Exchange-2 は `stats.ndjson` をインデックス化して、以下の2系統で参照している。

- `STAT_BY_REF(ref)` は `ref` 文字列で stat を引く
- `STAT_BY_MATCH_STR(matchStr)` は matcher 文字列で stat を引く

### 11.1 参照キーの考え方

poe.ninjaの mod 文字列は「表示用の文章」に近いため、`matchStr` 側で引く方が自然。
ただし `stats.ndjson` は `matchers` に複数の表現を持つため、次の順で照合するのが実用的。

1. `normalizeModText(raw)` でタグ除去と空白正規化
2. 完全一致で `STAT_BY_MATCH_STR(matchStr)` を探す
3. 見つからなければ、数値部を `#` に置換した `matchStr` を試す

### 11.2 modifier種別とtradeIdの選択

`stats.ndjson` は `trade.ids` を `ModifierType` 別に持つ。
poe.ninja のフィールドから以下のように割り当てる。

- `explicitMods` → `ModifierType.Explicit`
- `implicitMods` → `ModifierType.Implicit`
- `enchantMods` → `ModifierType.Enchant`
- `runeMods` → `ModifierType.Rune`
- `desecratedMods` → `ModifierType.Desecrated`

### 11.3 擬似コード（最小構成）

```ts
function toMatchStr(raw: string): string {
  const normalized = normalizeModText(raw);
  const withPlaceholder = normalized.replace(/-?\\d+(?:\\.\\d+)?/g, "#");
  return withPlaceholder;
}

function resolveTradeIds(raw: string, modifierType: ModifierType) {
  const matchStr = toMatchStr(raw);
  const found = STAT_BY_MATCH_STR(matchStr);
  if (!found) return [];
  const { stat } = found;
  return stat.trade?.ids?.[modifierType] ?? [];
}

function modToQueryFilter(raw: string, modifierType: ModifierType) {
  const tradeIds = resolveTradeIds(raw, modifierType);
  if (!tradeIds.length) return null;
  const range = extractRange(raw); // 数値がある場合だけ min/max を作る
  return tradeIds.map((id) => ({ id, value: range }));
}
```

`extractRange` は mod 文字列から数値を抽出し、`min/max` を埋める関数。
値が無い場合は `value` を省略し、フラグ扱いで検索する。

## 12. 検索ID（search id / query id）の扱い

非英語ドメイン（例: `jp.pathofexile.com`）では、`?q=` 付きURLが無効判定される場合があるため、**検索APIでIDを取得して結果URLで開く**方式を使う。

### 12.1 検索API

- `POST https://{host}/api/trade2/search/poe2/{league}`
- `body`: `query` オブジェクト（`trade2/search` と同じ内容）
- `host` は言語に応じて切り替える（例: 日本語表示は `jp.pathofexile.com`）
- 日本語ドメインで `Unknown item base type` が出る場合は **検索APIのみ `www.pathofexile.com` にフォールバック**する
- フォールバック時は **検索APIと同じホストで結果URLを開く**（search id はホスト間で共有されないため）
- 日本語ドメインで検索する場合は **`type`/`name` を日本語表記に変換**する
  - Exiled-Exchange-2 の `items.ndjson`（`renderer/public/data/ja/items.ndjson`）を同梱し、
    `refName(英語)` → `name(日本語)` の対応表を作る

### 12.2 結果URL

- `https://{host}/trade2/search/poe2/{league}/{searchId}`
- `searchId` は検索APIのレスポンス `id` を使用

### 12.3 失敗時の代表例

- `{"error":{"code":2,"message":"Unknown item base type"}}`
  - `type` がtrade側の辞書に無いか、言語側の baseType 変換が必要な場合に発生

## 13. poe.ninja実データからのtradeId解決とクエリー生成（実演）

対象: poe.ninjaレスポンス内の `Time-Lost Sapphire`（jewel）

### 12.1 元の mod 文字列（poe.ninja）

```
Notable Passive Skills in Radius also grant 9% increased Critical Damage Bonus
Notable Passive Skills in Radius also grant 6% faster start of Energy Shield Recharge
Notable Passive Skills in Radius also grant Recover 1% of maximum Life on Kill
```

### 12.2 正規化 → matchStr

```
Notable Passive Skills in Radius also grant #% increased Critical Damage Bonus
Notable Passive Skills in Radius also grant #% faster start of Energy Shield Recharge
Notable Passive Skills in Radius also grant Recover #% of maximum Life on Kill
```

### 12.3 stats.ndjson の該当行（tradeId）

`renderer/public/data/en/stats.ndjson` より。

- `Notable Passive Skills in Radius also grant #% increased Critical Damage Bonus`
  - `explicit.stat_2359002191`
- `Notable Passive Skills in Radius also grant #% faster start of Energy Shield Recharge`
  - `explicit.stat_3394832998`
- `Notable Passive Skills in Radius also grant Recover #% of maximum Life on Kill`
  - `explicit.stat_2726713579`

### 12.4 組み立てたクエリーJSON（最小構成）

```json
{
  "query": {
    "status": { "option": "securable" },
    "type": "Time-Lost Sapphire",
    "stats": [
      {
        "type": "and",
        "filters": [
          { "id": "explicit.stat_2359002191", "value": { "min": 9 } },
          { "id": "explicit.stat_3394832998", "value": { "min": 6 } },
          { "id": "explicit.stat_2726713579", "value": { "min": 1 } }
        ]
      }
    ],
    "filters": {
      "type_filters": {
        "filters": {
          "category": { "option": "jewel" },
          "rarity": { "option": "nonunique" }
        }
      },
      "trade_filters": {
        "filters": {
          "price": { "min": 1 }
        }
      }
    }
  },
  "sort": { "price": "asc" }
}
```

このJSONを `https://{endpoint}/trade2/search/poe2/{league}?q=...` に埋め込めば検索できる。

### 12.5 ブラウザ確認用URL

リーグ名が異なると無効になるため、`Fate%20of%20the%20Vaal` は現在のPoE2リーグ名に置き換える。

```
https://www.pathofexile.com/trade2/search/poe2/Fate%20of%20the%20Vaal?q=%7B%22query%22%3A%7B%22status%22%3A%7B%22option%22%3A%22securable%22%7D%2C%22type%22%3A%22Time-Lost%20Sapphire%22%2C%22stats%22%3A%5B%7B%22type%22%3A%22and%22%2C%22filters%22%3A%5B%7B%22id%22%3A%22explicit.stat_2359002191%22%2C%22value%22%3A%7B%22min%22%3A9%7D%7D%2C%7B%22id%22%3A%22explicit.stat_3394832998%22%2C%22value%22%3A%7B%22min%22%3A6%7D%7D%2C%7B%22id%22%3A%22explicit.stat_2726713579%22%2C%22value%22%3A%7B%22min%22%3A1%7D%7D%5D%7D%5D%2C%22filters%22%3A%7B%22type_filters%22%3A%7B%22filters%22%3A%7B%22category%22%3A%7B%22option%22%3A%22jewel%22%7D%2C%22rarity%22%3A%7B%22option%22%3A%22nonunique%22%7D%7D%7D%2C%22trade_filters%22%3A%7B%22filters%22%3A%7B%22price%22%3A%7B%22min%22%3A1%7D%7D%7D%7D%7D%2C%22sort%22%3A%7B%22price%22%3A%22asc%22%7D%7D
```

## 13. 装備アイテムの実演（Rare Boots）

対象: poe.ninjaレスポンス内の `Sekhema Sandals`（Rare Boots）

### 13.1 元の mod 文字列（poe.ninja）

```
35% increased Movement Speed
95% increased Energy Shield
+45% to Fire Resistance
+44% to Cold Resistance
+45% to Lightning Resistance
```

### 13.2 正規化 → matchStr

```
#% increased Movement Speed
#% increased Energy Shield
#% to Fire Resistance
#% to Cold Resistance
#% to Lightning Resistance
```

### 13.3 stats.ndjson の該当行（tradeId）

`renderer/public/data/en/stats.ndjson` より。

- `#% increased Movement Speed`
  - `explicit.stat_2250533757`
- `#% increased Energy Shield`
  - `explicit.stat_4015621042`
- `#% to Fire Resistance`
  - `explicit.stat_3372524247`
- `#% to Cold Resistance`
  - `explicit.stat_4220027924`
- `#% to Lightning Resistance`
  - `explicit.stat_1671376347`

### 13.4 組み立てたクエリーJSON（最小構成）

```json
{
  "query": {
    "status": { "option": "securable" },
    "name": "Sekhema Sandals",
    "type": "Brimstone Spark",
    "stats": [
      {
        "type": "and",
        "filters": [
          { "id": "explicit.stat_2250533757", "value": { "min": 35 } },
          { "id": "explicit.stat_4015621042", "value": { "min": 95 } },
          { "id": "explicit.stat_3372524247", "value": { "min": 45 } },
          { "id": "explicit.stat_4220027924", "value": { "min": 44 } },
          { "id": "explicit.stat_1671376347", "value": { "min": 45 } }
        ]
      }
    ],
    "filters": {
      "type_filters": {
        "filters": {
          "category": { "option": "armour.boots" },
          "rarity": { "option": "nonunique" }
        }
      },
      "trade_filters": {
        "filters": {
          "price": { "min": 1 }
        }
      }
    }
  },
  "sort": { "price": "asc" }
}
```

レアアイテムは `name` を付けず、`type` にベースタイプを入れる。`name` はユニーク名など固定名でのみ使用する。

### 13.5 ブラウザ確認用URL

リーグ名が異なると無効になるため、`Fate%20of%20the%20Vaal` は現在のPoE2リーグ名に置き換える。

```
https://www.pathofexile.com/trade2/search/poe2/Fate%20of%20the%20Vaal?q=%7B%22query%22%3A%7B%22status%22%3A%7B%22option%22%3A%22securable%22%7D%2C%22type%22%3A%22Sekhema%20Sandals%22%2C%22stats%22%3A%5B%7B%22type%22%3A%22and%22%2C%22filters%22%3A%5B%7B%22id%22%3A%22explicit.stat_2250533757%22%2C%22value%22%3A%7B%22min%22%3A35%7D%7D%2C%7B%22id%22%3A%22explicit.stat_4015621042%22%2C%22value%22%3A%7B%22min%22%3A95%7D%7D%2C%7B%22id%22%3A%22explicit.stat_3372524247%22%2C%22value%22%3A%7B%22min%22%3A45%7D%7D%2C%7B%22id%22%3A%22explicit.stat_4220027924%22%2C%22value%22%3A%7B%22min%22%3A44%7D%7D%2C%7B%22id%22%3A%22explicit.stat_1671376347%22%2C%22value%22%3A%7B%22min%22%3A45%7D%7D%5D%7D%5D%2C%22filters%22%3A%7B%22type_filters%22%3A%7B%22filters%22%3A%7B%22category%22%3A%7B%22option%22%3A%22armour.boots%22%7D%2C%22rarity%22%3A%7B%22option%22%3A%22nonunique%22%7D%7D%7D%2C%22trade_filters%22%3A%7B%22filters%22%3A%7B%22price%22%3A%7B%22min%22%3A1%7D%7D%7D%7D%7D%2C%22sort%22%3A%7B%22price%22%3A%22asc%22%7D%7D
```

## 14. 装備アイテムの実演（Rare Amulet）

対象: poe.ninjaレスポンス内の `Solar Amulet`（Rare Amulet）

### 14.1 元の mod 文字列（poe.ninja）

```
+117 to maximum Life
37% increased Critical Hit Chance
+23 to all Attributes
36% increased Global Defences
```

### 14.2 正規化 → matchStr

```
# to maximum Life
#% increased Critical Hit Chance
# to all Attributes
#% increased Global Defences
```

### 14.3 stats.ndjson の該当行（tradeId）

`renderer/public/data/en/stats.ndjson` より。

- `# to maximum Life`
  - `explicit.stat_3299347043`
- `#% increased Critical Hit Chance`
  - `explicit.stat_587431675`
- `# to all Attributes`
  - `explicit.stat_1379411836`
- `#% increased Global Defences`
  - `explicit.stat_1389153006`

### 14.4 組み立てたクエリーJSON（最小構成）

```json
{
  "query": {
    "status": { "option": "online" },
    "type": "Solar Amulet",
    "stats": [
      {
        "type": "and",
        "filters": [
          { "id": "explicit.stat_3299347043", "value": { "min": 117 } },
          { "id": "explicit.stat_587431675", "value": { "min": 37 } },
          { "id": "explicit.stat_1379411836", "value": { "min": 23 } },
          { "id": "explicit.stat_1389153006", "value": { "min": 36 } }
        ]
      }
    ],
    "filters": {
      "type_filters": {
        "filters": {
          "category": { "option": "accessory.amulet" },
          "rarity": { "option": "nonunique" }
        }
      },
      "trade_filters": {
        "filters": {
          "price": { "min": 1 }
        }
      }
    }
  },
  "sort": { "price": "asc" }
}
```

### 14.5 ブラウザ確認用URL

リーグ名が異なると無効になるため、`Fate%20of%20the%20Vaal` は現在のPoE2リーグ名に置き換える。

```
https://www.pathofexile.com/trade2/search/poe2/Fate%20of%20the%20Vaal?q=%7B%22query%22%3A%7B%22status%22%3A%7B%22option%22%3A%22securable%22%7D%2C%22type%22%3A%22Solar%20Amulet%22%2C%22stats%22%3A%5B%7B%22type%22%3A%22and%22%2C%22filters%22%3A%5B%7B%22id%22%3A%22explicit.stat_3299347043%22%2C%22value%22%3A%7B%22min%22%3A117%7D%7D%2C%7B%22id%22%3A%22explicit.stat_587431675%22%2C%22value%22%3A%7B%22min%22%3A37%7D%7D%2C%7B%22id%22%3A%22explicit.stat_1379411836%22%2C%22value%22%3A%7B%22min%22%3A23%7D%7D%2C%7B%22id%22%3A%22explicit.stat_1389153006%22%2C%22value%22%3A%7B%22min%22%3A36%7D%7D%5D%7D%5D%2C%22filters%22%3A%7B%22type_filters%22%3A%7B%22filters%22%3A%7B%22category%22%3A%7B%22option%22%3A%22accessory.amulet%22%7D%2C%22rarity%22%3A%7B%22option%22%3A%22nonunique%22%7D%7D%7D%2C%22trade_filters%22%3A%7B%22filters%22%3A%7B%22price%22%3A%7B%22min%22%3A1%7D%7D%7D%7D%7D%2C%22sort%22%3A%7B%22price%22%3A%22asc%22%7D%7D
```

## 15. メイン武器/スワップ武器の判定方法

poe.ninja のレスポンスは `itemData.inventoryId` で武器スロットを表す。

### 15.1 判定ルール

- メイン武器: `inventoryId === "Weapon"`
- メイン副手: `inventoryId === "Offhand"`
- スワップ武器: `inventoryId === "Weapon2"`
- スワップ副手: `inventoryId === "Offhand2"`

### 15.2 どちらがアクティブか

poe.ninjaのビルドページでは **WTab（武器切替タブ）** が表示されるため、DOM側から判定する。

- `grid-area: WTab` の要素配下にある子要素（I/II）のうち、**hoverが付いていない方が選択中**
- 1番目が選択中 → メイン（`Weapon/Offhand`）
- 2番目が選択中 → スワップ（`Weapon2/Offhand2`）
- スワップ側に装備が無い場合は **null** を返し、メイン側へのフォールバックはしない

### 15.3 実データ例

`samples/poe-ninja-character-weapon2.json` より。

- `Weapon`: Dueling Wand
- `Offhand`: Omen Sceptre
- `Weapon2`: Chiming Staff
- `useSecondWeaponSet`: false（メイン側がアクティブ）

## 16. 装備情報とninjaページDOMの紐づけ（grid-area活用）

poe.ninjaのビルドページは装備グリッドをCSS Gridで描画している。DOM側の各アイテム要素には `grid-area` が割り当てられるため、これをスロット名として利用できる。

### 16.1 グリッド側のスロット名

CSSの `grid-template-areas` から読み取れるスロット名は以下。
`Weapon`, `Offhand`, `Helm`, `BodyArmour`, `Gloves`, `Boots`, `Amulet`, `Ring`, `Ring2`, `Ring3`, `Belt`, `Trinket`, `LifeFlask`, `ManaFlask`, `Charms`。

### 16.2 具体的な紐づけ手順

1. DOMで「装備グリッド」を特定する
   - `getComputedStyle(el).gridTemplateAreas` に `Weapon` を含む要素が対象
2. 子要素の `grid-area` を取得する
   - `getComputedStyle(itemEl).gridArea` を参照
3. `grid-area` 名からスロット名を確定し、`inventoryId` に変換する
   - 例: `Weapon` → `Weapon`, `Ring2` → `Ring2`
4. poe.ninja APIの `items[]` と `inventoryId` で結合し、DOM上の要素に装備情報を付与する

### 16.3 DOMスキャンのサンプル（概念）

```js
function findEquipmentGrid(root = document) {
  return Array.from(root.querySelectorAll(\"div,section\")).find((el) => {
    const style = getComputedStyle(el);
    return style.display === \"grid\" && style.gridTemplateAreas.includes(\"Weapon\");
  });
}

function mapDomToInventoryId() {
  const grid = findEquipmentGrid();
  if (!grid) return [];
  const items = Array.from(grid.children);
  return items
    .map((el) => ({
      el,
      gridArea: getComputedStyle(el).gridArea.replace(/\"/g, \"\"),
    }))
    .filter((row) => row.gridArea && row.gridArea !== \"auto\");
}
```

### 16.4 注意点

- クラス名はハッシュ化されるため、クラス固定は避ける
- `grid-area` 名が変わった場合に備えて、`gridTemplateAreas` の文字列から動的に判断する
- `Ring3` など特殊スロットは、画面上に存在する場合のみ紐づける
- `Charms` は **親要素に grid-area が付き、子要素が実セル** なので、子要素をクリック対象として index を割り振る
- poe.ninjaの`Charms`実データは`items`ではなく`flasks`配列に入る場合があるため、`flasks`優先で解決する
- `flasks`内のチャームは`x/y`で左→右、上→下に並べて`slotIndex`に対応付ける
- `x/y`が無い場合は`itemSlot`でソートする

### 16.6 ジュエル一覧のDOMと順序解決

poe.ninjaのジュエル一覧は装備グリッドとは別セクションに描画されるため、**別途DOMから拾ってクリックを割り当てる**。

- セル要素: `.w-16` の内側に `img[alt]` があるものを対象にする
- `img.alt` は `name + baseType` または `typeLine` と一致するため、APIの`jewels[]`から候補集合を作る
- DOMの`img.alt`をキーにして`jewels[]`と対応付ける
- 同じ`alt`が複数ある場合も**API順のまま割り当てる**

### 16.5 セレクタの具体化（実装寄り）

poe.ninjaのビルドページはSSR時点では装備DOMが無く、クライアント側で描画される。  
そのため「固定クラス」のCSSセレクタではなく、**計算済みスタイルで判定する**のが安全。

```js
function findEquipmentGrid(root = document) {
  return Array.from(root.querySelectorAll("div,section")).find((el) => {
    const style = getComputedStyle(el);
    return (
      style.display === "grid" &&
      style.gridTemplateAreas.includes("Weapon") &&
      style.gridTemplateAreas.includes("Offhand")
    );
  });
}

function findGridCells(grid) {
  return Array.from(grid.children)
    .map((el) => ({
      el,
      gridArea: getComputedStyle(el).gridArea.replace(/\"/g, "")
    }))
    .filter((row) => row.gridArea && row.gridArea !== "auto");
}

function mapCellsToInventoryId() {
  const grid = findEquipmentGrid();
  if (!grid) return [];
  return findGridCells(grid).map(({ el, gridArea }) => ({
    el,
    inventoryId: gridArea // Weapon/Offhand/Helm/... と同名
  }));
}
```

DOMが遅延描画される場合に備えて、`MutationObserver` で `findEquipmentGrid` が見つかるまで待つ。

## 17. 実装メモ（stat filter 生成ルール）

実装時に詰まった点と、最終的なルールを整理する。

### 17.1 trade2 stats の取得経路

- content script から直接取得すると CORS で失敗するため、background service worker で取得する
- `https://www.pathofexile.com/api/trade2/data/stats` を読み込み、`text -> { type: {id, hasValue} }` のマップを作る

### 17.2 文字列正規化

- `[...]` と `[Tag|Display]` の両方を除去
- 数値は `#` に置換
- `+` と `#` の間の空白は削除
- 装備条件の接頭辞は除去（`Armour:`, `Wand or Staff:` など）
- 正規化は **prefix 除去あり/なしの両方**をキー候補にする

### 17.3 rune/augment の扱い

- runeMods と socketedItems 由来の rune は **type: augment** を優先して検索する
- `trade2/data/stats` 側は `type: augment` だが `id` は `rune.stat_*` になる
- augment が無い場合は `rune.*` のIDをフォールバックで採用する

### 17.4 socketedItems の扱い

- rune ソケット数（`sockets[].type === "rune"`）を上限として採用
- `socketedItems` のうち rune/Soul Core/Idol/Talisman/Augment のみを対象にする
- 装備条件が合わない mod は除外（例: `Body Armours:` が武器に混ざる場合）

### 17.5 value の付与ルール

- stats 側の `text` に `#` が含まれる場合のみ `value` を付与
- 固定値（`#` が無い）mod は **value を省略**する
- 同一 `stat id` の重複は統合し、`min` は最大値、`max` は最小値を採用

### 17.6 mutatedMods の扱い

- poe.ninjaの`mutatedMods`はtrade2側の専用typeが無いため、`explicit`扱いでフィルターに加える

### 17.7 Charges per use の減少表記（reduced/less）の扱い

`reduced Charges per use` は trade2 側の `#% increased Charges per use` に紐づくため、候補生成とネゲート処理が必要。

- **候補生成**: `Charges per use` を含む場合は `reduced/less -> increased/more` へ置換したキーを追加して探索する
- **ネゲート判定**: 元のmod側が `reduced/less` で、stats側が `increased/more` の場合は値を反転
- **単一値の反転**: negatedで `min` のみ生成された場合は `max` に入れる（例: `-21` は `max: -21`）
- **Flask Charges used へのフォールバック**: フラスコの場合は `Charges per use` を `Flask Charges used` に置換した候補も追加

### 17.8 Armour/Evasion/Energy Shield の local 判定

防具スロット（Helm/BodyArmour/Gloves/Boots）やShieldでは、数値防御系の `explicit` は trade2 側の `(Local)` に寄ることが多い。

- **local候補を優先**: 防具/盾では `(Local)` 版のキーを先に評価し、通常版は後回し
- **対応する置換**
  - `# to Armour` → `# to Armour (Local)`
  - `# to Evasion Rating` → `# to Evasion Rating (Local)`
  - `# to Energy Shield` / `# to maximum Energy Shield` → `# to maximum Energy Shield (Local)`
  - `#% increased Armour` → `#% increased Armour (Local)`
  - `#% increased Evasion Rating` → `#% increased Evasion Rating (Local)`
  - `#% increased Energy Shield` → `#% increased Energy Shield (Local)`

### 17.9 フラットダメージ（Adds # to # ... Damage to Attacks）の値算出

`Adds # to # [Element] Damage to Attacks` は trade2 のフィルタ値として**平均値**を使う。

- 例: `Adds 5 to 10 Fire Damage to Attacks` → `(5 + 10) / 2 = 7.5`
- value は平均値を `min` に入れる（参照実装の `getRollOrMinmaxAvg` と同等の扱い）
