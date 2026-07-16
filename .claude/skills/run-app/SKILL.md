---
name: run-app
description: 启动小白记账 APP(开发模式)。当用户想打开/运行项目、查看效果、或说"启动项目""跑起来看看""运行一下"时使用。
---

# 启动小白记账 APP

帮用户把小白记账跑起来(开发模式),方便随时打开看效果。

## 前提检查

启动前确认:
1. **Node.js 已安装**:运行 `node --version` 应有版本号输出。
2. **依赖已安装**:如果 `node_modules` 不存在,先 `npm install`。

## 操作步骤

### 方式一:一键启动(推荐)

直接运行:
```
npm run dev
```

这会同时启动:
- Vite 开发服务器(端口 5173)
- Electron 应用窗口

### 方式二:手动分步启动(排查问题时用)

1. 启动 Vite 前端(后台):
   ```
   npm run dev:vite
   ```

2. 启动 Electron(等 Vite 起来后,另一个终端):
   ```
   npm run dev:electron
   ```

3. 窗口会自动弹出

### 确认是否正常运行

- Electron 窗口正常打开 ✓
- 无报错日志
- 首页显示"本月结余"等数据

## 关闭项目

直接关掉 Electron 窗口即可。
如需清理进程:
- 杀掉 Electron:taskkill /F /IM electron.exe
- 杀掉 Node(Vite):taskkill /F /IM node.exe

## 注意事项

- 首次启动会自动下载 Electron 二进制,如遇网络问题,设置镜像:
  `ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"`
- 本项目数据存储在用户本地 SQLite 数据库文件,路径在用户数据目录下。
