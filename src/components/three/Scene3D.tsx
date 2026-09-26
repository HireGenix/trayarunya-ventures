'use client';

import dynamic from 'next/dynamic';
import type { SceneVariant } from './FloatingShapes';

/**
 * Client-only, lazily loaded 3D scene. Keeps three.js out of the SSR bundle
 * and off the critical path.
 */
const FloatingShapes = dynamic(() => import('./FloatingShapes'), { ssr: false });

export default function Scene3D({ variant = 'hero' }: { variant?: SceneVariant }) {
  return <FloatingShapes variant={variant} />;
}
