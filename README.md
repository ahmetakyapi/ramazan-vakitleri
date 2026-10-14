# Ramazan Vakitleri

> Türkiye il ve ilçeleri için iftar ve sahur vakitlerini gösteren minimal bir web uygulaması.

<br>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Vite-7.3-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Node-20.19%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
</p>

<br>

## Özellikler

| Özellik | Açıklama |
|---------|----------|
| Namaz Vakitleri | Türkiye'nin tüm il ve ilçeleri için resmi vakitler |
| Geri Sayım | İftar ve sahur için canlı geri sayım |
| Görünüm Seçimi | İmsak & İftar veya tüm vakitler; gün bitince liste yarına geçer |
| Bugünün Tarihi | Miladi ve Diyanet'in hicri tarihi |
| Konum | İsteğe bağlı "Konumumu Kullan"; seçilen il/ilçe kaydedilir |
| Ramazan Takibi | Kaçıncı gün olduğunu Diyanet takvimine göre gösterir |
| Kadir Gecesi | 26 Ramazan akşamı özel gece notu |
| Hatırlatıcı | Sayfa açıkken imsak ve iftardan 15 dakika önce bildirim |
| Çevrimdışı | Bağlantı yokken kayıtlı vakitler |
| Responsive | Tüm cihazlarda uyumlu tasarım |

<br>

## Kurulum

`Node.js 20.19+` veya `22.12+` gereklidir.

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Prodüksiyon için derle
npm run build

# Testler (saf yardımcılar, node:test)
npm test
```

<br>

## Teknolojiler

```text
React                        →  Kullanıcı arayüzü
Vite                         →  Build aracı
ezanvakti.emushaf.net API    →  Diyanet İşleri Başkanlığı namaz vakitleri
```
