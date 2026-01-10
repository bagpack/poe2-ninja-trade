# poe2-ninja-trade

English | [日本語](README.ja.md)

Chrome extension that opens PoE2 trade searches directly from poe.ninja character equipment.

## Features

- Click equipment on poe.ninja character pages to open PoE2 trade search
- Supports weapons, armour, accessories, flasks, charms, jewels
- Supports both English (www) and Japanese (jp) trade sites

## Install (Recommended)

Download the zip from GitHub Releases, unzip it, and load the extracted folder.

1. Open Chrome Extensions
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the extracted folder

## Build (Optional)

If you want to build from source, see `docs/BUILDING.md`.

## Quick Build

```bash
npm install
npm run build
```

Load the `dist/` folder in Chrome Extensions (Developer mode).

## Usage

- Open a poe.ninja character page
- Click an item to open the trade search
- Use the popup to switch trade site language

## Development

```bash
npm run lint
npm run format:check
npm run build
```

## License

MIT (see `LICENSE`).
Third-party notices: `docs/NOTICE.md`.

## Acknowledgements

Thanks to [Kvan7/Exiled-Exchange-2](https://github.com/Kvan7/Exiled-Exchange-2) for reference and data sources.
