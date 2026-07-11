---
name: rebuild-app
description: 把"小白记账"重新打包成桌面安装程序。当用户想重新打包、生成新的安装文件、出一个新版本的 .exe/.dmg 时使用。
---

# 重新打包小白记账

把当前代码重新打包成可安装的桌面软件。产物输出到项目的 `release/` 目录。

## 操作步骤

按顺序完成以下四步。

### 第一步：清理旧的打包文件

1. 确认软件没在开发模式下运行（Electron/Vite 进程若还开着可能占用文件）。必要时先按 `/run-app` 技能里的「关闭软件 / 清理进程」清一遍。
2. 删除上一次的打包产物，避免新旧文件混在一起：清空项目根目录下的 `release/` 目录（如果存在）。
3. 告诉用户旧的打包文件已经清理干净。

### 第二步：确认依赖完整

1. 检查项目根目录 `e:\ItHeima\记账APP` 下是否有 `node_modules` 目录，且关键依赖齐全（electron、electron-builder、vite、sql.js 等）。
2. 如果缺失或不确定，执行 `npm install` 补齐依赖。若 Electron 二进制下载失败，用国内镜像：`ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"`。
3. 确认依赖没问题后再进入下一步。

### 第三步：编译并打包安装文件

在项目根目录 `e:\ItHeima\记账APP` 执行打包命令：
- **Windows（本机默认）**：`npm run dist:win` — 先 `vite build` 编译前端，再 electron-builder 生成 NSIS 安装程序 `.exe`。
- Mac：`npm run dist:mac` — 生成 `.dmg`（只能在 Mac 上打，Windows 打不了）。
- 当前平台就打对应平台的版本。用户没特别说明时，本机（win32）就用 `npm run dist:win`。

打包耗时较长（几十秒到几分钟），用较长的超时时间运行，不要中途打断。

### 第四步：确认打包结果

1. 查看 `release/` 目录，确认产物存在：安装程序文件名形如 `小白记账-安装程序-<版本号>.exe`（版本号取自 package.json 的 `version`）。
2. 检查文件大小是否正常（应有几十 MB，太小说明打包不完整）。
3. 用一两句大白话告诉用户：打包好了，安装程序在 `release/` 文件夹里，文件名叫什么、多大。如果打包过程报错，把关键错误告诉用户并帮忙排查。

## 已知的坑

- **winCodeSign 解压失败**：electron-builder 首次打包会下载 winCodeSign 工具包，里面含 macOS 的符号链接，在 Windows 上解压需要管理员权限，可能报错。之前的解决办法是手动解压该包时排除其中的 `darwin` 目录。如果这次又卡在这里，参照 CLAUDE.md 开发记录（2026-07-09 阶段 7）里的处理方式。
- **sql.js 的 wasm 引擎**：`package.json` 的 build 配置已把 `sql-wasm.wasm` 打进包并 `asarUnpack` 解出来，`electron/db.js` 以二进制方式读取它。这块已配好，不用动。

## 注意事项

- 打包不会自动改版本号。若用户想出一个"新版本号"，需先改 `package.json` 里的 `version` 字段，再打包，产物文件名会跟着变。用户没提就沿用当前版本号。
- 打包只是在本地生成安装文件，不涉及上传/发布到网上。
