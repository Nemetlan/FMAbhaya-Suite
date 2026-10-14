# FMAbhaya Suite

A browser-based converter for Sinhala Unicode and the legacy FMAbhaya font encoding. Conversion runs locally in the browser; no server-side conversion service is required.

## Features

- Convert Unicode Sinhala to FMAbhaya, or FMAbhaya to Unicode.
- Convert as you type or paste text.
- Swap conversion direction with the swap button or `Ctrl+K` / `Cmd+K`.
- Copy converted text, clear the input, and view character counts.
- Toggle light and dark themes; the selected theme is saved in the browser.
- Responsive layout for desktop and mobile.

## Getting Started

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

## Commands

```sh
npm run dev      # Start the development server
npm run build    # Build the production site in dist/
npm run preview  # Preview the production build locally
```

## About the Font Encoding

FMAbhaya output uses legacy ASCII font codes, not Sinhala Unicode. The project bundles `4u-bindumathi.ttf` to render the converted output in the app. When using the converted text in another application, use a compatible legacy Sinhala font such as FM Abhaya. Use the reverse conversion mode to turn legacy-encoded text back into Unicode.

## Project Structure

```text
index.html                 App markup
src/main.js                UI behavior and conversion controls
src/fmAbhayaEngine.js      Unicode/FMAbhaya conversion engine
src/style.css              App styles and bundled font declaration
src/assets/fonts/          Bundled Sinhala font
src/assets/img/            App icon
```

## Credits

Created by [Nemetlan](https://www.drafnet.eu.org/). Inspired by [Malinthe Samarakoon](http://malinthe.com/). Originally created by LTRL, University of Colombo School of Computing: [Other Converter](http://www.ucsc.cmb.ac.lk/ltrl/services/feconverter/).
