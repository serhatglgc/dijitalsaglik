# Dijital Yaşam Risk Değerlendirmesi

Katılımcıların günlük dijital alışkanlıklarını girerek **10 üzerinden dijital sağlık puanı** alabildikleri, tamamen ücretsiz ve sunucusuz çalışan web uygulaması.

## Özellikler

- 8 soruluk kapsamlı değerlendirme
- Ağırlıklı puanlama algoritması (bilimsel temelli)
- Kategori analizi (telefon, uyku, sosyal medya, detoks...)
- Kişisel öneriler motoru
- Sıfır backend — tüm veriler cihazda kalır
- Mobil uyumlu (responsive)

## Dosya Yapısı

```
hastane/
├── index.html    # Ana sayfa (3 ekran: intro, sorular, sonuç)
├── style.css     # Premium dark glassmorphism tasarım
├── app.js        # Puanlama algoritması ve uygulama mantığı
└── README.md
```

## Hosting (Ücretsiz)

### Seçenek 1: Netlify (Önerilen)
1. netlify.com - üye ol
2. "Add new site" > Deploy manually
3. hastane/ klasörünü sürükle-bırak > Deploy
4. Otomatik https://xxx.netlify.app URL alırsın

### Seçenek 2: GitHub Pages
```bash
git init
git add .
git commit -m "ilk surum"
git remote add origin https://github.com/KULLANICI/dijital-saglik.git
git push -u origin main
# GitHub > Settings > Pages > Branch: main > Save
```

### Seçenek 3: Vercel
```bash
npx vercel --prod
```

## Puanlama Algoritması

| Kriter | Agirlik | Ideal |
|---|---|---|
| Telefon ekran suresi | 2.0 | 2 saat/gun |
| Bilgisayar ekran suresi | 1.5 | 4 saat/gun |
| Uyku oncesi telefon | 1.5 | 15 dakika |
| Sosyal medya | 2.0 | 1 saat/gun |
| Bildirim yuku | 1.0 | 20/gun |
| Uyku suresi | 2.0 | 7-9 saat |
| Dijital mola | 2.0 | 4+ saat molasiz kalabilmek |
| Dijital detoks | 1.0 | Haftalik detoks |

Risk Seviyeleri:
- 7.5-10 : Dusuk Risk
- 5.0-7.4 : Orta Risk
- 0-4.9  : Yuksek Risk

## Gizlilik

Hicbir veri sunucuya gonderilmez. Tum hesaplamalar tarayicida yapilir.
