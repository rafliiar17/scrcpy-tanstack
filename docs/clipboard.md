# Dokumentasi Implementasi: Clipboard Sync (KDE Connect)

> Dianalisis dari source code KDE Connect (C++):
> `plugins/clipboard/clipboardplugin.cpp`
> `plugins/clipboard/clipboardlistener.cpp`

---

## 1. Gambaran Umum

Fitur clipboard sync di KDE Connect memungkinkan dua device (misalnya laptop dan HP) berbagi clipboard secara otomatis. Saat pengguna meng-copy teks di salah satu device, teks tersebut langsung tersedia untuk di-paste di device lain — semua lewat jaringan lokal yang terenkripsi TLS.

Plugin ini bersifat **simetris**: kedua sisi (pengirim dan penerima) menjalankan logika yang persis sama.

---

## 2. Komponen Utama

Ada dua komponen inti yang perlu diimplementasi:

### 2.1 ClipboardListener

Bertugas **memantau perubahan clipboard sistem** dan menyimpan state clipboard terkini. Ini adalah komponen low-level yang berinteraksi langsung dengan clipboard OS.

Tanggung jawabnya:
- Mendengarkan event perubahan clipboard dari sistem operasi
- Menyimpan konten clipboard saat ini (`current_content`)
- Menyimpan timestamp kapan clipboard terakhir berubah (`update_timestamp`, dalam milliseconds epoch)
- Mendeteksi jenis konten — apakah teks biasa atau password
- Menyediakan metode `set_text()` untuk menulis ke clipboard sistem (saat menerima dari remote)

**Catatan penting pada `set_text()`:** Saat konten ditulis ke clipboard dari remote, state internal listener harus diperbarui terlebih dahulu sebelum menulis ke sistem. Tujuannya adalah agar polling loop tidak langsung mendeteksi perubahan tersebut sebagai perubahan "baru" dan mengirimnya kembali ke remote — yang akan menyebabkan loop tak berujung.

### 2.2 ClipboardPlugin

Bertugas **menangani logika sync antar device** — kapan mengirim, apa yang dikirim, dan apa yang dilakukan saat menerima packet dari device lain.

Tanggung jawabnya:
- Mendengarkan event dari `ClipboardListener`
- Memutuskan apakah konten perlu dikirim (berdasarkan konfigurasi `autoShare` dan `sharePasswords`)
- Membentuk dan mengirimkan `NetworkPacket` ke device remote
- Menerima dan memproses packet dari device remote
- Mengirim packet khusus saat device pertama kali terhubung (connect packet)

---

## 3. Struktur NetworkPacket

Semua komunikasi antar device menggunakan format JSON dengan struktur berikut:

```
{
  "id":      <unix timestamp ms saat packet dibuat>,
  "type":    "<tipe packet>",
  "body":    { <konten spesifik plugin> },
  "version": 7
}
```

Plugin clipboard menggunakan dua tipe packet:

### 3.1 `kdeconnect.clipboard` — Live Sync

Dikirim setiap kali clipboard berubah saat device sudah terhubung.

```
body: {
  "content": "<teks yang di-copy>"
}
```

Tidak ada timestamp di sini karena diasumsikan konten ini selalu lebih baru dari apa yang sudah ada.

### 3.2 `kdeconnect.clipboard.connect` — Initial Connect

Dikirim **satu kali saja** tepat saat device berhasil terhubung dan ter-pair. Fungsinya untuk menyinkronkan state awal clipboard antara kedua device.

```
body: {
  "content":   "<isi clipboard saat ini>",
  "timestamp": <unix timestamp ms kapan clipboard ini terakhir berubah>
}
```

Timestamp di sini krusial — digunakan untuk memutuskan device mana yang clipboard-nya lebih baru.

---

## 4. Alur Kerja Lengkap

### 4.1 Saat Device Pertama Kali Connect

```
Device A                          Device B
   |                                 |
   |--- clipboard.connect ---------->|
   |    { content, timestamp }       |
   |                                 | -- Bandingkan timestamp:
   |                                 |    Jika timestamp A > timestamp B lokal
   |                                 |    → set clipboard B = content A
   |                                 |    Jika timestamp A <= timestamp B lokal
   |                                 |    → abaikan (B sudah lebih baru)
   |                                 |    Jika timestamp A == 0
   |                                 |    → abaikan (timestamp tidak diketahui)
```

Logika perbandingan timestamp ini penting untuk menghindari menimpa clipboard yang lebih baru dengan yang lebih lama, terutama bila kedua device baru saja di-unlock setelah lama tidak terhubung.

### 4.2 Saat Pengguna Meng-copy Teks (Live Sync)

```
Device A (pengguna copy teks)     Device B
   |                                 |
   | [ClipboardListener deteksi]     |
   |   → emit clipboardChanged       |
   |                                 |
   | [ClipboardPlugin terima event]  |
   |   → cek autoShare               |
   |   → cek apakah password?        |
   |   → kirim packet                |
   |                                 |
   |--- clipboard ------------------>|
   |    { content: "teks baru" }     |
   |                                 | [ClipboardPlugin terima packet]
   |                                 |   → ClipboardListener.set_text()
   |                                 |   → clipboard B = "teks baru"
```

