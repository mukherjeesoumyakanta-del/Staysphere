import { useRef, useLayoutEffect } from "react";
import { gsap, ScrollTrigger } from "./motion";
export default function PropertyReveal() {
  const root = useRef(),
    stage = useRef();
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: "(min-width: 801px)",
        mobile: "(max-width: 800px)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      ({ conditions }) => {
        if (conditions.reduce) return;
        const ctx = gsap.context(() => {
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root.current,
              start: conditions.desktop ? "top top" : "top 75%",
              end: () => "+=" + innerHeight * (conditions.desktop ? 1.7 : 0.85),
              pin: conditions.desktop ? stage.current : false,
              scrub: 0.7,
              invalidateOnRefresh: true,
            },
          });
          tl.fromTo(
            ".portal-image",
            { clipPath: "inset(30% 34% round 2px)", scale: 1.25 },
            { clipPath: "inset(0% 0% round 0px)", scale: 1, duration: 1.4 },
            0.2,
          )
            .to(
              ".portal-word:first-child",
              { xPercent: -35, scale: 1.3, duration: 1.6 },
              0,
            )
            .to(
              ".portal-word:last-child",
              { xPercent: 35, scale: 1.3, duration: 1.6 },
              0,
            )
            .to(".portal-type", { opacity: 0, duration: 0.45 }, 0.65)
            .fromTo(
              ".portal-caption",
              { yPercent: 110, rotate: 4 },
              { yPercent: 0, rotate: 0, duration: 0.65 },
              1.05,
            )
            .fromTo(
              ".portal-caption em",
              { clipPath: "inset(0 100% 0 0)" },
              { clipPath: "inset(0 0% 0 0)", duration: 0.5 },
              1.55,
            )
            .to(".portal-shade", { opacity: 1, duration: 0.6 }, 1);
          ScrollTrigger.refresh();
        }, root);
        return () => ctx.revert();
      },
    );
    return () => mm.revert();
  }, []);
  return (
    <section className="property-portal" ref={root}>
      <div className="portal-stage" ref={stage}>
        <div className="portal-type" aria-hidden="true">
          <span className="portal-word">BE</span>
          <span className="portal-word">LONG.</span>
        </div>
        <div className="portal-image">
          <img
            src="/images/villa-fallback.webp"
            alt="Contemporary villa opening onto a courtyard"
            loading="lazy"
          />
          <div className="portal-shade" />
        </div>
        <span className="portal-index">03 / THE FEELING OF ARRIVING</span>
        <div className="portal-caption-mask">
          <h2 className="portal-caption">
            Some places change
            <br />
            <em>the way you feel.</em>
          </h2>
        </div>
        <span className="portal-bottom">
          EXTRAORDINARY IS A FEELING. FIND YOURS.
        </span>
      </div>
    </section>
  );
}
