import { useEffect, useRef, useState } from "react";
export default function BackgroundVideo({
  className = "",
  poster = "/images/hero-poster.webp",
}) {
  const ref = useRef();
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const limited = navigator.connection?.saveData;
    let visible = false;
    const update = () => {
      if (visible && !document.hidden && !media.matches && !limited) {
        setPlay(true);
        el.play()?.catch(() => {});
      } else el.pause();
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        update();
      },
      { rootMargin: "100px" },
    );
    io.observe(el);
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    el.addEventListener("loadeddata", update);
    return () => {
      io.disconnect();
      el.pause();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      el.removeEventListener("loadeddata", update);
    };
  }, []);
  return (
    <video
      ref={ref}
      className={className}
      muted
      autoPlay
      loop
      playsInline
      preload="none"
      src={play ? "/videos/architecture.mp4" : undefined}
      poster={poster}
      aria-hidden="true"
    ></video>
  );
}
