---
title: Pi'nin çalıştığı Obsidian kasası
description: Klasör düzeni, not şablonları ve Pi ajanının kasadaki çalışma biçimi.
tags: [Obsidian, Pi]
translationKey: vault-overview
---

Bir kasa büyüdükçe notları nereye koyduğunu hatırlamak zorlaşıyor. Bu kasada klasör yapısı ve metadata, yeni bir notun yerini seçip gerektiğinde yeniden bulmaya yardım ediyor. Pi de bu düzenin içinde çalışıyor; kendi kurallarını `AGENTS.md`, insanlara yönelik genel açıklamayı `README.md` belirliyor.

## Notlar nereye gidiyor?

Numaralı klasörler notların yaşam döngüsünü ve konusunu ayırıyor. `00-gelen-kutusu/` henüz sınıflandırılmamış notları karşılıyor. Günlük kayıtlar `01-gunluk/` altında, `YYYY-MM-DD.md` biçiminde adlandırılıyor. Bitiş hedefi olan işler `02-projeler/`'e, sürekli sorumluluklar `03-alanlar/`'a gidiyor. `04-kaynaklar/` başvuru notlarıyla fikirleri topluyor; kişiler için `06-kisiler/` ayrılmış.

İş bitince ya da not güncelliğini yitirince `05-arsiv/` devreye giriyor. Buradaki tercih basit: arşivlemek silmek değil, notu başka bir yere taşımak. `90-sablonlar/` not oluştururken başlangıç noktası veriyor; `91-ekler/` görsel ve PDF gibi ekleri tutuyor. Klasörlerdeki `_index.md` dosyaları da o bölümün ne için olduğunu kısaca açıklıyor.

Dosya adları küçük harfli kebab-case; Türkçe karakter kullanılmıyor. Başlıkların içinde Türkçe serbest. Günlüklerde tarih dosya adına giriyor, diğer notlarda ise konuya göre kısa bir ad seçiliyor. Böylece yol ve ad, notun içeriğini açmadan önce bile nerede aranacağına dair ipucu veriyor.

## Bir notun taşıdığı bilgiler

Notların başındaki frontmatter, tür bilgisini ve `etiketler` listesini; ayrıca `olgunluk` ve `eylem-durumu` gibi alanları tutuyor. Şablonlarda etiket listesi çoğunlukla boş başlıyor; belirgin, zorunlu bir etiket taksonomisi görmedim. Bunlar aynı şeyi söylemiyor: ilki içeriğin ne kadar işlendiğini, ikincisi yapılacak işin durumunu gösteriyor. Bir proje henüz olgunlaşmamışken de aktif olabilir. Proje şablonunda `hedef-tarih` gibi o türe özgü alan da var.

`90-sablonlar/` içinde günlükten kişiye farklı not türleri için başlangıçlar var. `frontmatter-semasi.md` alanları açıklıyor; şablonlar da yeni notlara ortak bir iskelet veriyor. Böylece her seferinde sıfırdan düzen kurmak gerekmiyor.

Bağlantılar da bu metadata düzenine katılıyor. `ev`, notun ana bağlamını; `ilgili` ise en fazla birkaç yakın ilişkiyi gösterebiliyor. Bu bağlantılar gövdede ikinci kez listelenmiyor. Kasa içinde Obsidian wikilink'leri kullanılıyor; arama ve denetim araçları da bu bağlantıları hesaba katıyor.

## Pi bu yapıda nasıl çalışıyor?

Pi kasayı düz metin dosyalarından oluşan bir kod tabanı gibi ele alıyor. Oturum yönergeleri önce temel bağlamı, son oturum notunu ve açık işleri okumasını; yeni not açmadan önce arama yapıp uygun şablonu seçmesini söylüyor. Böylece aynı konu için gereksiz yere yeni bir not üretmekten kaçınabilir.

Kurallar değişikliği de sınırlıyor: Pi ilgili dosyalara bakıyor, mevcut bilgiyi koruyor, işin gerektirdiği kadar değişiklik yapıyor ve belirsizlik önemliyse soru soruyor. Not ekledikten veya değiştirdikten sonra `scripts/` altındaki denetim araçları bağlantıları, ekleri, adlandırmayı ve frontmatter düzenini kontrol ediyor. Arama ve görev panosu araçları da notların içinde elle tutulur bir indeks tutmadan bilgiye ulaşmayı kolaylaştırıyor.

Obsidian ayarlarında Graph, Backlinks, Outgoing Links, Tag Pane, Properties, Daily Notes, Templates ve Bases gibi yerleşik özellikler açık. Community plugin listesinde GitSync Portal etkin görünüyor. Calendar ve Kanban eklentilerinin dosyaları da kasada bulunuyor, ancak etkin eklentiler listesinde olmadıkları için bunları kullanımda saymıyorum.

Klasörler ve kurallar notların yerini seçmeye yardım ediyor; şablonlar da her yeni notta aynı düzeni kurma işini azaltıyor. Böylece insanla ajan aynı kasada yolunu bulabiliyor.
