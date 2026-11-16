import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  MapPin,
  BedDouble,
  Users,
  Bath,
  Heart,
  ArrowLeft,
  Check,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { useStore } from "../context/Store";
import { favoriteService } from "../services";
import { Button, PropertyGrid, money, Empty } from "../components/UI";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
export default function Property() {
  const { id } = useParams(),
    { listings, favorites, refresh, mutate } = useStore(),
    p = listings.find((x) => x.id === id);
  const [gallery, setGallery] = useState(null);
  useEffect(() => {
    if (p)
      mutate(
        (s) =>
          (s.recent = [id, ...s.recent.filter((x) => x !== id)].slice(0, 8)),
      );
    setGallery(null);
  }, [id]);
  useEffect(() => {
    if (gallery === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setGallery(null);
      if (e.key === "ArrowRight") setGallery((v) => (v + 1) % p.images.length);
      if (e.key === "ArrowLeft")
        setGallery((v) => (v + p.images.length - 1) % p.images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery]);
  if (!p || p.status !== "active")
    return (
      <Empty
        title="This space is taking a break"
        text="Explore another beautiful place."
      >
        <Button to="/explore">Explore stays</Button>
      </Empty>
    );
  return (
    <main className="section property-detail">
      <Link className="back-link" to="/explore">
        <ArrowLeft size={16} />
        Back to discovery
      </Link>
      <div className="detail-title">
        <div>
          <span className="eyebrow">
            {p.type.toUpperCase()} · A STAYSPHERE SPACE
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
            await favoriteService.toggle(id);
            refresh();
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
        {p.images.map((img, i) => (
          <button
            key={img + i}
            onClick={() => setGallery(i)}
            aria-label={"Enlarge property image " + (i + 1)}
          >
            <img src={img} alt={p.name + " — view " + (i + 1)} />
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
          <section className="detail-section host-detail">
            <span className="avatar">
              {p.hostId === "host-demo" ? "A" : "S"}
            </span>
            <div>
              <h3>
                Hosted by{" "}
                {p.hostId === "host-demo"
                  ? "Arjun"
                  : "the StaySphere demo host"}
              </h3>
              <p>Demo host profile · Thoughtful spaces, simply managed.</p>
            </div>
          </section>
          <section className="detail-section">
            <h2>Make room in your calendar</h2>
            <p>
              Availability is shown using demo data. Blocked dates cannot be
              selected.
            </p>
            <AvailabilityCalendar blocks={p.blocks} />
          </section>
        </div>
        <aside className="availability-card">
          <span>YOUR NEXT CHANGE OF SCENE</span>
          <h2>
            {money(p.price)}
            <small> / night</small>
          </h2>
          <div className="info-box">
            <Info size={20} />
            <p>
              Online booking is currently unavailable. Explore the property's
              availability below.
            </p>
          </div>
          <a className="button secondary" href="#availability-note">
            How availability works
          </a>
          <button className="button disabled" disabled>
            Booking Currently Unavailable
          </button>
          <p id="availability-note" className="muted">
            Green dates are available. Sand dates are booked; grey dates are
            blocked by the host. No reservations or payments can be made.
          </p>
          <div className="safe-note">
            <ShieldCheck size={17} />
            Transparent availability. No surprises.
          </div>
        </aside>
      </div>
      <section className="similar">
        <div className="section-heading">
          <div>
            <span className="eyebrow">KEEP YOUR CURIOSITY GOING</span>
            <h2>
              A few more <span>possibilities.</span>
            </h2>
          </div>
        </div>
        <PropertyGrid
          properties={listings
            .filter((x) => x.id !== id && x.status === "active")
            .slice(0, 3)}
        />
      </section>
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
            src={p.images[gallery]}
            alt={p.name + " view " + (gallery + 1)}
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
    </main>
  );
}
