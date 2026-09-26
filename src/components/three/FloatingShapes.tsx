'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Environment,
  Float,
  Lightformer,
  MeshDistortMaterial,
  MeshWobbleMaterial,
  Sparkles,
} from '@react-three/drei';

export type SceneVariant = 'hero' | 'page' | 'cta';

/** Creative agency spectrum — brand gold/green plus pop pink, violet, blue. */
export const SCENE_COLORS = {
  gold: '#ffaf06',
  pink: '#ff4d8d',
  violet: '#7c5cff',
  green: '#14bb87',
  blue: '#2f7bff',
} as const;

type Vec3 = [number, number, number];

interface ShapeLayout {
  blob: { position: Vec3; scale: number };
  knot: { position: Vec3; scale: number };
  ring: { position: Vec3; scale: number };
  ico: { position: Vec3; scale: number };
  pill: { position: Vec3; scale: number };
  cube: { position: Vec3; scale: number };
  orbs: { position: Vec3; scale: number; color: string }[];
}

const LAYOUTS: Record<SceneVariant, ShapeLayout> = {
  // Home hero: cluster on the right behind the product showcase.
  hero: {
    blob: { position: [2.6, 0.2, -1.5], scale: 1.9 },
    knot: { position: [4.4, 2.2, -2.5], scale: 0.55 },
    ring: { position: [1.2, -2.1, -0.5], scale: 0.9 },
    ico: { position: [-4.6, 2.4, -3], scale: 0.55 },
    pill: { position: [4.6, -1.9, -1], scale: 0.5 },
    cube: { position: [-3.6, -2.6, -2], scale: 0.45 },
    orbs: [
      { position: [0.2, 2.8, -2], scale: 0.28, color: SCENE_COLORS.gold },
      { position: [-1.4, -3, -1.5], scale: 0.2, color: SCENE_COLORS.green },
      { position: [5.8, 0.4, -3], scale: 0.32, color: SCENE_COLORS.pink },
    ],
  },
  // Inner-page heroes: shapes frame the centered headline from the edges.
  page: {
    blob: { position: [5.6, 0.6, -3], scale: 1.5 },
    knot: { position: [-5.6, 1.4, -3], scale: 0.6 },
    ring: { position: [-4.4, -2, -1.5], scale: 0.75 },
    ico: { position: [4.2, -2.4, -1.5], scale: 0.5 },
    pill: { position: [-2.8, 2.9, -3.5], scale: 0.42 },
    cube: { position: [3, 2.9, -3.5], scale: 0.38 },
    orbs: [
      { position: [-6.6, -0.6, -4], scale: 0.3, color: SCENE_COLORS.gold },
      { position: [6.8, -1.2, -4], scale: 0.26, color: SCENE_COLORS.green },
      { position: [0.4, -3.4, -4], scale: 0.18, color: SCENE_COLORS.pink },
    ],
  },
  // Final CTA band: lighter, shapes at the corners.
  cta: {
    blob: { position: [-5.4, -0.6, -3], scale: 1.3 },
    knot: { position: [6.6, 1.8, -3.5], scale: 0.5 },
    ring: { position: [4, -2.2, -2], scale: 0.7 },
    ico: { position: [-3.6, 2.4, -3], scale: 0.45 },
    pill: { position: [2.6, 2.6, -3.5], scale: 0.38 },
    cube: { position: [-2.2, -2.8, -2.5], scale: 0.35 },
    orbs: [
      { position: [6.6, -1.8, -4], scale: 0.24, color: '#ffffff' },
      { position: [-6.8, 1.6, -4], scale: 0.22, color: '#ffffff' },
    ],
  },
};

const glossy = (color: string) => ({
  color,
  roughness: 0.12,
  metalness: 0.15,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
});

/** Group that eases towards the pointer for a parallax, "look-around" 3D feel. */
function PointerRig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const k = Math.min(1, delta * 2.5);
    g.rotation.y += (state.pointer.x * 0.28 - g.rotation.y) * k;
    g.rotation.x += (-state.pointer.y * 0.18 - g.rotation.x) * k;
    g.position.x += (state.pointer.x * 0.35 - g.position.x) * k;
    g.position.y += (state.pointer.y * 0.25 - g.position.y) * k;
  });
  return <group ref={ref}>{children}</group>;
}

