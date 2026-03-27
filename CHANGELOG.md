# Changelog 📋

Semua perubahan penting pada proyek **ScrcpyGUI Pro** akan dicatat di sini. Format ini berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) dan mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-03-27

### ✨ Added
- **Apps Manager Pagination**: Paginasi sisi klien untuk menangani ratusan aplikasi Android dengan lancar.
- **Enhanced Filtering**: Dropdown kategori baru (All, User, System) untuk memfilter aplikasi dengan cepat.
- **Automated CI/CD**: Workflow GitHub Actions untuk membangun paket `.deb`, `.rpm`, `.AppImage`, dan `.exe` secara otomatis.
- **Wireless ADB UI**: Antarmuka baru untuk koneksi TCP/IP dengan mode pairing (Android 11+).

### 🎨 Improved
- **Compact Device Table**: Tabel perangkat yang dirancang ulang untuk kerapatan informasi yang lebih baik.
- **Premium Layout**: Implementasi lebar 90% terpusat dan tinggi yang disesuaikan untuk pengalaman visual "Pro Max".
- **ShadcnUI Integration**: Migrasi besar-besaran komponen dashboard ke sistem desain Shadcn.

### 🔧 Technical
- Migrasi build system ke **Bun** untuk performa instalasi dan build yang lebih cepat.
- Penambahan skrip build otomatis untuk platform Linux dan Windows di workflow rilis.

---

> [!TIP]
> Lihat [ROADMAP.md](./ROADMAP.md) untuk melihat rencana fitur mendatang di Q3 dan Q4 2026.
