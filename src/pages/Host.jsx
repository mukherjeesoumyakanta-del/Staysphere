import { useState, lazy, Suspense, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  House,
  Check,
  CalendarDays,
  Eye,
  Plus,
  ArrowUpRight,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { motion, animate, useInView, useReducedMotion } from "framer-motion";
import { useStore } from "../context/Store";
import { listingApiService } from "../services/listingApiService";
import { availabilityService } from "../services";
import { Button, money, ConfirmDialog, Field, Empty } from "../components/UI";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import { dateAfter } from "../data/properties";
const Analytics = lazy(() => import("../components/Analytics"));

function AnimatedNumber({ value }) {
  const ref = useRef();
  const visible = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      ref.current.textContent = value;
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (n) => {
        if (ref.current)
          ref.current.textContent = Math.round(n).toLocaleString("en-IN");
      },
    });
    return () => controls.stop();
  }, [value, visible, reduced]);
  return <b ref={ref}>{value}</b>;
}

/** Skeleton row for host listing table */
function SkeletonRow() {
  return (
    <div className="listing-row">
      <div className="skeleton" style={{ width: 72, height: 52, borderRadius: 8, flexShrink: 0 }} />
      <div className="listing-name" style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 16, width: "60%", marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "40%" }} />
      </div>
      <div className="skeleton" style={{ height: 24, width: 60, borderRadius: 20 }} />
      <div className="skeleton" style={{ height: 16, width: 80 }} />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="listing-table">
      {[1, 2, 3].map((n) => (
        <SkeletonRow key={n} />
      ))}
    </div>
  );
}

