import { useState, lazy, Suspense } from "react";
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
import { motion } from "framer-motion";
import { useStore } from "../context/Store";
import { listingService, availabilityService } from "../services";
import { Button, money, ConfirmDialog, Field, Empty } from "../components/UI";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import { dateAfter } from "../data/properties";
const Analytics = lazy(() => import("../components/Analytics"));
export function HostDashboard() {
  const { user, listings } = useStore(),
    mine = listings.filter((p) => p.hostId === user.id);
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
      mine.filter((p) => p.blocks.length).length,
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
            Welcome back, {user.name}. Here’s what’s happening with your
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
            <motion.b
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {value}
            </motion.b>
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
      <ListingTable items={mine.slice(0, 4)} />
    </>
  );
}
export function ListingTable({ items }) {
  const [deleting, setDeleting] = useState(null),
    [error, setError] = useState("");
  const { refresh } = useStore();
  return (
    <>
      <div className="listing-table">
        {items.length ? (
          items.map((p) => (
            <div className="listing-row" key={p.id}>
              <img src={p.images[0]} alt={p.name} />
              <div className="listing-name">
                <h3>{p.name}</h3>
                <span>{p.location}</span>
              </div>
              <span className={"status " + p.status}>{p.status}</span>
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
          text={`“${deleting.name}” and its availability will be removed from the demo.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await listingService.remove(deleting.id);
              refresh();
              setDeleting(null);
            } catch (e) {
              setError(e.message);
            }
          }}
        />
      )}
    </>
  );
}
export function Listings() {
  const { user, listings } = useStore();
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
      <ListingTable items={listings.filter((p) => p.hostId === user.id)} />
    </>
  );
}
export function HostAvailability() {
  const { user, listings, refresh } = useStore(),
    [params] = useSearchParams(),
    mine = listings.filter((p) => p.hostId === user.id);
  const [id, setId] = useState(params.get("property") || mine[0]?.id || ""),
    [f, setF] = useState({ start: "", end: "", reason: "Host Blocked" }),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [deleting, setDeleting] = useState(null);
  const p = mine.find((p) => p.id === id);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await availabilityService.add(id, f);
      refresh();
      setSuccess("Your calendar is up to date.");
      setF({ ...f, start: "", end: "" });
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
      {!mine.length ? (
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
                  <AvailabilityCalendar blocks={p.blocks} />
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
                {p.blocks.length ? (
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
              text={`${deleting.start} to ${deleting.end} will be removed from this property’s blocked ranges.`}
              onClose={() => setDeleting(null)}
              onConfirm={async () => {
                await availabilityService.remove(id, deleting.id);
                refresh();
                setDeleting(null);
              }}
            />
          )}
        </>
      )}
    </>
  );
}
