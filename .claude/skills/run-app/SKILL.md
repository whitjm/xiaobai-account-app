---
name: run-app
description: 启动"小白记账"桌面软件（开发模式）。当用户想打开/运行软件、查看软件效果、或说"启动项目""跑起来看看"时使用。
---

# 启动小白记账

帮用户把记账软件跑起来（开发模式），方便随时打开看效果。

## 操作步骤

1. 在项目根目录 `e:\ItHeima\记账APP` 用后台方式运行启动命令：

   ```
   npm run dev
   ```

   必须用 `run_in_background: true` 后台运行，因为这是一个持续运行的进程（同时起 Vite 前端服务和 Electron 桌面窗口），不会自己结束。

2. 启动后等待几秒，读取后台任务输出，确认：
   - Vite 已在 `http://localhost:5173` 启动；
   - Electron 桌面窗口已弹出（日志里没有报错）。

3. 用一两句大白话告诉用户"软件已经打开了，桌面上应该弹出了记账窗口"。如果日志里有报错，把关键错误告诉用户并帮忙排查。

## 关闭软件 / 清理进程

当用户说"关掉软件""停掉项目""帮我清理端口"，或用户手动叉掉了窗口、想确保进程都被杀干净时，执行以下清理：

1. 如果启动的后台任务还在，用 TaskStop 停掉它（`npm run dev` 用了 concurrently 的 `-k` 参数，关掉一个会连带关掉 Vite 和 Electron）。
2. 检查开发端口 5173 是否还被占用：`netstat -ano | grep ':5173' | grep LISTENING`。若有占用，记下末尾的进程号（PID），用 `taskkill //PID <PID> //F` 杀掉。
3. 检查残留进程：`tasklist | grep -i electron` 和 `wmic process where "name='node.exe'" get ProcessId,CommandLine | grep -iE 'vite|electron|concurrently|start-electron|5173'`。若有残留，同样用 `taskkill //PID <PID> //F` 逐个杀掉。
4. 确认端口空闲、无残留进程后，用一句话告诉用户已经清理干净。

> 注意：用户手动叉掉窗口时，日志里 Electron 会显示 `exited with code 0`（正常退出，不是报错），随后 concurrently 会因 `-k` 把 Vite 一起关掉，这是预期行为。

## 注意事项

- 本机预设了环境变量 `ELECTRON_RUN_AS_NODE=1`，会导致 Electron 退化成普通 Node 而崩溃。项目已通过 `scripts/start-electron.js` 在启动前删除该变量，所以正常走 `npm run dev` 即可，不要绕过这个启动器。
- 如果 Electron 二进制缺失需要重装，用国内镜像：`ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"`。
- 想关闭软件时，直接关掉桌面窗口即可；如需从命令行彻底停止并清理端口，按上面「关闭软件 / 清理进程」这一节操作。
