import { createRoot } from "react-dom/client";
import { BrowserRouter } from "./router";
import { AppStore } from "./store";
import { applySessionMeta, getSessionId } from "./session";
import { APPS } from "./apps/registry";
import App from "./App";
import "./styles.css";

applySessionMeta(getSessionId());

/**
 * Stable test manifest for E2E automation. The click-all-elements sweep reads
 * this to enumerate every sub-app (id + name + base-relative path) without
 * scraping portal tiles, so new apps are picked up automatically as they're
 * added to the registry. Kept intentionally simple and side-effect free.
 */
(window as unknown as { __APPS__?: unknown }).__APPS__ = APPS.map((a) => ({
  id: a.id,
  name: a.name,
  path: `${(import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || "/"}`.replace(
    /\/$/,
    "",
  ) + `/${a.id}`,
}));

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AppStore>
      <App />
    </AppStore>
  </BrowserRouter>,
);
