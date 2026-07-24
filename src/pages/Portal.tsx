import { type CSSProperties } from "react";
import { useNavigate } from "../router";
import { useChurnTick, useStore } from "../store";
import { APPS, capacityOf } from "../apps/registry";
import { makeLabeler } from "../lib/labeler";
import { pii } from "../lib/pii";
import { appRole, PROCESS_APPS, NOISE_APPS } from "../lib/controls";
import { multiPort, appPortOrigin } from "../lib/ports";
import { getSessionId } from "../session";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export default function Portal() {
  const navigate = useNavigate();
  const tick = useChurnTick();
  const { settings, setSettings } = useStore();
  const lab = makeLabeler(tick, 1);

  const totals = APPS.reduce(
    (acc, a) => {
      const c = capacityOf(a);
      return { valid: acc.valid + c.valid, invalid: acc.invalid + c.invalid };
    },
    { valid: 0, invalid: 0 },
  );

  return (
    <div className="portal">
      <header className="portal-hdr">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>Acme Intranet</h1>
            <p className="portal-sub">
              {APPS.length} applications · ≈ {fmt(totals.valid + totals.invalid)}{" "}
              field instances / full pass ({fmt(totals.valid)} valid /{" "}
              {fmt(totals.invalid)} invalid) · {PROCESS_APPS.length}-app process +{" "}
              {NOISE_APPS.length} noise + {APPS.length - PROCESS_APPS.length - NOISE_APPS.length} extras
            </p>
          </div>
        </div>
        <div className="portal-user">
          <input
            className="portal-search"
            placeholder={lab.field(0)}
            aria-label={lab.field(1)}
          />
          <span className="user-chip">{pii("name", tick + 99)}</span>
        </div>
      </header>

      <section className="portal-controls" data-ap-control="1">
        <label>
          Session tag
          <input
            value={settings.sessionTag}
            onChange={(e) => setSettings({ sessionTag: e.target.value })}
          />
        </label>
        <label className="chk">
          <input
            type="checkbox"
            checked={settings.showPII}
            onChange={(e) => setSettings({ showPII: e.target.checked })}
          />
          Show PII values
        </label>
        <label className="chk">
          <input
            type="checkbox"
            checked={settings.churnMs > 0}
            onChange={(e) => setSettings({ churnMs: e.target.checked ? 4000 : 0 })}
          />
          Auto-rotate labels while idle
        </label>
        <span className="hint">
          Labels, PII &amp; URLs also change on every click. Session:{" "}
          <code>{settings.sessionTag || getSessionId()}</code>
        </span>
      </section>

      <section className="app-grid">
        {APPS.map((app, idx) => {
          const c = capacityOf(app);
          const port = 5174 + idx;
          return (
            <div className="tile-wrap" key={app.id}>
              <button
                className="app-tile"
                data-app={app.id}
                onClick={() => {
                  if (multiPort()) window.location.href = appPortOrigin(idx);
                  else navigate(`/${app.id}`);
                }}
                style={{ "--accent": app.accent } as CSSProperties}
              >
                <div className="tile-top">
                  <span className="tile-mono" style={{ background: app.accent }}>
                    {app.monogram}
                  </span>
                  <span className="tile-name">{app.name}</span>
                  <span className={`role-badge role-${appRole(app.id)}`}>
                    {appRole(app.id)}
                  </span>
                </div>
                <p className="tile-blurb">{app.blurb}</p>
                <div className="tile-caps">
                  <span className="cap-total">{fmt(c.total)} attrs</span>
                  <span className="cap-valid">{fmt(c.valid)} valid</span>
                  <span className="cap-invalid">{fmt(c.invalid)} invalid</span>
                </div>
              </button>
              {multiPort() && (
                <a
                  className="tile-port"
                  href={`http://${window.location.hostname}:${port}/`}
                  title={`Open ${app.name} on its own port`}
                  onClick={(e) => e.stopPropagation()}
                >
                  :{port}
                </a>
              )}
            </div>
          );
        })}
      </section>

      <footer className="portal-foot">
        Fake enterprise intranet · QA capture target · no real data, synthetic
        values only
      </footer>
    </div>
  );
}
