import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  House,
  CalendarDays,
  ArrowLeftRight,
} from "lucide-react";
import { useStore } from "../context/Store";
import { aiService, authService } from "../services";
import { bookingApiService } from "../services/listingApiService";
import {
  PropertyGrid,
  Button,
  Field,
  Empty,
  money,
  ConfirmDialog,
} from "../components/UI";
export function GuestDashboard() {
  const { user, listings, favorites, recent, switchRole } = useStore();
  const navigate = useNavigate();
  const [switchingHost, setSwitchingHost] = useState(false);
  const [myBookings, setMyBookings] = useState([]);

  useEffect(() => {
    bookingApiService.getMyBookings().then(setMyBookings).catch(() => {});
  }, []);

  const confirmedBookings = myBookings.filter((b) => b.status === "CONFIRMED");

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

      {confirmedBookings.length > 0 && (
        <div className="panel" style={{ marginBottom: "2rem", padding: "1.25rem" }}>
          <div className="section-heading" style={{ marginBottom: "1rem" }}>
            <div>
              <span className="eyebrow" style={{ color: "#059669" }}>RESERVED & READY</span>
              <h2 style={{ fontSize: "1.3rem", margin: 0 }}>Upcoming journeys</h2>
            </div>
            <Link className="text-link" to="/guest/bookings">
              View all bookings ({confirmedBookings.length})
              <ArrowRight size={16} />
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {confirmedBookings.slice(0, 2).map((b) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  background: "rgba(0,0,0,0.02)",
                  borderRadius: "8px",
                }}
              >
                <div>
                  <strong>{b.listing?.title || b.listing?.name || "StaySphere Stay"}</strong>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {b.checkIn} → {b.checkOut} · {b.totalNights} night{b.totalNights > 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <strong>{money(b.totalPrice)}</strong>
                  <Button
                    className="secondary"
                    to={"/property/" + (b.listing?.id || b.listing?._id || b.listingId)}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

      {/* Dual-role account host invitation banner */}
      <div className="panel host-switch-banner" style={{ marginTop: "2.5rem" }}>
        <div className="host-switch-banner-text">
          <span className="eyebrow">SINGLE ACCOUNT · DUAL ROLE</span>
          <h3>Want to become a host with this account?</h3>
          <p>
            You do not need a separate account to host. Switch to Host mode anytime to list properties, manage availability, and accept guest bookings.
          </p>
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={switchingHost}
          onClick={async () => {
            setSwitchingHost(true);
            try {
              await switchRole("HOST");
              navigate("/host/dashboard");
            } finally {
              setSwitchingHost(false);
            }
          }}
        >
          <ArrowLeftRight size={15} />
          <span>{switchingHost ? "Switching…" : "Switch to Host Mode"}</span>
        </button>
      </div>
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
      {listings.filter(
        (p) => favorites.includes(p.id) && p.status === "active",
      ).length ? (
        <PropertyGrid
          properties={listings.filter(
            (p) => favorites.includes(p.id) && p.status === "active",
          )}
        />
      ) : (
        <Empty
          title="A little wish list starts here"
          text="Tap a heart on any property to keep it close."
        >
          <Button to="/explore">Explore stays</Button>
        </Empty>
      )}
    </>
  );
}

export function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadBookings = () => {
    setLoading(true);
    bookingApiService
      .getMyBookings()
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  async function handleCancel(booking) {
    setBusy(true);
    setError("");
    try {
      await bookingApiService.cancelBooking(booking.id);
      setCancelling(null);
      loadBookings();
    } catch (err) {
      setError(err.message || "Failed to cancel booking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">YOUR JOURNEYS</span>
          <h1>My bookings.</h1>
          <p>Upcoming and past reservations across your favourite spaces.</p>
        </div>
        <Button to="/explore">
          Find another stay
          <ArrowUpRight size={17} />
        </Button>
      </div>

      {error && (
        <div
          className="info-box"
          style={{
            background: "#fef2f2",
            borderColor: "#f87171",
            color: "#991b1b",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div
          className="skeleton"
          style={{ height: 260, borderRadius: "12px" }}
        />
      ) : bookings.length === 0 ? (
        <Empty
          title="No bookings yet"
          text="When you reserve a stay, your confirmed dates will appear here."
        >
          <Button to="/explore">Explore stays</Button>
        </Empty>
      ) : (
        <div
          className="bookings-list"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {bookings.map((b) => {
            const propName =
              b.listing?.title || b.listing?.name || "StaySphere Property";
            const propLocation =
              b.listing?.location ||
              [b.listing?.city, b.listing?.state].filter(Boolean).join(", ");
            const propImg = b.listing?.images?.[0] || "";
            const isConfirmed = b.status === "CONFIRMED";

            return (
              <div
                key={b.id}
                className="panel booking-card"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1.25rem",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                    minWidth: "260px",
                  }}
                >
                  {propImg ? (
                    <img
                      src={propImg}
                      alt={propName}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80";
                      }}
                      style={{
                        width: 90,
                        height: 72,
                        borderRadius: 8,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 90,
                        height: 72,
                        borderRadius: 8,
                        background: "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9ca3af",
                        flexShrink: 0,
                      }}
                    >
                      <House size={28} />
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: "0 0 0.25rem" }}>{propName}</h3>
                    <p
                      className="muted"
                      style={{ margin: "0 0 0.25rem", fontSize: "0.85rem" }}
                    >
                      {propLocation}
                    </p>
                    <span
                      style={{
                        background: isConfirmed ? "#d1fae5" : "#f3f4f6",
                        color: isConfirmed ? "#065f46" : "#6b7280",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span
                      className="muted"
                      style={{ fontSize: "0.75rem", display: "block" }}
                    >
                      DATES
                    </span>
                    <strong style={{ fontSize: "0.95rem" }}>{b.checkIn}</strong>
                    <span style={{ margin: "0 4px" }}>→</span>
                    <strong style={{ fontSize: "0.95rem" }}>{b.checkOut}</strong>
                    <small className="muted" style={{ display: "block" }}>
                      {b.totalNights} night{b.totalNights > 1 ? "s" : ""}
                    </small>
                  </div>

                  <div>
                    <span
                      className="muted"
                      style={{ fontSize: "0.75rem", display: "block" }}
                    >
                      TOTAL
                    </span>
                    <strong style={{ fontSize: "1.1rem" }}>
                      {money(b.totalPrice)}
                    </strong>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button
                      className="secondary"
                      to={
                        "/property/" +
                        (b.listing?.id || b.listing?._id || b.listingId)
                      }
                    >
                      View Space
                    </Button>
                    {isConfirmed && (
                      <Button
                        className="danger"
                        disabled={busy}
                        onClick={() => setCancelling(b)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cancelling && (
        <ConfirmDialog
          title="Cancel this reservation?"
          text={`Are you sure you want to cancel your stay at ${
            cancelling.listing?.title ||
            cancelling.listing?.name ||
            "this property"
          } (${cancelling.checkIn} to ${
            cancelling.checkOut
          })? This will immediately free these dates for other guests.`}
          onConfirm={() => handleCancel(cancelling)}
          onClose={() => setCancelling(null)}
        />
      )}
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
            AI POWERED SEARCH · GROUNDED IN REAL PROPERTIES
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
          AI searches real active listings by destination, budget, capacity,
          property type, and amenities.
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
                {result.properties.length} place{result.properties.length === 1 ? "" : "s"} to{" "}
                <span>picture yourself.</span>
              </h2>
              {result.explanation && (
                <p className="muted" style={{ marginTop: "0.25rem" }}>
                  {result.explanation}
                </p>
              )}
            </div>
          </div>
          <div className="filter-chips">
            {Object.entries(result.filters)
              .filter(([, v]) => (Array.isArray(v) ? v.length : v))
              .map(([k, v]) => (
                <span key={k}>
                  <Check size={13} />
                  {k === "q" || k === "city" ? "Destination" : k}:{" "}
                  {Array.isArray(v)
                    ? v.join(", ")
                    : k === "max" || k === "maxPrice"
                    ? "₹" + Number(v).toLocaleString("en-IN")
                    : v}
                </span>
              ))}
          </div>
          {result.properties.length === 0 ? (
            <div className="info-box" style={{ margin: "1.5rem 0" }}>
              <p>{result.explanation || "No active properties matched your criteria. Try expanding your budget or destination."}</p>
            </div>
          ) : (
            <PropertyGrid properties={result.properties} />
          )}
        </div>
      )}
    </div>
  );
}
export function Profile() {
  const { user, refresh, reset, switchRole } = useStore();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: user.name, email: user.email }),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [switching, setSwitching] = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await authService.update(f);
      refresh();
      setSaved(true);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRole() {
    setSwitching(true);
    try {
      const next = user.role === "HOST" ? "GUEST" : "HOST";
      await switchRole(next);
      navigate(next === "HOST" ? "/host/dashboard" : "/guest/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSwitching(false);
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
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
          <Check size={16} />
        </Button>
        {saved && (
          <p role="status" className="success">
            Your profile has been updated.
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </form>

      {/* Single Account Dual-Role Switcher Panel */}
      <div className="panel profile-role-panel">
        <div className="role-panel-header">
          <div>
            <span className="eyebrow">SINGLE ACCOUNT DUAL-ROLE</span>
            <h3>Active Account Mode: <em>{user.role}</em></h3>
            <p>
              {user.role === "HOST"
                ? "You are currently in Host mode, allowing you to manage property listings, accept reservations, and configure availability. You can switch to Guest mode anytime to explore and book stays."
                : "You are currently in Guest mode, allowing you to discover stays, use AI search, and save favorites. You can switch to Host mode anytime to list properties."}
            </p>
          </div>
          <button
            type="button"
            className="button secondary role-switch-action-btn"
            disabled={switching}
            onClick={handleToggleRole}
          >
            <ArrowLeftRight size={16} />
            <span>{switching ? "Switching…" : `Switch to ${user.role === "HOST" ? "Guest Mode" : "Host Mode"}`}</span>
          </button>
        </div>
      </div>

      <div className="panel reset-panel">
        <h3>Start fresh</h3>
        <p>
          Reset clears only local demo listings, saved spaces, and image
          previews. Your registered account and server session remain unchanged.
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
