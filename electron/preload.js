// preload 桥接层:在网页(React)和 Electron 之间架一座受控的桥。
// 界面通过 window.api 调用这里暴露的方法,方法内部转发给主进程处理数据库。
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // 分类
  getCategories: () => ipcRenderer.invoke('categories:getAll'),
  addCategory: (cat) => ipcRenderer.invoke('categories:add', cat),
  updateCategory: (cat) => ipcRenderer.invoke('categories:update', cat),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),
  // 账目增删改查
  getRecords: () => ipcRenderer.invoke('records:getAll'),
  addRecord: (record) => ipcRenderer.invoke('records:add', record),
  updateRecord: (record) => ipcRenderer.invoke('records:update', record),
  deleteRecord: (id) => ipcRenderer.invoke('records:delete', id),
  // 数据导入导出
  exportExcel: () => ipcRenderer.invoke('io:exportExcel'),
  backupData: () => ipcRenderer.invoke('io:backup'),
  restoreData: () => ipcRenderer.invoke('io:restore'),
  importExcel: () => ipcRenderer.invoke('io:importExcel'),
})
