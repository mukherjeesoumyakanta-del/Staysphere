import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef } from "react";
function Building() {
  const group = useRef();
  useFrame(({ pointer, clock }) => {
    if (group.current) {
      group.current.rotation.y = 0.35 + pointer.x * 0.13;
      group.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.06;
    }
  });
  return (
    <group ref={group} rotation={[0, 0.35, 0]}>
      <mesh position={[0, -0.8, 0]}>
        <boxGeometry args={[4, 0.18, 3]} />
        <meshStandardMaterial color="#d7cdb8" />
      </mesh>
      {[0, 1].map((i) => (
        <group key={i} position={[i * 0.35, i * 0.8 - 0.3, 0]}>
          <mesh>
            <boxGeometry args={[2.6, 0.65, 1.7]} />
            <meshStandardMaterial color="#ddd4bd" />
          </mesh>
          <mesh position={[0, 0, 0.86]}>
            <boxGeometry args={[2.1, 0.43, 0.03]} />
            <meshStandardMaterial
              color="#20463f"
              metalness={0.5}
              roughness={0.18}
            />
          </mesh>
          <mesh position={[0, 0.39, 0]}>
            <boxGeometry args={[2.9, 0.12, 2]} />
            <meshStandardMaterial color="#f5efdc" />
          </mesh>
        </group>
      ))}
      <Float speed={1} floatIntensity={0.2}>
        <mesh position={[-1.8, 0.4, 0]}>
          <sphereGeometry args={[0.28, 24, 24]} />
          <meshStandardMaterial color="#829d7e" roughness={0.7} />
        </mesh>
      </Float>
    </group>
  );
}
export default function Architecture() {
  return (
    <Canvas
      dpr={[1, 1.4]}
      camera={{ position: [4, 3, 5], fov: 40 }}
      frameloop="always"
    >
      <ambientLight intensity={1.8} />
      <directionalLight position={[3, 5, 4]} intensity={3} />
      <Building />
    </Canvas>
  );
}
