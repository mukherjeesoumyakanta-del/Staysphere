import { useEffect, useRef } from "react";

export default function BackgroundVideo({
  className = "",
  poster = "/images/hero-poster.webp",
  src = "/videos/architecture.mp4",
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Explicitly set muted on DOM property to satisfy Chrome's strict autoplay policy
    el.muted = true;
    el.defaultMuted = true;

    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const limited = navigator.connection?.saveData;

    const playVideo = () => {
      if (!document.hidden && !media.matches && !limited) {
        el.play()?.catch(() => {});
      } else {
        el.pause();
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          playVideo();
        } else {
          el.pause();
        }
      },
      { rootMargin: "100px" }
    );

    io.observe(el);
    media.addEventListener("change", playVideo);
    document.addEventListener("visibilitychange", playVideo);

    playVideo();

    return () => {
      io.disconnect();
      el.pause();
      media.removeEventListener("change", playVideo);
      document.removeEventListener("visibilitychange", playVideo);
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
      preload="auto"
      src={src}
      poster={poster}
      aria-hidden="true"
    />
  );
}
