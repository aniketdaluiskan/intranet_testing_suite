import type { AppDef } from "./registry";
import { getLayout } from "./layouts";

/** Resolve the app to its authentic per-app layout. */
export default function AppShell({ app }: { app: AppDef }) {
  const Layout = getLayout(app);
  return <Layout app={app} />;
}
