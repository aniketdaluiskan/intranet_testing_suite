import { createRoot } from "react-dom/client";
import { BrowserRouter } from "./router";
import { AppStore } from "./store";
import { applySessionMeta, getSessionId } from "./session";
import App from "./App";
import "./styles.css";

applySessionMeta(getSessionId());

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AppStore>
      <App />
    </AppStore>
  </BrowserRouter>,
);
