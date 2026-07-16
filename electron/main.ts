// Electron 主进程:负责创建应用窗口。
// 开发时加载 Vite 本地服务器(热更新),打包后加载构建好的静态文件。
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { initDb } from './db'
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
} from './queries'
import { exportExcel, backupData, restoreData, importExcel } from './io'

// 是否处于开发模式:开发时通过环境变量 VITE_DEV 判断
const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    title: '小白记账',
    webPreferences: {
      // 安全设置:渲染进程不直接访问 Node,通过 preload 暴露受控接口
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

// 注册界面可调用的后台接口(IPC):界面发请求 → 主进程查数据库 → 返回结果
function registerIpcHandlers() {
  ipcMain.handle('categories:getAll', () => getCategories())
  ipcMain.handle('categories:add', (_e, cat) => addCategory(cat))
  ipcMain.handle('categories:update', (_e, cat) => updateCategory(cat))
  ipcMain.handle('categories:delete', (_e, id) => deleteCategory(id))
  ipcMain.handle('records:getAll', () => getRecords())
  ipcMain.handle('records:add', (_e, record) => addRecord(record))
  ipcMain.handle('records:update', (_e, record) => updateRecord(record))
  ipcMain.handle('records:delete', (_e, id) => deleteRecord(id))
  ipcMain.handle('records:summary', () => getSummary())
  ipcMain.handle('io:exportExcel', () => exportExcel())
  ipcMain.handle('io:backup', () => backupData())
  ipcMain.handle('io:restore', () => restoreData())
  ipcMain.handle('io:importExcel', () => importExcel())
}

app.whenReady().then(async () => {
  // 先初始化数据库(建表 + 灌入默认分类),再开窗口
  await initDb(app.getPath('userData'))
  registerIpcHandlers()
  createWindow()

  // macOS 习惯:点击 Dock 图标且没有窗口时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 除 macOS 外,关闭所有窗口即退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
