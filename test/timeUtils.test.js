import test from 'node:test';
import assert from 'node:assert/strict';

import { getNextMainPrayer, getNextPrayer } from '../src/utils/timeUtils.js';

const todayTimes = {
  Imsak: '05:10',
  Gunes: '06:35',
  Ogle: '13:10',
  Ikindi: '16:40',
  Aksam: '19:18',
  Yatsi: '20:39',
};

const nextDayTimes = {
  ...todayTimes,
  Imsak: '05:08',
};

test('getNextPrayer uses next day imsak after the final prayer', () => {
  const now = new Date('2026-03-10T22:30:00+03:00');

  const result = getNextPrayer(todayTimes, nextDayTimes, now);
  const expected = new Date(now);
  expected.setDate(expected.getDate() + 1);
  expected.setHours(5, 8, 0, 0);

  assert.equal(result.key, 'Imsak');
  assert.equal(result.time, '05:08');
  assert.equal(result.date.getTime(), expected.getTime());
});

test('getNextMainPrayer uses next day imsak after iftar', () => {
  const now = new Date('2026-03-10T21:00:00+03:00');

  const result = getNextMainPrayer(todayTimes, nextDayTimes, now);
  const expected = new Date(now);
  expected.setDate(expected.getDate() + 1);
  expected.setHours(5, 8, 0, 0);

  assert.equal(result.key, 'Imsak');
  assert.equal(result.time, '05:08');
  assert.equal(result.date.getTime(), expected.getTime());
});

test('getNextMainPrayer skips intermediate prayers during the day', () => {
  const now = new Date('2026-03-10T14:15:00+03:00');

  const result = getNextMainPrayer(todayTimes, nextDayTimes, now);

  assert.equal(result.key, 'Aksam');
  assert.equal(result.time, '19:18');
});
