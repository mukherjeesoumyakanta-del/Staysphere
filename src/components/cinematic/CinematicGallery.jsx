import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "./motion";
import { PropertyCard, Empty } from "../UI";
export default function CinematicGallery({ properties }) {
  const root = useRef(),
    track = useRef(),
    trigger = useRef();
  const signature = properties.map((p) => p.id).join(",");
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 801px) and (prefers-reduced-motion: no-preference)",
      () => {
        if (properties.length < 3) return;
        const ctx = gsap.context(() => {
          const distance = () =>
            Math.max(0, track.current.scrollWidth - root.current.clientWidth);
          const animation = gsap.to(track.current, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "center center",
              end: () => "+=" + Math.max(innerHeight, distance()),
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                root.current.style.setProperty(
                  "--reel-progress",
                  self.progress,
                );
              },
            },
          });
          trigger.current = animation.scrollTrigger;
          gsap.from(".reel-card", {
            rotationY: 9,
            y: 40,
            stagger: 0.08,
            duration: 0.8,
            scrollTrigger: {
              trigger: root.current,
              start: "top 80%",
              once: true,
            },
          });
          ScrollTrigger.refresh();
        }, root);
        return () => {
          ctx.revert();
          trigger.current = null;
        };
      },
    );
    return () => mm.revert();
  }, [signature]);
  return (
    <div
      className="cinematic-gallery"
      ref={root}
      onFocusCapture={(e) => {
        const st = trigger.current,
          card = e.target.closest(".reel-card");
        if (st && card && e.target.matches(":focus-visible")) {
          const distance = Math.max(
            0,
            track.current.scrollWidth - root.current.clientWidth,
          );
          const ratio = distance ? Math.min(1, card.offsetLeft / distance) : 0;
          window.scrollTo(0, st.start + (st.end - st.start) * ratio);
          st.update();
        }
      }}
    >
      <div className="gallery-reel-label">
        <span>A COLLECTION OF POSSIBILITIES</span>
        <span>SCROLL TO EXPLORE ↗</span>
      </div>
      {properties.length ? (
        <div ref={track} className="gallery-track">
          {properties.map((p, i) => (
            <div key={p.id} className="reel-card">
              <span className="reel-number">
                {String(i + 1).padStart(2, "0")}
                <i> / THE STAYSPHERE COLLECTION</i>
              </span>
              <PropertyCard property={p} />
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="More spaces are on their way"
          text="Try another collection."
        />
      )}
      <div className="reel-progress">
        <i />
      </div>
    </div>
  );
}
