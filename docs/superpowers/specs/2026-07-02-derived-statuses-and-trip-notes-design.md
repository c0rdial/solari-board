# Design: Time-Derived Departure Statuses + Trip Notes

**Date:** 2026-07-02
**Status:** Approved

## Problem

Departure `status`, `kind`, and `sym` are hardcoded in `src/content/departures.ts`. The
DENPASAR OD 177 row departed 2026-05-24 but still shows BOARDING / NOW because nothing
derives status from the clock. Every trip requires a manual data edit after it happens.

Additionally: two new trips need to be added, and there is no way to attach a note or
trip details to a row.

## Goals

1. Status, kind, symbol, and depart-cell text are derived from `depart` + system time.
   Passed trips automatically become ARRIVED; the earliest future trip is automatically
   promoted to BOARDING (and drives the NEXT BOARDING hero panel); other future trips
   are ON TIME; rows without a date are TBD.
2. Add trips: DENPASAR GA 821 departing 2026-07-16, JAKARTA GA 407 departing 2026-07-23.
3. Rows that have a `note` are clickable and open a trip-details overlay card.
4. Warm the page background: the default-grey wall shifts to a warm off-white/ivory.
5. Add a subtle synthesized airport ambience (room tone + occasional PA chime).

## Non-Goals

- No backend / no in-browser editing. Notes are authored in code (git-versioned),
  matching the curated feel of the board.
- No changes to the flip animation, the clack synthesis, the cascade, or the layout.
  Visual changes are limited to the wall background tone (see Warmer Background).
- No custom event system for time transitions (see Trigger Model).

## Data Model (`src/content/departures.ts`)

```ts
export type Departure = {
  dest: string;
  flight: string;
  gate: string;
  depart?: string; // ISO 8601 datetime with offset; omitted = TBD wishlist row
  note?: string;   // optional trip details; presence makes the row clickable
};
```

- Stored `status`, `kind`, and `sym` fields are removed — all derived.
- Existing label-only past rows convert to ISO dates (first of month, e.g.
  `2024-12-01T00:00:00+08:00`); display shows only `DEC · 2024` style so day is
  irrelevant.
- New rows use 09:00 +08:00 as departure time (placeholder until real times known)
  and gate `——`.

## Derivation (pure function)

`deriveDepartures(rows: Departure[], now: Date): DerivedDeparture[]`

For each row:

| Condition                | kind       | sym | status     | depart cell            |
|--------------------------|------------|-----|------------|------------------------|
| no `depart`              | `tbd`      | `·` | `TBD`      | `——`                   |
| `depart` <= now          | `arrived`  | `○` | `ARRIVED`  | `MMM · YYYY` label     |
| earliest future `depart` | `boarding` | `✦` | `BOARDING` | countdown              |
| other future `depart`    | `ontime`   | `◇` | `ON TIME`  | countdown              |

Countdown formatting is the existing `formatDeparture` logic (`N DAYS`, `ND HHH`,
`HH:MM:00`). The `NOW` branch becomes unreachable (passed → arrived) but stays as a
guard.

`DerivedDeparture` = original fields + derived `kind`, `sym`, `status`, plus the
formatted depart text.

## Trigger Model (no events)

- Derived list is recomputed from the existing 1-second clock tick (`useState` clock in
  `Board.tsx`). Deriving 9 rows per second is negligible.
- The existing 60-second update interval extends to compare **status cells** in
  addition to depart cells, flipping any changed cell with the clack animation. When a
  departure crosses "now", both affected rows (passed → ARRIVED, next → BOARDING) flip
  within a minute.
- Row symbol and row color class (`row ${kind}`) update via normal React re-render —
  they are not flap cells.
- Hero panel binds to the derived `boarding` row, so promotion is automatic.
- Rationale: statuses are a pure function of time already re-evaluated on existing
  timers; a one-shot timer or event emitter adds code for a ≤60s latency improvement
  nobody watching a trip board will notice.

## Trip Notes UI

- Rows where `note` is present: clickable (pointer cursor, subtle hover brightness
  lift), keyboard-accessible (focusable, Enter/Space opens).
- Clicking first replays the row's split-flap flip animation (existing `flipRow`, with
  clack audio), then — once the flip settles (~1s) — the trip card overlay opens.
  The overlay reuses the existing `info-overlay` pattern: dark card, close button,
  Esc and click-outside dismiss. Repeat clicks during the flip are ignored.
- Card content: destination, `flight · gate · date label`, status, note text
  (multi-line preserved).
- Rows without a note render exactly as today (inert).
- Notes for past trips to be authored later by the user; feature ships with the
  mechanism and no notes is acceptable.

## Warmer Background

- `--color-canvas` (`src/styles/globals.css`) shifts from cool grey `#e5e7eb` to a warm
  ivory/paper tone, and the body gradient stops (`#ececef`, `#dcdee2`) shift to warm
  equivalents so the wall reads intentional rather than default-grey.
- The board surface, flap cells, and accent colors are unchanged; only the wall around
  the board (and its grid lines if they clash) is adjusted. Text on the wall
  (header, footer, column captions) is re-checked for legibility against the new tone.

## Airport Ambience (synthesized, no assets)

- Produced with WebAudio like the existing clack synthesis — no audio files.
- **Room tone:** a generated noise buffer (several seconds, looped) through a low-pass
  filter at very low gain, with slow gain drift so it breathes; reads as distant
  terminal hum, sits well under the clacks.
- **PA chime:** the classic two-tone announcement chime (two sine tones with soft
  attack and long decay), scheduled at a random interval every ~90–180 seconds.
- Starts only after the first user gesture (existing `ensureAudio` pattern — browsers
  block autoplay), and is controlled by the existing ♪ toggle: muting stops both
  clacks and ambience; unmuting resumes the room tone.

## Trip Data After Change (as of 2026-07-02)

| dest         | flight | depart                    | derived today       |
|--------------|--------|---------------------------|---------------------|
| DENPASAR     | AK 384 | 2024-12-01                | ARRIVED · DEC 2024  |
| DENPASAR     | TR 158 | 2026-01-01                | ARRIVED · JAN 2026  |
| HONG KONG    | CX 716 | 2026-03-01                | ARRIVED · MAR 2026  |
| KUALA LUMPUR | AK 707 | 2026-04-01                | ARRIVED · APR 2026  |
| DENPASAR     | OD 177 | 2026-05-24T09:15+08:00    | ARRIVED · MAY 2026  |
| DENPASAR     | GA 821 | 2026-07-16T09:00+08:00    | BOARDING (hero)     |
| JAKARTA      | GA 407 | 2026-07-23T09:00+08:00    | ON TIME             |
| BANGKOK      | MH 774 | 2026-12-01T07:30+08:00    | ON TIME             |
| DENPASAR     | ——     | (none)                    | TBD                 |
| COLOMBO      | ——     | (none)                    | TBD                 |
| MILAN        | ——     | (none)                    | TBD                 |

## Testing

- Unit tests for `deriveDepartures` and date-label/countdown formatting with a fixed
  `now`: passed trip → arrived, earliest future → boarding, tie/ordering, no-date →
  tbd, boundary at exactly `now`.
- Manual verification: board renders with OD 177 as ARRIVED · MAY 2026, GA 821 in the
  hero panel with a 14-day countdown, noted rows open/close the trip card via mouse
  and keyboard, the wall reads warm ivory, and after a first click the room tone is
  audible and the ♪ toggle silences everything.

## Error Handling

- Unparseable `depart` string: treat as TBD (defensive; data is authored in-repo).
- Empty/whitespace `note`: treated as absent (row stays inert).
