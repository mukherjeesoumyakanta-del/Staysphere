import { useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger } from "./motion";
const destinations = [
  [
    "Goa",
    "Follow the light.",
    "Salt in the air. A slower rhythm.",
    "photo-1512343879784-a960bf40e7f2",
  ],
  [
    "Manali",
    "Take the scenic route.",
    "Mountain air. A whole new perspective.",
    "photo-1626621341517-bbf3d9990a23",
  ],
  [
    "Darjeeling",
    "Above the everyday.",
    "Misty mornings. Time to simply be.",
    "photo-1544735716-392fe2489ffa",
  ],
  [
    "Jaipur",
    "Stay somewhere storied.",
    "Warm colours. A little royal. A lot of soul.",
    "photo-1599661046289-e31897846e41",
  ],
];
export default function DestinationShowcase() {
  const root = useRef(),
    stage = useRef();
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 801px) and (prefers-reduced-motion: no-preference)",
      () => {
        const ctx = gsap.context(() => {
          const scenes = gsap.utils.toArray(".destination-scene");
          gsap.set(scenes.slice(1), { autoAlpha: 0 });
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
          scenes.forEach((scene, i) => {
            tl.fromTo(
              scene.querySelector("img"),
              { scale: 1.25 },
              { scale: 1, duration: 1.3 },
              i,
            );
            if (i) {
              tl.to(scenes[i - 1], { autoAlpha: 0, duration: 0.5 }, i);
              tl.fromTo(
                scene,
                { autoAlpha: 0, clipPath: "inset(0 0 0 100%)" },
                { autoAlpha: 1, clipPath: "inset(0 0 0 0%)", duration: 0.85 },
                i,
              );
              tl.fromTo(
                scene.querySelector("h2"),
                { x: 140, rotate: -4, scale: 1.15 },
                { x: 0, rotate: 0, scale: 1, duration: 0.9 },
                i,
              );
              tl.to(
                scenes[i - 1].querySelector("img"),
                { xPercent: -12, scale: 1.15, duration: 0.8 },
                i,
              );
              tl.fromTo(
                scene.querySelector(".destination-copy"),
                { y: 35 },
                { y: 0, duration: 0.85 },
                i,
              );
            }
          });
          ScrollTrigger.refresh();
        }, root);
        return () => ctx.revert();
      },
    );
    return () => mm.revert();
  }, []);
  return (
    <section className="destination-story" ref={root}>
      <div className="destination-stage" ref={stage}>
        <header>
          <span>04 — FOLLOW YOUR FEELING</span>
          <span>INDIA, THROUGH A DIFFERENT LENS</span>
        </header>
        {destinations.map(([name, title, desc, img], i) => (
          <article className="destination-scene" key={name}>
            <img
              src={`https://images.unsplash.com/${img}?auto=format&fit=crop&w=1600&q=85`}
              alt={name + " landscape"}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1600&q=85";
              }}
              loading="lazy"
            />
            <div className="destination-gradient" />
            <div className="destination-copy">
              <span className="eyebrow">
                0{i + 1} / FOUR WAYS TO FEEL AT HOME
              </span>
              <h2>
                {name}
                <em>{title}</em>
              </h2>
              <p>{desc}</p>
              <Link to={"/explore?q=" + name}>
                Explore stays
                <ArrowUpRight size={19} />
              </Link>
            </div>
            <span className="destination-counter">
              0{i + 1}
              <small> / 04</small>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
