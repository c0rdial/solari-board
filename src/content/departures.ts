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
