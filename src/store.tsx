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
 * PII keep moving. The churn tick is derived from the router's location.key
 * (bumped on every navigation/interaction) plus an optional idle timer, so:
 *   - every click that navigates regenerates all labels/values, and
 *   - if enabled, labels also rotate on a timer while idle.
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
