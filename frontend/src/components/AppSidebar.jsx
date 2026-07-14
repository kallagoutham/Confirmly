import { Check, LogOut, Moon, Settings, Sun, UserPlus } from "lucide-react";
import { Metric } from "./Metric";

export function AppSidebar({
  auth,
  credentials,
  metrics,
  profile,
  signupForm,
  signupMode,
  onCredentialsChange,
  onLogin,
  onLogout,
  onSignup,
  onSignupChange,
  onSignupModeChange,
  onThemeChange,
  theme,
}) {
  const signedIn = Boolean(auth && profile);

  return (
    <aside className={`sidebar ${signedIn ? "signed-in" : ""}`}>
      <div className="brand">
        <div className="brand-mark">C</div>
        <div>
          <h1>Confirmly</h1>
          <p>Appointments</p>
        </div>
      </div>

      {signedIn ? (
        <section className="profile-panel">
          <div className="profile-header">
            <div className="avatar">
              {profile.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="profile-identity">
              <strong>{profile.username}</strong>
              <span>{profile.email || "No email saved"}</span>
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-title">
              <Settings size={15} />
              <span>Profile settings</span>
            </div>
            <label>
              Theme
              <span className="theme-control">
                {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
                <select
                  value={theme}
                  onChange={(event) => onThemeChange(event.target.value)}
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </span>
            </label>
          </div>

          <div className="settings-group">
            <div className="settings-title">
              <span>Owned businesses</span>
            </div>
            <div className="business-list">
              {profile.businesses.map((business) => (
                <article className="business-card" key={business.id}>
                  <strong>{business.name}</strong>
                  <span>{business.timezone}</span>
                </article>
              ))}
            </div>
          </div>

          <button className="logout-button" type="button" onClick={onLogout}>
            <LogOut size={16} /> Sign out
          </button>
        </section>
      ) : signupMode ? (
        <form className="login-panel" onSubmit={onSignup}>
          <label>
            Business name
            <input
              required
              value={signupForm.business_name}
              onChange={(event) =>
                onSignupChange({
                  ...signupForm,
                  business_name: event.target.value,
                })
              }
              placeholder="Northside Studio"
            />
          </label>
          <label>
            Username
            <input
              autoComplete="username"
              required
              value={signupForm.username}
              onChange={(event) =>
                onSignupChange({ ...signupForm, username: event.target.value })
              }
              placeholder="owner"
            />
          </label>
          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              value={signupForm.email}
              onChange={(event) =>
                onSignupChange({ ...signupForm, email: event.target.value })
              }
              placeholder="owner@example.com"
            />
          </label>
          <label>
            Password
            <input
              autoComplete="new-password"
              minLength={8}
              required
              type="password"
              value={signupForm.password}
              onChange={(event) =>
                onSignupChange({ ...signupForm, password: event.target.value })
              }
              placeholder="At least 8 characters"
            />
          </label>
          <label>
            Timezone
            <input
              required
              value={signupForm.timezone}
              onChange={(event) =>
                onSignupChange({ ...signupForm, timezone: event.target.value })
              }
              placeholder="America/New_York"
            />
          </label>
          <div className="button-row">
            <button className="primary" type="submit">
              <UserPlus size={16} /> Sign up
            </button>
            <button
              className="ghost text-button"
              type="button"
              onClick={() => onSignupModeChange(false)}
            >
              Sign in
            </button>
          </div>
        </form>
      ) : (
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
          </div>
          <button
            className="link-button"
            type="button"
            onClick={() => onSignupModeChange(true)}
          >
            New business? Create an account
          </button>
        </form>
      )}

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
