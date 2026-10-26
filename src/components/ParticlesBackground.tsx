'use client';

import dynamic from 'next/dynamic';

const Particles = dynamic(() => import('@/components/Particles'), { ssr: false });

export function ParticlesBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0a0a0a',
      }}
    >
      <Particles
        particleColors={['#ffffff', '#a3a3a3']}
        particleCount={180}
        particleSpread={12}
        speed={0.08}
        particleBaseSize={80}
        glow={0.4}
        twinkle={0.35}
        moveParticlesOnHover
        hoverEffect="parallax"
        particleHoverFactor={0.4}
        opacity={0.55}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
