// preload 桥接层:在网页(React)和 Electron 之间架一座受控的桥。
// 界面通过 window.api 调用这里暴露的方法,方法内部转发给主进程处理数据库。
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  ping: () => 'pong',
  // 分类
  getCategories: () => ipcRenderer.invoke('categories:getAll'),
  addCategory: (cat: { type: string; major: string; minor: string }) =>
    ipcRenderer.invoke('categories:add', cat),
  updateCategory: (cat: { id: number; major: string; minor: string }) =>
    ipcRenderer.invoke('categories:update', cat),
  deleteCategory: (id: number) => ipcRenderer.invoke('categories:delete', id),
  // 账目增删改查
  getRecords: () => ipcRenderer.invoke('records:getAll'),
  addRecord: (record: {
    type: string
    amount: number
    major: string
    minor: string
    date: string
    note?: string
  }) => ipcRenderer.invoke('records:add', record),
  updateRecord: (record: {
    id: number
    type: string
    amount: number
    major: string
    minor: string
    date: string
    note?: string
  }) => ipcRenderer.invoke('records:update', record),
  deleteRecord: (id: number) => ipcRenderer.invoke('records:delete', id),
  getSummary: () => ipcRenderer.invoke('records:summary'),
  // 数据导入导出
  exportExcel: () => ipcRenderer.invoke('io:exportExcel'),
  backupData: () => ipcRenderer.invoke('io:backup'),
  restoreData: () => ipcRenderer.invoke('io:restore'),
  importExcel: () => ipcRenderer.invoke('io:importExcel'),
})
