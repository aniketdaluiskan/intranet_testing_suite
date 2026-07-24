import { useNavigate, useParams } from "../router";
import { getApp } from "../apps/registry";
import AppShell from "../apps/AppShell";

export default function AppRoute() {
  const { appId = "" } = useParams();
  const navigate = useNavigate();
  const app = getApp(appId);
  if (!app) {
    return (
      <div className="notfound">
        <h2>App not found</h2>
        <button className="btn" onClick={() => navigate("/")}>
          Back to intranet
        </button>
      </div>
    );
  }
  return <AppShell app={app} />;
}
