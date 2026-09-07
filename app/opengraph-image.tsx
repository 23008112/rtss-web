import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'RTSS Performance — Real-Time PC Performance Control'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '76px',
          background: '#0b1015',
          color: '#e7edf0',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, letterSpacing: -1 }}>
          <div
            style={{
              display: 'flex',
              width: 46,
              height: 46,
              borderRadius: 8,
              border: '2px solid #56c8ff',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#56c8ff',
              fontWeight: 700,
            }}
          >
            R
          </div>
          <span style={{ fontWeight: 700 }}>RTSS</span>
          <span style={{ color: '#56c8ff', fontWeight: 700 }}>PERFORMANCE</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 980 }}>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            Your entire performance stack.
            <span style={{ color: '#56c8ff', marginLeft: 20 }}>At your fingertips.</span>
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#8a969d' }}>
            Live FPS, CPU and GPU telemetry on the Logitech MX Creative Console.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 28, fontSize: 22, color: '#56c8ff', letterSpacing: 1 }}>
          <span>LIVE TELEMETRY</span>
          <span>FPS CONTROL</span>
          <span>RTSS INTEGRATION</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
