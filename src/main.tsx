import React from "react";
import ReactDOM from "react-dom/client";

// Fonts are SELF-HOSTED from npm packages (woff2 files bundled into the build
// archive by Vite) — the game must not reference any external service/CDN
// (Yandex Games moderation rule: no service-storage links in the build).
import "@fontsource/russo-one/400.css";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/500.css";
import "@fontsource/rubik/600.css";
import "@fontsource/rubik/700.css";
import "@fontsource/rubik/800.css";
import "@fontsource/rubik/900.css";

import "./index.css";
import App from "./App.tsx";

// Tells the inline boot failsafe (index.html) that the bundle executed,
// so the startup splash is never mistaken for a stuck loader.
(window as Window & { __APP_MOUNTED__?: boolean }).__APP_MOUNTED__ = true;

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
