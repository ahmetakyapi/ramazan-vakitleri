import test from 'node:test';
import assert from 'node:assert/strict';

import { getKadirGecesiState, getRamazanInfo, parseHijri } from '../src/utils/ramazan.js';

// Diyanet satırı üretir: miladi gün + hicri tarih
const row = (date, hijri) => {
  const d = new Date(date);
  const kisa = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  return { MiladiTarihKisa: kisa, HicriTarihKisa: hijri, Imsak: '05:10', Aksam: '19:18' };
};

// 2026 Ramazanı: Diyanet'te 19 Şubat başladı, 20 Mart bayram (29 gün)
const ramadan2026 = (() => {
  const rows = [];
  const start = new Date(2026, 1, 15);
  for (let i = 0; i < 40; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const ramadanDay = i - 3; // 19 Şubat = 1
    let hijri;
    if (ramadanDay < 1) hijri = `${30 + ramadanDay - 1}.8.1447`;
    else if (ramadanDay <= 29) hijri = `${ramadanDay}.9.1447`;
    else hijri = `${ramadanDay - 29}.10.1447`;
    rows.push(row(date, hijri));
  }
  return rows;
})();

const findRow = (rows, y, m, d) =>
  rows.find((r) => r.MiladiTarihKisa === `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`);

test('parseHijri reads Diyanet short hijri dates', () => {
  assert.deepEqual(parseHijri('3.5.1448'), { day: 3, month: 5, year: 1448 });
  assert.equal(parseHijri(''), null);
  assert.equal(parseHijri(undefined), null);
});

test('first day of Ramadan follows Diyanet, not Umm al-Qura', () => {
  const now = new Date(2026, 1, 19, 12);
  const info = getRamazanInfo({ today: findRow(ramadan2026, 2026, 2, 19), rows: ramadan2026, now });

  assert.equal(info.type, 'current');
  assert.equal(info.day, 1);
  assert.equal(info.length, 29);
  assert.equal(info.remaining, 28);
});

test('day before Ramadan counts down one day', () => {
  const now = new Date(2026, 1, 18, 12);
  const info = getRamazanInfo({ today: findRow(ramadan2026, 2026, 2, 18), rows: ramadan2026, now });

  assert.deepEqual(info, { type: 'countdown', days: 1 });
});

test('last day of Ramadan has nothing remaining', () => {
  const now = new Date(2026, 2, 19, 12);
  const info = getRamazanInfo({ today: findRow(ramadan2026, 2026, 3, 19), rows: ramadan2026, now });

  assert.equal(info.day, 29);
  assert.equal(info.remaining, 0);
});

test('countdown beyond the API window uses Umm al-Qura', () => {
  // 14 Ekim 2026: Diyanet 3 Cemaziyelevvel 1448, Ramazan 8 Şubat 2027
  const now = new Date(2026, 9, 14, 12);
  const today = row(now, '3.5.1448');
  const info = getRamazanInfo({ today, rows: [today], now });

  assert.deepEqual(info, { type: 'countdown', days: 117 });
});

test('Kadir Gecesi is the evening of the 26th and the night into the 27th', () => {
  const times = { Imsak: '05:10', Aksam: '19:18' };
  const day26 = { type: 'current', day: 26, length: 29, remaining: 3 };
  const day27 = { type: 'current', day: 27, length: 29, remaining: 2 };

  assert.equal(getKadirGecesiState(day26, times, new Date(2026, 2, 16, 12)), 'tonight');
  assert.equal(getKadirGecesiState(day26, times, new Date(2026, 2, 16, 21)), 'now');
  assert.equal(getKadirGecesiState(day27, times, new Date(2026, 2, 17, 3)), 'now');
  assert.equal(getKadirGecesiState(day27, times, new Date(2026, 2, 17, 12)), null);
  assert.equal(getKadirGecesiState({ type: 'countdown', days: 3 }, times), null);
});
