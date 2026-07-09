// 启动器:某些环境预设了 ELECTRON_RUN_AS_NODE=1,会让 Electron 退化成普通 Node 运行,
// 导致拿不到应用窗口对象。这里在启动 Electron 前把该变量彻底删除,再以干净环境启动。
// 用 Node 运行本文件即可(见 package.json 的 dev:electron 脚本)。
const { spawn } = require('child_process')
const electronPath = require('electron')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(electronPath, ['.'], { stdio: 'inherit', env })
child.on('close', (code) => process.exit(code ?? 0))
