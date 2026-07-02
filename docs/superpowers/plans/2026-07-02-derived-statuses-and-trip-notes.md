# Derived Statuses, Trip Notes, Warm Background & Ambience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Departure statuses derive from system time (passed trips auto-become ARRIVED, earliest future trip auto-promotes to BOARDING), two new trips are added, noted rows open a flip-then-reveal trip card, the wall background warms to ivory, and a synthesized airport ambience plays behind the clacks.

**Architecture:** A pure `deriveDepartures(rows, now)` function in `src/lib/derive.ts` computes kind/sym/status/depart-text from the data + clock; `Board.tsx` recomputes it on its existing 1-second clock tick and lets the existing 60-second interval flip any cells whose text changed. Notes and ambience are additive: a `note` field drives a clickable row + overlay card reusing the info-card styles, and `src/lib/ambience.ts` synthesizes room tone + PA chimes on the existing AudioContext.

**Tech Stack:** React 19, TypeScript ~6.0, Vite 8, Vitest (added in Task 1), WebAudio API. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-07-02-derived-statuses-and-trip-notes-design.md`

## Global Constraints

- No audio file assets — all sound is synthesized with WebAudio.
- No backend, no localStorage — notes are authored in `src/content/departures.ts`.
- Do not change the flip animation, clack synthesis, cascade timing, or layout.
- Departure times use ISO 8601 with `+08:00` offset.
- `NOW` countdown branch is kept as a guard even though passed trips derive to arrived.
- Empty/whitespace `note` is treated as absent (row stays inert).
- Verify with `npm run test`, `npm run build`, and `npm run lint` before each commit.

---

### Task 1: Vitest setup + pure derivation module

**Files:**
- Modify: `package.json` (add vitest devDependency + `test` script)
- Create: `src/lib/derive.ts`
- Test: `src/lib/derive.test.ts`

**Interfaces:**
- Consumes: `Departure` type from `src/content/departures.ts` — **note:** at this task's start the type still has `status/kind/sym` fields; the new type ships in Task 2. To keep this task independent, `derive.ts` defines its own minimal input type (structurally compatible with both old and new data):

```ts
export type DepartureInput = {
  dest: string;
  flight: string;
  gate: string;
  depart?: string; // ISO 8601 with offset; absent = wishlist/TBD
  note?: string;
};
```

- Produces (Tasks 2–3 rely on these exact names):

```ts
export type DepartureKind = 'arrived' | 'boarding' | 'ontime' | 'tbd';
export type DerivedDeparture = DepartureInput & {
  kind: DepartureKind;
  sym: string;        // '○' | '✦' | '◇' | '·'
  status: string;     // 'ARRIVED' | 'BOARDING' | 'ON TIME' | 'TBD'
  departText: string; // 'MAY · 2026' | '14 DAYS' | '2D 05H' | 'HH:MM:00' | '——'
};
export const MONTH_NAMES: string[]; // ['JAN', ... 'DEC']
export function deriveDepartures(rows: DepartureInput[], now: Date): DerivedDeparture[];
```

- [ ] **Step 1: Install vitest and add the test script**

```bash
npm install -D vitest
```

In `package.json` scripts, add:

```json
"test": "vitest run"
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/derive.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveDepartures, type DepartureInput } from './derive';

const NOW = new Date('2026-07-02T12:00:00+08:00');

const row = (over: Partial<DepartureInput>): DepartureInput => ({
  dest: 'X', flight: 'XX 1', gate: 'A1', ...over,
});

