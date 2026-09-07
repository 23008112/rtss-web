'use client'

import { useCallback, useEffect, useState } from 'react'

/* ---------------------------------------------------------------- data --- */

type Tone = 'good' | 'warn' | 'bad'
type Feature = { id: string; group: string; name: string; desc: string; value: string; tone?: Tone }

/** Events: performance information the plugin reads and displays. Nothing to press.
 *  Only Bottleneck and Thermal Status carry a status tone — plain telemetry
 *  (usage, clocks, memory, frame numbers) stays in the regular accent colour. */
const eventFeatures: Feature[] = [
  { id: '01', group: 'CPU', name: 'CPU USAGE', desc: 'How hard the processor is working.', value: '54%' },
  { id: '02', group: 'CPU', name: 'CPU CLOCK', desc: 'Current processor clock speed.', value: '4.8 GHz' },
  { id: '03', group: 'CPU', name: 'CPU TEMPERATURE', desc: 'Current processor temperature.', value: '58°C' },
  { id: '04', group: 'GPU', name: 'GPU USAGE', desc: 'How hard the graphics card is working.', value: '97%' },
  { id: '05', group: 'GPU', name: 'GPU CLOCK', desc: 'Current graphics card clock speed.', value: '2.7 GHz' },
  { id: '06', group: 'GPU', name: 'GPU TEMPERATURE', desc: 'Current graphics card temperature.', value: '68°C' },
  { id: '07', group: 'FRAME', name: '1% LOW', desc: 'Frame rate during the worst 1% of frames.', value: '118 FPS' },
  { id: '08', group: 'FRAME', name: '0.1% LOW', desc: 'Frame rate during the worst 0.1% of frames — the stutters you feel.', value: '96 FPS' },
  { id: '09', group: 'FRAME', name: 'FRAME TIME', desc: 'Milliseconds spent on each frame. Steadier is smoother.', value: '7.1 ms' },
  { id: '10', group: 'MEMORY', name: 'VRAM', desc: 'Graphics card memory in use.', value: '7.1 GB' },
  { id: '11', group: 'MEMORY', name: 'RAM', desc: 'System memory in use.', value: '12.4 GB' },
  { id: '12', group: 'PERF', name: 'BOTTLENECK', desc: 'Whether the CPU or the GPU is limiting your frame rate.', value: 'GPU', tone: 'warn' },
  { id: '13', group: 'PERF', name: 'THERMAL STATUS', desc: 'A summary of how your temperatures are doing.', value: 'NOMINAL', tone: 'good' },
  { id: '14', group: 'FPS', name: 'LIVE FPS', desc: 'Frames per second in the game you are playing.', value: '142 FPS' },
]

/** Actions: controls you press on the console. */
const actionFeatures: Feature[] = [
  { id: '01', group: 'FPS', name: 'FPS ADVISOR', desc: 'Suggests an FPS target your system should be able to hold.', value: '144 TARGET' },
  { id: '02', group: 'FPS', name: 'FPS CAP', desc: 'Choose a frame-rate limit and apply it to the game you are playing.', value: '144 FPS' },
]

/** The nine keys on the console mockup's main screen — seven Events, two Actions.
 *  Index 0 (LIVE FPS) ignores its `value` at render time — the live figure comes
 *  from the ticking `fps` state instead. Everything else stays a fixed example. */
const consoleKeys: { label: string; value: string; kind: 'EVENT' | 'ACTION'; desc: string; tone?: Tone }[] = [
  { label: 'LIVE FPS', value: '142', kind: 'EVENT', desc: 'Frames per second in the game you are playing.' },
  { label: 'CPU USAGE', value: '54%', kind: 'EVENT', desc: 'How hard the processor is working.' },
  { label: 'GPU USAGE', value: '97%', kind: 'EVENT', desc: 'How hard the graphics card is working.' },
  { label: 'FRAME TIME', value: '7.1ms', kind: 'EVENT', desc: 'Milliseconds spent on each frame. Steadier is smoother.' },
  { label: 'RAM', value: '12.4G', kind: 'EVENT', desc: 'System memory in use, in gigabytes.' },
  { label: 'GPU TEMPERATURE', value: '68°C', kind: 'EVENT', desc: 'Current graphics card temperature.' },
  { label: 'BOTTLENECK', value: 'GPU', kind: 'EVENT', desc: 'Whether the CPU or the GPU is limiting your frame rate.', tone: 'warn' },
  { label: 'FPS ADVISOR', value: '144', kind: 'ACTION', desc: 'Suggests an FPS target your system should be able to hold.' },
]

