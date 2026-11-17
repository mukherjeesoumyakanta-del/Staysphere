import { useParams, Link, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  BedDouble,
  Users,
  Bath,
  Heart,
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  LoaderCircle,
  Calendar,
} from "lucide-react";
import { useStore } from "../context/Store";
import { favoriteService } from "../services";
import {
  listingApiService,
  availabilityApiService,
  bookingApiService,
} from "../services/listingApiService";
import { Button, PropertyGrid, money, Empty, Field } from "../components/UI";
import AvailabilityCalendar from "../components/AvailabilityCalendar";

/** Skeleton for the property detail page */
function PropertyDetailSkeleton() {
  return (
    <main className="section property-detail">
      <div className="skeleton" style={{ height: "16px", width: "120px", marginBottom: "1.5rem" }} />
      <div className="skeleton" style={{ height: "36px", width: "50%", marginBottom: "0.5rem" }} />
      <div className="skeleton" style={{ height: "16px", width: "30%", marginBottom: "1.5rem" }} />
      <div className="gallery">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: "240px", borderRadius: "var(--radius, 12px)" }}
          />
        ))}
      </div>
      <div className="detail-layout">
        <div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "14px", width: `${60 + i * 8}%`, marginBottom: "12px" }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function Property() {
  const { id } = useParams();
  const location = useLocation();
  const {
    listings: storeListings = [],
    favorites = [],
    refresh,
    mutate,
    toggleFavorite,
    user,
  } = useStore();

  const [p, setP] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [gallery, setGallery] = useState(null);
  const recordedRecentRef = useRef(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const nextDayStr = new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0];

  // Booking form state
  const [checkIn, setCheckIn] = useState(tomorrowStr);
  const [checkOut, setCheckOut] = useState(nextDayStr);
  const [isBooked, setIsBooked] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const dIn = checkIn ? new Date(checkIn + "T12:00:00Z") : null;
  const dOut = checkOut ? new Date(checkOut + "T12:00:00Z") : null;
  const nights =
    dIn && dOut && dOut > dIn
      ? Math.round((dOut - dIn) / (1000 * 60 * 60 * 24))
      : 0;
  const price = p ? Number(p.price ?? p.pricePerNight ?? 0) : 0;
  const totalPrice = p && nights > 0 ? nights * price : 0;

  const hasOverlap = Boolean(
    checkIn &&
      checkOut &&
      blocks.some((b) => {
        const s = b.start || b.startDate;
        const e = b.end || b.endDate;
        return s < checkOut && e > checkIn;
      })
  );

  const isHostOfListing = Boolean(
    user &&
      p &&
      (String(user.id) === String(p.hostId) ||
        String(user._id) === String(p.hostId))
  );

  async function handleBook(e) {
    if (e) e.preventDefault();
    if (!checkIn || !checkOut || nights <= 0 || hasOverlap) return;
    setBookingBusy(true);
    setBookingError("");
    try {
      const res = await bookingApiService.createBooking({
        listingId: id,
        checkIn,
        checkOut,
      });
      setConfirmedBooking(res);
      setIsBooked(true);
      // Immediately reflect booked dates on the availability calendar
      setBlocks((prev) => [
        ...prev,
        {
          id: "temp-" + Date.now(),
          listingId: id,
          startDate: checkIn,
          endDate: checkOut,
          start: checkIn,
          end: checkOut,
          reason: "BOOKED",
        },
      ]);
      // Also fetch live blocks from backend if real MongoDB listing
      if (!String(id).startsWith("stay-")) {
        availabilityApiService
          .getBlocks(id)
          .then(setBlocks)
          .catch(() => {});
      }
    } catch (err) {
      setBookingError(
        err.message || "Failed to confirm booking. Please try again."
      );
    } finally {
      setBookingBusy(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setP(null);
    setGallery(null);

    listingApiService
      .getListingById(id)
      .then((result) => {
        const listing = result?.data;
        if (!listing) {
          setNotFound(true);
        } else {
          setP(listing);
          // Record recent view at most once per property without triggering re-render
          if (
            (listing.status === "active" || listing.status === "ACTIVE") &&
            recordedRecentRef.current !== id
          ) {
            recordedRecentRef.current = id;
            try {
              const cur = JSON.parse(localStorage.getItem("staysphere-v1")) || {};
              cur.recent = [id, ...(cur.recent || []).filter((x) => x !== id)].slice(0, 8);
              localStorage.setItem("staysphere-v1", JSON.stringify(cur));
            } catch {}
          }
        }
      })
      .catch((e) => {
        setNotFound(true);
      })
      .finally(() => setLoading(false));

    availabilityApiService
      .getBlocks(id)
      .then((b) => setBlocks(b))
      .catch(() => setBlocks([]));
  }, [id]);

  useEffect(() => {
    if (gallery === null || !p) return;
    const onKey = (e) => {
      if (e.key === "Escape") setGallery(null);
      if (e.key === "ArrowRight") setGallery((v) => (v + 1) % p.images.length);
      if (e.key === "ArrowLeft")
        setGallery((v) => (v + p.images.length - 1) % p.images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery, p]);

  if (loading) return <PropertyDetailSkeleton />;

  if (notFound || !p)
    return (
      <Empty
        title="This space is taking a break"
        text="Explore another beautiful place."
      >
        <Button to="/explore">Explore stays</Button>
      </Empty>
    );

  // Similar listings: from the store (may be API or mock), exclude current
  const similar = (storeListings || [])
    .filter(
      (x) => x.id !== id && (x.status === "active" || x.status === "ACTIVE")
    )
    .slice(0, 3);

  return (
    <main className="section property-detail">
      <Link className="back-link" to="/explore">
        <ArrowLeft size={16} />
        Back to discovery
      </Link>
      {p.status === "draft" && (
        <div
          className="info-box"
          style={{
            marginBottom: "1.5rem",
            border: "1px solid #f59e0b",
            background: "#fffbeb",
            color: "#92400e",
            borderRadius: "8px",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <Info size={20} color="#d97706" />
          <p style={{ margin: 0 }}>
            <strong>Draft Listing:</strong> This space is currently a draft and
            does not appear in public search.
          </p>
        </div>
      )}
      <div className="detail-title">
        <div>
          <span className="eyebrow">
            {(p.type || p.propertyType || "Stay").toUpperCase()} · A STAYSPHERE SPACE
          </span>
          <h1>{p.name}</h1>
          <p>
            <MapPin size={16} />
            {p.location}
          </p>
        </div>
        <Button
          className="secondary"
          onClick={async () => {
            if (toggleFavorite) {
              await toggleFavorite(id);
            } else {
              await favoriteService.toggle(id);
              refresh();
            }
          }}
        >
          <Heart
            size={16}
            fill={favorites.includes(id) ? "currentColor" : "none"}
          />
          {favorites.includes(id) ? "Saved" : "Save space"}
        </Button>
      </div>
      <div className="gallery">
        {(p.images && p.images.length > 0
          ? p.images.map((img) => (typeof img === "string" ? img : img?.url || ""))
          : [
              "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85",
            ]
        )
          .filter(Boolean)
          .map((img, i) => (
            <button
              key={img + i}
              onClick={() => setGallery(i)}
              aria-label={"Enlarge property image " + (i + 1)}
            >
              <img
                src={typeof img === "object" ? img?.url : img}
                alt={(p.name || p.title || "Stay") + " — view " + (i + 1)}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80";
                }}
                style={
                  i === 0 ? { viewTransitionName: "property-" + p.id } : undefined
                }
              />
              {i === 2 && <span>View all photos</span>}
            </button>
          ))}
      </div>
      <div className="detail-layout">
        <div>
          <div className="detail-spec">
            <span>
              <BedDouble />
              {p.bedrooms} bedrooms
            </span>
            <span>
              <Bath />
              {p.bathrooms} bathrooms
            </span>
            <span>
              <Users />
              Up to {p.guests} guests
            </span>
          </div>
          <section className="detail-section">
            <h2>A little about this space</h2>
            <p>{p.description}</p>
          </section>
          {p.amenities && p.amenities.length > 0 && (
            <section className="detail-section">
              <h2>Thoughtful little comforts</h2>
              <div className="amenity-grid">
                {p.amenities.map((a) => (
                  <span key={a}>
                    <Check size={17} />
                    {a}
                  </span>
                ))}
              </div>
            </section>
          )}
          <section className="detail-section host-detail">
            <span className="avatar">H</span>
            <div>
              <h3>Hosted by a StaySphere host</h3>
              <p>Thoughtful spaces, simply managed.</p>
            </div>
          </section>
          <section className="detail-section">
            <h2>Make room in your calendar</h2>
            <p>
              Availability is shown for your planning. Blocked dates cannot be
              selected.
            </p>
            <AvailabilityCalendar
              blocks={blocks.length > 0 ? blocks : p.blocks || []}
            />
          </section>
        </div>
        <aside className="availability-card">
          <span>YOUR NEXT CHANGE OF SCENE</span>
          <h2>
            {money(p.price)}
            <small> / night</small>
          </h2>

          <div
            className="booking-dates-panel"
            style={{
              margin: "1rem 0",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <Field label="Check-in date">
              <input
                type="date"
                min={todayStr}
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  setIsBooked(false);
                  if (checkOut && e.target.value >= checkOut) {
                    setCheckOut("");
                  }
                }}
                required
              />
            </Field>

            <Field label="Checkout date">
              <input
                type="date"
                min={
                  checkIn
                    ? new Date(new Date(checkIn).getTime() + 86400000)
                        .toISOString()
                        .split("T")[0]
                    : todayStr
                }
                value={checkOut}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  setIsBooked(false);
                }}
                disabled={!checkIn}
                required
              />
            </Field>
          </div>

          {nights > 0 && (
            <div
              className="booking-breakdown"
              style={{
                background: "rgba(0,0,0,0.03)",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                margin: "0.75rem 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                {money(p.price)} × {nights} night{nights > 1 ? "s" : ""}
              </span>
              <strong style={{ fontSize: "1.1rem" }}>
                {money(totalPrice)}
              </strong>
            </div>
          )}

          {hasOverlap && (
            <div
              className="info-box"
              style={{
                background: "#fef2f2",
                borderColor: "#f87171",
                color: "#991b1b",
                margin: "0.75rem 0",
              }}
            >
              <Info size={16} color="#ef4444" />
              <p style={{ margin: 0, fontSize: "0.85rem" }}>
                These dates are already booked or unavailable. Please choose another date range.
              </p>
            </div>
          )}

          {bookingError && (
            <div
              className="info-box"
              style={{
                background: "#fef2f2",
                borderColor: "#f87171",
                color: "#991b1b",
                margin: "0.75rem 0",
              }}
            >
              <Info size={16} color="#ef4444" />
              <p style={{ margin: 0, fontSize: "0.85rem" }}>{bookingError}</p>
            </div>
          )}

          {isBooked || confirmedBooking ? (
            <button
              className="button"
              disabled
              style={{
                background: "#059669",
                borderColor: "#059669",
                color: "#ffffff",
                cursor: "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontWeight: 600,
                fontSize: "1.05rem",
                width: "100%",
              }}
            >
              <Check size={20} />
              Booked
            </button>
          ) : isHostOfListing ? (
            <button className="button disabled" disabled>
              Host Cannot Book Own Space
            </button>
          ) : (
            <Button
              onClick={handleBook}
              disabled={
                bookingBusy || !checkIn || !checkOut || nights <= 0 || hasOverlap
              }
            >
              {bookingBusy ? (
                <LoaderCircle className="spin" size={16} />
              ) : null}
              {hasOverlap
                ? "Dates Unavailable"
                : nights > 0
                ? `Book Now · ${money(totalPrice)}`
                : "Select Dates to Book"}
            </Button>
          )}

          <div className="safe-note">
            <ShieldCheck size={17} />
            Instant booking confirmation. No card required.
          </div>
        </aside>
      </div>
      {similar.length > 0 && (
        <section className="similar">
          <div className="section-heading">
            <div>
              <span className="eyebrow">KEEP YOUR CURIOSITY GOING</span>
              <h2>
                A few more <span>possibilities.</span>
              </h2>
            </div>
          </div>
          <PropertyGrid properties={similar} />
        </section>
      )}
      {gallery !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Property image gallery"
        >
          <button
            className="close icon-button"
            onClick={() => setGallery(null)}
            aria-label="Close gallery"
            autoFocus
          >
            <X />
          </button>
          <button
            className="icon-button"
            aria-label="Previous image"
            onClick={() =>
              setGallery((gallery + p.images.length - 1) % p.images.length)
            }
          >
            <ChevronLeft />
          </button>
          <img
            src={typeof p.images[gallery] === "object" ? p.images[gallery]?.url : p.images[gallery]}
            alt={p.name + " view " + (gallery + 1)}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80";
            }}
          />
          <button
            className="icon-button"
            aria-label="Next image"
            onClick={() => setGallery((gallery + 1) % p.images.length)}
          >
            <ChevronRight />
          </button>
        </div>
      )}
      {confirmedBooking && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirmedBooking(null)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", width: "90%" }}
          >
            <button
              className="close icon-button"
              onClick={() => setConfirmedBooking(null)}
              aria-label="Close confirmation"
            >
              <X />
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#10b981",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={24} />
              </div>
              <div>
                <span className="eyebrow" style={{ color: "#059669" }}>
                  RESERVATION SECURED
                </span>
                <h2 style={{ margin: 0, fontSize: "1.4rem" }}>
                  Booking Confirmed!
                </h2>
              </div>
            </div>
            <p style={{ margin: "0.5rem 0 1rem" }}>
              Your stay at <strong>{p.name}</strong> has been secured.
            </p>
            <div
              style={{
                background: "rgba(0,0,0,0.03)",
                padding: "1rem",
                borderRadius: "10px",
                margin: "1rem 0",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontSize: "0.95rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">Check-in:</span>
                <strong>{confirmedBooking.checkIn}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">Checkout:</span>
                <strong>{confirmedBooking.checkOut}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">Length of stay:</span>
                <span>
                  {confirmedBooking.totalNights} night
                  {confirmedBooking.totalNights > 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">Booking status:</span>
                <span
                  style={{
                    background: "#d1fae5",
                    color: "#065f46",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  CONFIRMED
                </span>
              </div>
              <div
                style={{
                  borderTop: "1px solid rgba(0,0,0,0.08)",
                  paddingTop: "0.5rem",
                  marginTop: "0.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Total price:</span>
                <strong style={{ fontSize: "1.15rem" }}>
                  {money(confirmedBooking.totalPrice)}
                </strong>
              </div>
            </div>
            <div
              className="actions"
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                marginTop: "1.5rem",
              }}
            >
              <Button
                className="secondary"
                onClick={() => setConfirmedBooking(null)}
              >
                Done
              </Button>
              <Button to="/guest/bookings">
                My Bookings <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
