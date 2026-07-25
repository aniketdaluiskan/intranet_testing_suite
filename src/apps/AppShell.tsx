import type { AppDef } from "./registry";
import { getLayout, ActionPanel } from "./layouts";

/** Resolve the app to its authentic per-app layout, plus the global action modal. */
export default function AppShell({ app }: { app: AppDef }) {
  const Layout = getLayout(app);
  return (
    <>
      <Layout app={app} />
      <ActionPanel app={app} />
    </>
  );
}
