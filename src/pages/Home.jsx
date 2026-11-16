import { lazy, Suspense, useState, useEffect, useRef, Component } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  MapPin,
  Users,
  IndianRupee,
  Search,
  Compass,
  CalendarDays,
  SlidersHorizontal,
  House,
  Mountain,
  Trees,
  Waves,
  Building2,
  Sun,
  Check,
  MoveUpRight,
} from "lucide-react";
import { useReducedMotion, motion, useInView } from "framer-motion";
import { useStore } from "../context/Store";
import { Button, PropertyGrid, Reveal } from "../components/UI";
import { photo, photos } from "../data/properties";
const Architecture = lazy(() => import("../components/Architecture"));
class SceneBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <House size={70} /> : this.props.children;
  }
}
function HeroStudy({ enabled }) {
  const ref = useRef();
  const visible = useInView(ref, { margin: "100px" });
  return (
    <div className="hero-study" ref={ref}>
      <div className="study-label">
        <span className="small-green-dot" />A NEW PERSPECTIVE
        <span>STUDY Nº 01</span>
      </div>
      <div className="study-canvas">
        {enabled && visible ? (
          <SceneBoundary>
            <Suspense fallback={<House size={45} />}>
              <Architecture />
            </Suspense>
          </SceneBoundary>
        ) : (
          <House size={60} />
        )}
      </div>
      <div className="study-bottom">
        Thoughtfully designed.
        <br />
        <span>Made for living.</span>
        <ArrowUpRight size={19} />
      </div>
    </div>
  );
}
export default function Home() {
  const { listings } = useStore(),
    navigate = useNavigate();
  const [q, setQ] = useState(""),
    [guests, setGuests] = useState(""),
    [max, setMax] = useState(""),
    [category, setCategory] = useState("All stays");
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = useState(false);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {}
  }, []);
  const categories = [
    [House, "All stays"],
    [Waves, "Coastal escapes"],
    [Mountain, "Mountain hideaways"],
    [Trees, "Nature retreats"],
    [Building2, "City living"],
    [Sun, "Heritage homes"],
  ];
  const featured = listings
    .filter(
      (p) =>
        p.status === "active" &&
        (category === "All stays" ||
          (category === "Coastal escapes"
            ? p.location.includes("Goa")
            : category === "Mountain hideaways"
              ? /Manali|Darjeeling/.test(p.location)
              : category === "Nature retreats"
                ? p.location.includes("Lonavala")
                : category === "City living"
                  ? p.location.includes("Bengaluru")
                  : p.location.includes("Jaipur"))),
    )
    .slice(0, 6);
  return (
    <>
      <section className="hero">
        <img
          className="hero-photo"
          src={photo("photo-1600607687920-4e2a09cf159d", 2400)}
          alt="Sunlit contemporary villa with a courtyard and reflecting pool"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="hero-kicker">
              <span /> NOT JUST A STAY. A FEELING.
            </div>
            <h1>
              Find a space that
              <br />
              feels like <em>yours.</em>
            </h1>
            <p>
              Extraordinary places. Thoughtfully discovered.
              <br />
              Your next chapter starts with a space that feels right.
            </p>
            <div className="hero-buttons">
              <Button to="/explore">
                Explore properties <ArrowUpRight size={17} />
              </Button>
              <Link className="hero-ai" to="/guest/ai-finder">
                <Sparkles size={17} />
                Find with AI
                <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
          <div className="hero-caption">
            <span className="caption-line" />
            <span>
              ROOM TO BREATHE.
              <br />
              <b>Somewhere you belong.</b>
            </span>
            <span className="hero-number">
              01 <i>/ 03</i>
            </span>
          </div>
        </div>
        <HeroStudy enabled={webgl && !reduced} />
        <div className="hero-coordinate">
          18.7481° N &nbsp; 73.4072° E<br />
          <span>A slower kind of somewhere.</span>
        </div>
        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/explore?" + new URLSearchParams({ q, guests, max }));
          }}
        >
          <label>
            <MapPin size={20} />
            <div>
              <span>Where to?</span>
              <input
                aria-label="Destination"
                placeholder="Find your somewhere"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </label>
          <label>
            <Users size={20} />
            <div>
              <span>Your people</span>
              <select
                aria-label="Number of guests"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
              >
                <option value="">Add guests</option>
                {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} guests
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label>
            <IndianRupee size={20} />
            <div>
              <span>A little budget</span>
              <select
                aria-label="Maximum nightly budget"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              >
                <option value="">Price per night</option>
                {[3000, 5000, 7000, 10000].map((n) => (
                  <option key={n} value={n}>
                    Under ₹{n.toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <Button type="submit">
            <Search size={18} />
            Find my stay
          </Button>
        </form>
      </section>
      <main>
        <div className="intro-strip">
          <span>
            <span className="small-green-dot" /> LESS SEARCHING. MORE BELONGING.
          </span>
          <p>
            For weekend wanderers, slow travellers, and everyone in between.
          </p>
          <span>
            Thoughtfully curated. Always personal.
            <ArrowUpRight size={16} />
          </span>
        </div>
        <section className="section featured">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">THE STAYSPHERE EDIT</span>
                <h2>
                  Good places. <span>Great feelings.</span>
                </h2>
                <p>Spaces with character, for moments that matter.</p>
              </div>
              <Link className="text-link" to="/explore">
                Explore all stays
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="category-tabs">
              {categories.map(([Icon, title]) => (
                <button
                  key={title}
                  className={category === title ? "active" : ""}
                  onClick={() => setCategory(title)}
                >
                  <Icon size={17} />
                  {title}
                </button>
              ))}
            </div>
          </Reveal>
          <Reveal>
            <PropertyGrid properties={featured} />
          </Reveal>
        </section>
        <section className="section destinations">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">FOLLOW YOUR KIND OF FEELING</span>
                <h2>
                  Where will you <span>feel at home?</span>
                </h2>
              </div>
              <span className="muted">
                Different places. Endless possibilities.
              </span>
            </div>
            <div className="destination-grid">
              {[
                ["Goa", "Salt in the air. Peace on your mind.", photos[0]],
                ["Manali", "Closer to the clouds.", photos[6]],
                ["Jaipur", "A little royal. A lot of soul.", photos[5]],
                ["Lonavala", "Green as far as you can feel.", photos[2]],
              ].map(([name, desc, img], i) => (
                <Link
                  to={"/explore?q=" + name}
                  key={name}
                  className="destination"
                >
                  <img
                    src={photo(img, 700)}
                    loading="lazy"
                    alt={name + " destination stay"}
                  />
                  <span className="destination-index">0{i + 1}</span>
                  <div>
                    <h3>{name}</h3>
                    <p>{desc}</p>
                  </div>
                  <span className="destination-arrow">
                    <ArrowUpRight size={20} />
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
        <section className="ai-feature section">
          <Reveal className="ai-copy">
            <span className="eyebrow">
              <Sparkles size={15} /> A LITTLE INTELLIGENCE. A LOT OF INTUITION.
            </span>
            <h2>
              Your perfect stay,
              <br />
              <span>in your own words.</span>
            </h2>
            <p>
              A mountain view? Space for your people? A quiet corner under
              ₹5,000? Just ask. Our demo AI Finder turns your wish list into
              places you can explore.
            </p>
            <Button to="/guest/ai-finder">
              Meet your AI Finder
              <Sparkles size={16} />
            </Button>
            <span className="ai-disclaimer">
              A thoughtfully simulated AI experience. No live AI calls.
            </span>
          </Reveal>
          <Reveal className="ai-visual">
            <div className="architecture-scene">
              <img
                src={photo(photos[5], 600)}
                alt="Modern architectural home"
              />
            </div>
            <div className="ai-prompt">
              <span className="sparkle-box">
                <Sparkles size={17} />
              </span>
              “A peaceful villa in Goa under ₹6,000
              <br />
              for 5 guests, with a pool.”
              <span className="prompt-send">
                <ArrowUpRight size={17} />
              </span>
            </div>
            <div className="ai-match">
              <span className="small-green-dot" />
              Your words. Your kind of place.
            </div>
          </Reveal>
        </section>
        <section className="section why">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">A BETTER WAY TO FIND YOUR PLACE</span>
                <h2>
                  Stay a little <span>more you.</span>
                </h2>
              </div>
            </div>
            <div className="why-grid">
              {[
                [
                  Compass,
                  "Spaces with a point of view",
                  "Thoughtfully selected stays with character, comfort, and a sense of place.",
                ],
                [
                  CalendarDays,
                  "Clarity comes standard",
                  "See available, booked, and host-blocked dates before you make plans.",
                ],
                [
                  Sparkles,
                  "Discovery, made personal",
                  "Turn your everyday words into a shortlist that makes sense for you.",
                ],
                [
                  SlidersHorizontal,
                  "Hosting, simplified",
                  "Manage your spaces and availability from one considered workspace.",
                ],
              ].map(([Icon, title, text], i) => (
                <div key={title}>
                  <span className="why-icon">
                    <Icon size={24} />
                  </span>
                  <small>0{i + 1}</small>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
        <section className="host-cta section">
          <div>
            <span className="eyebrow">
              YOUR SPACE. SOMEONE’S NEXT FAVOURITE PLACE.
            </span>
            <h2>
              Good spaces deserve
              <br />
              to be <em>discovered.</em>
            </h2>
            <p>
              Bring your property to StaySphere. We’ll help you make room for
              more.
            </p>
            <Button to="/signup?role=HOST">
              Start your hosting story
              <ArrowUpRight size={17} />
            </Button>
          </div>
          <div className="host-cta-image">
            <img
              src={photo("photo-1600210492493-0946911123ea", 900)}
              alt="Warm, carefully furnished living space"
              loading="lazy"
            />
          </div>
        </section>
      </main>
    </>
  );
}
