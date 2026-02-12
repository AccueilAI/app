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
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          background: '#2B4C8C',
        }}
      >
        <span
          style={{
            fontSize: 120,
            color: 'white',
            fontFamily: 'serif',
            lineHeight: 1,
          }}
        >
          A
        </span>
      </div>
    ),
    { ...size },
  );
}
