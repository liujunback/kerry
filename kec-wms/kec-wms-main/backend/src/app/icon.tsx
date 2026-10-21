import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 26,
          background: '#f97316',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          borderRadius: 4,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        K
      </div>
    ),
    {
      ...size,
    }
  )
}
