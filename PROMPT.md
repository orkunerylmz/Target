# macOS & Windows Goal Tracker – Tauri Basic Desktop App Prompt

Tauri 2, Rust, React ve TypeScript kullanarak **yalnızca macOS ve Windows üzerinde çalışan basit bir masaüstü hedef/birikim takip uygulaması** geliştir.

Bu proje küçük ve anlaşılır bir MVP/prototip olacaktır. Gereksiz mimari, veritabanı, kullanıcı hesabı, backend servisi, cloud sync, internet bağlantısı veya mobil destek ekleme.

## 1. Platformlar

Uygulama yalnızca şu platformlarda çalışmalıdır:

* macOS
* Windows 10/11

iOS, Android, web veya Linux desteği ekleme.

## 2. Teknoloji Yığını

Kullan:

* Tauri 2
* Rust
* React
* TypeScript
* Vite
* HTML / CSS
* Tauri Notification Plugin
* Tauri tray API
* Rust `serde` / `serde_json`
* Rust `std::fs` veya Tauri File System Plugin

Frontend kullanıcı arayüzünü React + TypeScript ile geliştir.

Rust tarafını yalnızca masaüstü uygulamasına özgü işler için kullan:

* lokal JSON dosyasını okuma/yazma
* bildirim zamanlayıcısı
* sistem tray davranışı
* Tauri command'ları

Kullanma:

* Flutter
* Dart
* Electron
* Next.js
* Supabase
* Firebase
* PostgreSQL
* SQLite
* herhangi bir veritabanı
* authentication
* REST API
* backend sunucusu
* cloud sync
* Redux, MobX veya benzeri ağır state management çözümleri

React tarafında basit state yönetimi için `useState`, `useEffect`, `useMemo` ve gerekirse küçük bir Context kullan.

## 3. Uygulamanın Amacı

Kullanıcı finansal hedefler oluşturabilsin ve her hedef için şu bilgileri girebilsin:

* Hedef adı
* Hedef tutarı
* Şu ana kadar biriktirilen tutar
* İsteğe bağlı hedef tarihi
* İsteğe bağlı emoji/icon

Örnek:

```text
🏍️ CFMOTO 250SR

Hedef: 250.000 TL
Birikim: 75.000 TL
Kalan: 175.000 TL
İlerleme: %30
```

Uygulama kalan miktarı ve ilerleme yüzdesini otomatik hesaplamalıdır.

```text
kalan = hedefTutari - birikim

yuzde = (birikim / hedefTutari) * 100
```

Gösterilen ilerleme yüzdesi en fazla `%100` olmalıdır.

## 4. Ana Pencere

Uygulama açıldığında modern ve sade bir masaüstü dashboard göster.

Sol tarafta sabit sidebar olsun:

```text
Dashboard
Hedefler
Bildirimler
Ayarlar
```

Sağ tarafta aktif sayfanın içeriği gösterilsin.

Dashboard üzerinde:

* toplam hedef sayısı
* toplam hedef tutarı
* toplam birikim
* toplam kalan tutar

gösterilsin.

Ana veya ilk hedef büyük bir kart olarak gösterilebilir.

Örnek:

```text
🏍️ CFMOTO 250SR

75.000 TL / 250.000 TL

[██████░░░░░░░░░░░]

%30 tamamlandı

175.000 TL kaldı
```

## 5. Hedef Oluşturma

`Yeni Hedef` butonu oluştur.

Butona basıldığında modal veya ayrı bir form paneli açılsın.

Form alanları:

* Hedef adı
* Hedef tutarı
* Mevcut birikim
* Hedef tarihi (opsiyonel)
* Emoji/icon (opsiyonel)

Kaydet butonuna basıldığında hedef lokal JSON dosyasına kaydedilsin ve UI anında güncellensin.

## 6. Hedefler Ekranı

Tüm hedefleri kart halinde göster.

Her kartta:

* hedef adı
* emoji/icon
* hedef tutarı
* mevcut birikim
* kalan tutar
* yüzde
* progress bar

bulunsun.

Her hedef için şu işlemler olsun:

* Düzenle
* Sil
* Birikim Ekle

## 7. Birikim Ekleme

Kullanıcı bir hedefe yeni para ekleyebilsin.

Örnek:

```text
+ 2.500 TL
```

Birikim eklendiğinde:

```text
savedAmount = savedAmount + eklenecekTutar
```

olarak güncelle.

JSON dosyasını tekrar kaydet ve UI'ı yenile.

İlk sürümde transaction geçmişi tutma.

## 8. Lokal Veri Saklama

Herhangi bir veritabanı kullanma.

Tüm uygulama verileri kullanıcının bilgisayarında tek veya birkaç küçük JSON dosyasında saklansın.

Önerilen yapı:

