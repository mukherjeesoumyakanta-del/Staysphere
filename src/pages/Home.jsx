import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Compass,
  CalendarDays,
  Sparkles,
  SlidersHorizontal,
  House,
  Waves,
  Mountain,
  Trees,
  Building2,
  Sun,
} from "lucide-react";
import { useStore } from "../context/Store";
import { PropertyGrid, Reveal } from "../components/UI";
import CinematicHero from "../components/cinematic/CinematicHero";
import ScrollDrivenHouse from "../components/cinematic/ScrollDrivenHouse";
import PropertyReveal from "../components/cinematic/PropertyReveal";
import DestinationShowcase from "../components/cinematic/DestinationShowcase";
import CinematicAISection from "../components/cinematic/CinematicAISection";
import HostingCTA from "../components/cinematic/HostingCTA";
import "../components/cinematic/cinematic.css";
export default function Home() {
  const { listings } = useStore();
  const [category, setCategory] = useState("All stays");
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
    <div className="cinematic-home">
      <CinematicHero />
      <main>
        <ScrollDrivenHouse />
        <PropertyReveal />{" "}
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
        <DestinationShowcase />
        <CinematicAISection />{" "}
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
        <HostingCTA />
      </main>
    </div>
  );
}
