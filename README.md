# Split

Local-first shared expense tracker built with React, Vite and Capacitor.

## Run

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm test
npm run build
npm run preview
```

## Android

Requires Android Studio / Android SDK and JDK 21.

```bash
npm run build
npx cap sync android
npx cap open android
```

Data is stored only in browser/WebView localStorage. The first launch includes an Italy Trip demo group.
