import { Link } from "react-router-dom";
import {
  Heart,
  ArrowUpRight,
  MapPin,
  BedDouble,
  Users,
  Wifi,
  ArrowRight,
  X,
  House,
  LoaderCircle,
} from "lucide-react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { useStore } from "../context/Store";
import { favoriteService } from "../services";
export const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
export function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-icon">
        <House size={21} />
      </span>
      StaySphere<span className="brand-dot">.</span>
    </Link>
  );
}
export function Button({ children, to, className = "", ...props }) {
  return to ? (
    <Link className={"button " + className} to={to} {...props}>
      {children}
    </Link>
  ) : (
    <button className={"button " + className} {...props}>
      {children}
    </button>
  );
}
export function Reveal({ children, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
export function PropertyCard({ property: p }) {
  const { favorites, refresh } = useStore();
  const reduced = useReducedMotion();
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 180, damping: 24 });
  const rotateY = useSpring(y, { stiffness: 180, damping: 24 });
  const tilt = (event) => {
    if (
      reduced ||
      event.pointerType !== "mouse" ||
      !matchMedia("(hover: hover)").matches
    )
      return;
    const r = event.currentTarget.getBoundingClientRect();
    x.set((-(event.clientY - r.top - r.height / 2) / r.height) * 5);
    y.set(((event.clientX - r.left - r.width / 2) / r.width) * 5);
  };
  return (
    <motion.article
      className="property-card"
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onPointerMove={tilt}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileHover={reduced ? {} : { y: -5 }}
    >
      <Link to={"/property/" + p.id} className="card-image">
        <img
          loading="lazy"
          src={p.images[0]}
          alt={p.name + " in " + p.location}
        />
        <span className="card-tag">{p.type}</span>
      </Link>
      <button
        className={"heart " + (favorites.includes(p.id) ? "saved" : "")}
        aria-label={
          (favorites.includes(p.id) ? "Remove" : "Save") + " " + p.name
        }
        onClick={async () => {
          await favoriteService.toggle(p.id);
          refresh();
        }}
      >
        <Heart
          size={17}
          fill={favorites.includes(p.id) ? "currentColor" : "none"}
        />
      </button>
      <div className="card-info">
        <span className="location">
          <MapPin size={12} />
          {p.location}
        </span>
        <Link className="card-title" to={"/property/" + p.id}>
          {p.name}
          <ArrowUpRight size={17} />
        </Link>
        <div className="card-spec">
          <span>
            <BedDouble size={14} />
            {p.bedrooms} bedrooms
          </span>
          <span>
            <Users size={14} />
            {p.guests} guests
          </span>
          <span>
            <Wifi size={14} />
            Wi-Fi
          </span>
        </div>
        <div className="card-price">
          <b>{money(p.price)}</b>
          <span> / night</span>
          <Link to={"/property/" + p.id} aria-label={"View " + p.name}>
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
export function PropertyGrid({ properties }) {
  return properties.length ? (
    <div className="property-grid">
      {properties.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  ) : (
    <Empty
      title="No spaces found"
      text="Try a different destination or loosen your filters."
    />
  );
}
export function Empty({ title, text, children }) {
  return (
    <div className="empty">
      <House size={32} />
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" />
      Finding your next favourite place…
    </div>
  );
}
export function ConfirmDialog({ title, text, onConfirm, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close icon-button"
          onClick={onClose}
          aria-label="Cancel"
        >
          <X />
        </button>
        <h2 id="dialog-title">{title}</h2>
        <p>{text}</p>
        <div className="actions">
          <Button className="secondary" onClick={onClose} autoFocus>
            Cancel
          </Button>
          <Button className="danger" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
