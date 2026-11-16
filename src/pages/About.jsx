import { Link } from "react-router-dom";
import { ArrowUpRight, Compass, House, Sparkles } from "lucide-react";
import { Button } from "../components/UI";
import { photo } from "../data/properties";
export function About() {
  return (
    <main>
      <section className="section about-hero">
        <span className="eyebrow">
          SPACES WITH SOUL. DISCOVERY WITH INTENTION.
        </span>
        <h1>
          There’s a somewhere
          <br />
          for <em>every kind of you.</em>
        </h1>
        <p>
          StaySphere brings thoughtful property discovery and simple hosting
          tools together. Because finding your place should feel as good as
          arriving.
        </p>
        <img
          src={photo("photo-1600210492486-724fe5c67fb0", 1600)}
          alt="A welcoming sunlit living room"
        />
      </section>
      <section className="section about-copy">
        <h2>
          A little more personal.
          <br />A little less ordinary.
        </h2>
        <div>
          <p>
            From a quiet cabin in Manali to a sunlit villa in Goa, the best
            spaces give us room to be ourselves. We built StaySphere around that
            simple idea.
          </p>
          <p>
            This B.Tech frontend project explores a more considered way to
            discover and manage rental properties. Its AI features, accounts,
            availability, and analytics are clearly simulated, ready for a
            future MERN backend.
          </p>
          <p>
            No online booking, payments, or real AI calls are enabled. Every
            listing is demonstration data.
          </p>
          <Button to="/explore">
            Find your kind of somewhere
            <ArrowUpRight size={17} />
          </Button>
        </div>
      </section>
    </main>
  );
}
export function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">404 · A LITTLE OFF THE MAP</span>
      <h1>
        This space is
        <br />
        <em>still undiscovered.</em>
      </h1>
      <p>Let’s get you back to somewhere good.</p>
      <Button to="/">
        Back to StaySphere
        <ArrowUpRight size={17} />
      </Button>
    </main>
  );
}
