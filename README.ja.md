# PoE2 ninja Trade

[English](README.md) | 日本語

poe.ninjaのキャラクター装備からPoE2トレード検索を直接開くChrome拡張です。

## 機能

- poe.ninjaの装備クリックでトレード検索を開く
- 武器/防具/アクセ/フラスコ/チャーム/ジュエルに対応
- 英語（www）/日本語（jp）のトレードサイトに対応

## インストール（推奨）

GitHub Releasesのzipをダウンロードして展開し、展開したフォルダを読み込んでください。

1. Chrome拡張を開く
2. デベロッパーモードをONにする
3. 「パッケージ化されていない拡張機能を読み込む」を選ぶ
4. 展開したフォルダを指定する

## ビルド（任意）

ソースからビルドする場合は `docs/BUILDING.md` を参照してください。

## クイックビルド

```bash
npm install
npm run build
```

Chrome拡張（デベロッパーモード）で `dist/` を読み込んでください。

## 使い方

- poe.ninjaのキャラクターページを開く
- 装備をクリックして検索
- ポップアップで言語を切り替え

## 開発

```bash
npm run lint
npm run format:check
npm run build
```

## ライセンス

MIT（`LICENSE` を参照）。
第三者ライセンス: `docs/NOTICE.md`。

## 謝辞

参考にした [Kvan7/Exiled-Exchange-2](https://github.com/Kvan7/Exiled-Exchange-2) に感謝します。
