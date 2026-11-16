import { useLayoutEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { gsap, ScrollTrigger } from "./motion";
function Box({ position, args, color = "#e8deca", ...rest }) {
  return (
    <mesh position={position} {...rest}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}
function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 1.3, 8]} />
        <meshStandardMaterial color="#6c5d40" />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshStandardMaterial color="#667e53" roughness={1} />
      </mesh>
      <mesh position={[0.2, 1.9, 0]}>
        <sphereGeometry args={[0.38, 12, 12]} />
        <meshStandardMaterial color="#83946b" roughness={1} />
      </mesh>
    </group>
  );
}
function Villa() {
  return (
    <group>
      <RoundedBox args={[8, 0.18, 6]} radius={0.08} position={[0, -0.18, 0]}>
        <meshStandardMaterial color="#c3bba6" />
      </RoundedBox>
      <Box position={[0, 0.05, 0]} args={[6.7, 0.2, 4.5]} color="#e5d9bd" />
      <Box position={[-0.7, 1, 0]} args={[4.6, 1.8, 2.6]} />
      <Box
        position={[0.4, 2.6, -0.2]}
        args={[4.4, 1.35, 2.5]}
        color="#f2e9d8"
      />
      <Box
        position={[0.4, 3.32, -0.2]}
        args={[4.8, 0.12, 2.9]}
        color="#f6f0e4"
      />
      <Box
        position={[-0.6, 1.95, 0.1]}
        args={[5.4, 0.15, 3.3]}
        color="#f4e8d2"
      />
      {[-2, -0.65, 0.7].map((x) => (
        <group key={x}>
          <Box
            position={[x, 1, 1.32]}
            args={[1.22, 1.5, 0.035]}
            color="#345f5a"
          />
          <Box
            position={[x + 0.62, 1, 1.36]}
            args={[0.035, 1.6, 0.05]}
            color="#8b7250"
          />
        </group>
      ))}
      {[-1, 0.3, 1.6].map((x) => (
        <group key={x}>
          <Box
            position={[x, 2.6, 1.06]}
            args={[1.15, 1.13, 0.03]}
            color="#436c63"
          />
          <Box
            position={[x + 0.58, 2.6, 1.1]}
            args={[0.04, 1.2, 0.04]}
            color="#9e8864"
          />
        </group>
      ))}
      <Box position={[2.5, 1.0, 0.3]} args={[0.12, 1.9, 2.8]} color="#b7a481" />
      {Array.from({ length: 10 }, (_, i) => (
        <Box
          key={i}
          position={[1.75 + i * 0.12, 2.65, 1.1]}
          args={[0.04, 1.3, 0.1]}
          color="#a38a60"
        />
      ))}
      <Box
        position={[0.5, 0.16, 2.0]}
        args={[4.5, 0.08, 1.15]}
        color="#87b2ad"
      />
      <Box
        position={[0.5, 0.21, 2.0]}
        args={[4.25, 0.015, 0.95]}
        color="#568f89"
      />
      <Box
        position={[-2.8, 0.25, 1.9]}
        args={[0.7, 0.35, 1.4]}
        color="#d0c2a5"
      />
      <Box
        position={[-2.85, 0.48, 1.9]}
        args={[0.55, 0.1, 1.2]}
        color="#f5efdd"
      />
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          position={[-1.5 - i * 0.3, 0.04, 2.8 + i * 0.15]}
          args={[0.9, 0.06, 0.2]}
          color="#f3ecda"
        />
      ))}
      <Tree position={[-3, 0.0, -1.7]} />
      <Tree position={[3, 0.0, -1.6]} />
      <Tree position={[3.15, 0, 1.7]} />
      <Box position={[-3.1, 0.03, 0]} args={[0.7, 0.1, 1]} color="#7f9568" />
      <Box
        position={[2.8, 0.03, -1.4]}
        args={[1.3, 0.1, 1.4]}
        color="#80916b"
      />
    </group>
  );
}
function World({ section, panel }) {
  const group = useRef(),
    keyLight = useRef();
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: "(min-width: 801px)",
        mobile: "(max-width: 800px)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      ({ conditions }) => {
        const { desktop, reduce } = conditions;
        camera.position.set(11, 7, 12);
        camera.lookAt(0, 1, 0);
        invalidate();
        if (reduce) return;
        const ctx = gsap.context(() => {
          const update = () => {
            camera.lookAt(0, 1, 0);
            invalidate();
          };
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            onUpdate: update,
            scrollTrigger: {
              trigger: section.current,
              start: desktop ? "top top" : "top 65%",
              end: () => "+=" + innerHeight * (desktop ? 2.8 : 1.15),
              pin: desktop ? panel.current : false,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });
          tl.to(camera.position, { x: 8, y: 5, z: 10, duration: 20 }, 0)
            .to(group.current.rotation, { y: Math.PI * 0.5, duration: 25 }, 20)
            .to(camera.position, { x: 6, y: 4, z: 8, duration: 25 }, 45)
            .to(group.current.rotation, { y: Math.PI * 0.85, duration: 20 }, 70)
            .to(camera.position, { x: 7, y: 6, z: 9, duration: 20 }, 70)
            .to(
              group.current.rotation,
              { y: Math.PI * 0.95, duration: 10 },
              90,
            );
          tl.to(".message-one", { opacity: 0, y: -30, duration: 10 }, 24)
            .fromTo(
              ".message-two",
              { opacity: 0, y: 30 },
              { opacity: 1, y: 0, duration: 10 },
              35,
            )
            .to(".message-two", { opacity: 0, y: -30, duration: 10 }, 62)
            .fromTo(
              ".message-three",
              { opacity: 0, y: 30 },
              { opacity: 1, y: 0, duration: 10 },
              73,
            )
            .to(".house-progress i", { scaleX: 1, duration: 100 }, 0);
          tl.to(keyLight.current, { intensity: 1.1, duration: 35 }, 40)
            .to(
              keyLight.current.color,
              { r: 1, g: 0.7, b: 0.4, duration: 35 },
              40,
            )
            .to(camera.position, { y: 3.4, duration: 15 }, 55)
            .to(keyLight.current, { intensity: 3, duration: 20 }, 80)
            .to(keyLight.current.color, { r: 1, g: 1, b: 1, duration: 20 }, 80);
          ScrollTrigger.refresh();
        }, panel.current);
        return () => ctx.revert();
      },
    );
    return () => mm.revert();
  }, [camera, invalidate, section, panel]);
  return (
    <>
      <ambientLight intensity={1.5} />
      <hemisphereLight args={["#fff7e3", "#42654b", 1.6]} />
      <directionalLight ref={keyLight} position={[5, 10, 6]} intensity={3} />
      <directionalLight
        position={[-4, 4, -3]}
        intensity={1.2}
        color="#c5d7c6"
      />
      <group ref={group} position={[0, -0.3, 0]}>
        <Villa />
      </group>
    </>
  );
}
export default function VillaScene(props) {
  return (
    <Canvas
      dpr={[1, 1.4]}
      frameloop="demand"
      camera={{ position: [11, 7, 12], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <World {...props} />
    </Canvas>
  );
}