```text
AppData/
    goals.json
    settings.json
```

macOS ve Windows'ta işletim sistemine uygun application data klasörünü kullan.

`goals.json` örneği:

```json
[
  {
    "id": "goal-1",
    "name": "CFMOTO 250SR",
    "targetAmount": 250000,
    "savedAmount": 75000,
    "targetDate": "2027-06-01",
    "icon": "🏍️"
  }
]
```

`settings.json` örneği:

```json
{
  "theme": "dark",
  "currency": "TRY",
  "notificationsEnabled": true,
  "notificationTimes": ["09:00", "14:00", "21:30"]
}
```

JSON okuma/yazma işlemini tercihen Rust tarafında yap ve React'tan Tauri command ile çağır.

Örnek command mantığı:

```text
load_goals
save_goals
load_settings
save_settings
```

Uygulama ilk kez açılıyorsa gerekli JSON dosyalarını varsayılan boş değerlerle otomatik oluştur.

## 9. Bildirim Sistemi

Tauri'nin resmi notification plugin'ini kullan.

Bildirimler tamamen lokal çalışmalıdır.

Kullanıcı örneğin şu saatleri tanımlayabilsin:

```text
09:00
14:00
21:30
```

Kullanıcı:

* bildirim saati ekleyebilsin
* saat değiştirebilsin
* bildirimi aktif/pasif yapabilsin
* bildirimi silebilsin

Örnek mesajlar:

```text
CFMOTO 250SR hedefine %30 ulaştın.
```

```text
Hedefine 175.000 TL kaldı.
```

```text
Bugün biraz daha biriktirmek ister misin?
```

```text
Hedefini unutma. Küçük adımlar da ilerlemedir.
```

Mesajlardan biri rastgele seçilebilir.

Hedef varsa mümkün olduğunca hedef adı, yüzde veya kalan tutarı kullanarak dinamik mesaj oluştur.

## 10. Bildirim Zamanlayıcısı

Bu basic sürümde işletim sistemine ayrı ayrı gelişmiş native scheduler entegrasyonu yazma.

Uygulama çalıştığı sürece Rust tarafında basit bir zamanlayıcı çalıştır.

Örneğin her 30-60 saniyede bir mevcut saati kontrol et.

Mevcut saat kullanıcının aktif bildirim saatlerinden biriyle eşleşiyorsa ve o dakika için daha önce bildirim gönderilmediyse notification oluştur.

Aynı bildirimin aynı dakika içinde tekrar gönderilmesini engelle.

## 11. Sistem Tray Davranışı

Uygulama penceresinin kapatma butonuna basıldığında uygulamayı tamamen sonlandırmak yerine system tray'e küçült.

Böylece motivasyon bildirim zamanlayıcısı arka planda çalışmaya devam edebilir.

Tray menüsünde en az:

```text
Uygulamayı Aç
Çıkış
```

seçenekleri olsun.

`Çıkış` seçildiğinde uygulama gerçekten tamamen kapansın.

İlk MVP'de uygulama tamamen kapalıyken bildirim göndermek zorunlu değildir.

## 12. Hedef Tarihi Hesapları

Kullanıcı hedef tarihi girdiyse kalan gün sayısını göster.

Örnek:

```text
Hedefe 284 gün kaldı.
```

Ayrıca yaklaşık aylık gerekli birikimi hesapla.

Örnek:

```text
Kalan: 175.000 TL

Hedefe kalan süre: 10 ay

Aylık gerekli: yaklaşık 17.500 TL
```

Bu hesap basit olabilir.

AI, makine öğrenmesi veya istatistiksel tahmin kullanma.

## 13. Tasarım

Arayüz:

* sade
* modern
* minimal
* masaüstüne uygun
* dark mode'da güçlü görünen

olmalıdır.

Varsayılan browser görünümü bırakma.

React tarafında normal CSS, CSS Modules veya küçük bir global stylesheet kullan.

İlk MVP için Tailwind zorunlu değildir.

Destek:

* Light Mode
* Dark Mode

olsun.

Tema tercihini `settings.json` içerisinde sakla.

## 14. Pencere Davranışı

Uygulama gerçek desktop app gibi davranmalıdır.

Başlangıç pencere boyutu yaklaşık:

```text
1100 x 720
```

Minimum pencere boyutu yaklaşık:

```text
900 x 600
```

olsun.

Pencere yeniden boyutlandırılabilsin.

UI farklı desktop pencere boyutlarında bozulmasın.

## 15. React Proje Yapısı

Projeyi gereksiz şekilde karmaşıklaştırma.

Önerilen yapı:

