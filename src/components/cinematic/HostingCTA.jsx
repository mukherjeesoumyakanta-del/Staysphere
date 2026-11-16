import { useLayoutEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap } from "./motion";
import { Button } from "../UI";
import { useStore } from "../../context/Store";
import BackgroundVideo from "./BackgroundVideo";
export default function HostingCTA() {
  const root = useRef(),
    { user } = useStore();
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".hosting-content>*", {
          y: 55,
          opacity: 0,
          stagger: 0.15,
          duration: 1,
          scrollTrigger: {
            trigger: root.current,
            start: "top 65%",
            once: true,
          },
        });
        gsap.fromTo(
          ".hosting-media",
          { yPercent: -10 },
          {
            yPercent: 10,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          },
        );
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  return (
    <section className="cinema-hosting" ref={root}>
      <div className="hosting-media">
        <BackgroundVideo className="cinema-video" />
      </div>
      <div className="hosting-overlay" />
      <div className="hosting-content">
        <span className="eyebrow">06 — MAKE ROOM FOR MORE</span>
        <h2>
          Your Property.
          <br />
          <em>New Possibilities.</em>
        </h2>
        <p>Someone’s next favourite place could be yours.</p>
        <Button
          to={user?.role === "HOST" ? "/host/dashboard" : "/signup?role=HOST"}
        >
          Start your hosting story
          <ArrowUpRight size={18} />
        </Button>
      </div>
      <span className="hosting-footnote">
        GOOD SPACES DESERVE TO BE DISCOVERED.
      </span>
    </section>
  );
}
