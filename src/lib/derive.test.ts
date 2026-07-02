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
