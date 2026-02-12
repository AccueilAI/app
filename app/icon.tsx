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
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 7,
          background: 'linear-gradient(135deg, #3D6AB5 0%, #1E3A6E 100%)',
        }}
      >
        <span
          style={{
            fontSize: 22,
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
