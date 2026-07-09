import { Check, X } from "lucide-react";
import { Metric } from "./Metric";

export function AppSidebar({
  auth,
  credentials,
  metrics,
  onCredentialsChange,
  onLogin,
  onLogout,
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">C</div>
        <div>
          <h1>Confirmly</h1>
          <p>Appointments</p>
        </div>
      </div>

      <form className="login-panel" onSubmit={onLogin}>
        <label>
          Username
          <input
            autoComplete="username"
            value={credentials.username}
            onChange={(event) =>
              onCredentialsChange({
                ...credentials,
                username: event.target.value,
              })
            }
            placeholder="admin"
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            type="password"
            value={credentials.password}
            onChange={(event) =>
              onCredentialsChange({
                ...credentials,
                password: event.target.value,
              })
            }
            placeholder="password"
          />
        </label>
        <div className="button-row">
          <button className="primary" type="submit">
            <Check size={16} /> Sign in
          </button>
          {auth && (
            <button
              className="ghost"
              type="button"
              onClick={onLogout}
              title="Sign out"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      <div className="metric-list">
        {metrics.map((metric) => (
          <Metric
            key={metric.label}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>
    </aside>
  );
}
