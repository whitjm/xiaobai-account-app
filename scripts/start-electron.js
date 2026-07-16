// 启动器:编译 TypeScript 后启动 Electron
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const root = path.join(__dirname, '..');

// 清理旧的编译文件
const distElectron = path.join(root, 'dist-electron');
if (fs.existsSync(distElectron)) {
  fs.rmSync(distElectron, { recursive: true });
}

// 编译 TypeScript
console.log('编译 Electron TypeScript...');
try {
  execSync('npx tsc --project tsconfig.electron.json', { stdio: 'inherit', cwd: root });
} catch (e) {
  console.error('编译失败:', e.message);
  process.exit(1);
}

// 启动 Electron
console.log('启动 Electron...');
const electronPath = require('electron');
const child = spawn(electronPath, ['.'], { stdio: 'inherit', env, cwd: root });
child.on('close', (code) => process.exit(code ?? 0));
