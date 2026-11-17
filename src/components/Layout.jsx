import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  Menu,
  X,
  ArrowUpRight,
  Sparkles,
  LayoutDashboard,
  Heart,
  House,
  CalendarDays,
  User,
  LogOut,
  Plus,
  PanelLeftClose,
  ArrowRight,
  ArrowLeftRight,
} from "lucide-react";
import { Brand, Button, Loading, Empty } from "./UI";
import { useStore } from "../context/Store";
import { authService } from "../services";
export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useStore();

  return (
    <header className="navbar">
      <div className="nav-inner">
        <Brand />
        <nav
          className={open ? "nav-links open" : "nav-links"}
          onClick={() => setOpen(false)}
        >
          <NavLink to="/explore">Explore stays</NavLink>
          <NavLink to="/guest/ai-finder">
            <Sparkles size={14} /> AI Finder{" "}
            <span className="tiny-tag">NEW</span>
          </NavLink>
          <NavLink to="/about">Our story</NavLink>
        </nav>
        <div className="nav-actions">
          {user ? (
            <div className="nav-user-actions" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="tiny-tag nav-user-tag" style={{ textTransform: "capitalize", padding: "3px 8px" }}>
                {user.role?.toLowerCase()} · {user.name?.split(" ")[0] || "User"}
              </span>
              <Button
                className="nav-signin"
                to={`/${user.role.toLowerCase()}/dashboard`}
              >
                Workspace
              </Button>
              <button
                className="button secondary nav-logout-btn"
                style={{
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.85rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  cursor: "pointer",
                }}
                onClick={async () => {
                  try {
                    await authService.logout();
                  } finally {
                    window.location.href = "/";
                  }
                }}
                aria-label="Sign out"
              >
                <LogOut size={14} /> <span className="logout-text">Sign out</span>
              </button>
            </div>
          ) : (
            <>
              <Link
                className="host-link"
                to="/signup?role=HOST"
              >
                Become a host <ArrowUpRight size={15} />
              </Link>
              <Button
                className="nav-signin"
                to="/login"
              >
                Sign in
                <ArrowUpRight size={15} />
              </Button>
            </>
          )}
          <button
            className="icon-button mobile-toggle"
            aria-label="Toggle navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <div>
          <Brand />
          <p>Extraordinary spaces. A little more you.</p>
        </div>
        <div>
          <h4>Discover</h4>
          <Link to="/explore">Explore stays</Link>
          <Link to="/guest/ai-finder">AI Property Finder</Link>
          <Link to="/about">Our story</Link>
        </div>
        <div>
          <h4>Make yourself at home</h4>
          <Link to="/signup?role=HOST">Become a host</Link>
          <Link to="/login">Your workspace</Link>
          <a href="mailto:hello@example.com">Contact · demo address</a>
        </div>
        <div className="footer-note">
          A new perspective.
          <br />A place to belong.<span>Crafted for the way you stay.</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} StaySphere. All rights reserved.
        </span>
        <span>Frontend demo · No online reservations</span>
        <span>Made for the curious ↗</span>
      </div>
    </footer>
  );
}
export function PublicLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}
export function ProtectedRoute({ role }) {
  const { user, authLoading, authError, restoreSession } = useStore();
  const location = useLocation();
  if (authLoading) return <Loading />;
  if (authError && !user)
    return (
      <Empty title="Could not restore your session" text={authError}>
        <Button onClick={restoreSession}>Try again</Button>
        <Button className="secondary" to="/login">
          Sign in
        </Button>
      </Empty>
    );
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // Hosts have full access to guest features too; guests switch to HOST mode for host workspace
  if (role === "HOST" && user.role !== "HOST")
    return <Navigate to="/guest/dashboard" replace />;
  return <Outlet />;
}
export function DashboardLayout({ role }) {
  const [open, setOpen] = useState(false),
    [collapsed, setCollapsed] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const { user, refresh, switchRole } = useStore();
  const [logoutError, setLogoutError] = useState(""),
    [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const host = role === "HOST";
  const base = host ? "/host" : "/guest";
  const links = host
    ? [
        [LayoutDashboard, "Overview", "/dashboard"],
        [House, "My listings", "/listings"],
        [CalendarDays, "Reservations", "/reservations"],
        [CalendarDays, "Availability", "/availability"],
        [User, "Profile", "/profile"],
      ]
    : [
        [LayoutDashboard, "Overview", "/dashboard"],
        [CalendarDays, "My Bookings", "/bookings"],
        [Heart, "Saved spaces", "/favorites"],
        [Sparkles, "AI Finder", "/ai-finder"],
        [User, "Profile", "/profile"],
      ];

  const handleSwitchWorkspace = async () => {
    if (switchingRole) return;
    setSwitchingRole(true);
    try {
      const nextRole = host ? "GUEST" : "HOST";
      await switchRole(nextRole);
      setOpen(false);
      navigate(nextRole === "HOST" ? "/host/dashboard" : "/guest/dashboard");
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <div className={"workspace " + (collapsed ? "collapsed" : "")}>
      {open && (
        <div
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={"sidebar " + (open ? "open" : "")}>
        <Brand />
        <button
          className="sidebar-collapse icon-button"
          aria-label="Collapse sidebar"
          onClick={() => setCollapsed(!collapsed)}
        >
          <PanelLeftClose size={18} />
        </button>
        <span className="eyebrow">
          {host ? "HOST WORKSPACE" : "YOUR PERSONAL SPACE"}
        </span>

        {/* 1-Account Dual-Role Mode Switcher in Sidebar */}
        <div className="sidebar-mode-card">
          <div className="sidebar-mode-status">
            <span className="sidebar-mode-dot" />
            <span>{host ? "Host Mode" : "Guest Mode"}</span>
          </div>
          <button
            type="button"
            className="sidebar-switch-btn"
            disabled={switchingRole}
            onClick={handleSwitchWorkspace}
          >
            <ArrowLeftRight size={13} />
            <span>{switchingRole ? "Switching…" : `Switch to ${host ? "Guest Mode" : "Host Mode"}`}</span>
          </button>
        </div>

        <nav>
          {links.map(([Icon, title, path]) => (
            <NavLink onClick={() => setOpen(false)} key={path} to={base + path}>
              <Icon size={19} />
              <span>{title}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/explore">
            <ArrowUpRight size={18} />
            Explore stays
          </Link>
          <button
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              setLogoutError("");
              try {
                await authService.logout();
                refresh();
                navigate("/");
              } catch (error) {
                setLogoutError(error.message);
              } finally {
                setLoggingOut(false);
              }
            }}
          >
            <LogOut size={18} />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
          {logoutError && (
            <p role="alert" className="error">
              {logoutError}
            </p>
          )}
          <small>Signed-in account · Demo property data</small>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <button
            className="icon-button mobile-toggle"
            onClick={() => setOpen(!open)}
            aria-label="Toggle dashboard menu"
          >
            <Menu />
          </button>
          <span className="workspace-title">{host ? "Property management" : "A little space for you"}</span>
          <div className="workspace-header-actions">
            <button
              type="button"
              className="header-switch-mode-btn"
              disabled={switchingRole}
              onClick={handleSwitchWorkspace}
              title={`Switch account mode to ${host ? "Guest" : "Host"}`}
            >
              <ArrowLeftRight size={13} />
              <span className="header-switch-text">
                {switchingRole ? "…" : host ? "To Guest" : "To Host"}
              </span>
            </button>
            <span className="demo-label">DEMO PROPERTY DATA</span>
            <Link to={base + "/profile"} className="avatar" title={user.name}>
              {user.name?.[0] || "U"}
            </Link>
          </div>
        </header>
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
