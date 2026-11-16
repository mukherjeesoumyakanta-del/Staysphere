import { useRef, useLayoutEffect } from "react";
import { gsap } from "./motion";
export default function PropertyReveal() {
  const root = useRef();
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top 80%",
              end: "bottom 35%",
              scrub: 1,
            },
          })
          .fromTo(
            ".reveal-window",
            { clipPath: "inset(14% 18% round 32px)", scale: 0.92 },
            { clipPath: "inset(0% 0% round 0px)", scale: 1, duration: 1 },
          )
          .fromTo(
            ".reveal-title",
            { y: 70, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5 },
            0.4,
          );
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  return (
    <section ref={root} className="property-reveal">
      <div className="reveal-window">
        <img
          src="/images/villa-fallback.webp"
          alt="Contemporary villa opening onto a courtyard"
          loading="lazy"
        />
        <div />
        <h2 className="reveal-title">
          Some places change
          <br />
          <em>the way you feel.</em>
        </h2>
        <span className="reveal-small">03 — YOUR KIND OF SOMEWHERE</span>
      </div>
    </section>
  );
}
