import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { departures } from '../content/departures';
import { deriveDepartures, MONTH_NAMES, type DerivedDeparture } from '../lib/derive';

const COL_WIDTHS = { dest: 16, flight: 7, gate: 4, status: 9, depart: 11 } as const;
const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·◇○✦—:/. ';

const pad2 = (n: number) => String(n).padStart(2, '0');
const rightPad = (text: string, width: number) =>
  String(text).padStart(width, ' ').slice(-width);

type FlipOptions = { stagger?: number; cycles?: number; cycleMs?: number };

// Imperative DOM mutation — the mockup's flip routine, ported verbatim.
// Walks the .flap children of flapRow, shuffles each through random
// FLAP_CHARS for a few cycles, then settles on the target character.
function flipTo(
  flapRow: HTMLSpanElement,
  newText: string,
  onSettle: () => void,
  options: FlipOptions = {},
) {
  const flaps = Array.from(flapRow.querySelectorAll<HTMLSpanElement>('.flap'));
  const padded = newText.padEnd(flaps.length, ' ').slice(0, flaps.length);
  const stagger = options.stagger ?? 35;
  const cycles = options.cycles ?? 6;
  const cycleMs = options.cycleMs ?? 55;

  flaps.forEach((flap, i) => {
    const target = padded[i];
    const current = (flap.textContent ?? '').replace(/ /g, ' ').trim() || ' ';
    if (target === current) return;

    setTimeout(() => {
      let n = 0;
      const tick = () => {
        flap.classList.remove('flipping');
        void flap.offsetWidth; // force reflow so the CSS animation restarts
        flap.classList.add('flipping');
        if (n < cycles) {
          flap.textContent = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
          n++;
          setTimeout(tick, cycleMs);
        } else {
          flap.textContent = target === ' ' ? ' ' : target;
          flap.classList.toggle('space', target === ' ');
          onSettle();
        }
      };
      tick();
    }, i * stagger);
  });
}

// Three layered components per clack: body thock (low triangle), card slap
// (high bandpassed noise), click transient (short mid burst).
function playClack(audioCtx: AudioContext, volume = 0.08) {
  const now = audioCtx.currentTime;
  const variance = 0.85 + Math.random() * 0.3;

  const thock = audioCtx.createOscillator();
  thock.type = 'triangle';
  thock.frequency.setValueAtTime(110 + Math.random() * 30, now);
  thock.frequency.exponentialRampToValueAtTime(70, now + 0.018);
  const thockGain = audioCtx.createGain();
  thockGain.gain.setValueAtTime(0, now);
  thockGain.gain.linearRampToValueAtTime(volume * 0.6 * variance, now + 0.001);
  thockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
  thock.connect(thockGain).connect(audioCtx.destination);
  thock.start(now);
  thock.stop(now + 0.03);

  const slapBuf = audioCtx.createBuffer(1, 180, audioCtx.sampleRate);
  const slapData = slapBuf.getChannelData(0);
  for (let i = 0; i < slapData.length; i++) {
    slapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 22);
  }
  const slap = audioCtx.createBufferSource();
  slap.buffer = slapBuf;
  const slapFilter = audioCtx.createBiquadFilter();
  slapFilter.type = 'bandpass';
  slapFilter.frequency.value = 2800 + Math.random() * 1200;
  slapFilter.Q.value = 6;
  const slapGain = audioCtx.createGain();
  slapGain.gain.setValueAtTime(volume * 0.45 * variance, now + 0.002);
  slapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
  slap.connect(slapFilter).connect(slapGain).connect(audioCtx.destination);
  slap.start(now + 0.002);
  slap.stop(now + 0.025);

  const clickBuf = audioCtx.createBuffer(1, 90, audioCtx.sampleRate);
  const clickData = clickBuf.getChannelData(0);
  for (let i = 0; i < clickData.length; i++) {
    clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 12);
  }
  const click = audioCtx.createBufferSource();
  click.buffer = clickBuf;
  const clickFilter = audioCtx.createBiquadFilter();
  clickFilter.type = 'bandpass';
  clickFilter.frequency.value = 1400 + Math.random() * 400;
  clickFilter.Q.value = 3;
  const clickGain = audioCtx.createGain();
  clickGain.gain.setValueAtTime(volume * 0.55 * variance, now);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);
  click.connect(clickFilter).connect(clickGain).connect(audioCtx.destination);
  click.start(now);
  click.stop(now + 0.015);
}