function Spinner({
  children,
  speed = 0.3,
  position,
}: {
  children: React.ReactNode;
  speed?: number;
  position?: Vec3;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * speed * 0.6;
    ref.current.rotation.y += delta * speed;
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

function Shapes({ variant }: { variant: SceneVariant }) {
  const l = LAYOUTS[variant];
  const cta = variant === 'cta';
  return (
    <PointerRig>
      {/* Liquid chrome blob */}
      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.2}>
        <mesh position={l.blob.position} scale={l.blob.scale}>
          <sphereGeometry args={[1, 96, 96]} />
          <MeshDistortMaterial
            color={cta ? '#ffffff' : SCENE_COLORS.violet}
            roughness={0.08}
            metalness={0.2}
            distort={0.42}
            speed={1.8}
          />
        </mesh>
      </Float>

      <Float speed={2} rotationIntensity={1.4} floatIntensity={1.6}>
        <Spinner position={l.knot.position} speed={0.45}>
          <mesh scale={l.knot.scale}>
            <torusKnotGeometry args={[1, 0.34, 180, 28]} />
            <meshPhysicalMaterial {...glossy(SCENE_COLORS.gold)} />
          </mesh>
        </Spinner>
      </Float>

      <Float speed={1.6} rotationIntensity={1.2} floatIntensity={1}>
        <mesh position={l.ring.position} scale={l.ring.scale} rotation={[1.1, 0.3, 0]}>
          <torusGeometry args={[1, 0.36, 48, 120]} />
          <meshPhysicalMaterial {...glossy(SCENE_COLORS.pink)} />
        </mesh>
      </Float>

      <Float speed={2.2} rotationIntensity={2} floatIntensity={1.4}>
        <mesh position={l.ico.position} scale={l.ico.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial {...glossy(SCENE_COLORS.green)} flatShading />
        </mesh>
      </Float>

      <Float speed={1.8} rotationIntensity={1.6} floatIntensity={1.8}>
        <mesh position={l.pill.position} scale={l.pill.scale} rotation={[0.4, 0, 0.9]}>
          <capsuleGeometry args={[0.6, 1.2, 16, 32]} />
          <MeshWobbleMaterial color={SCENE_COLORS.blue} factor={0.25} speed={1.2} roughness={0.15} />
        </mesh>
      </Float>

      <Float speed={1.5} rotationIntensity={2.2} floatIntensity={1.2}>
        <Spinner position={l.cube.position} speed={0.5}>
          <mesh scale={l.cube.scale}>
            <boxGeometry args={[1.3, 1.3, 1.3]} />
            <meshPhysicalMaterial {...glossy(cta ? '#ffffff' : SCENE_COLORS.gold)} />
          </mesh>
        </Spinner>
      </Float>

      {l.orbs.map((o, i) => (
        <Float key={i} speed={2.4 + i * 0.4} floatIntensity={2} rotationIntensity={0}>
          <mesh position={o.position} scale={o.scale}>
            <sphereGeometry args={[1, 48, 48]} />
            <meshPhysicalMaterial {...glossy(o.color)} />
          </mesh>
        </Float>
      ))}

      <Sparkles
        count={variant === 'hero' ? 70 : 45}
        scale={[16, 8, 4]}
        position={[0, 0, -2]}
        size={3}
        speed={0.35}
        opacity={0.7}
        color={cta ? '#ffffff' : SCENE_COLORS.violet}
      />
    </PointerRig>
  );
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Interactive WebGL 3D scene of glossy floating shapes. Pauses rendering while
 * off-screen, and renders nothing when WebGL is unavailable or the user prefers
 * reduced motion (the CSS aurora backgrounds remain as the fallback).
 */
export default function FloatingShapes({ variant = 'hero' }: { variant?: SceneVariant }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(!reduce && hasWebGL());
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '120px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
    >
      <Canvas
        frameloop={inView ? 'always' : 'never'}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        eventSource={document.body}
        eventPrefix="client"
        style={{ pointerEvents: 'none' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 6, 5]} intensity={1.6} />
        <pointLight position={[-6, -3, 2]} intensity={40} color={SCENE_COLORS.pink} />
        <pointLight position={[6, 3, 3]} intensity={40} color={SCENE_COLORS.blue} />
        <Shapes variant={variant} />
        {/* Local studio lighting (no remote HDR download) for glossy reflections */}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} position={[0, 5, -5]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={2} color={SCENE_COLORS.gold} position={[-6, 1, -2]} scale={[4, 6, 1]} />
          <Lightformer form="rect" intensity={2} color={SCENE_COLORS.violet} position={[6, -1, -2]} scale={[4, 6, 1]} />
          <Lightformer form="ring" intensity={2} position={[0, 0, 6]} scale={4} />
        </Environment>
      </Canvas>
    </div>
  );
}
