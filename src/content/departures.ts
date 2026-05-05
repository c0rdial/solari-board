export type DepartureKind = 'arrived' | 'boarding' | 'ontime' | 'tbd';

export type Departure = {
  sym: string;
  dest: string;
  flight: string;
  gate: string;
  status: string;
  depart: string;
  kind: DepartureKind;
};

export const departures: Departure[] = [
  { sym: '○', dest: 'DENPASAR',     flight: 'AK 384', gate: 'B12', status: 'ARRIVED',  depart: 'DEC · 2024',                kind: 'arrived'  },
  { sym: '○', dest: 'DENPASAR',     flight: 'TR 158', gate: 'B07', status: 'ARRIVED',  depart: 'JAN · 2026',                kind: 'arrived'  },
  { sym: '○', dest: 'HONG KONG',    flight: 'CX 716', gate: 'C24', status: 'ARRIVED',  depart: 'MAR · 2026',                kind: 'arrived'  },
  { sym: '○', dest: 'KUALA LUMPUR', flight: 'AK 707', gate: 'A11', status: 'ARRIVED',  depart: 'APR · 2026',                kind: 'arrived'  },
  { sym: '✦', dest: 'DENPASAR',     flight: 'OD 177', gate: 'B12', status: 'BOARDING', depart: '2026-05-24T09:15:00+08:00', kind: 'boarding' },
  { sym: '◇', dest: 'BANGKOK',      flight: 'MH 774', gate: 'A03', status: 'ON TIME',  depart: '2026-12-01T07:30:00+08:00', kind: 'ontime'   },
  { sym: '·', dest: 'DENPASAR',     flight: '——',     gate: '——',  status: 'TBD',      depart: '——',                        kind: 'tbd'      },
  { sym: '·', dest: 'COLOMBO',      flight: '——',     gate: '——',  status: 'TBD',      depart: '——',                        kind: 'tbd'      },
  { sym: '·', dest: 'MILAN',        flight: '——',     gate: '——',  status: 'TBD',      depart: '——',                        kind: 'tbd'      },
];
