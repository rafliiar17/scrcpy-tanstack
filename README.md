# ScrcpyGUI Pro v0.1.0

![ScrcpyGUI Pro Banner](https://img.shields.io/badge/Scrcpy-Pro-blue?style=for-the-badge&logo=android)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=for-the-badge&logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)

**ScrcpyGUI Pro** is a premium, professional-grade Android Device Manager built with **Tauri v2**, **Tanstack Ecosystem**, and **Rust**. It provides a high-performance, low-latency interface for mirroring, managing, and debugging Android devices.

## ✨ Key Features

- 📱 **High-Performance Mirroring**: Powered by `scrcpy` with support for H.264/H.265 codecs and 60+ FPS.
- 💻 **Interactive Android Shell**: A persistent, real-time terminal (`xterm.js`) with PTY support.
- 📜 **Session Persistence**: Shell history and Application Logs (`logcat`) are preserved globally across navigation tabs.
- 📂 **Advanced File Manager**: High-speed file transfers with real-time progress bars and disk-based polling for 100% accuracy.
- 🛠️ **Developer Tools**: One-click TCP/IP connection, Reboot options (Recovery, Bootloader, EDL), and detailed System Monitoring.
- 🎨 **Premium UI/UX**: Modern dark mode, ShadcnUI components, and JetBrains Mono typography for a pro developer experience.

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.3.11+)
- [Rust](https://www.rust-lang.org/) (v1.75+)
- [ADB (Android Debug Bridge)](https://developer.android.com/tools/adb) installed and in your PATH.

### Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/scrcpy-tanstack.git
   cd scrcpy-tanstack
   ```

2. **Install dependencies**:
   ```bash
   bun install # or npm install
   ```

3. **Run in development mode**:
   ```bash
   bun run tauri dev
   ```

## 📦 Packaging & Distribution

### 🐧 Linux (AppImage / .deb)

To build for Linux, run the following command on a Linux machine:

```bash
bun run tauri build
```

The output will be located in `src-tauri/target/release/bundle/appimage/` and `deb/`.

### 🪟 Windows (MSI / EXE)

To build for Windows, run the following command on a Windows machine:

```bash
bun run tauri build
```

The output will be located in `src-tauri/target/release/bundle/msi/` and `nsis/`.

> [!NOTE]
> Cross-compilation (building Windows from Linux or vice versa) is possible with specialized tools like `xwin` or Docker, but it is highly recommended to build on the native OS for the most stable results.

## 🗺️ Roadmap

See [ROADMAP.md](./ROADMAP.md) for the future vision of ScrcpyGUI Pro.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
