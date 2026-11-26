"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SceneProps {
  scrollRef: React.MutableRefObject<number>;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  isMobile: boolean;
}

/**
 * Generates an Interstellar-inspired ambient starfield + golden spiral accretion dot ring.
 * Uses a lighter particle count on phones (650 total) so it stays silky 60fps on mobile GPUs.
 */
function buildCosmicParticles(dustCount: number, ringCount: number) {
  const total = dustCount + ringCount;
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);

  const amber = new THREE.Color("#E8A849");
  const ivory = new THREE.Color("#FCE7BA");
  const steel = new THREE.Color("#5AA9E6");
  const tmp = new THREE.Color();

  for (let i = 0; i < dustCount; i++) {
    const r = 3.2 + Math.random() * 7.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.7;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 2.0;

    tmp.copy(i % 3 === 0 ? steel : ivory).multiplyScalar(0.55 + Math.random() * 0.45);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  // Luminous golden spiral accretion ring
  for (let j = 0; j < ringCount; j++) {
    const i = dustCount + j;
    const angle = Math.random() * Math.PI * 2;
    const band = (Math.random() - 0.5) * 0.52;
    const radius = 2.45 + band;
    const yScatter = (Math.random() - 0.5) * 0.08;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = yScatter;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    const heat = 1 - Math.min(1, Math.abs(band) / 0.28);
    tmp.copy(amber).lerp(ivory, heat * 0.75);
    if (j % 9 === 0) tmp.lerp(steel, 0.45);

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  return { positions, colors };
}

function NolanSpaceScene({ scrollRef, mouseRef, isMobile }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { positions, colors } = useMemo(
    () => (isMobile ? buildCosmicParticles(260, 460) : buildCosmicParticles(900, 1100)),
    [isMobile]
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame((state, delta) => {
    const p = scrollRef.current;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    if (!isMobile) {
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, mx * 0.35, 0.03);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, -my * 0.22, 0.03);
      state.camera.lookAt(0, 0, 0);
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.065;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        0.38 + p * 0.32 + (isMobile ? 0 : my * 0.08),
        0.04
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        -0.16 + p * 0.18,
        0.04
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        -0.35 + p * 0.7,
        0.04
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.35, -1.2]}>
      <points geometry={geometry}>
        <pointsMaterial
          size={isMobile ? 0.042 : 0.028}
          vertexColors
          transparent
          opacity={0.82}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export default function ArcadeCanvas({
  scrollRef,
  mouseRef,
}: {
  scrollRef: React.MutableRefObject<number>;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const [hidden, setHidden] = useState(false);
  const [isMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-85"
    >
      <Canvas
        dpr={isMobile ? 1 : [1, 1.5]}
        camera={{ position: [0, 0, isMobile ? 6.8 : 6.2], fov: 42 }}
        frameloop={hidden ? "never" : "always"}
        gl={{
          antialias: !isMobile,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <NolanSpaceScene
          scrollRef={scrollRef}
          mouseRef={mouseRef}
          isMobile={isMobile}
        />
      </Canvas>
    </div>
  );
}