```text
src/
    App.tsx
    main.tsx

    components/
        Sidebar.tsx
        GoalCard.tsx
        ProgressBar.tsx
        Modal.tsx

    pages/
        Dashboard.tsx
        Goals.tsx
        Notifications.tsx
        Settings.tsx

    types/
        goal.ts
        settings.ts

    utils/
        calculations.ts
        currency.ts

    styles/
        global.css

src-tauri/
    src/
        lib.rs
        main.rs
        storage.rs
        notifications.rs

    Cargo.toml
    tauri.conf.json
```

Clean Architecture, repository pattern, dependency injection framework veya benzeri ağır yapılar ekleme.

## 16. TypeScript Goal Model

Basit bir interface oluştur:

```ts
export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
  icon?: string;
}
```

## 17. Settings Model

```ts
export interface AppSettings {
  theme: "light" | "dark";
  currency: "TRY" | "USD" | "EUR";
  notificationsEnabled: boolean;
  notificationTimes: string[];
}
```

## 18. Rust Veri Modelleri

React modelleriyle uyumlu basit Rust struct'ları oluştur.

Örneğin:

```rust
#[derive(Serialize, Deserialize)]
struct Goal {
    id: String,
    name: String,
    target_amount: f64,
    saved_amount: f64,
    target_date: Option<String>,
    icon: Option<String>,
}
```

Tauri invoke serialization isimlerinin frontend ile uyumunu düzgün şekilde ayarla.

## 19. Para Birimi

Varsayılan:

```text
TRY / TL
```

olsun.

Basit şekilde:

* TRY
* USD
* EUR

seçenekleri bulunabilir.

Döviz kuru API'si kullanma.

Para birimleri arasında dönüşüm yapma.

Frontend'de `Intl.NumberFormat` kullanarak para formatla.

## 20. Ayarlar Ekranı

Yalnızca gerekli ayarlar olsun:

* Light / Dark tema
* Varsayılan para birimi
* Bildirimleri genel olarak aç/kapat

Hesap, profil, cloud veya sync ayarları ekleme.

## 21. İlk Sürümde Olmayacak Özellikler

Kesinlikle ekleme:

* kullanıcı hesabı
* giriş/kayıt
* Supabase
* Firebase
* herhangi bir veritabanı
* SQLite
* backend sunucusu
* REST API
* internet bağlantısı
* cloud sync
* mobil uygulama
* iPhone desteği
* Android desteği
* yapay zeka
* gelişmiş istatistik
* transaction geçmişi
* sosyal özellikler
* Redux veya ağır state management
* otomatik güncelleme sistemi
* telemetry / analytics

## 22. Geliştirme Önceliği

Şu sırayla geliştir:

1. Tauri 2 + React + TypeScript + Vite projesini oluştur.
2. macOS ve Windows desktop yapılandırmasını hazırla.
3. Ana pencere ve sidebar tasarımını oluştur.
4. Goal ve Settings TypeScript modellerini oluştur.
5. Rust tarafında JSON storage service oluştur.
6. `load_goals` ve `save_goals` Tauri command'larını yaz.
7. Dashboard'u oluştur.
8. Hedef ekleme/düzenleme/silme işlemlerini oluştur.
9. Birikim ekleme özelliğini oluştur.
10. Kalan tutar ve yüzde hesaplarını ekle.
11. Bildirim ayarları ekranını oluştur.
12. Tauri notification plugin'ini ekle.
13. Rust tarafında basit bildirim zamanlayıcısını oluştur.
14. System tray davranışını ekle.
15. Light/Dark tema desteğini tamamla.
16. macOS ve Windows production build'lerinin çalıştığını doğrula.

Her aşamada çalışan ve derlenebilir kod üret.

Bir aşama tamamlanmadan gereksiz yeni özellik ekleme.

## 23. Kod Kalitesi

Kod basit ve okunabilir olsun.

* küçük component'lar
* açık fonksiyon isimleri
* TypeScript strict typing
* Rust error handling
* gereksiz abstraction yok
* magic number'ları mümkün olduğunca azalt
* tekrar eden hesaplamaları utility fonksiyonlarına taşı

UI doğrudan dosya sistemiyle uğraşmasın.

Dosya işlemleri Rust tarafındaki Tauri command'ları üzerinden yapılsın.

## 24. Nihai Kullanıcı Akışı

```text
Uygulamayı aç
↓
Hedef oluştur
↓
Hedef tutarını gir
↓
Mevcut birikimini gir
↓
Ne kadar kaldığını gör
↓
Birikim ekle
↓
İlerleme yüzdesini takip et
↓
Motivasyon bildirim saatlerini belirle
↓
Uygulamayı tray'de çalışır halde bırak
↓
Belirlediğin saatlerde lokal bildirim al
```

Projenin amacı yalnızca **basit, hafif, hızlı ve gerçekten kullanılabilir bir macOS + Windows masaüstü uygulaması** oluşturmaktır.

Gereksiz özellik veya karmaşık mimari ekleme.
