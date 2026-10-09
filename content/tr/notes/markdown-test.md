---
title: Markdown test notu
description: Başlıklar, listeler, tablolar, kod, görseller ve dipnotlar için tek sayfalık görünüm testi.
tags: [Markdown, Test]
---

Bu not bir **görünüm ve etkileşim testi**. Türkçe karakterler: ğ, ş, ı, İ, ö, ü, ç. Dar ekranda yalnızca geniş tablo ve kod blokları kendi içinde kaymalı; sayfa yana taşmamalı.

# Birinci seviye içerik başlığı

## Başlıklar ve metin

### Üçüncü seviye başlık

#### Dördüncü seviye başlık

##### Beşinci seviye başlık

###### Altıncı seviye başlık

**Kalın**, *italik*, ***kalın italik***, ~~üstü çizili~~ ve `satır içi kod` aynı paragrafta. Kaçış karakterleri: \*yıldız\*, \_alt çizgi\_ ve \# işareti.

Bu satırın sonunda iki boşluk var.  
Bu satır aynı paragrafta, ama yeni satırda görünmeli.

Ayrı bir paragrafın üstünde okunabilir boşluk bulunmalı.

Alternatif başlık sözdizimi
--------------------------

Bu başlık altına çizilen tirelerle ikinci seviyeye dönüşür.

## Bağlantılar

[Ana sayfaya dön](/tr/), [bu notun tablo bölümüne git](#tablolar) ve [referans bağlantısı][kaynak] alt çizgili görünmeli.

Otomatik bağlantı: <https://example.com>. Çıplak adres: https://example.com. E-posta örneği: <markdown@example.com>.

[kaynak]: https://example.com "Referans bağlantısı"

## Listeler

- İlk madde
- İkinci madde
  - İç içe madde
  - Bir başka madde
    1. İç içe sıralı liste
    2. İkinci sıra
- Son madde

1. İlk adım
2. İkinci adım
   - Adımın altındaki açıklama
3. Üçüncü adım

- Birden fazla paragraf içeren madde.

  Bu paragraf aynı maddeye ait; hizası korunmalı.

- Bir sonraki madde.

### Görev listesi

- [x] Tamamlanmış görev
- [ ] Bekleyen görev
- [ ] Birden çok satıra yayılan uzun açıklama; dar ekranda metin düzgün kaymalı ve onay kutusu metnin ilk satırıyla hizalanmalı.

## Alıntılar ve ayırıcı

> Alıntı, ana metinden ince bir çizgiyle ayrılmalı.
>
> İkinci paragrafında **vurgu** ve [bağlantı](https://example.com) bulunabilir.
>
> > İç içe alıntı da hizasını korumalı.

---

## Tablolar

| Özellik | Durum | Adet |
| :--- | :---: | ---: |
| Türkçe karakterler | Hazır | 7 |
| Satır içi kod | `const sayı = 42` | 42 |
| **Kalın** ve *italik* | ~~Eski~~ | 128 |

Aşağıdaki geniş tablo telefonda kendi içinde yatay kaydırılmalı.

| Birinci uzun sütun başlığı | İkinci uzun sütun başlığı | Üçüncü uzun sütun başlığı | Dördüncü uzun sütun başlığı | Beşinci uzun sütun başlığı |
| --- | --- | --- | --- | --- |
| `uzun-birinci-deger-1234567890` | `uzun-ikinci-deger-1234567890` | `uzun-ucuncu-deger-1234567890` | `uzun-dorduncu-deger-1234567890` | `uzun-besinci-deger-1234567890` |

## Kod blokları

Dil etiketi görünmeli, kopyalama düğmesi yalnızca kodu kopyalamalı.

```typescript
// Türkçe yorum: ğ ş ı İ ö ü ç
const okur = { ad: 'Arda', notSayısı: 42 };
function selamla(ad: string): string {
  return `Merhaba, ${ad}!`;
}
console.log(selamla(okur.ad));
```

```css
.not {
  color: #c3c2b7;
  max-width: 720px;
}
```

```json
{
  "başlık": "Markdown testi",
  "tamamlandı": true,
  "adet": 7
}
```

```bash
printf '%s\n' 'Türkçe: ğ ş ı İ ö ü ç'
```

```
Dil belirtilmeyen düz metin.
Bu çok uzun satır kırılmadan kod bloğunun içinde yatay kaymalı: abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz
```

    Girintili kod bloğu.
    İkinci satır.

## Görsel

![Markdown testi için nötr zemin üzerinde üç satırlı not çizimi](./markdown-ornek.svg "Yerel SVG görseli")

Görsel okuma sütununu aşmamalı; alternatif metni bulunmalı.

## Dipnotlar

Bu cümlenin bir dipnotu var.[^kisa] İkinci dipnot daha uzun bir açıklamaya bağlanıyor.[^uzun]

[^kisa]: Kısa dipnot açıklaması.
[^uzun]: İlk dipnot paragrafı.

    İkinci paragrafta **kalın metin** ve `kod` da bulunabilir.

## HTML ile ek biçimler

<details>
<summary>Ayrıntıları aç ve kapat</summary>
<p>Bu bölüm açıldığında kısa ve sakin bir giriş hareketi olmalı.</p>
</details>

<dl>
<dt>Okuma sütunu</dt>
<dd>Metni rahat okunabilir genişlikte tutan alan.</dd>
<dt>Azaltılmış hareket</dt>
<dd>Sistem bu tercihi bildirdiğinde animasyonlar kapatılır.</dd>
</dl>

Klavye gösterimi: <kbd>Ctrl</kbd> + <kbd>K</kbd>. <mark>İşaretlenmiş metin</mark>, H<sub>2</sub>O ve x<sup>2</sup>.

## Destek sınırı

Bu sayfa standart Markdown ve GFM biçimlerini, dipnotları ve yukarıdaki HTML öğelerini sınar. Obsidian `[[wiki bağlantıları]]`, `![[not gömme]]`, özel callout sözdizimi, Mermaid ve LaTeX matematik için ayrıca dönüştürücü gerekir; burada çalıştıkları varsayılmaz.
