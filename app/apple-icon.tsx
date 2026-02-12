import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          background: 'linear-gradient(135deg, #3D6AB5 0%, #1E3A6E 100%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <span
          style={{
            fontSize: 110,
            color: 'white',
            fontFamily: 'serif',
            lineHeight: 1,
          }}
        >
          A
        </span>
        {/* Tricolor bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            display: 'flex',
            width: 80,
            height: 6,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, background: '#002395' }} />
          <div style={{ flex: 1, background: '#FFFFFF' }} />
          <div style={{ flex: 1, background: '#ED2939' }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