// Memoized: ch never changes as a prop (imperative flipTo mutates DOM
// directly), so React skips re-rendering these 500+ nodes every clock tick.
const Flap = memo(function Flap({ ch }: { ch: string }) {
  const isSpace = ch === ' ' || ch === ' ';
  return (
    <span className={'flap' + (isSpace ? ' space' : '')}>
      {isSpace ? ' ' : ch}
    </span>
  );
});

type CellKey = 'dest' | 'flight' | 'gate' | 'status' | 'depart';
type RowRefs = Record<CellKey, HTMLSpanElement | null>;

function FlapRow({
  width,
  cellRef,
}: {
  width: number;
  cellRef: (el: HTMLSpanElement | null) => void;
}) {
  return (
    <span className="flap-row" ref={cellRef}>
      {Array.from({ length: width }).map((_, i) => (
        <Flap key={i} ch=" " />
      ))}
    </span>
  );
}

function Row({
  row,
  registerRef,
  onOpen,
}: {
  row: DerivedDeparture;
  registerRef: (key: CellKey, el: HTMLSpanElement | null) => void;
  onOpen: () => void;
}) {
  const clickable = Boolean(row.note?.trim());
  return (
    <div
      className={`row ${row.kind}${clickable ? ' has-note' : ''}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onOpen : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
    >
      <div className="cell-sym">{row.sym}</div>
      <div className="cell cell-dest">
        <FlapRow width={COL_WIDTHS.dest} cellRef={(el) => registerRef('dest', el)} />
      </div>
      <div className="cell cell-num">
        <FlapRow width={COL_WIDTHS.flight} cellRef={(el) => registerRef('flight', el)} />
      </div>
      <div className="cell cell-gate">
        <FlapRow width={COL_WIDTHS.gate} cellRef={(el) => registerRef('gate', el)} />
      </div>
      <div className="cell cell-status">
        <FlapRow width={COL_WIDTHS.status} cellRef={(el) => registerRef('status', el)} />
      </div>
      <div className="cell cell-depart">
        <FlapRow width={COL_WIDTHS.depart} cellRef={(el) => registerRef('depart', el)} />
      </div>
    </div>
  );
}

export default function Board() {
  const [clock, setClock] = useState<Date>(() => new Date());
  const [soundOn, setSoundOn] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState<number | null>(null);
  const flipLockRef = useRef(false);

  const derived = deriveDepartures(departures, clock);
  const derivedRef = useRef<DerivedDeparture[]>(derived);
  derivedRef.current = derived;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const rowRefsRef = useRef<RowRefs[]>(
    departures.map(() => ({
      dest: null, flight: null, gate: null, status: null, depart: null,
    })),
  );

  const clack = useCallback((vol = 0.12) => {
    if (!soundOnRef.current || !audioCtxRef.current) return;
    playClack(audioCtxRef.current, vol);
  }, []);

  const ensureAudio = useCallback(() => {
    const wasUninitialized = !audioCtxRef.current;
    if (!audioCtxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) audioCtxRef.current = new Ctor();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    // First successful init — fire a single confirming clack so the user
    // gets immediate feedback that audio is now armed. Otherwise the gap
    // between the silent cascade and the next 25s random flip feels broken.
    if (wasUninitialized && audioCtxRef.current && soundOnRef.current) {
      playClack(audioCtxRef.current, 0.14);
    }
  }, []);

  const flipRow = useCallback(
    (rowIdx: number, options?: FlipOptions) => {
      const row = derivedRef.current[rowIdx];
      const refs = rowRefsRef.current[rowIdx];
      if (refs.dest) flipTo(refs.dest, row.dest.padEnd(COL_WIDTHS.dest), clack, options);
      if (refs.flight) flipTo(refs.flight, row.flight.padEnd(COL_WIDTHS.flight), clack, options);
      if (refs.gate) flipTo(refs.gate, row.gate.padEnd(COL_WIDTHS.gate), clack, options);
      if (refs.status) flipTo(refs.status, row.status.padEnd(COL_WIDTHS.status), clack, options);
      if (refs.depart) {
        flipTo(refs.depart, rightPad(row.departText, COL_WIDTHS.depart), clack, options);
      }
    },
    [clack],
  );

  // Flip-then-reveal: replay the row's split-flap animation, then open the
  // card once the flaps settle (~950ms covers 6 cycles + stagger across the
  // widest cell). The lock ignores repeat clicks mid-flip.
  const openTrip = useCallback(
    (i: number) => {
      if (!derivedRef.current[i]?.note?.trim() || flipLockRef.current) return;
      flipLockRef.current = true;
      ensureAudio();
      flipRow(i);
      window.setTimeout(() => {
        flipLockRef.current = false;
        setTripOpen(i);
      }, 950);
    },
    [ensureAudio, flipRow],
  );

  // Initial cascade. No started-ref guard: StrictMode's double-invoke
  // is handled by clearTimeout in cleanup — the first-run cascade is
  // canceled before the 250ms kickoff fires, then the second run goes
  // through cleanly.
  useEffect(() => {
    const timeouts: number[] = [];
    const kickoff = window.setTimeout(() => {
      departures.forEach((_, i) => {
        timeouts.push(window.setTimeout(() => flipRow(i), i * 220));
      });
    }, 250);
    timeouts.push(kickoff);
    return () => timeouts.forEach(clearTimeout);
  }, [flipRow]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const readCell = (el: HTMLSpanElement) =>
      Array.from(el.querySelectorAll<HTMLSpanElement>('.flap'))
        .map((f) => (f.textContent === ' ' ? ' ' : f.textContent ?? ''))
        .join('');
    const id = window.setInterval(() => {
      const opts: FlipOptions = { cycles: 3, cycleMs: 50, stagger: 20 };
      derivedRef.current.forEach((row, i) => {
        const refs = rowRefsRef.current[i];
        if (refs.status && readCell(refs.status).trim() !== row.status) {
          flipTo(refs.status, row.status.padEnd(COL_WIDTHS.status), clack, opts);
        }
        if (refs.depart) {
          const newText = rightPad(row.departText, COL_WIDTHS.depart);
          if (readCell(refs.depart).trim() !== newText.trim()) {
            flipTo(refs.depart, newText, clack, opts);
          }
        }
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [clack]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const candidates = derivedRef.current
        .map((row, i) => ({ row, i }))
        .filter(({ row }) => row.kind !== 'arrived' && row.kind !== 'tbd')
        .map(({ i }) => i);
      if (candidates.length === 0) return;
      flipRow(candidates[Math.floor(Math.random() * candidates.length)]);
    }, 25_000);
    return () => clearInterval(id);
  }, [flipRow]);

  // iOS Safari requires AudioContext construction inside a user-gesture
  // stack. Attaching to window catches any tap anywhere on the page.
  useEffect(() => {
    const onClick = () => ensureAudio();
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [ensureAudio]);

  useEffect(() => {
    if (!infoOpen && tripOpen === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInfoOpen(false);
        setTripOpen(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [infoOpen, tripOpen]);

  const clockLabel = `${pad2(clock.getHours())}:${pad2(clock.getMinutes())}:${pad2(clock.getSeconds())}`;
  const dateLabel = `${pad2(clock.getDate())} · ${MONTH_NAMES[clock.getMonth()]} · ${clock.getFullYear()}`;

  // Hero readout: `derived` is recomputed from the 1s clock tick, so the
  // Doto countdown stays live and the panel re-binds automatically when a
  // different trip becomes the boarding one.
  const boardingRow = derived.find((r) => r.kind === 'boarding');

  return (
    <>
      <div className="board">
        <header className="header">
          <div className="title-block">
            <div className="eyebrow">A · G · TERMINAL</div>
            <div className="title">DEPARTURES</div>
            <div className="sub">the days we're in the same place.</div>
          </div>
          <div className="clock-block">
            <div className="clock">{clockLabel}</div>
            <div className="date">{dateLabel}</div>
            <div className="location">KUL · DPS · UTC +08</div>
          </div>
        </header>

        {boardingRow && (
          <div className="boarding-panel">
            <div>
              <div className="label">NEXT BOARDING</div>
              <div className="destination">{boardingRow.dest}</div>
              <div className="meta">
                {boardingRow.flight} · GATE {boardingRow.gate} · {boardingRow.status}
              </div>
            </div>
            <div>
              <div className="countdown">{boardingRow.departText}</div>
              <div className="countdown-caption">until departure</div>
            </div>
          </div>
        )}

        <div className="col-headers">
          <div />
          <div>destination</div>
          <div className="num">flight</div>
          <div className="gate">gate</div>
          <div>status</div>
          <div className="depart">departing</div>
        </div>

        <div>
          {derived.map((row, i) => (
            <Row
              key={i}
              row={row}
              onOpen={() => openTrip(i)}
              registerRef={(key, el) => {
                rowRefsRef.current[i][key] = el;
              }}
            />
          ))}
        </div>
      </div>

      <footer className="footer">
        <button
          className={'btn' + (soundOn ? '' : ' muted')}
          title="sound on/off"
          onClick={() => {
            setSoundOn((v) => !v);
            ensureAudio();
          }}
        >
          {soundOn ? '♪' : '♪̸'}
        </button>
        <div className="footer-msg">
          we live in different cities. these are the days it doesn't matter.
        </div>
        <button className="btn" title="info" onClick={() => setInfoOpen(true)}>
          i
        </button>
      </footer>

      {infoOpen && (
        <div
          className="info-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInfoOpen(false);
          }}
        >
          <div className="info-card">
            <h2>departures</h2>
            <div className="sub">a reading guide</div>
            <p>
              this board is not for going anywhere alone. every destination on it is a meeting.
              arrivals are the times you have already been in the same room. boardings are the next time you will be.
            </p>
            <p>the countdown is honest. the wishlist is not.</p>
            <div className="legend">
              <div>
                <strong style={{ color: 'var(--color-graphite)' }}>ARRIVED</strong> · we made it. these are the past.
              </div>
              <div>
                <strong style={{ color: 'var(--color-urgency)' }}>BOARDING</strong> · the closest one. soon.
              </div>
              <div>
                <strong style={{ color: 'var(--color-white)' }}>ON TIME</strong> · confirmed, with a date.
              </div>
              <div>
                <strong style={{ color: 'var(--color-steel)' }}>TBD</strong> · the wishlist. someday.
              </div>
            </div>
            <button className="close" onClick={() => setInfoOpen(false)}>
              close
            </button>
          </div>
        </div>
      )}

      {tripOpen !== null && derived[tripOpen] && (
        <div
          className="info-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTripOpen(null);
          }}
        >
          <div className="info-card">
            <h2>{derived[tripOpen].dest.toLowerCase()}</h2>
            <div className="sub">
              {derived[tripOpen].flight} · GATE {derived[tripOpen].gate} ·{' '}
              {derived[tripOpen].status} · {derived[tripOpen].departText}
            </div>
            <p style={{ whiteSpace: 'pre-line' }}>{derived[tripOpen].note}</p>
            <button className="close" onClick={() => setTripOpen(null)}>
              close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
