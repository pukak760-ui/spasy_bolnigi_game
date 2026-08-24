import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Tells the inline boot failsafe (index.html) that the bundle executed,
// so the startup splash is never mistaken for a stuck loader.
(window as Window & { __APP_MOUNTED__?: boolean }).__APP_MOUNTED__ = true;

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
