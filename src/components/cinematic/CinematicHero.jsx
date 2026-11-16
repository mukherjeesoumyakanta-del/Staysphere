import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  MapPin,
  Users,
  IndianRupee,
  Search,
} from "lucide-react";
import { gsap } from "./motion";
import { Button } from "../UI";
import BackgroundVideo from "./BackgroundVideo";
export default function CinematicHero() {
  const root = useRef(),
    navigate = useNavigate();
  const [q, setQ] = useState(""),
    [guests, setGuests] = useState(""),
    [max, setMax] = useState("");
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".hero-line>span", {
          yPercent: 110,
          rotateX: -65,
          transformOrigin: "50% 100%",
          opacity: 0,
          duration: 1.3,
          stagger: 0.16,
          ease: "power3.out",
        });
        gsap.from(".hero-kicker,.hero-description,.hero-buttons", {
          opacity: 0,
          y: 20,
          delay: 0.6,
          duration: 1,
          stagger: 0.12,
        });
        gsap.to(".cinema-media", {
          scale: 1.3,
          yPercent: 14,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
        gsap.to(".hero-editorial", {
          y: -90,
          scale: 0.93,
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "25% top",
            end: "bottom top",
            scrub: 1,
          },
        });
        gsap.to(".hero-film-word", {
          xPercent: -24,
          letterSpacing: "-.04em",
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.7,
          },
        });
        gsap.fromTo(
          ".hero-aperture",
          { clipPath: "inset(0% 0% 0% 0%)" },
          {
            clipPath: "inset(50% 0% 50% 0%)",
            ease: "power2.inOut",
            duration: 1.4,
          },
        );
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  return (
    <section ref={root} className="cinema-hero">
      <div className="cinema-media">
        <BackgroundVideo className="cinema-video" />
      </div>
      <div className="cinema-vignette" />
      <div className="cinema-grain" />
      <div className="hero-aperture" aria-hidden="true" />
      <span className="hero-film-word" aria-hidden="true">
        STAYSPHERE
      </span>
      <span className="hero-film-edition">
        AN EXPLORATION OF SPACE & FEELING — VOL. 01
      </span>
      <div className="hero-editorial">
        <div className="hero-kicker">
          <span />
          THE ART OF FEELING AT HOME
        </div>
        <h1>
          <span className="hero-line">
            <span>Find a Space</span>
          </span>
          <span className="hero-line">
            <span>That Feels Like</span>
          </span>
          <span className="hero-line">
            <span>
              <em>Yours.</em>
            </span>
          </span>
        </h1>
        <p className="hero-description">
          Discover extraordinary stays, explore availability,
          <br />
          and find your next home with intelligent assistance.
        </p>
        <div className="hero-buttons">
          <Button to="/explore">
            Explore properties
            <ArrowUpRight size={17} />
          </Button>
          <Link className="hero-ai" to="/guest/ai-finder">
            <Sparkles size={16} />
            Find with AI
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      <div className="hero-side-note">A DIFFERENT PERSPECTIVE ON STAYING.</div>
      <a className="cinema-scroll" href="#architecture">
        <span className="scroll-circle">
          <ArrowDown size={16} />
        </span>
        SCROLL TO DISCOVER
        <span className="scroll-rule" />
      </a>
      <div className="cinema-location">
        <span>01 — THE ARRIVAL</span>
        <p>Less ordinary. More you.</p>
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
  );
}
