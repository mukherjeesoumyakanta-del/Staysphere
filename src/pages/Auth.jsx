import { useState } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  House,
  User,
  LoaderCircle,
} from "lucide-react";
import { authService } from "../services";
import { useStore } from "../context/Store";
import { Button, Field, Brand } from "../components/UI";
import { photo } from "../data/properties";
export default function Auth({ signup = false }) {
  const [params] = useSearchParams();
  const [f, setF] = useState({
      name: "",
      email: "",
      password: "",
      role: params.get("role") === "HOST" ? "HOST" : "GUEST",
    }),
    [visible, setVisible] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const { refresh, authError } = useStore(),
    navigate = useNavigate(),
    location = useLocation();
  const set = (k, v) => setF({ ...f, [k]: v });
  async function submit(e) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = signup
        ? await authService.signup(f)
        : await authService.login(f.email, f.password);
      refresh();
      const from = location.state?.from;
      navigate(
        from?.startsWith("/" + data.role.toLowerCase())
          ? from
          : `/${data.role.toLowerCase()}/dashboard`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="auth-page">
      <div
        className="auth-image"
        style={{
          backgroundImage: `url(${photo("photo-1600210492486-724fe5c67fb0", 1200)})`,
        }}
      >
        <Brand />
        <div>
          <span className="eyebrow">MAKE ROOM FOR SOMETHING GOOD</span>
          <h1>
            A space to stay.
            <br />A place to belong.
          </h1>
          <p>Your next chapter starts here.</p>
        </div>
      </div>
      <main className="auth-form">
        <Link to="/" className="back-link">
          ← Back to StaySphere
        </Link>
        <span className="eyebrow">YOUR KIND OF SOMEWHERE</span>
        <h1>{signup ? "Start your story." : "Welcome back."}</h1>
        <p>
          {signup
            ? "A little more discovery. A little more you."
            : "Your favourite spaces are waiting for you."}
        </p>
        <form onSubmit={submit}>
          {signup && (
            <>
              <Field
                label="Your name"
                minLength={2}
                maxLength={80}
                required
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
              />
              <div className="role-selector">
                {["GUEST", "HOST"].map((r) => (
                  <button
                    type="button"
                    key={r}
                    className={f.role === r ? "active" : ""}
                    onClick={() => set("role", r)}
                  >
                    {r === "HOST" ? <House size={20} /> : <User size={20} />}
                    <span>
                      {r === "HOST" ? "I’m a host" : "I’m a guest"}
                      <small>
                        {r === "HOST" ? "Share your space" : "Find your space"}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          <Field
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={f.email}
            onChange={(e) => set("email", e.target.value)}
          />
          <Field label="Password">
            <div className="password-field">
              <input
                type={visible ? "text" : "password"}
                minLength={8}
                required
                autoComplete={signup ? "new-password" : "current-password"}
                value={f.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 8 characters"
              />
              <button
                className="icon-button"
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Hide password" : "Show password"}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {(error || authError) && (
            <p role="alert" className="error">
              {error || authError}
            </p>
          )}
          <Button disabled={loading} type="submit">
            {loading ? (
              <LoaderCircle className="spin" size={18} />
            ) : signup ? (
              "Create account"
            ) : (
              "Sign in"
            )}
            <ArrowUpRight size={17} />
          </Button>
        </form>
        <div className="auth-switch">
          {signup ? "Already have an account?" : "New to StaySphere?"}{" "}
          <Link to={signup ? "/login" : "/signup"}>
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </div>
        <div
          className="demo-accounts"
          style={{
            marginTop: "1.5rem",
            padding: "1.25rem",
            background: "rgba(0,0,0,0.03)",
            borderRadius: "12px",
            border: "1px dashed rgba(0,0,0,0.15)",
          }}
        >
          <span className="eyebrow" style={{ display: "block", marginBottom: "0.5rem" }}>
            QUICK DEMO ACCOUNTS
          </span>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem" }}>
            Click below to instantly sign in with a demo account:
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="button secondary"
              style={{
                fontSize: "0.85rem",
                padding: "0.5rem 0.9rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer",
              }}
              onClick={async () => {
                setLoading(true);
                setError("");
                try {
                  const { data } = await authService.login(
                    "guest@demo.com",
                    "Password123!"
                  );
                  refresh();
                  const from = location.state?.from;
                  navigate(from || "/guest/dashboard");
                } catch (e) {
                  setError(e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              <User size={15} /> Demo Guest Login
            </button>
            <button
              type="button"
              className="button secondary"
              style={{
                fontSize: "0.85rem",
                padding: "0.5rem 0.9rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer",
              }}
              onClick={async () => {
                setLoading(true);
                setError("");
                try {
                  const { data } = await authService.login(
                    "host@demo.com",
                    "Password123!"
                  );
                  refresh();
                  const from = location.state?.from;
                  navigate(from || "/host/dashboard");
                } catch (e) {
                  setError(e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              <House size={15} /> Demo Host Login
            </button>
          </div>
          <small
            className="muted"
            style={{ display: "block", marginTop: "0.75rem", fontSize: "0.75rem" }}
          >
            Demo credentials: <strong>guest@demo.com</strong> or <strong>host@demo.com</strong> · Password: <code>Password123!</code>
          </small>
        </div>
      </main>
    </div>
  );
}
