// Electron 主进程:负责创建应用窗口。
// 开发时加载 Vite 本地服务器(热更新),打包后加载构建好的静态文件。
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import { initDb, resetDatabase, getSetting, setSetting } from './db';
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  addRecord,
  getRecords,
  updateRecord,
  deleteRecord,
  getSummary,
} from './queries';
import { exportExcel, backupData, restoreData, importExcel } from './io';
import { log, initGlobalErrorHandlers } from './logger';

// 是否处于开发模式:开发时通过环境变量 VITE_DEV 判断
const isDev = !app.isPackaged;

// Whisper 服务进程
let whisperProcess: ChildProcess | null = null;
const WHISPER_PORT = 8765;

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.connect(port, '127.0.0.1', () => {
      client.destroy();
      resolve(true);
    });
    client.on('error', () => {
      client.destroy();
      resolve(false);
    });
    client.setTimeout(1000);
  });
}

async function startWhisperServer(): Promise<void> {
  // 先检查端口是否已被占用（服务可能已在运行）
  const portInUse = await checkPort(WHISPER_PORT);
  if (portInUse) {
    log('info', `Whisper 服务已在运行（端口 ${WHISPER_PORT}）`);
    return;
  }

  return new Promise((resolve) => {
    const scriptPath = isDev
      ? path.join(__dirname, '..', 'scripts', 'whisper_server.py')
      : path.join(process.resourcesPath!, 'scripts', 'whisper_server.py');

    log('info', `启动 Whisper 服务: ${scriptPath}`);

    whisperProcess = spawn('python', [scriptPath, String(WHISPER_PORT)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    whisperProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) log('info', `Whisper: ${msg}`);
    });

    whisperProcess.stderr?.on('data', (data: Buffer) => {
      log('info', `Whisper: ${data.toString().trim()}`);
    });

    whisperProcess.on('error', (err) => {
      log('error', 'Whisper server error', { error: err.message });
    });

    // 等待服务就绪
    setTimeout(resolve, 2000);
  });
}

function stopWhisperServer(): void {
  if (whisperProcess) {
    whisperProcess.kill();
    whisperProcess = null;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    title: '小白记账',
    autoHideMenuBar: true,
    webPreferences: {
      // 安全设置:渲染进程不直接访问 Node,通过 preload 暴露受控接口
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // 开发模式下按 F12 打开开发者工具
    win.webContents.on('before-input-event', (_event, input) => {
      if (input.key === 'F12') {
        win.webContents.toggleDevTools();
      }
    });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// 注册界面可调用的后台接口(IPC):界面发请求 → 主进程查数据库 → 返回结果
function registerIpcHandlers() {
  ipcMain.handle('categories:getAll', () => getCategories());
  ipcMain.handle('categories:add', (_e, cat) => addCategory(cat));
  ipcMain.handle('categories:update', (_e, cat) => updateCategory(cat));
  ipcMain.handle('categories:delete', (_e, id) => deleteCategory(id));
  ipcMain.handle('records:getAll', () => getRecords());
  ipcMain.handle('records:add', (_e, record) => addRecord(record));
  ipcMain.handle('records:update', (_e, record) => updateRecord(record));
  ipcMain.handle('records:delete', (_e, id) => deleteRecord(id));
  ipcMain.handle('records:summary', () => getSummary());
  ipcMain.handle('io:exportExcel', () => exportExcel());
  ipcMain.handle('io:backup', () => backupData());
  ipcMain.handle('io:restore', () => restoreData());
  ipcMain.handle('io:importExcel', () => importExcel());
  ipcMain.handle('database:reset', () => {
    resetDatabase();
    return { success: true };
  });

  // 语音识别：通过本地 Whisper 服务转写音频
  ipcMain.handle('speech:transcribe', async (_e, audioBase64: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:${WHISPER_PORT}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: Buffer.from(audioBase64, 'base64'),
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '识别失败' };
    }
  });

  // 设置读写
  ipcMain.handle('settings:get', (_e, key: string) => getSetting(key));
  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    setSetting(key, value);
    return { success: true };
  });
}

app.whenReady().then(async () => {
  // 初始化全局错误处理
  initGlobalErrorHandlers();
  log('info', 'Application starting', { version: app.getVersion() });

  // 启动本地 Whisper 语音识别服务
  try {
    await startWhisperServer();
    log('info', 'Whisper server started');
  } catch (err) {
    log('error', 'Failed to start whisper server', { error: String(err) });
  }

  // 先初始化数据库(建表 + 灌入默认分类),再开窗口
  await initDb(app.getPath('userData'));
  registerIpcHandlers();
  createWindow();
  log('info', 'Application started successfully');

  // macOS 习惯:点击 Dock 图标且没有窗口时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 除 macOS 外,关闭所有窗口即退出应用
app.on('window-all-closed', () => {
  stopWhisperServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopWhisperServer();
});