const presets = [30, 60, 90, 120, 144, 180, 240, 360]

const faqs = [
  {
    q: 'What is RTSS Performance?',
    a: 'A plugin for Logitech Options+. It takes the performance information that MSI Afterburner and RTSS already collect and puts it on the keys of your MX Creative Console, so you can read it — and change your frame limit — without leaving the game.',
  },
  {
    q: 'What is the difference between an Event and an Action?',
    a: 'An Event shows you something: CPU usage, GPU temperature, live FPS. It updates on its own and there is nothing to press. An Action is a control you press: FPS Advisor and FPS Cap. You assign both kinds to console keys the same way.',
  },
  {
    q: 'What are RTSS and MSI Afterburner?',
    a: 'Two free Windows tools. RivaTuner Statistics Server (RTSS) measures game performance and can limit frame rates. MSI Afterburner reads your hardware — clocks, temperatures and memory. Both are required, and RTSS Performance does not replace either of them.',
  },
  {
    q: 'Do I really need both of them?',
    a: 'Yes. MSI Afterburner and RTSS both have to be installed and running for the plugin to work. RTSS is normally installed alongside MSI Afterburner, so in practice this is one download.',
  },
  {
    q: 'What is the MX Creative Console?',
    a: 'A Logitech input device with nine programmable keys, set up through Logitech Options+. RTSS Performance adds its Events and Actions to the list you can assign to those keys.',
  },
  {
    q: 'Which frame limits can I choose?',
    a: 'FPS Cap offers 30, 60, 90, 120, 144, 180, 240 and 360 FPS. Pick one on the console and the plugin applies it through RTSS to the game in the foreground.',
  },
]

/* Troubleshooting steps stay on the safe side: they describe what to check in
   RTSS, MSI Afterburner and Options+ rather than asserting plugin internals. */
const troubleshooting = [
  {
    q: 'RTSS not detected',
    a: 'Check that RivaTuner Statistics Server is installed and running — its icon should be visible in the Windows system tray. RTSS normally installs alongside MSI Afterburner, so if you only installed Afterburner it may have been skipped. If RTSS is running and still is not picked up, restart Logitech Options+ so the plugin reconnects.',
  },
  {
    q: 'FPS shows 0',
    a: 'Frame rate is only measured while a game is actually rendering, so 0 is expected on the desktop. If a game is running, check that RTSS shows a frame counter for it — if RTSS cannot measure the game, the plugin has nothing to display. Titles with strict anti-cheat sometimes block RTSS entirely.',
  },
  {
    q: 'Data not updating',
    a: 'MSI Afterburner and RTSS both need to stay open the whole time you are playing — closing either one stops the readings. Confirm both are still running, then restart Logitech Options+ to reload the plugin.',
  },
  {
    q: 'Temperature not available',
    a: 'Temperatures come from MSI Afterburner. Open it and check whether the sensor appears in its own monitoring list: if Afterburner cannot read it, the plugin cannot either. Some laptops and older hardware simply do not expose every sensor.',
  },
  {
    q: 'Creative Console not updating',
    a: 'Check that the console is connected and that Logitech Options+ recognises it. Confirm RTSS Performance is enabled in the plugin list and that the key still has an Event or Action assigned to it. Restarting Options+ reloads the plugin and clears most display problems.',
  },
]

const logoSource = '/rtss-logo.png'

const navItems = [
  { id: 'system', label: 'Overview' },
  { id: 'console', label: 'Console' },
  { id: 'actions', label: 'Features' },
  { id: 'requirements', label: 'Setup' },
  { id: 'faq', label: 'Help' },
]

/* ---------------------------------------------------------- primitives --- */

function Mark() {
  return <span className="mark" aria-hidden="true"><img src={logoSource} alt="" /></span>
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge"><b /> {children}</span>
}

function FlowLine({ label }: { label: string }) {
  return <div className="flow-line" aria-hidden="true"><span>{label}</span><i /><i /><i /><i /><i /></div>
}

/* -------------------------------------------------------------- theme --- */

type Theme = 'dark' | 'light'

