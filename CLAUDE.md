# Claude Code notları

## Commit yazarı

Commitler her zaman `Ahmet Akyapı <ahmetakyapii@gmail.com>` adına atılır;
yazarı yalnızca "Claude" olan commit atılmaz. Claude, mesajın sonundaki
`Co-Authored-By: Claude …` satırıyla ortak yazar olarak görünür. Oturum
başında, ilk committen önce:

```bash
git config user.name "Ahmet Akyapı"
git config user.email "ahmetakyapii@gmail.com"
```

Bu kural sahibinin tüm repolarında geçerli (9 Ekim 2026).

## Proje

Vite + React 18, tek sayfa; veri `ezanvakti.emushaf.net` (Diyanet). Komutlar:
`npm run dev | build | test` (test = `TZ=Europe/Istanbul node --test`, saf
yardımcılar `src/utils/*` için `test/*.test.js`).

- **Hicri tarih Diyanet'ten**: bugünün Ramazan günü API satırının
  `HicriTarihKisa` alanından okunur; Intl Umm al-Qura yalnızca API'nin
  ötesini tahmin eder (2026'da Diyanet'ten bir gün öndeydi). Kadir Gecesi
  26 Ramazan akşamı. Tek kaynak `src/utils/ramazan.js`.
- **Bugün listede yoksa vakit gösterilmez** (`getVisiblePrayerTimes` null
  döner, yeniden çekilir); başka günün vakti bugünkü gibi görünmesin.
- **Yerleşim kaydırılabilir**: `.app`'e sabit yükseklik ya da
  `overflow: hidden` verme; masaüstü kart `margin: auto` ile ortalanır
  (flex ortalaması taşınca kartın üstünü ekran dışına itiyordu).
- Konum izni yalnız "Konumumu Kullan" düğmesiyle istenir, yüklemede değil.
- Tarayıcı diyaloğu (alert/confirm) yok; kısa mesajlar `Toast`.
