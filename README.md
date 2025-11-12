# 🌍 Time Zone Converter (TimeZ)

A fast, minimalist web app to compare times across multiple time zones — built with **React**, **Vite**, and **Luxon**, deployed on **GitHub Pages**, and installable as a **Progressive Web App (PWA)**.

![screenshot](./public/screenshot.svg)

## ✨ Features

- 🕒 **Instant conversion** between time zones  
- 🧩 **Table view** with hours as rows and time zones as columns  
- 🔴 **Red** highlights the current time  
- 🌙 **Night hours** (22:00–06:00) visually dimmed  
- 📱 **Mobile-friendly**: native `<select>` on mobile, `<datalist>` search on desktop  
- 🔗 **Shareable URLs**: state synced to the query string  
- 📱 **Progressive Web App** can be installed on Android
- ⚡ **Offline support** via service worker (PWA)  
- 🧭 **Privacy-first**: all time calculations and conversions happen entirely in your browser.

## 🧱 Tech Stack

| Purpose | Library / Tool |
|----------|----------------|
| Framework | [React](https://react.dev/) |
| Build tool | [Vite](https://vitejs.dev/) |
| Date handling | [Luxon](https://moment.github.io/luxon/#/) |
| Deployment | [GitHub Pages](https://pages.github.com/) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |

## 🛠️ Local Development

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/timezone-converter.git
cd timezone-converter

# 2. Install dependencies
npm install

# 3. Start local dev server
npm run dev
```

The app will be available at http://localhost:5173.

## 🧩 Build & Deploy

To build for production and preview locally:

```
npm run build
npm run preview
```

Manual deploy to GitHub Pages:

```
npm run deploy
```

### 📜 License

Released under the [MIT License](./LICENSE).
Feel free to fork, remix, and improve.
