import { createRoot } from "react-dom/client";

import App from "./App";
import {
  createUncaughtErrorHandler,
  initFrontendSentry,
} from "./lib/monitoring";

import "./index.css";

document.body.classList.add("app-grain");

async function boot() {
  await initFrontendSentry();
  const uncaught = createUncaughtErrorHandler();
  createRoot(document.getElementById("root")!, {
    ...(uncaught ? { onUncaughtError: uncaught } : {}),
  }).render(<App />);
}

void boot();