function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  // The blocking script in the document head sets data-theme before paint;
  // read it back once mounted so the button label matches what is on screen.
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  }, [])

  const toggle = useCallback(() => {
    setTheme(current => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      const root = document.documentElement
      root.dataset.themeAnim = ''
      root.dataset.theme = next
      try { localStorage.setItem('rtss-theme', next) } catch { /* storage unavailable */ }
      window.setTimeout(() => { delete root.dataset.themeAnim }, 320)
      return next
    })
  }, [])

  return { theme, toggle }
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a6.9 6.9 0 0 0 11.1 11.1Z" />
        </svg>
      )}
      <span>{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
    </button>
  )
}

/* -------------------------------------------------------------- pieces --- */

function TelemetryFlow() {
  return (
    <div className="flow-visual">
      <div className="flow-node">
        <span className="node-index">01</span>
        <strong>LIVE<br />GAME</strong>
        <small>FOREGROUND APP</small>
      </div>
      <FlowLine label="FPS 142" />
      <div className="flow-node">
        <span className="node-index">02</span>
        <strong>AFTERBURNER<br />/ RTSS</strong>
        <small>BOTH REQUIRED</small>
      </div>
      <FlowLine label="GPU 97%" />
      <div className="flow-node active">
        <span className="node-index">03</span>
        <strong>RTSS<br />PERFORMANCE</strong>
        <small>PLUGIN LAYER</small>
      </div>
      <FlowLine label="68°C" />
      <div className="flow-node">
        <span className="node-index">04</span>
        <strong>MX CREATIVE<br />CONSOLE</strong>
        <small>YOUR NINE KEYS</small>
      </div>
    </div>
  )
}

type Screen = 'main' | 'cap'

