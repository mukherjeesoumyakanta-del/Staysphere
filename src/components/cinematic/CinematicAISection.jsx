import { useLayoutEffect, useRef } from "react";
import { Sparkles, ArrowUpRight, Check } from "lucide-react";
import { gsap } from "./motion";
import { Button, money } from "../UI";
import { useStore } from "../../context/Store";
export default function CinematicAISection() {
  const root = useRef(),
    { listings } = useStore();
  const match = listings.find(
    (p) =>
      p.status === "active" &&
      p.location.includes("Goa") &&
      p.type === "Villa" &&
      p.price < 5000 &&
      p.amenities.includes("Swimming pool"),
  );
  const prompt = "Find me a villa in Goa under ₹5,000 with a pool.";
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          root.current,
          { backgroundColor: "#243d32" },
          {
            backgroundColor: "#0d211d",
            scrollTrigger: {
              trigger: root.current,
              start: "top 95%",
              end: "top 20%",
              scrub: 1,
            },
          },
        );
        const chars = gsap.utils.toArray(".typed-character");
        gsap
          .timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top 60%",
              once: true,
            },
          })
          .from(chars, { opacity: 0, duration: 0.02, stagger: 0.035 })
          .from(
            ".demo-ai-result",
            { y: 30, opacity: 0, duration: 0.8 },
            "+=.3",
          );
        gsap.from(".ai-cinema-copy>*", {
          y: 35,
          opacity: 0,
          stagger: 0.12,
          duration: 1,
          scrollTrigger: {
            trigger: root.current,
            start: "top 65%",
            once: true,
          },
        });
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  return (
    <section className="cinematic-ai" ref={root}>
      <div className="ai-cinema-copy">
        <span className="eyebrow">
          <Sparkles size={15} />
          05 — INTUITION, MEET INTELLIGENCE
        </span>
        <h2>
          Discover Smarter.
          <br />
          <em>Stay Better.</em>
        </h2>
        <p>
          Your next stay starts with a thought.
          <br />
          Tell us what matters. Find a space that fits.
        </p>
        <Button to="/guest/ai-finder">
          Find your space with AI
          <ArrowUpRight size={17} />
        </Button>
        <small>Mock AI demonstration · No live AI calls</small>
      </div>
      <div className="ai-cinema-demo">
        <div className="ai-demo-top">
          <Sparkles size={18} />
          <span>STAYSPHERE INTELLIGENCE</span>
          <i />
        </div>
        <p className="typed-prompt" aria-label={prompt}>
          {[...prompt].map((c, i) => (
            <span className="typed-character" key={i} aria-hidden="true">
              {c}
            </span>
          ))}
          <span className="type-cursor" />
        </p>
        <div className="ai-extracted">
          <span>
            <Check size={12} />
            Goa
          </span>
          <span>
            <Check size={12} />
            Under ₹5,000
          </span>
          <span>
            <Check size={12} />
            Pool
          </span>
        </div>
        {match ? (
          <LinkCard property={match} />
        ) : (
          <div className="demo-ai-result">
            <p>
              No matching villa right now. Explore more options in the AI
              Finder.
            </p>
          </div>
        )}
        <div className="ai-demo-foot">
          REAL DEMO LISTINGS. THOUGHTFULLY MATCHED.
        </div>
      </div>
    </section>
  );
}
import { Link } from "react-router-dom";
function LinkCard({ property: p }) {
  return (
    <Link to={"/property/" + p.id} className="demo-ai-result">
      <img src={p.images[0]} alt={p.name} />
      <div>
        <span>{p.location}</span>
        <h3>{p.name}</h3>
        <p>
          {money(p.price)} <small>/ night</small>
        </p>
      </div>
      <ArrowUpRight size={18} />
    </Link>
  );
}
