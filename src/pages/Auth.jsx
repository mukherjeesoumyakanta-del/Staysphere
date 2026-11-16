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
  const { refresh } = useStore(),
    navigate = useNavigate(),
    location = useLocation();
  const set = (k, v) => setF({ ...f, [k]: v });
  async function submit(e, demo) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } =
        signup && !demo
          ? await authService.signup(f)
          : await authService.login(
              demo ? `${demo}@staysphere.demo` : f.email,
              demo ? "Demo123!" : f.password,
            );
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
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button disabled={loading} type="submit">
            {loading ? (
              <LoaderCircle className="spin" size={18} />
            ) : signup ? (
              "Create demo account"
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
        <div className="demo-accounts">
          <span className="eyebrow">TAKE A LOOK AROUND</span>
          <p>Try a clearly labelled demo account.</p>
          <div className="actions">
            <Button
              disabled={loading}
              className="secondary"
              onClick={() => submit(null, "guest")}
            >
              Explore as guest
            </Button>
            <Button
              disabled={loading}
              className="secondary"
              onClick={() => submit(null, "host")}
            >
              Explore as host
            </Button>
          </div>
          <small>
            guest@staysphere.demo / host@staysphere.demo
            <br />
            Password: Demo123! · Frontend simulation, not production security.
          </small>
        </div>
      </main>
    </div>
  );
}