describe('deriveDepartures', () => {
  it('derives TBD for rows without a depart date', () => {
    const [d] = deriveDepartures([row({})], NOW);
    expect(d).toMatchObject({ kind: 'tbd', sym: '·', status: 'TBD', departText: '——' });
  });

  it('derives TBD for an unparseable depart string', () => {
    const [d] = deriveDepartures([row({ depart: 'not-a-date' })], NOW);
    expect(d.kind).toBe('tbd');
  });

  it('derives ARRIVED with a month·year label for passed dates', () => {
    const [d] = deriveDepartures([row({ depart: '2026-05-24T09:15:00+08:00' })], NOW);
    expect(d).toMatchObject({ kind: 'arrived', sym: '○', status: 'ARRIVED', departText: 'MAY · 2026' });
  });

  it('treats a departure at exactly now as arrived', () => {
    const [d] = deriveDepartures([row({ depart: '2026-07-02T12:00:00+08:00' })], NOW);
    expect(d.kind).toBe('arrived');
  });

  it('promotes only the earliest future departure to BOARDING', () => {
    const rows = [
      row({ dest: 'BANGKOK', depart: '2026-12-01T07:30:00+08:00' }),
      row({ dest: 'DENPASAR', depart: '2026-07-16T09:00:00+08:00' }),
      row({ dest: 'JAKARTA', depart: '2026-07-23T09:00:00+08:00' }),
    ];
    const derived = deriveDepartures(rows, NOW);
    expect(derived.map((d) => d.kind)).toEqual(['ontime', 'boarding', 'ontime']);
    expect(derived[1]).toMatchObject({ sym: '✦', status: 'BOARDING' });
    expect(derived[0]).toMatchObject({ sym: '◇', status: 'ON TIME' });
  });

  it('formats countdowns: whole days ≥ 7', () => {
    const [d] = deriveDepartures([row({ depart: '2026-07-16T09:00:00+08:00' })], NOW);
    expect(d.departText).toBe('13 DAYS');
  });

  it('formats countdowns: days and hours under a week', () => {
    const [d] = deriveDepartures([row({ depart: '2026-07-04T15:00:00+08:00' })], NOW);
    expect(d.departText).toBe('2D 03H'); // 2 days 3 hours ahead
  });

  it('formats countdowns: hh:mm:00 inside the final day', () => {
    const [d] = deriveDepartures([row({ depart: '2026-07-02T18:30:00+08:00' })], NOW);
    expect(d.departText).toBe('06:30:00');
  });

  it('treats a whitespace-only note as absent by leaving it untouched on the derived row', () => {
    const [d] = deriveDepartures([row({ note: '   ' })], NOW);
    expect(d.note).toBe('   '); // derivation passes fields through; UI decides clickability
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module './derive'` (or equivalent).

- [ ] **Step 4: Implement `src/lib/derive.ts`**

```ts
// Pure time-derivation for the departures board. Everything the board
// displays about a trip — kind, symbol, status word, depart-cell text —
// is a function of (depart date, now). Nothing time-dependent is stored.

export type DepartureInput = {
  dest: string;
  flight: string;
  gate: string;
  depart?: string; // ISO 8601 with offset; absent = wishlist/TBD
  note?: string;
};

export type DepartureKind = 'arrived' | 'boarding' | 'ontime' | 'tbd';

export type DerivedDeparture = DepartureInput & {
  kind: DepartureKind;
  sym: string;
  status: string;
  departText: string;
};

export const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

function countdownText(targetMs: number, nowMs: number): string {
  const diff = targetMs - nowMs;
  if (diff <= 0) return 'NOW'; // unreachable guard: passed trips derive to arrived
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (days >= 7) return `${days} DAYS`;
  if (days >= 1) return `${days}D ${pad2(hours)}H`;
  return `${pad2(hours)}:${pad2(mins)}:00`;
}

export function deriveDepartures(
  rows: DepartureInput[],
  now: Date,
): DerivedDeparture[] {
  const nowMs = now.getTime();

  const times = rows.map((row) =>
    row.depart ? new Date(row.depart).getTime() : NaN,
  );

  let boardingIdx = -1;
  let earliest = Infinity;
  times.forEach((t, i) => {
    if (!Number.isNaN(t) && t > nowMs && t < earliest) {
      earliest = t;
      boardingIdx = i;
    }
  });

  return rows.map((row, i) => {
    const t = times[i];
    if (Number.isNaN(t)) {
      return { ...row, kind: 'tbd' as const, sym: '·', status: 'TBD', departText: '——' };
    }
    if (t <= nowMs) {
      const d = new Date(t);
      return {
        ...row,
        kind: 'arrived' as const,
        sym: '○',
        status: 'ARRIVED',
        departText: `${MONTH_NAMES[d.getMonth()]} · ${d.getFullYear()}`,
      };
    }
    if (i === boardingIdx) {
      return {
        ...row,
        kind: 'boarding' as const,
        sym: '✦',
        status: 'BOARDING',
        departText: countdownText(t, nowMs),
      };
    }
    return {
      ...row,
      kind: 'ontime' as const,
      sym: '◇',
      status: 'ON TIME',
      departText: countdownText(t, nowMs),
    };
  });
}
```

**Timezone caution for the month label:** `new Date(t)` + `getMonth()` uses the *viewer's* local timezone. All authored dates use midnight/morning `+08:00` and the audience is in +07/+08, so the month label is stable for them. Do not "fix" this with UTC getters — `2024-12-01T00:00:00+08:00` is `2024-11-30T16:00Z`, and UTC getters would show NOV.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test`
Expected: PASS — 9 tests.

- [ ] **Step 6: Verify build and lint stay clean**

Run: `npm run build && npm run lint`
Expected: both succeed (derive.ts is not imported anywhere yet).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/derive.ts src/lib/derive.test.ts
git commit -m "feat: add time-derived departure status module with vitest"
```

---

### Task 2: New data model, new trips, Board consumes derived rows

**Files:**
- Modify: `src/content/departures.ts` (entire file — new shape, new trips)
- Modify: `src/components/Board.tsx` (imports, remove local formatter, derived rows, intervals, hero panel, Row props)

**Interfaces:**
- Consumes: `deriveDepartures`, `MONTH_NAMES`, `DerivedDeparture` from `src/lib/derive.ts` (Task 1).
- Produces: `departures: Departure[]` where `Departure` is re-exported as the data-side alias of `DepartureInput`; `Board.tsx` holds `derivedRef` (a ref to the current `DerivedDeparture[]`) that Task 3 reuses.

- [ ] **Step 1: Replace `src/content/departures.ts`**

```ts
import type { DepartureInput } from '../lib/derive';

// Data is intentionally minimal: status/kind/symbol/depart-text are all
// derived from `depart` + the clock in src/lib/derive.ts. A trip with a
// `note` becomes clickable and opens the trip card.
export type Departure = DepartureInput;

export const departures: Departure[] = [
  { dest: 'DENPASAR',     flight: 'AK 384', gate: 'B12', depart: '2024-12-01T00:00:00+08:00' },
  { dest: 'DENPASAR',     flight: 'TR 158', gate: 'B07', depart: '2026-01-01T00:00:00+08:00' },
  { dest: 'HONG KONG',    flight: 'CX 716', gate: 'C24', depart: '2026-03-01T00:00:00+08:00' },
  { dest: 'KUALA LUMPUR', flight: 'AK 707', gate: 'A11', depart: '2026-04-01T00:00:00+08:00' },
  { dest: 'DENPASAR',     flight: 'OD 177', gate: 'B12', depart: '2026-05-24T09:15:00+08:00' },
  { dest: 'DENPASAR',     flight: 'GA 821', gate: '——',  depart: '2026-07-16T09:00:00+08:00' },
  { dest: 'JAKARTA',      flight: 'GA 407', gate: '——',  depart: '2026-07-23T09:00:00+08:00' },
  { dest: 'BANGKOK',      flight: 'MH 774', gate: 'A03', depart: '2026-12-01T07:30:00+08:00' },
  { dest: 'DENPASAR',     flight: '——',     gate: '——' },
  { dest: 'COLOMBO',      flight: '——',     gate: '——' },
  { dest: 'MILAN',        flight: '——',     gate: '——' },
];
```

(GA 821 / GA 407 times are 09:00 placeholders until real times are known; gates `——` until assigned.)

- [ ] **Step 2: Update `src/components/Board.tsx` imports and remove the local formatter**

Replace the import of departures and the `MONTH_NAMES` const:

```ts
import { departures } from '../content/departures';
import { deriveDepartures, MONTH_NAMES, type DerivedDeparture } from '../lib/derive';
```

Delete the local `MONTH_NAMES` array and the entire `formatDeparture` function (its logic now lives in `derive.ts` as `countdownText` + the arrived label). Keep `pad2` and `rightPad`.

- [ ] **Step 3: Derive rows from the clock inside `Board()`**

Immediately after the `clock` state declaration:

```ts
const derived = deriveDepartures(departures, clock);
const derivedRef = useRef<DerivedDeparture[]>(derived);
derivedRef.current = derived;
```

The ref exists so the stable callbacks/intervals below can read fresh derived rows without re-creating themselves every second (their deps must NOT include `derived`).

- [ ] **Step 4: Point `flipRow` and the intervals at derived rows**

`flipRow` reads from `derivedRef` and uses `departText`:

```ts
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
```

The 60-second interval now checks **status and depart** cells for every row (this is the transition trigger — when a departure crosses "now", the passed row flips to ARRIVED and the next one flips to BOARDING within a minute):

```ts
useEffect(() => {
  const readCell = (el: HTMLSpanElement) =>
    Array.from(el.querySelectorAll<HTMLSpanElement>('.flap'))
      .map((f) => (f.textContent === ' ' ? ' ' : f.textContent ?? ''))
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
```

The 25-second random-flip interval filters on derived kinds:

```ts
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
```

- [ ] **Step 5: Bind the hero panel and rows to derived data**

Replace the `boardingRow` / `boardingCountdown` block:

```ts
// Hero readout: `derived` is recomputed from the 1s clock tick, so the
// Doto countdown stays live and the panel re-binds automatically when a
// different trip becomes the boarding one.
const boardingRow = derived.find((r) => r.kind === 'boarding');
```

In the JSX, the panel condition becomes `{boardingRow && (` and the countdown renders `{boardingRow.departText}`. The rows map over `derived`:

```tsx
{derived.map((row, i) => (
  <Row
    key={i}
    row={row}
    registerRef={(key, el) => {
      rowRefsRef.current[i][key] = el;
    }}
  />
))}
```

Update `Row`'s prop type from `Departure` to `DerivedDeparture` (className `row ${row.kind}` and `{row.sym}` keep working — they're derived now).

- [ ] **Step 6: Verify tests, build, lint**

Run: `npm run test && npm run build && npm run lint`
Expected: all pass. If `tsc` flags the removed `Departure` import in `Board.tsx`, remove the stale import.

- [ ] **Step 7: Manual verification**

Run: `npm run dev` and open the printed URL. Confirm:
- OD 177 row shows `ARRIVED / MAY · 2026` (dimmed arrived styling, `○`)
- GA 821 DENPASAR is the red BOARDING row (`✦`) and owns the NEXT BOARDING hero panel with a whole-days countdown (`13 DAYS` if verifying on 2026-07-02 before 09:00 it is `14 DAYS`; drops below 7 days on Jul 9 and switches to the `ND HHH` format)
- GA 407 JAKARTA and MH 774 BANGKOK show `ON TIME` (`◇`)
- TBD rows unchanged

- [ ] **Step 8: Commit**

```bash
git add src/content/departures.ts src/components/Board.tsx
git commit -m "feat: derive statuses from system time; add GA 821 and GA 407 trips"
```

---

### Task 3: Trip notes — clickable rows, flip-then-reveal, trip card

**Files:**
- Modify: `src/components/Board.tsx` (Row clickability, openTrip handler, trip card overlay, Esc handling)
- Modify: `src/styles/globals.css` (hover/focus cues for noted rows)

**Interfaces:**
- Consumes: `derivedRef` and `flipRow` from Task 2; `note` field from the data model.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add trip-card state and the flip-then-reveal handler in `Board()`**

Next to the existing `infoOpen` state:

```ts
const [tripOpen, setTripOpen] = useState<number | null>(null);
const flipLockRef = useRef(false);

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
```

- [ ] **Step 2: Make noted rows interactive in `Row`**

Change `Row`'s signature and root element:

```tsx
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
```

(rest of the row body unchanged). In `Board()`'s JSX pass the handler:

```tsx
<Row
  key={i}
  row={row}
  onOpen={() => openTrip(i)}
  registerRef={(key, el) => {
    rowRefsRef.current[i][key] = el;
  }}
/>
```

- [ ] **Step 3: Render the trip card overlay**

After the existing info overlay JSX, add:

```tsx
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
```

Extend the Escape-key effect to close whichever overlay is open:

```ts
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
```

- [ ] **Step 4: Add the hover/focus cue in `src/styles/globals.css`**

After the `.row.tbd .cell` rules:

```css
/* Rows with an authored note are clickable — subtle lift as the cue. */
.row.has-note { cursor: pointer; }
.row.has-note:hover { filter: brightness(1.18); transform: translateY(-1px); }
.row.has-note:focus-visible {
  outline: 2px solid var(--color-active);
  outline-offset: 2px;
}
```

- [ ] **Step 5: Manual verification with a temporary note**

Temporarily add `note: 'test note\nsecond line'` to the OD 177 row in `src/content/departures.ts`. Run `npm run dev` and confirm:
- The row brightens on hover with a pointer cursor; other rows stay inert
- Click → the row's flaps replay with clacks, then (~1s) the card opens showing `denpasar`, `OD 177 · GATE B12 · ARRIVED · MAY · 2026`, and the two-line note
- Rapid double-click during the flip opens exactly one card
- Esc, click-outside, and the close button all dismiss it
- Tab focuses the row (visible outline); Enter opens it

**Then remove the temporary note** — notes will be authored later.

- [ ] **Step 6: Verify tests, build, lint**

Run: `npm run test && npm run build && npm run lint`
Expected: all pass, and `git diff src/content/departures.ts` shows no leftover test note.

- [ ] **Step 7: Commit**

```bash
git add src/components/Board.tsx src/styles/globals.css
git commit -m "feat: trip notes card with flip-then-reveal on noted rows"
```

---

### Task 4: Warm ivory background

**Files:**
- Modify: `src/styles/globals.css:11` (`--color-canvas`) and `src/styles/globals.css:63-64` (body gradient)

**Interfaces:** none — pure CSS token change; `.btn.muted` picks up the new canvas automatically.

- [ ] **Step 1: Shift the canvas token and gradient to warm ivory**

In `:root`, change:

```css
--color-canvas:        #ece8df;
```

In the `body` rule, change the gradient stops to warm equivalents:

```css
background:
  linear-gradient(180deg, #f2efe7 0%, var(--color-canvas) 50%, #e3ddd0 100%);
```

Update the comment block at the top of the file: replace the words "Light grey chassis" with "Warm ivory chassis" so the DESIGN.md token description stays truthful.

- [ ] **Step 2: Manual verification**

Run: `npm run dev`. Confirm the wall reads warm paper rather than cool grey; the dark display cards, red boarding rail, header text (`--color-slate` on ivory), and footer message all remain comfortably legible; the faint 48px grid is still visible but not stronger than before.

- [ ] **Step 3: Verify build and lint**

Run: `npm run build && npm run lint`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/styles/globals.css
git commit -m "style: warm the wall background from cool grey to ivory"
```

---

### Task 5: Synthesized airport ambience

**Files:**
- Create: `src/lib/ambience.ts`
- Modify: `src/components/Board.tsx` (start ambience on first audio unlock; ♪ toggle stops/starts it)

**Interfaces:**
- Consumes: the existing `audioCtxRef` / `ensureAudio` / `soundOn` machinery in `Board.tsx`.
- Produces:

```ts
export type AmbienceHandle = { stop: () => void };
export function startAmbience(ctx: AudioContext): AmbienceHandle;
```

- [ ] **Step 1: Create `src/lib/ambience.ts`**

```ts
// Synthesized airport ambience — no audio assets. Two layers:
// 1. Room tone: a looped brown-noise buffer through a low-pass filter at
//    very low gain, with a slow LFO drifting the level so it breathes.
// 2. PA chime: the classic two-tone announcement (E5 then C5, soft attack,
//    long decay) every 90–180 seconds.
// Gain values are tuned by ear to sit well under the flap clacks.

export type AmbienceHandle = { stop: () => void };

function playChime(ctx: AudioContext, out: GainNode) {
  const t0 = ctx.currentTime + 0.05;
  const tones: Array<[number, number]> = [
    [659.25, 0],    // E5
    [523.25, 0.65], // C5
  ];
  for (const [freq, offset] of tones) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0 + offset);
    gain.gain.linearRampToValueAtTime(0.045, t0 + offset + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 2.2);
    osc.connect(gain).connect(out);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 2.4);
  }
}

export function startAmbience(ctx: AudioContext): AmbienceHandle {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2); // fade in
  master.connect(ctx.destination);

  // Room tone: 6s of brown noise (integrated white noise), looped.
  const seconds = 6;
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + (Math.random() * 2 - 1) * 0.02) * 0.998;
    data[i] = last;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 320;

  const toneGain = ctx.createGain();
  toneGain.gain.value = 0.06;

  // Slow drift: ±0.02 around the base gain every ~20s.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.02;
  lfo.connect(lfoDepth).connect(toneGain.gain);

  noise.connect(lowpass).connect(toneGain).connect(master);
  noise.start();
  lfo.start();

  let chimeTimer = 0;
  const scheduleChime = () => {
    chimeTimer = window.setTimeout(() => {
      playChime(ctx, master);
      scheduleChime();
    }, 90_000 + Math.random() * 90_000);
  };
  scheduleChime();

  return {
    stop: () => {
      window.clearTimeout(chimeTimer);
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.6); // fade out
      window.setTimeout(() => {
        noise.stop();
        lfo.stop();
        master.disconnect();
      }, 700);
    },
  };
}
```

- [ ] **Step 2: Wire ambience into `Board.tsx`**

Import and ref:

```ts
import { startAmbience, type AmbienceHandle } from '../lib/ambience';
```

```ts
const ambienceRef = useRef<AmbienceHandle | null>(null);
```

In `ensureAudio`, extend the first-init block so ambience starts with the confirming clack:

```ts
if (wasUninitialized && audioCtxRef.current && soundOnRef.current) {
  playClack(audioCtxRef.current, 0.14);
  ambienceRef.current = startAmbience(audioCtxRef.current);
}
```

Add a mute/unmute effect (covers toggling after init; `ensureAudio` covers first init):

```ts
useEffect(() => {
  if (soundOn) {
    if (audioCtxRef.current && !ambienceRef.current) {
      ambienceRef.current = startAmbience(audioCtxRef.current);
    }
  } else {
    ambienceRef.current?.stop();
    ambienceRef.current = null;
  }
}, [soundOn]);
```

Note: the ♪ button's existing `onClick` already calls `ensureAudio()` after `setSoundOn`, so unmuting before any prior click both creates the context and starts ambience — no extra wiring needed.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Confirm:
- Page loads silent; after the first click anywhere, a soft low hum fades in over ~2s beneath the clacks
- ♪ toggle off → hum fades out within a second and clacks stop; toggle on → hum fades back in
- No console errors; CPU stays idle-level (one looped buffer + one LFO)
- Optional chime check: temporarily change `90_000 + Math.random() * 90_000` to `3_000`, hear the two-tone bing-bong, then restore the original interval

- [ ] **Step 4: Verify tests, build, lint**

Run: `npm run test && npm run build && npm run lint`
Expected: all pass, and `git diff src/lib/ambience.ts` shows the 90–180s chime interval (not a leftover 3s test value).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ambience.ts src/components/Board.tsx
git commit -m "feat: synthesized airport ambience (room tone + PA chime) behind sound toggle"
```
