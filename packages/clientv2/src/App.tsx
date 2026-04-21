import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { SessionsPage } from "./pages/SessionsPage";
import { SettingsPage } from "./pages/SettingsPage";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/sessions", label: "Sessions" },
  { to: "/settings", label: "Settings" },
];

export function App() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-mark" aria-label="Yep Anywhere Client V2">
          <span className="brand-mark__glyph">Y</span>
          <span>
            <strong>Yep</strong>
            <small>Client V2</small>
          </span>
        </div>

        <nav className="app-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? "app-nav__item app-nav__item--active"
                  : "app-nav__item"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
