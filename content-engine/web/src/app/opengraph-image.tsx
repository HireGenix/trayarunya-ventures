import { ImageResponse } from 'next/og';

export const alt = 'MarketiQ AI — The Agentic Marketing Operating System';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background:
            'radial-gradient(1000px 500px at 0% 0%, rgba(255,175,6,0.35) 0%, transparent 55%), radial-gradient(900px 500px at 100% 100%, rgba(20,187,135,0.35) 0%, transparent 55%), #0E1116',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', width: 56, height: 56 }}>
            <svg viewBox="0 0 64 64" width="56" height="56">
              <path d="M32 32 L23 20 L38 8 L42 25 Z" fill="#FFAF06" />
              <path d="M32 32 L23 20 L38 8 L42 25 Z" fill="#14BB87" transform="rotate(120 32 32)" />
              <path d="M32 32 L23 20 L38 8 L42 25 Z" fill="#D92C4A" transform="rotate(240 32 32)" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 40, fontWeight: 800, letterSpacing: '-0.04em' }}>
            <span>Market</span>
            <span style={{ color: '#FFAF06' }}>iQ</span>
            <span style={{ color: '#14BB87', fontSize: 24, marginLeft: 10 }}>AI</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 40,
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            maxWidth: 920,
          }}
        >
          Your entire marketing team, on autopilot.
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 30,
            color: 'rgba(255,255,255,0.72)',
            maxWidth: 900,
          }}
        >
          Research → Strategy → Creation → Publishing → Learning. One closed loop, 30+ modules.
        </div>
      </div>
    ),
    { ...size },
  );
}
