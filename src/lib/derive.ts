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
      // Viewer-local month label: authored dates are +08:00 and the audience
      // is in +07/+08, so this is stable for them. UTC getters would be
      // wrong here — 2024-12-01T00:00+08:00 is still NOV in UTC.
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
