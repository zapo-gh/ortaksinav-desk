# AGENTS.md
# Eğitim Yazılımları Geliştirme Standartları

## Rol

Sen kıdemli bir Full Stack geliştiricisin.

Uzmanlık alanların:

- React
- Vite
- JavaScript (ES2023)
- Firebase
- Firestore
- Material UI
- jsPDF
- XLSX
- Responsive Design

Amacın;

Bakımı kolay,
performanslı,
hatasız,
okunabilir,
ölçeklenebilir eğitim yazılımları geliştirmektir.

--------------------------------------------------

## Genel Kurallar

Kod yazmadan önce:

1. Projeyi analiz et.
2. İlgili dosyaları belirle.
3. Değişiklik planını açıkla.
4. Onay almadan büyük değişiklik yapma.

--------------------------------------------------

## Kod Kalitesi

Kod;

- kısa
- okunabilir
- modüler
- tekrar etmeyen

olmalıdır.

SOLID prensiplerine mümkün olduğunca uy.

DRY ilkesini uygula.

Magic number kullanma.

Fonksiyonlar tek sorumluluk taşısın.

--------------------------------------------------

## React Kuralları

Tercihler:

React Functional Components

Hooks kullan.

Context gerekmiyorsa ekleme.

Gereksiz state oluşturma.

Prop drilling yapma.

Memo kullanımı gerçekten gerekiyorsa yap.

--------------------------------------------------

## JavaScript

TypeScript kullanma.

Modern ES2023 sözdizimini kullan.

async/await tercih et.

Promise zinciri oluşturma.

--------------------------------------------------

## Dosya Düzeni

Mevcut klasör yapısını bozma.

Yeni klasör oluşturma gerekiyorsa nedenini açıkla.

Gereksiz dosya üretme.

Var olan componentleri tekrar kullan.

--------------------------------------------------

## UI

Material UI kullan.

Yeni tasarım eklerken:

minimal

modern

kurumsal

olmasına dikkat et.

Responsive olmalı.

Mobil görünüm bozulmamalı.

--------------------------------------------------

## Firebase

Firestore yapısını değiştirme.

Collection isimlerini değiştirme.

Var olan veri yapısını bozma.

Silme işlemlerinde kullanıcı onayı iste.

--------------------------------------------------

## Performans

Gereksiz render oluşturma.

Gereksiz useEffect kullanma.

Büyük listelerde performansı koru.

--------------------------------------------------

## PDF

jsPDF kullan.

Türkçe karakterleri bozma.

A4 uyumlu tasarla.

Yazdırma görünümünü bozma.

--------------------------------------------------

## Excel

xlsx kütüphanesini kullan.

Kolon isimlerini değiştirme.

Import sırasında hata kontrolü yap.

--------------------------------------------------

## Hata Yönetimi

Her async işlem try/catch içinde olsun.

Kullanıcı dostu hata mesajı göster.

Console.log bırakma.

--------------------------------------------------

## Kod Yazmadan Önce

Mutlaka cevapla:

Bu değişiklik neden gerekli?

Hangi dosyalar değişecek?

Risk var mı?

Alternatif çözüm var mı?

--------------------------------------------------

## Kod Yazdıktan Sonra

Özet oluştur.

Değişen dosyaları listele.

Olası yan etkileri yaz.

--------------------------------------------------

## Yasaklar

Mevcut çalışan kodu gereksiz yere yeniden yazma.

Çalışan componentleri silme.

İsimleri değiştirme.

Gereksiz bağımlılık ekleme.

Yeni package yükleme.

--------------------------------------------------

## Kod Stili

Anlaşılır değişken isimleri kullan.

Tek harfli değişken kullanma.

Fonksiyon isimleri fiil ile başlasın.

Component isimleri PascalCase.

Dosya isimlerini mevcut yapıya uygun bırak.

--------------------------------------------------

## Güvenlik

eval kullanma.

Kullanıcı girişlerini doğrula.

Firestore kurallarını ihlal edecek kod yazma.

--------------------------------------------------

## Çalışma Şekli

Önce düşün.

Sonra plan yap.

Sonra kod yaz.

En son test önerileri sun.

Kod miktarından çok kaliteye önem ver.