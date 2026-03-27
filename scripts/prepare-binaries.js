const fs = require('fs');
const path = require('path');

const platform = process.platform;
let platformDir = '';

if (platform === 'win32') {
  platformDir = 'windows';
} else if (platform === 'darwin') {
  platformDir = 'macos';
} else if (platform === 'linux') {
  platformDir = 'linux';
}

if (!platformDir) {
  process.exit(0);
}

// Adjusted paths relative to project root
const source = path.join(__dirname, '..', 'src-tauri', 'resources', 'bin', platformDir);
const target = path.join(__dirname, '..', 'src-tauri', 'resources', 'bin-bundled');

if (fs.existsSync(target)) {
  fs.rmSync(target, { recursive: true, force: true });
}

fs.mkdirSync(target, { recursive: true });

if (fs.existsSync(source)) {
  console.log(`Copying binaries from ${source} to ${target}...`);
  fs.cpSync(source, target, { recursive: true });
} else {
  console.error(`Source directory ${source} does not exist!`);
  process.exit(1);
}
