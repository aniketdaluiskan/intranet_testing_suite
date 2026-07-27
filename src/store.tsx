import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "./router";
import { applySessionMeta, getSessionId } from "./session";

/**
 * Global app state: the session tag and the "churn" controls that make labels /
 * PII keep moving. The churn tick is derived from two sources:
 *   - the router's location.key (bumped on every navigation), and
 *   - timerGen: an optional idle timer that also rotates while idle.
 * The 40% stable schema labels and the shared session Id are seeded independently
 * of this tick (by slot index / session id), so they stay put across churn.
 *
 * NOTE: a per-click churn ("regenerate on EVERY click, not just navigations") was
 * considered and deliberately NOT wired in. It remounts the it.id-keyed views
 * (chat/form/list/board/cells + dialogs), which wipes the `data-swept` marks the
 * in-page autopilot and the e2e sweep rely on — those sweeps would then never
 * converge (and the modal "exhaust then close" step would stall). So churn stays
 * on navigation + idle timer only.
 */
export interface Settings {
  sessionTag: string;
  churnMs: number; // 0 = only churn on navigation; >0 = also rotate every churnMs
  showPII: boolean;
}

interface Store {
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  timerGen: number;
}

const StoreCtx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("useStore must be used within <AppStore>");
  return s;
}

/** Combined churn tick: navigation key + idle-timer generation. */
export function useChurnTick(): number {
  const { key } = useLocation();
  const { timerGen } = useStore();
  return (key + timerGen) >>> 0;
}

export function AppStore({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>({
    sessionTag: getSessionId(),
    churnMs: 0,
    showPII: true,
  });
  const [timerGen, setTimerGen] = useState(0);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.sessionTag !== undefined) applySessionMeta(next.sessionTag);
      return next;
    });
  }, []);

  useEffect(() => {
    if (settings.churnMs <= 0) return;
    const id = setInterval(
      () => setTimerGen((g) => (g + 1) >>> 0),
      Math.max(200, settings.churnMs),
    );
    return () => clearInterval(id);
  }, [settings.churnMs]);

  const value = useMemo<Store>(
    () => ({ settings, setSettings, timerGen }),
    [settings, setSettings, timerGen],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