### 4.3 Mekanisme Pencegahan Loop

Tanpa mekanisme ini, kejadian berikut bisa terjadi: A mengirim ke B → B set clipboard → B mendeteksi clipboard berubah → B kirim ke A → A set clipboard → A deteksi berubah → ... dan seterusnya tanpa henti.

Solusi di KDE Connect: ketika `set_text()` dipanggil, state internal listener langsung diperbarui ke konten baru **sebelum** menulis ke clipboard sistem. Sehingga saat OS memicu event perubahan clipboard, listener membandingkan konten baru dengan state internal yang sudah sama — dan tidak menganggapnya sebagai perubahan baru.

---

## 5. Logika Konfigurasi

Ada dua flag konfigurasi yang mengontrol perilaku pengiriman:

| Flag | Default | Fungsi |
|------|---------|--------|
| `autoShare` | `true` | Otomatis kirim setiap kali clipboard berubah |
| `sharePasswords` | `true` | Izinkan pengiriman konten bertipe password |

Alur pengecekan sebelum mengirim:

```
clipboardChanged dipanggil
  → apakah autoShare == false?
      → Ya: hentikan, jangan kirim
  → apakah contentType == Password?
      → Ya: apakah sharePasswords == false?
          → Ya: hentikan, jangan kirim
  → Kirim packet ke remote
```

Fungsi `isAutoShareDisabled()` mengembalikan `true` jika salah satu dari dua kondisi ini berlaku: autoShare mati, atau autoShare hidup tapi sharePasswords mati. Digunakan oleh UI untuk menampilkan indikator bahwa sync tidak sepenuhnya aktif.

---

## 6. Deteksi Konten Password

Di C++, password dideteksi via MIME type khusus pada clipboard data:

```
mime type: "x-kde-passwordManagerHint"
value:     "secret"
```

Ini adalah konvensi yang digunakan oleh password manager di Linux (KWallet, KeePass, dll.) untuk menandai konten clipboard sebagai sensitif.

Pada implementasi di platform lain (terutama Windows dan macOS), mekanisme deteksi password ini mungkin tidak tersedia atau berbeda. Dalam kasus tersebut, content type bisa di-default ke `Unknown` dan keputusan apakah konten itu password diserahkan ke pengguna.

---

## 7. Penanganan Timestamp

Timestamp disimpan sebagai **Unix timestamp dalam milliseconds** (bukan detik). Poin-poin penting:

- Diperbarui setiap kali `refreshContent()` dipanggil (baik karena clipboard lokal berubah, maupun karena `set_text()` dari remote)
- Nilai `0` berarti timestamp tidak diketahui — packet connect dengan timestamp `0` harus diabaikan
- Pada packet connect, hanya terima konten remote jika `timestamp_remote > timestamp_lokal`

---

## 8. Pertimbangan Platform

### Linux
Clipboard tersedia via X11 atau Wayland. Di KDE, diakses melalui `KSystemClipboard`. Untuk Rust, library `arboard` cukup untuk teks biasa, tapi tidak mengekspos MIME type — sehingga deteksi password membutuhkan library level lebih rendah seperti `x11-clipboard` atau integrasi D-Bus ke KWallet.

### macOS
Tidak ada push notification untuk perubahan clipboard. KDE Connect C++ menggunakan `QTimer` 1000ms untuk polling. Implementasi Rust perlu melakukan hal yang sama — polling periodik setiap ~500-1000ms.

### Windows
Clipboard change notification tersedia via `WM_CLIPBOARDUPDATE` message. Lebih efisien dari polling, bisa diakses via WinAPI.

---

## 9. Dependensi yang Dibutuhkan (Rust)

| Kebutuhan | Library yang Direkomendasikan |
|-----------|-------------------------------|
| Akses clipboard | `arboard` (cross-platform, teks biasa) |
| Serialisasi packet | `serde` + `serde_json` |
| Async runtime | `tokio` |
| Enkripsi koneksi | `rustls` atau `native-tls` |
| Logging | `tracing` |
| Timestamp | `std::time::SystemTime` (built-in) |

---

## 10. Ringkasan Alur Implementasi

Urutan yang disarankan saat mengimplementasi:

1. **Definisikan `NetworkPacket`** — struct untuk dua tipe packet clipboard dengan serialisasi JSON
2. **Buat `ClipboardState`** — struct untuk menyimpan `content`, `content_type`, dan `update_timestamp`
3. **Buat `ClipboardListener`** — logic untuk membaca clipboard sistem, polling loop, dan `set_text()` dengan pencegahan loop
4. **Buat `ClipboardPlugin`** — sambungkan listener ke network layer, implementasi `on_connected()` dan `receive_packet()`
5. **Implementasi konfigurasi** — load/save flag `autoShare` dan `sharePasswords`
6. **Integrasi ke koneksi TLS** — pastikan packet dikirim melalui koneksi yang sudah ter-pair dan terenkripsi