function ConsolePreview({
  screen, setScreen, selected, setSelected, cap, setCap, fps,
}: {
  screen: Screen
  setScreen: (s: Screen) => void
  selected: number
  setSelected: (n: number) => void
  cap: number
  setCap: (n: number) => void
  fps: number
}) {
  const onMain = screen === 'main'
  const isLiveFpsKey = (i: number) => i === 0
  const keyValue = (i: number) => (isLiveFpsKey(i) ? String(fps) : consoleKeys[i].value)

  // Escape leaves the FPS Cap screen, matching the BACK key.
  useEffect(() => {
    if (onMain) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setScreen('main') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onMain, setScreen])

  const detail = onMain
    ? selected < consoleKeys.length
      ? {
          tag: `KEY ${String(selected + 1).padStart(2, '0')} / ${consoleKeys[selected].kind}`,
          title: consoleKeys[selected].label,
          desc: consoleKeys[selected].desc,
          value: keyValue(selected),
          note: consoleKeys[selected].kind === 'EVENT' ? 'UPDATES ON ITS OWN' : 'EXAMPLE READING',
          tone: consoleKeys[selected].tone,
          live: isLiveFpsKey(selected),
        }
      : { tag: 'KEY 09 / ACTION', title: 'FPS Cap', desc: 'Opens the frame-limit screen on the console. Press it to try the flow.', value: `${cap} FPS`, note: 'CURRENT LIMIT', tone: undefined, live: false }
    : { tag: 'SCREEN 02 / ACTION', title: 'FPS Cap', desc: 'Choose a frame-rate limit. The plugin applies it through RTSS to the game in the foreground.', value: `Selected: ${cap} FPS`, note: 'APPLIED TO FOREGROUND GAME', tone: undefined, live: false }

  return (
    <div className="device-wrap">
      <div>
        <div className="device-label">
          <Badge>INTERACTIVE PREVIEW</Badge>
          <span className="mono">MX CREATIVE CONSOLE / 3 × 3</span>
        </div>

        <div className="device">
          <div className="device-top">
            <span><Mark /> RTSS PERFORMANCE</span>
            <span className="mono">{onMain ? 'PLUGIN READY' : 'FPS CAP'}</span>
          </div>

          {/* key={screen} remounts the grid so the transition replays on every switch */}
          <div className="device-screen" key={screen}>
            {onMain ? (
              <div className="key-grid" role="group" aria-label="Console main screen, nine keys">
                {consoleKeys.map((k, i) => (
                  <button
                    type="button"
                    className={`device-key ${selected === i ? 'selected' : ''}`}
                    key={k.label}
                    aria-pressed={selected === i}
                    onClick={() => setSelected(i)}
                  >
                    <small>{String(i + 1).padStart(2, '0')}</small>
                    <strong>{k.label}</strong>
                    {isLiveFpsKey(i) ? (
                      <b key={fps} className="tick-value">{keyValue(i)}</b>
                    ) : (
                      <b className={k.tone ? `tone-${k.tone}` : undefined}>{keyValue(i)}</b>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  className={`device-key ${selected === 8 ? 'selected' : ''}`}
                  aria-label={`FPS Cap, currently ${cap} FPS. Opens the FPS limit screen.`}
                  onClick={() => { setSelected(8); setScreen('cap') }}
                >
                  <small>09</small>
                  <strong>FPS CAP</strong>
                  <b>{cap}</b>
                  <span className="key-hint" aria-hidden="true">PRESS →</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="screen-head">
                  <h4>FPS CAP</h4>
                  <p>SELECT FPS LIMIT</p>
                </div>
                <div className="key-grid" role="group" aria-label="FPS Cap screen, select a frame-rate limit">
                  <button type="button" className="device-key cap-back" onClick={() => setScreen('main')}>
                    <strong>← BACK</strong>
                    <small>MAIN SCREEN</small>
                  </button>
                  {presets.map(p => (
                    <button
                      type="button"
                      key={p}
                      className={`device-key cap-key ${cap === p ? 'selected' : ''}`}
                      aria-pressed={cap === p}
                      aria-label={`Limit to ${p} FPS`}
                      onClick={() => setCap(p)}
                    >
                      <b>{p}</b>
                      <small>FPS</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="device-foot">
            <span>{onMain ? 'OPTIONS+ / AFTERBURNER / RTSS' : 'BACK RETURNS TO THE MAIN SCREEN'}</span>
            <span className="signal"><i />SIMULATED SIGNAL</span>
          </div>
        </div>
      </div>

      <div className="device-info">
        <span className="mono">{detail.tag}</span>
        <h3>{detail.title}</h3>
        <p>{detail.desc}</p>
        <strong
          key={detail.live ? fps : detail.value}
          className={[detail.tone ? `tone-${detail.tone}` : '', detail.live ? 'tick-value' : ''].filter(Boolean).join(' ') || undefined}
        >
          {detail.value}<small>{detail.note}</small>
        </strong>
        <p className="device-hint">
          {onMain
            ? 'Press FPS CAP to open the limit screen inside the console.'
            : 'Press BACK, or the Escape key, to return.'}
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {onMain ? 'Main console screen.' : `FPS Cap screen. Selected ${cap} FPS.`}
        </p>
      </div>
    </div>
  )
}

function Metric({ name, value, unit, live }: { name: string; value: string; unit?: string; live?: boolean }) {
  return (
    <div className="metric">
      <span>{name}</span>
      <strong key={live ? value : undefined} className={live ? 'tick-value' : undefined}>
        {value}<small>{unit}</small>
      </strong>
      <i />
    </div>
  )
}

/* ---------------------------------------------------------------- page --- */

export default function Page() {
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [screen, setScreen] = useState<Screen>('main')
  const [selected, setSelected] = useState(0)
  const [cap, setCap] = useState(144)
  const [fps, setFps] = useState(144)
  const [active, setActive] = useState('')

  // A bounded random walk, not a ping-pong: each tick nudges the value by a
  // few frames and clamps it to a tight band, so it reads as a game holding
  // steady near 144 FPS rather than jumping between arbitrary numbers.
  useEffect(() => {
    const id = setInterval(() => {
      setFps(v => {
        const step = Math.round((Math.random() * 2 - 1) * 3)
        return Math.min(148, Math.max(140, v + step))
      })
    }, 1600)
    return () => clearInterval(id)
  }, [])

  // Highlight the nav item for the section currently in view.
  useEffect(() => {
    const els = navItems
      .map(n => document.getElementById(n.id))
      .filter((el): el is HTMLElement => el !== null)
    // Track membership across callbacks: a callback only reports sections whose
    // intersection *changed*, so filtering that batch alone leaves the nav stale.
    const inView = new Set<string>()
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target.id)
          else inView.delete(e.target.id)
        }
        const topMost = navItems.find(n => inView.has(n.id))
        if (topMost) setActive(topMost.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const openCapScreen = () => {
    setSelected(8)
    setScreen('cap')
    document.getElementById('console')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="site-header">
        <a className="brand" href="#top"><Mark /><span>RTSS<br /><em>PERFORMANCE</em></span></a>

        <nav id="site-nav" className={menuOpen ? 'nav-open' : ''} aria-label="Main">
          {navItems.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={active === item.id ? 'is-active' : ''}
              aria-current={active === item.id ? 'true' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a href="#download" className="nav-download" onClick={() => setMenuOpen(false)}>Download ↘</a>
        </nav>

        <div className="header-tools">
          <span className="sys-status" aria-hidden="true">SYS / ONLINE</span>
          <ThemeToggle theme={theme} onToggle={toggle} />
          <button
            type="button"
            className="menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="site-nav"
          >
            MENU <span aria-hidden="true">{menuOpen ? '×' : '↗'}</span>
          </button>
        </div>
      </header>

      <main id="main">
        {/* 1 — UNDERSTAND -------------------------------------------------- */}
        <section className="hero section-pad" id="top">
          <div className="hero-copy">
            <p className="eyebrow"><Badge>A PLUGIN FOR LOGITECH OPTIONS+</Badge></p>
            <h1>Your entire<br />performance <em>stack.</em><br /><span>At your fingertips.</span></h1>
            <p className="hero-intro">
              RTSS Performance puts live FPS, CPU, GPU, memory and frame-time readings on the keys
              of your Logitech MX Creative Console — and lets you change a game&apos;s frame limit
              without leaving it.
            </p>
            <p className="hero-note">
              It displays what MSI Afterburner and RivaTuner Statistics Server (RTSS) already
              measure. Both are free, and both must be installed and running.
            </p>
            <div className="hero-actions">
              <a className="button button-dark" href="#download">Download MSI + RTSS ↘</a>
              <a className="text-link" href="#system">See how it works ↓</a>
            </div>
            <div className="hero-meta">
              <span>LIVE TELEMETRY</span><span>FPS CONTROL</span>
              <span>RTSS INTEGRATION</span><span>MX CREATIVE CONSOLE</span>
            </div>
          </div>

          <div className="hero-system">
            <div className="system-caption">
              <Badge>DATA FLOW / SIMULATED</Badge>
              <span className="mono">01—04</span>
            </div>
            <TelemetryFlow />
          </div>
        </section>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            <span>RTSS PERFORMANCE <b>✳</b> TELEMETRY, WITH INTENT <b>✳</b> ONE PHYSICAL CONTROL SURFACE <b>✳</b> RTSS PERFORMANCE <b>✳</b></span>
            <span>RTSS PERFORMANCE <b>✳</b> TELEMETRY, WITH INTENT <b>✳</b> ONE PHYSICAL CONTROL SURFACE <b>✳</b> RTSS PERFORMANCE <b>✳</b></span>
          </div>
        </div>

        <section className="section-pad intro" id="system">
          <div className="section-kicker">( WHY THIS EXISTS )</div>
          <div className="split-copy">
            <h2>Performance data<br />is everywhere.<br /><span>Control is<br />somewhere else.</span></h2>
            <div>
              <p className="large-copy">
                Switching between a game, monitoring windows, RTSS and configuration panels
                interrupts the thing you actually sat down to do.
              </p>
              <p className="muted-copy">
                RTSS Performance brings the most useful signals and controls onto one physical
                surface. It does not replace RTSS or MSI Afterburner — it makes their data easier
                to read and act on.
              </p>
            </div>
          </div>
          <div className="problem-solution">
            <div>
              <span>THE OLD WORKFLOW</span>
              <strong>GAME + ALT-TAB + MONITORING WINDOWS + GUESSWORK</strong>
            </div>
            <div className="transition" aria-hidden="true">→</div>
            <div className="solution">
              <span>THE RTSS PERFORMANCE WORKFLOW</span>
              <strong>GAME + ONE GLANCE AT THE CONSOLE</strong>
            </div>
          </div>
        </section>

        {/* 2 — DISCOVER ---------------------------------------------------- */}
        <section className="dark-section" id="telemetry">
          <div className="section-pad">
            <div className="section-kicker light">( THE TELEMETRY STACK )</div>
            <div className="dark-heading">
              <h2>See what<br />the game <em>sees.</em></h2>
              <p>
                MSI Afterburner reads your hardware — clocks, temperatures and memory. RivaTuner
                Statistics Server (RTSS) measures what your game is doing, frame by frame.
                RTSS Performance needs both, and puts the result on your console.
              </p>
            </div>
            <div className="preview-grid">
              <div className="overlay-preview">
                <div className="preview-tag">SIMULATED PREVIEW / RTSS-STYLE OVERLAY</div>
                <div className="game-window">
                  <span className="crosshair" aria-hidden="true">+</span>
                  <div className="overlay-stats">
                    <b>FPS <strong key={fps} className="tick-value">{fps}</strong></b>
                    <b>FRAME <strong>7.1<small>ms</small></strong></b>
                    <b>GPU <strong>97%</strong></b>
                    <b>GPU TEMP <strong>68°C</strong></b>
                    <b>CPU <strong>54%</strong></b>
                    <b>1% LOW <strong>118</strong></b>
                  </div>
                </div>
              </div>
              <div className="afterburner-preview">
                <div className="preview-tag">SIMULATED PREVIEW / MSI AFTERBURNER</div>
                {['GPU CORE', 'CPU USAGE', 'GPU USAGE', 'TEMPERATURE', 'CLOCK', 'MEMORY'].map((x, i) => (
                  <div className="bar-row" key={x}>
                    <span>{x}</span>
                    <i><b style={{ width: `${[78, 54, 97, 61, 72, 48][i]}%` }} /></i>
                    <strong>{['2.7 GHz', '54%', '97%', '68°C', '1860 MHz', '7.1 GB'][i]}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3 — EXPLORE THE CONSOLE ----------------------------------------- */}
        <section className="section-pad console-section" id="console">
          <div className="section-kicker">( HARDWARE, MADE USEFUL )</div>
          <div className="split-copy">
            <h2>A control surface<br />that <span>keeps up.</span></h2>
            <p className="large-copy">
              The MX Creative Console has nine programmable keys. Assign an Event to watch a value,
              or an Action to control something. This preview is not connected to a real console —
              press a key to see what it does, then press <strong>FPS CAP</strong>.
            </p>
          </div>
          <ConsolePreview
            screen={screen} setScreen={setScreen}
            selected={selected} setSelected={setSelected}
            cap={cap} setCap={setCap}
            fps={fps}
          />
        </section>

        {/* 4 — SMART FEATURES ---------------------------------------------- */}
        <section className="section-pad fps-section" id="smart">
          <div className="section-kicker">( THE TWO ACTIONS )</div>
          <div className="split-copy">
            <h2>Everything else<br />reports. <span>These two<br />let you act.</span></h2>
            <p className="large-copy">
              Events tell you how the game is running. FPS Advisor and FPS Cap are the two keys you
              actually press — one suggests a frame rate, the other applies it.
            </p>
          </div>

          <div className="smart-grid">
            <article className="smart-card">
              <h3>FPS ADVISOR</h3>
              <p>Suggests an FPS target your system should be able to hold.</p>
              <p className="smart-detail">
                Instead of watching the frame counter and guessing, press the key and read the
                suggestion. You can then apply it yourself with FPS Cap.
              </p>
              <div className="smart-meta">
                <span>SUGGESTS</span><em>A TARGET YOU APPLY WITH FPS CAP</em>
              </div>
            </article>

            <article className="smart-card">
              <h3>FPS CAP</h3>
              <p>Sets a frame-rate limit for the game you are playing.</p>
              <p className="smart-detail">
                Press the key and choose from eight limits — 30, 60, 90, 120, 144, 180, 240 or
                360 FPS. The plugin applies your choice through RTSS to the game in the foreground.
              </p>
              <button type="button" className="button button-ghost" onClick={openCapScreen}>
                Try FPS Cap on the console ↑
              </button>
              <div className="smart-meta">
                <span>CURRENT LIMIT</span><em>{cap} FPS</em>
              </div>
            </article>
          </div>

          <div className="fps-demo">
            <div className="preset-head">
              <Badge>WHAT HAPPENS WHEN YOU CHOOSE</Badge>
              <span className="mono">FPS CAP / PROFILE 01</span>
            </div>
            <div className="preset-result">
              <span className="mono">FOREGROUND GAME</span>
              <i aria-hidden="true">↓</i>
              <span className="mono">RTSS PROFILE</span>
              <i aria-hidden="true">↓</i>
              <strong>[Framerate]<br />Limit={cap}</strong>
              <b>RTSS PROFILE UPDATED</b>
            </div>
          </div>
        </section>

        <section className="section-pad metrics-section">
          <div className="section-heading">
            <div className="section-kicker">( PERFORMANCE, IN REAL TIME )</div>
            <Badge>SIMULATED TELEMETRY</Badge>
          </div>
          <div className="metrics">
            {([['FPS', String(fps), ''], ['GPU', '97', '%'], ['CPU', '54', '%'], ['GPU TEMP', '68', '°C'], ['FRAME TIME', '7.1', 'ms'], ['1% LOW', '118', '']] as const)
              .map(x => <Metric key={x[0]} name={x[0]} value={x[1]} unit={x[2]} live={x[0] === 'FPS'} />)}
          </div>
        </section>

        {/* 5 — EVENTS AND ACTIONS ------------------------------------------ */}
        <section className="section-pad actions-section" id="actions">
          <div className="section-heading">
            <div className="section-kicker">( EVENTS &amp; ACTIONS )</div>
            <p>Every useful signal.<br />Within reach.</p>
          </div>
          <p className="section-lead">
            <strong>Events</strong> show you what is happening. <strong>Actions</strong> let you
            change it. You assign both to console keys the same way.
          </p>

          <div className="feature-block">
            <div className="feature-head">
              <h3>Events</h3>
              <Badge>UPDATE ON THEIR OWN</Badge>
            </div>
            <p className="section-lead">
              Performance information the plugin reads and displays. Put one on a key and it keeps
              showing the current value while you play — there is nothing to press.
            </p>
            <div className="action-list">
              {eventFeatures.map(f => (
                <article className="action" key={f.name}>
                  <span>{f.id}</span>
                  <span className="action-icon">{f.group}</span>
                  <div>
                    <h3>{f.name}</h3>
                    <p>{f.desc}</p>
                  </div>
                  <strong className={f.tone ? `tone-${f.tone}` : undefined}>{f.value}</strong>
                </article>
              ))}
            </div>
            <p className="status-note">
              Colour on <b>Bottleneck</b> and <b>Thermal Status</b> shows severity —{' '}
              <span className="tone-good">green</span> is healthy,{' '}
              <span className="tone-warn">amber</span> flags something worth watching.
            </p>
          </div>

          <div className="feature-block">
            <div className="feature-head">
              <h3>Actions</h3>
              <Badge>YOU PRESS THESE</Badge>
            </div>
            <p className="section-lead">
              Controls you trigger from the console. Press the key and something changes.
            </p>
            <div className="action-list">
              {actionFeatures.map(f => (
                <article className="action" key={f.name}>
                  <span>{f.id}</span>
                  <span className="action-icon">{f.group}</span>
                  <div>
                    <h3>{f.name}</h3>
                    <p>{f.desc}</p>
                  </div>
                  <strong>{f.value}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad usecases">
          <div className="section-kicker">( USE CASES )</div>
          <div className="usecase-grid">
            {['Gaming', 'FPS cap control', 'Frame-time analysis', 'Thermal monitoring', 'Bottleneck detection', 'Performance tuning', 'Desktop / laptop monitoring', 'Streaming / creation'].map((x, i) => (
              <article key={x}>
                <span>0{i + 1}</span>
                <h3>{x}</h3>
                <p>{[
                  'Watch FPS, frame time, GPU load and temperatures without leaving the game.',
                  'Apply a common frame limit to the game currently in the foreground.',
                  'Spot uneven frame pacing and the low-percentile dips you actually feel.',
                  'Keep an eye on CPU and GPU temperatures while playing.',
                  'See whether the CPU or the GPU is holding your frame rate back.',
                  'Read live telemetry while you adjust settings or refresh targets.',
                  'Use the console as a compact hardware monitor on any PC.',
                  'Keep performance visible while your screen is full of other apps.',
                ][i]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dark-section evolution">
          <div className="section-pad">
            <div className="section-kicker light">( FROM DATA TO CONTROL )</div>
            <h2>Signals in.<br /><em>Decisions out.</em></h2>
            <div className="evolution-flow">
              {['MSI Afterburner telemetry', 'RTSS shared memory', 'Plugin services', 'Performance analysis', 'Live console rendering', 'You press a key', 'RTSS profile updated'].map((x, i) => (
                <div key={x}>
                  <span>0{i + 1}</span>
                  <strong>{x}</strong>
                  {i < 6 && <i aria-hidden="true">↓</i>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6 — INSTALL ------------------------------------------------------ */}
        <section className="section-pad requirements" id="requirements">
          <div className="section-kicker">( SETUP )</div>
          <div className="split-copy">
            <h2>Small footprint.<br /><span>Clear prerequisites.</span></h2>
            <div className="req-table">
              {[
                ['WINDOWS', '10 / 11'],
                ['MSI AFTERBURNER', 'Required'],
                ['RTSS', 'Required'],
                ['LOGITECH OPTIONS+', 'Required'],
                ['MX CREATIVE CONSOLE', 'Required'],
              ].map(x => (
                <div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>
              ))}
            </div>
          </div>

          <ol className="steps">
            <li>
              <h3>INSTALL AFTERBURNER + RTSS</h3>
              <p>Both are required. RTSS is normally included with the MSI Afterburner installer, so this is usually one download.</p>
            </li>
            <li>
              <h3>START BOTH APPS</h3>
              <p>MSI Afterburner and RTSS must be running before the plugin has anything to read. Leave them open while you play.</p>
            </li>
            <li>
              <h3>INSTALL THE PLUGIN</h3>
              <p>Open the .lplug4 package with Logitech Options+ to add RTSS Performance to your plugin list.</p>
            </li>
            <li>
              <h3>OPEN LOGITECH OPTIONS+</h3>
              <p>Connect your MX Creative Console and open its key settings in Options+.</p>
            </li>
            <li>
              <h3>ASSIGN EVENTS AND ACTIONS</h3>
              <p>Put the Events you want to watch and the Actions you want to press onto the nine keys.</p>
            </li>
            <li>
              <h3>START GAMING</h3>
              <p>Your Events update as you play. Press FPS Cap whenever you want to change the frame limit.</p>
            </li>
          </ol>

          <p className="muted-copy">
            MSI Afterburner and RTSS are both required, and both need to be running. RTSS Performance
            displays their data and applies frame limits through RTSS; it does not replace either
            application.
          </p>
        </section>

        <section className="section-pad faq-section" id="faq">
          <div className="section-heading">
            <div className="section-kicker">( QUESTIONS &amp; TROUBLESHOOTING )</div>
            <Badge>HELP</Badge>
          </div>

          {([
            { title: 'Common questions', tag: 'FAQ', items: faqs },
            { title: 'Troubleshooting', tag: 'IF SOMETHING LOOKS WRONG', items: troubleshooting },
          ] as const).map(group => (
            <div className="faq-group" key={group.title}>
              <div className="faq-group-head">
                <h3>{group.title}</h3>
                <Badge>{group.tag}</Badge>
              </div>
              <div className="faq-list">
                {group.items.map(item => (
                  <details className="faq-item" key={item.q}>
                    <summary>{item.q}</summary>
                    <div className="faq-answer"><p>{item.a}</p></div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="download section-pad" id="download">
          <Badge>REQUIRED PREREQUISITES</Badge>
          <h2>Make every frame<br /><em>count.</em></h2>
          <div className="download-grid">
            <div className="download-card">
              <h3>MSI AFTERBURNER</h3>
              <span className="download-prereq">Required prerequisite</span>
              <a
                className="button button-dark"
                href="https://www.msi.com/Landing/afterburner/graphics-cards"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download for Windows ↘
              </a>
            </div>
            <div className="download-card">
              <h3>RIVATUNER STATISTICS SERVER (RTSS)</h3>
              <span className="download-prereq">Required prerequisite</span>
              <a
                className="button button-dark"
                href="https://www.guru3d.com/files-details/rtss-rivatuner-statistics-server-download.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download for Windows ↘
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer section-pad">
        <a className="brand" href="#top"><Mark /><span>RTSS<br /><em>PERFORMANCE</em></span></a>
        <p>Real-time PC performance control.</p>
        <div>
          <span>© 2026 RTSS Performance</span>
          <a href="#requirements">Setup</a>
          <a href="#faq">Help</a>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </>
  )
}
