import type { DepartureInput } from '../lib/derive';

// Data is intentionally minimal: status/kind/symbol/depart-text are all
// derived from `depart` + the clock in src/lib/derive.ts. A trip with a
// `note` becomes clickable and opens the trip card.
export type Departure = DepartureInput;

export const departures: Departure[] = [
  {
    dest: 'DENPASAR', flight: 'AK 384', gate: 'B12', depart: '2024-12-01T00:00:00+08:00',
    note: "the first time we said ‘let's just go.’ i still have the boarding pass.",
  },
  {
    dest: 'DENPASAR', flight: 'TR 158', gate: 'B07', depart: '2026-01-01T00:00:00+08:00',
    note: 'the same beach, second date. you fell asleep before we even took off.',
  },
  {
    dest: 'HONG KONG', flight: 'CX 716', gate: 'C24', depart: '2026-03-01T00:00:00+08:00',
    note: 'neon and dumplings and getting lost in causeway bay on purpose.',
  },
  {
    dest: 'KUALA LUMPUR', flight: 'AK 707', gate: 'A11', depart: '2026-04-01T00:00:00+08:00',
    note: "petronas at midnight, and you still said it wasn't as tall as you imagined.",
  },
  {
    dest: 'DENPASAR', flight: 'OD 177', gate: 'B12', depart: '2026-05-24T09:15:00+08:00',
    note: "miss you already. cried a little at the gate, didn't tell you.",
  },
  {
    dest: 'DENPASAR', flight: 'GA 821', gate: '——', depart: '2026-07-16T09:00:00+08:00',
    note: 'counting down. bring the sunscreen you always forget.',
  },
  {
    dest: 'JAKARTA', flight: 'GA 407', gate: '——', depart: '2026-07-23T09:00:00+08:00',
    note: 'quick one right after bali — see you before the goodbye even settles.',
  },
  {
    dest: 'BANGKOK', flight: 'MH 774', gate: 'A03', depart: '2026-12-01T07:30:00+08:00',
    note: 'already thinking about it. street food and getting hopelessly lost together.',
  },
  {
    dest: 'DENPASAR', flight: '——', gate: '——',
    note: "someday, again. it's never really done with this one.",
  },
  {
    dest: 'COLOMBO', flight: '——', gate: '——',
    note: 'you keep sending me photos. one day i’ll stop just looking.',
  },
  {
    dest: 'MILAN', flight: '——', gate: '——',
    note: 'the one we keep saying "next year" about.',
  },
];
