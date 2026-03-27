# ScrcpyGUI Pro v0.1.2

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
- 📦 **Zero-Dependency Setup**: Bundled ADB binaries with mandatory Windows DLLs for a 100% offline-ready, out-of-the-box experience.
- 🧙 **Intelligent Connection Wizard**: Distro-aware setup instructions for Linux and automated troubleshooting for manual driver issues.
- 🎨 **Premium UI/UX**: Modern dark mode, ShadcnUI components, and JetBrains Mono typography for a pro developer experience.

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.3.11+)
- [Rust](https://www.rust-lang.org/) (v1.75+)
- [ADB (Android Debug Bridge)](https://developer.android.com/tools/adb) - *Now bundled internally for a zero-config experience, but can still use system PATH if preferred.*

### Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rafliiar17/scrcpy-tanstack.git
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

### 📦 Packaging & Distribution

This project is configured with **GitHub Actions** to automate the building and packaging process.

- **🐧 Linux**: Automated builds for `.deb`, `.rpm`, and `.AppImage`.
- **🪟 Windows**: Automated builds for `.exe` (NSIS) and `.msi`.
- **🍎 macOS**: Automated builds for `.dmg` and `.app`.

#### How to trigger a Build/Release:
1.  **Tag it**: Run `git tag v0.1.0` then `git push --tags`.
2.  **GitHub Actions**: Go to the **Actions** tab on your GitHub repository, select "Release", and click "Run workflow".
3.  **Drafts**: Once finished, a new draft release will appear in the "Releases" section of your repo with all binaries attached.

## 🗺️ Roadmap & History

- [Roadmap](./docs/ROADMAP.md): Future vision and planned features.
- [Changelog](./docs/CHANGELOG.md): History of changes and releases.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
