import { lazy, Suspense, Component, useRef, useState, useEffect } from "react";
import { useInView, useReducedMotion } from "framer-motion";
const VillaScene = lazy(() => import("./VillaScene"));
class WebGLBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function ScrollDrivenHouse() {
  const root = useRef(),
    panel = useRef();
  const near = useInView(root, { once: true, margin: "600px" }),
    reduced = useReducedMotion();
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setSupported(!!c.getContext("webgl2"));
    } catch {}
  }, []);
  const fallback = (
    <img
      className="villa-fallback"
      src="/images/villa-fallback.webp"
      alt="Architectural study of a modern villa"
    />
  );
  return (
    <section
      ref={root}
      id="architecture"
      className={
        "house-scroll" +
        (supported && !reduced && near ? " house-scroll-enabled" : "")
      }
    >
      <div ref={panel} className="house-stage">
        <div className="house-heading">
          <span className="eyebrow">02 — A CHANGE OF PERSPECTIVE</span>
          <span className="house-caption">
            AN INTERACTIVE ARCHITECTURAL STUDY
          </span>
        </div>
        <div className="villa-canvas">
          {supported && !reduced && near ? (
            <WebGLBoundary fallback={fallback}>
              <Suspense fallback={fallback}>
                <VillaScene section={root} panel={panel} />
              </Suspense>
            </WebGLBoundary>
          ) : (
            fallback
          )}
        </div>
        <div className="house-story">
          <div className="house-message message-one">
            <span>01 / DISCOVER</span>
            <h2>
              Discover
              <br />
              <em>Extraordinary</em>
              <br />
              Spaces.
            </h2>
            <p>A new angle on somewhere special.</p>
          </div>
          <div className="house-message message-two">
            <span>02 / EXPERIENCE</span>
            <h2>
              Designed for
              <br />
              <em>Every</em>
              <br />
              Journey.
            </h2>
            <p>Thoughtful details. Room to be you.</p>
          </div>
          <div className="house-message message-three">
            <span>03 / BELONG</span>
            <h2>
              Your Next Stay
              <br />
              <em>Begins Here.</em>
            </h2>
            <p>Take a closer look. Find your place.</p>
          </div>
        </div>
        <div className="house-bottom">
          <span>SCROLL TO EXPLORE EVERY ANGLE</span>
          <div className="house-progress">
            <i />
          </div>
          <span>THE STAYSPHERE HOUSE · 3D STUDY</span>
        </div>
      </div>
    </section>
  );
}
