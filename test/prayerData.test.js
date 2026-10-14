import test from 'node:test';
import assert from 'node:assert/strict';

import { formatDayLabel, formatHijriLabel, getVisiblePrayerTimes } from '../src/utils/prayerData.js';
import { foldForSearch, formatPlaceName } from '../src/utils/text.js';

const data = [
  { MiladiTarihKisa: '13.10.2026', Imsak: '05:42' },
  { MiladiTarihKisa: '14.10.2026', Imsak: '05:43' },
  { MiladiTarihKisa: '15.10.2026', Imsak: '05:44' },
];

test('getVisiblePrayerTimes picks today and tomorrow', () => {
  const { current, next } = getVisiblePrayerTimes(data, new Date(2026, 9, 14, 22));

  assert.equal(current.Imsak, '05:43');
  assert.equal(next.Imsak, '05:44');
});

test('getVisiblePrayerTimes never shows another day as today', () => {
  const { current, next } = getVisiblePrayerTimes(data, new Date(2026, 9, 20, 9));

  assert.equal(current, null);
  assert.equal(next, null);
});

test('getVisiblePrayerTimes has no tomorrow on the last day of data', () => {
  const { current, next } = getVisiblePrayerTimes(data, new Date(2026, 9, 15, 9));

  assert.equal(current.Imsak, '05:44');
  assert.equal(next, null);
});

test('formatDayLabel drops the year from Diyanet long dates', () => {
  assert.equal(formatDayLabel({ MiladiTarihUzun: '14 Ekim 2026 Çarşamba' }), '14 Ekim Çarşamba');
  assert.equal(formatDayLabel({ MiladiTarihKisa: '15.10.2026' }), '15 Ekim Perşembe');
  assert.equal(formatDayLabel({ MiladiTarihUzun: '09 Ekim 2026 Cuma' }), '9 Ekim Cuma');
  assert.equal(formatDayLabel(null), '');
  assert.equal(formatHijriLabel({ HicriTarihUzun: '03 Cemaziyelevvel 1448' }), '3 Cemaziyelevvel 1448');
  assert.equal(formatHijriLabel({}), '');
});

test('foldForSearch ignores Turkish letters and case', () => {
  assert.equal(foldForSearch('KADIKÖY'), 'kadikoy');
  assert.equal(foldForSearch('İSTANBUL'), foldForSearch('Istanbul'));
  assert.equal(foldForSearch('  Şile '), 'sile');
  assert.equal(foldForSearch('Çağlayancerit'), 'caglayancerit');
});

test('formatPlaceName writes Turkish title case', () => {
  assert.equal(formatPlaceName('KÜÇÜKÇEKMECE'), 'Küçükçekmece');
  assert.equal(formatPlaceName('BÜYÜK ORHAN'), 'Büyük Orhan');
  assert.equal(formatPlaceName('İSTANBUL'), 'İstanbul');
});
