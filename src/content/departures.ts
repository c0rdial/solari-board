import type { DepartureInput } from '../lib/derive';

// Data is intentionally minimal: status/kind/symbol/depart-text are all
// derived from `depart` + the clock in src/lib/derive.ts. A trip with a
// `note` becomes clickable and opens the trip card.
export type Departure = DepartureInput;

export const departures: Departure[] = [
  {
    dest: 'DENPASAR', flight: 'AK 384', gate: 'B12', depart: '2024-12-01T00:00:00+08:00',
    note: 'the jamie xx concert. where our souls first interacted.',
  },
  {
    dest: 'DENPASAR', flight: 'TR 158', gate: 'B07', depart: '2026-01-01T00:00:00+08:00',
    note: 'the second time — getting to know each other for real, in person.',
  },
  {
    dest: 'HONG KONG', flight: 'CX 716', gate: 'C24', depart: '2026-03-01T00:00:00+08:00',
    note: 'where it started. loved partying with you.',
  },
  {
    dest: 'KUALA LUMPUR', flight: 'AK 707', gate: 'A11', depart: '2026-04-01T00:00:00+08:00',
    note: 'your first time in KL. seeing Pak V, running around town.',
  },
  {
    dest: 'DENPASAR', flight: 'OD 177', gate: 'B12', depart: '2026-05-24T09:15:00+08:00',
    note: 'my first visit as your boyfriend. the house party.',
  },
  {
    dest: 'KUALA LUMPUR', flight: '——', gate: '——',
    depart: '2026-06-10T00:00:00+08:00', until: '2026-06-14T00:00:00+08:00',
    note: "you came back for Pak V's funeral. a tough time — but you are strong, and i saw one of the most beautiful parts of you.",
  },
  {
    dest: 'DENPASAR', flight: 'GA 821', gate: '——', depart: '2026-07-16T09:00:00+08:00',
    note: '(pending memories)',
  },
  {
    dest: 'JAKARTA', flight: 'GA 407', gate: '——', depart: '2026-07-23T09:00:00+08:00',
    note: '(pending memories)',
  },
  {
    dest: 'BANGKOK', flight: 'MH 774', gate: 'A03', depart: '2026-12-01T07:30:00+08:00',
    note: '(pending memories)',
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
