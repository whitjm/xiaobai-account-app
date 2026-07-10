# 小白记账

一款简单易用的桌面记账软件,帮你随手记录每一笔人民币花销,并按「大类 / 小类」两级分类管理。记账要快、要简单,分类清楚,数据看得明白。

支持 **Windows** 和 **macOS**,数据全部保存在本地电脑,不联网、不上传。

## 功能特性

- **记支出也记收入**:每笔记录含类型、金额(精确到分)、一级大类、二级小类、日期、备注。
- **两级分类**:支出、收入各有独立的分类体系;内置一套默认分类,开箱即用。
- **自定义分类**:可新增、重命名、删除自己创建的分类;软件预置的分类受保护,不可修改删除。
- **账目管理**:列表查看、编辑、删除(删除前有确认),自动合计总支出 / 总收入 / 结余。
- **时间筛选**:本周 / 本月 / 本年 / 全部 / 自定义日期区间,合计与列表跟随所选范围联动。
- **统计图表**:饼图看分类占比,折线图看金额趋势,支持支出 / 收入切换。
- **数据导入导出**:导出 / 导入 Excel,备份 / 恢复 JSON,通过系统对话框选择文件。
- **界面**:iOS 风格 + 毛玻璃质感,含分段控件、点击回弹、淡入等动效。

## 技术栈

- **桌面框架**:[Electron](https://www.electronjs.org/) — 用网页技术打包成桌面软件,一套代码同时出 Windows 和 Mac 版。
- **界面**:[React](https://react.dev/) + [Vite](https://vitejs.dev/) — 组件化开发,构建快。
- **数据存储**:[sql.js](https://sql.js.org/)(SQLite)— 数据存在本地一个数据库文件里,备份只需复制文件。
- **图表**:[Recharts](https://recharts.org/)。
- **Excel 读写**:[SheetJS (xlsx)](https://sheetjs.com/)。

## 快速开始(开发模式)

需要先装好 [Node.js](https://nodejs.org/)(建议 18 及以上版本)。

```bash
# 1. 安装依赖
npm install

# 2. 启动开发模式(同时起 Vite 和 Electron,支持热更新)
npm run dev
```

> 提示:若 Electron 的二进制文件下载失败,可用国内镜像:
> `ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" npm install`

## 打包成安装程序

```bash
npm run dist:win   # 打包 Windows 安装程序(.exe)
npm run dist:mac   # 打包 macOS 安装程序(.dmg,需在 Mac 上执行)
```

打包结果输出到 `release/` 目录。

## 项目结构

```
记账APP/
├── electron/            Electron 主进程与后台逻辑
│   ├── main.js          创建窗口、注册 IPC 接口
│   ├── preload.js       安全桥接:向界面暴露受控接口
│   ├── db.js            SQLite 初始化、建表、落盘
│   ├── seed-categories.js  首次运行灌入默认分类
│   ├── queries.js       账目与分类的增删改查
│   └── io.js            Excel / JSON 导入导出
├── src/                 React 界面
│   ├── App.jsx          主布局(左侧菜单 + 内容区)
│   ├── components/      各功能组件(记账、统计、分类管理等)
│   └── utils/           工具(分类图标等)
├── scripts/             启动辅助脚本
└── package.json         依赖与构建配置
```

## 数据与隐私

所有账目数据保存在你本机的用户数据目录下的 `xiaobai.db` 文件中,**不会联网上传**。想备份时,用软件内的「备份」功能导出 JSON,或直接复制该数据库文件即可。

## 许可证

[MIT](LICENSE)


