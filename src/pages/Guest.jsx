import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Send,
  RotateCcw,
  Heart,
  Compass,
  LoaderCircle,
  User,
  Check,
} from "lucide-react";
import { useStore } from "../context/Store";
import { aiService, authService } from "../services";
import { PropertyGrid, Button, Field, Empty } from "../components/UI";
export function GuestDashboard() {
  const { user, listings, favorites, recent } = useStore();
  return (
    <>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h1>Good to see you, {user.name.split(" ")[0]}.</h1>
          <p>A little inspiration for your next change of scene.</p>
        </div>
        <Button to="/explore">
          Explore stays
          <ArrowUpRight size={17} />
        </Button>
      </div>
      <Link className="guest-ai-banner" to="/guest/ai-finder">
        <span className="sparkle-box">
          <Sparkles size={26} />
        </span>
        <div>
          <span className="eyebrow">YOUR WISH LIST, MEET YOUR SHORTLIST</span>
          <h2>Tell us your kind of somewhere.</h2>
          <p>Find a space in your own words with the demo AI Finder.</p>
        </div>
        <ArrowUpRight />
      </Link>
      <div className="section-heading">
        <h2>
          Picked for your <span>next escape.</span>
        </h2>
      </div>
      <PropertyGrid
        properties={listings.filter((p) => p.status === "active").slice(0, 3)}
      />
      <div className="section-heading dashboard-section">
        <h2>
          Saved for <span>later.</span>
        </h2>
        <Link className="text-link" to="/guest/favorites">
          View all
          <ArrowRight size={16} />
        </Link>
      </div>
      {favorites.length ? (
        <PropertyGrid
          properties={listings
            .filter((p) => favorites.includes(p.id) && p.status === "active")
            .slice(0, 3)}
        />
      ) : (
        <Empty
          title="A little wish list starts here"
          text="Tap a heart on any property to keep it close."
        />
      )}
      {recent.length > 0 && (
        <>
          <div className="section-heading dashboard-section">
            <h2>Recently explored</h2>
          </div>
          <PropertyGrid
            properties={listings
              .filter((p) => recent.includes(p.id) && p.status === "active")
              .slice(0, 3)}
          />
        </>
      )}
    </>
  );
}
export function Favorites() {
  const { listings, favorites } = useStore();
  return (
    <>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">KEEP THE GOOD ONES CLOSE</span>
          <h1>Your saved spaces.</h1>
          <p>A collection of places that feel a little like you.</p>
        </div>
        <Heart />
      </div>
      <PropertyGrid
        properties={listings.filter(
          (p) => favorites.includes(p.id) && p.status === "active",
        )}
      />
    </>
  );
}
export function AIFinder() {
  const [prompt, setPrompt] = useState(""),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [last, setLast] = useState("");
  const suggestions = [
    "A villa in Goa under ₹6,000 for 5 people with a pool",
    "A mountain view cottage in Manali under ₹5,000",
    "An apartment in Bengaluru for 2 guests",
  ];
  async function search(e, value) {
    e?.preventDefault();
    const q = value || prompt;
    if (!q.trim()) return;
    setBusy(true);
    setError("");
    setLast(q);
    setResult(null);
    try {
      setResult((await aiService.findPropertiesFromPrompt(q)).data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ai-page">
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} /> YOUR PERSONAL SPACE FINDER
          </span>
          <h1>A stay that gets you.</h1>
          <p>Describe your somewhere. We’ll help you find it.</p>
        </div>
        <button
          className="text-link"
          disabled={busy}
          onClick={() => {
            setResult(null);
            setError("");
            setLast("");
            setPrompt("");
          }}
        >
          <RotateCcw size={16} />
          Clear conversation
        </button>
      </div>
      <div className="ai-chat">
        <div className="ai-chat-intro">
          <span className="sparkle-box">
            <Sparkles size={25} />
          </span>
          <h2>A little detail goes a long way.</h2>
          <p>Tell me where, who’s coming, and what makes a stay feel right.</p>
          <span className="demo-label">
            MOCK AI · GROUNDED IN 12 DEMO PROPERTIES
          </span>
        </div>
        <div className="prompt-chips">
          {suggestions.map((s) => (
            <button
              disabled={busy}
              key={s}
              onClick={() => {
                setPrompt(s);
                search(null, s);
              }}
            >
              {s}
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
        <form className="ai-input" onSubmit={search}>
          <textarea
            aria-label="Describe your ideal stay"
            placeholder="A peaceful villa in Goa under ₹6,000 for 5 guests…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
          <Button
            type="submit"
            disabled={busy || !prompt.trim()}
            aria-label="Find matching properties"
          >
            {busy ? (
              <LoaderCircle size={20} className="spin" />
            ) : (
              <ArrowUpRight size={22} />
            )}
          </Button>
        </form>
        <small>
          Demo search extracts known destinations, budgets, guests, property
          types, and amenities. No live LLM.
        </small>
      </div>
      {last && (
        <div className="conversation-prompt">
          <User size={18} />
          {last}
        </div>
      )}
      {busy && (
        <div className="loading">
          <Sparkles className="spin" />
          Turning your wish list into a shortlist…
        </div>
      )}
      {error && (
        <div role="alert" className="info-box">
          {error}
        </div>
      )}
      {result && (
        <div className="ai-results">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR WISH LIST, UNDERSTOOD</span>
              <h2>
                {result.properties.length} places to{" "}
                <span>picture yourself.</span>
              </h2>
            </div>
          </div>
          <div className="filter-chips">
            {Object.entries(result.filters)
              .filter(([, v]) => (Array.isArray(v) ? v.length : v))
              .map(([k, v]) => (
                <span key={k}>
                  <Check size={13} />
                  {k === "q" ? "Destination" : k}:{" "}
                  {Array.isArray(v) ? v.join(", ") : k === "max" ? "₹" + v : v}
                </span>
              ))}
          </div>
          <PropertyGrid properties={result.properties} />
        </div>
      )}
    </div>
  );
}
export function Profile() {
  const { user, refresh, reset } = useStore();
  const [f, setF] = useState({ name: user.name, email: user.email }),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    try {
      await authService.update(f);
      refresh();
      setSaved(true);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">A LITTLE ABOUT YOU</span>
          <h1>Your profile.</h1>
          <p>Make your workspace feel more personal.</p>
        </div>
      </div>
      <form className="panel profile-form" onSubmit={save}>
        <span className="avatar large">{f.name?.[0]}</span>
        <p className="muted">Profile picture placeholder</p>
        <Field
          label="Full name"
          value={f.name}
          required
          onChange={(e) => {
            setF({ ...f, name: e.target.value });
            setSaved(false);
          }}
        />
        <Field
          label="Email address"
          type="email"
          value={f.email}
          required
          onChange={(e) => {
            setF({ ...f, email: e.target.value });
            setSaved(false);
          }}
        />
        <Field label="Account role">
          <input disabled value={user.role + " · Mock account"} />
        </Field>
        <Button type="submit">
          Save changes
          <Check size={16} />
        </Button>
        {saved && (
          <p role="status" className="success">
            Your demo profile has been updated.
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </form>
      <div className="panel reset-panel">
        <h3>Start fresh</h3>
        <p>
          Reset clears listings, saved spaces, uploaded images, accounts, and
          your current demo session.
        </p>
        <Button
          className="secondary"
          onClick={() => {
            if (window.confirm("Reset all StaySphere demo data?")) reset();
          }}
        >
          Reset demo data
        </Button>
      </div>
    </>
  );
}