export function HostDashboard() {
  const { user, refreshApiListings } = useStore();
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listingApiService
      .getHostListings()
      .then((r) => setMine(r.data))
      .catch(() => setMine([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    [House, "Total properties", mine.length],
    [
      Check,
      "Active listings",
      mine.filter((p) => p.status === "active").length,
    ],
    [
      CalendarDays,
      "With blocked dates",
      mine.filter((p) => p.blocks && p.blocks.length).length,
    ],
    [Eye, "Demo property views", 677],
  ];

  return (
    <>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">
            A LITTLE CLARITY. A LOT OF POSSIBILITY.
          </span>
          <h1>Your spaces, at a glance.</h1>
          <p>
            Welcome back, {user.name}. Here's what's happening with your
            properties.
          </p>
        </div>
        <Button to="/host/listings/new">
          <Plus size={17} />
          Add a property
        </Button>
      </div>
      <div className="stats-grid">
        {stats.map(([Icon, label, value], i) => (
          <div className="stat-card" key={label}>
            <span>
              <Icon size={20} />
            </span>
            <AnimatedNumber value={value} />
            <p>{label}</p>
            {i === 3 && <small>Simulated analytics</small>}
          </div>
        ))}
      </div>
      <div className="host-overview-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <h3>A little more discovery</h3>
              <p>Property views · Simulated demo analytics</p>
            </div>
            <span className="tiny-tag">THIS WEEK</span>
          </div>
          <Suspense fallback={<div className="skeleton" />}>
            <Analytics />
          </Suspense>
        </div>
        <div className="availability-promo">
          <CalendarDays size={32} />
          <h2>
            Plans change.
            <br />
            Stay in control.
          </h2>
          <p>Keep your property calendar clear, current, and easy to manage.</p>
          <Button className="secondary" to="/host/availability">
            Manage availability
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
      <div className="section-heading dashboard-section">
        <h2>Your latest spaces</h2>
        <Link className="text-link" to="/host/listings">
          All listings
          <ArrowUpRight size={16} />
        </Link>
      </div>
      {loading ? (
        <SkeletonTable />
      ) : (
        <ListingTable items={mine.slice(0, 4)} onRefresh={() => {
          listingApiService.getHostListings().then((r) => setMine(r.data)).catch(() => {});
        }} />
      )}
    </>
  );
}

export function ListingTable({ items, onRefresh }) {
  const [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { refreshApiListings } = useStore();

  async function handleDelete(p) {
    setBusy(true);
    setError("");
    try {
      await listingApiService.deleteListing(p.id);
      setDeleting(null);
      if (onRefresh) onRefresh();
      refreshApiListings();
    } catch (e) {
      setError(e.message || "Failed to delete listing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="listing-table">
        {items.length ? (
          items.map((p) => (
            <div className="listing-row" key={p.id}>
              <img
                src={p.images[0] || ""}
                alt={p.name}
                style={p.images[0] ? undefined : { background: "#eee" }}
              />
              <div className="listing-name">
                <h3>{p.name}</h3>
                <span>{p.location}</span>
              </div>
              <span className={"status " + p.status}>
                {p.status}
                {p.status === "draft" && (
                  <span
                    style={{
                      marginLeft: "4px",
                      fontSize: "0.65rem",
                      background: "#f59e0b",
                      color: "#fff",
                      borderRadius: "4px",
                      padding: "1px 4px",
                      verticalAlign: "middle",
                    }}
                  >
                    DRAFT
                  </span>
                )}
              </span>
              <b>
                {money(p.price)}
                <small> / night</small>
              </b>
              <div className="row-actions">
                <Link
                  aria-label={"Edit " + p.name}
                  to={"/host/listings/" + p.id + "/edit"}
                >
                  <Pencil size={17} />
                </Link>
                <Link
                  aria-label={"Manage availability for " + p.name}
                  to={"/host/availability?property=" + p.id}
                >
                  <CalendarDays size={17} />
                </Link>
                <button
                  aria-label={"Delete " + p.name}
                  onClick={() => setDeleting(p)}
                  disabled={busy}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <Empty
            title="Make room for your first listing"
            text="Add your property and let its story begin."
          >
            <Button to="/host/listings/new">Add a property</Button>
          </Empty>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {deleting && (
        <ConfirmDialog
          title="Remove this space?"
          text={`"${deleting.name}" will be permanently removed.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </>
  );
}

export function Listings() {
  const { user, refreshApiListings } = useStore();
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMine = () => {
    setLoading(true);
    listingApiService
      .getHostListings()
      .then((r) => setMine(r.data))
      .catch(() => setMine([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMine();
  }, []);

  return (
    <>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">EVERY SPACE HAS A STORY</span>
          <h1>Your collection of spaces.</h1>
          <p>
            Keep your listings thoughtful, up to date, and ready to discover.
          </p>
        </div>
        <Button to="/host/listings/new">
          <Plus size={17} />
          Add a property
        </Button>
      </div>
      {loading ? (
        <SkeletonTable />
      ) : (
        <ListingTable
          items={mine}
          onRefresh={() => {
            fetchMine();
            refreshApiListings();
          }}
        />
      )}
    </>
  );
}

export function HostAvailability() {
  const { user, refreshApiListings } = useStore();
  const [params] = useSearchParams();
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For availability, we still use local store listings since availability
    // is a local-only feature (blocks aren't persisted to API)
    listingApiService
      .getHostListings()
      .then((r) => setMine(r.data))
      .catch(() => setMine([]))
      .finally(() => setLoading(false));
  }, []);

  const [id, setId] = useState(params.get("property") || ""),
    [f, setF] = useState({ start: "", end: "", reason: "Host Blocked" }),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [deleting, setDeleting] = useState(null);

  // Once mine is loaded, default to first property if none selected
  useEffect(() => {
    if (!id && mine.length) setId(mine[0].id);
  }, [mine]);

  const p = mine.find((p) => p.id === id);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await availabilityService.add(id, f);
      setSuccess("Your calendar is up to date.");
      setF({ ...f, start: "", end: "" });
      // Reload mine so calendar updates
      listingApiService.getHostListings().then((r) => setMine(r.data)).catch(() => {});
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">A CLEAR CALENDAR. A CLEARER MIND.</span>
          <h1>Make space for your plans.</h1>
          <p>Manage booked dates, maintenance, and time for yourself.</p>
        </div>
        <CalendarDays size={27} />
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : !mine.length ? (
        <Empty
          title="Add a space first"
          text="Your property calendar will appear here."
        >
          <Button to="/host/listings/new">Create a listing</Button>
        </Empty>
      ) : (
        <>
          <Field label="Choose your property">
            <select
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setError("");
                setSuccess("");
              }}
            >
              {mine.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name} · {p.location}
                </option>
              ))}
            </select>
          </Field>
          {p && (
            <>
              <div className="availability-layout">
                <div className="panel">
                  <h2>{p.name}</h2>
                  <AvailabilityCalendar blocks={p.blocks || []} />
                </div>
                <form className="panel" onSubmit={submit}>
                  <span className="eyebrow">SAVE TIME FOR WHAT MATTERS</span>
                  <h2>Block a date range</h2>
                  <Field
                    label="Start date (inclusive)"
                    type="date"
                    min={dateAfter(0)}
                    value={f.start}
                    required
                    onChange={(e) => setF({ ...f, start: e.target.value })}
                  />
                  <Field
                    label="End date (exclusive)"
                    type="date"
                    min={f.start || dateAfter(0)}
                    value={f.end}
                    required
                    onChange={(e) => setF({ ...f, end: e.target.value })}
                  />
                  <Field label="Reason">
                    <select
                      value={f.reason}
                      onChange={(e) => setF({ ...f, reason: e.target.value })}
                    >
                      {["Booked", "Maintenance", "Host Blocked"].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </Field>
                  <p className="muted">
                    The end date stays available. Adjacent ranges are allowed;
                    overlapping ranges are prevented. This records a demo
                    availability block only.
                  </p>
                  {error && (
                    <p role="alert" className="error">
                      {error}
                    </p>
                  )}
                  {success && (
                    <p role="status" className="success">
                      {success}
                    </p>
                  )}
                  <Button type="submit">
                    Save date range
                    <Check size={16} />
                  </Button>
                </form>
              </div>
              <div className="panel dashboard-section">
                <h2>Existing date ranges</h2>
                {p.blocks && p.blocks.length ? (
                  p.blocks.map((b) => (
                    <div key={b.id} className="block-row">
                      <span
                        className={
                          "status " + (b.reason === "Booked" ? "booked" : "")
                        }
                      >
                        {b.reason}
                      </span>
                      <span>
                        {b.start} → {b.end} <small>(end exclusive)</small>
                      </span>
                      <button
                        className="icon-button"
                        aria-label={"Remove " + b.reason + " range"}
                        onClick={() => setDeleting(b)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    All dates are open. Add a range whenever you need.
                  </p>
                )}
              </div>
            </>
          )}
          {deleting && (
            <ConfirmDialog
              title="Open these dates again?"
              text={`${deleting.start} to ${deleting.end} will be removed from this property's blocked ranges.`}
              onClose={() => setDeleting(null)}
              onConfirm={async () => {
                await availabilityService.remove(id, deleting.id);
                listingApiService.getHostListings().then((r) => setMine(r.data)).catch(() => {});
                setDeleting(null);
              }}
            />
          )}
        </>
      )}
    </>
  );
}
