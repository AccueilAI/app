import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 7,
          background: 'linear-gradient(135deg, #3D6AB5 0%, #1E3A6E 100%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <span
          style={{
            fontSize: 20,
            color: 'white',
            fontFamily: 'serif',
            lineHeight: 1,
          }}
        >
          A
        </span>
        {/* Tricolor bar at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            display: 'flex',
            width: 32,
            height: 2,
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
