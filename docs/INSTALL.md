# TabHub 安装与使用指南（Windows / Mac / Linux）

本指南写给**没有开发经验**的用户：照着一步步做，就能从零把 TabHub 装进 Chrome，并在以后一键更新。

TabHub 是一个 Chrome 扩展：装好后，每次打开新标签页都会显示 TabHub 的书签管理界面。它目前**没有上架 Chrome 应用商店**，所以需要先在自己电脑上「构建」一次，再用 Chrome 的「开发者模式」加载。整个过程大约 15–30 分钟（主要时间花在下载安装软件上）。

> 遇到问题先看文末 [常见问题](#9-常见问题faq)。功能的详细用法见 [用户手册 USER_MANUAL.md](../USER_MANUAL.md)。

---

## 目录

1. [准备工作：安装 Chrome、Git、Node.js](#1-准备工作安装-chromegitnodejs)
2. [下载代码](#2-下载代码)
3. [构建扩展（生成 dist 文件夹）](#3-构建扩展生成-dist-文件夹)
4. [在 Chrome 中加载扩展](#4-在-chrome-中加载扩展)
5. [第一次使用](#5-第一次使用)
6. [以后如何更新](#6-以后如何更新)
7. [数据存在哪里？会不会同步？](#7-数据存在哪里会不会同步)
8. [卸载](#8-卸载)
9. [常见问题（FAQ）](#9-常见问题faq)

---

## 先认识一下「终端」

后面很多步骤需要在「终端」里输入命令。终端就是一个可以打字下命令的窗口：**把命令复制进去，按回车（Enter）执行**，等它跑完再输入下一条。

| 系统 | 怎么打开 | 本指南里叫它 |
|------|----------|--------------|
| **Windows** | 按键盘上的 `Win` 键，输入 `cmd`，点击「**命令提示符**」（Command Prompt） | 命令提示符 |
| **Mac** | 按 `⌘ + 空格` 打开「聚焦搜索」（Spotlight），输入 `终端`（或 `Terminal`），按回车 | 终端 |
| **Linux**（Ubuntu） | 按 `Ctrl + Alt + T`，或在应用菜单搜索「终端」（Terminal） | 终端 |

> **Windows 用户请优先使用「命令提示符」(cmd)**，不要用 PowerShell。PowerShell 在很多电脑上默认禁止运行脚本，可能导致 `npm` 命令报错（见 [FAQ 9.3](#93-windowspowershell-提示禁止运行脚本--执行策略)）。
>
> 安装完新软件（Git、Node.js）后，**请关掉终端窗口再重新打开**，否则终端可能还「认不出」新装的命令。

---

## 1. 准备工作：安装 Chrome、Git、Node.js

需要三样软件。已经装过的，用下面的「检查命令」确认版本即可。

| 软件 | 用途 | 版本要求 |
|------|------|----------|
| **Google Chrome** | 运行 TabHub | 使用最新稳定版即可（扩展清单未声明最低版本；建议保持 Chrome 自动更新） |
| **Git** | 下载和更新代码 | 任意较新版本（2.x） |
| **Node.js**（自带 npm） | 构建扩展 | **至少 20.19**；推荐安装 Node.js 官网标注为 **LTS** 的版本（截至 2026 年 10 月为 **24.x**） |

> Node.js 版本依据：仓库没有 `.nvmrc` 文件，`package.json` 里也没有 `engines` 字段；但 `package-lock.json` 中的测试依赖 **jsdom** 声明需要 Node `^20.19.0 || ^22.12.0 || >=24.0.0`（并非 vitest 提出该下限），项目的 CI 使用 Node 20 构建。Node.js 20 已停止官方维护，所以推荐直接装 LTS 版（24.x 已验证可以构建）。

### 1.1 Google Chrome

**Windows / Mac**

- 下载：<https://www.google.com/chrome/>（中国大陆也可用 <https://www.google.cn/chrome/>）
- 已安装的话，打开 Chrome，地址栏输入 `chrome://settings/help` 回车（「关于 Chrome」/ About Chrome），它会自动检查并更新到最新版。

**Linux（Ubuntu 22.04 / 24.04，推荐 Google Chrome）**

TabHub 按 **Google Chrome** 开发与测试。Ubuntu 自带的 **Chromium**（或 Snap 版 Chromium）也能打开扩展页面，但新标签页覆盖、扩展加载路径等行为可能与 Chrome 不完全一致，**建议安装官方 Google Chrome**。

在终端逐行执行（需要 `sudo` 密码；适用于 64 位 amd64）：

```bash
cd ~/Downloads
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb
```

- 安装成功后，可在应用菜单打开「Google Chrome」，或在终端运行 `google-chrome`。
- 安装过程会自动加入 Google 的 apt 源，之后用系统更新即可升级 Chrome：`sudo apt update && sudo apt upgrade`。
- 已安装的话，在 Chrome 地址栏输入 `chrome://settings/help` 回车，确认已是最新版。
- 若没有 `wget`，可先 `sudo apt install -y wget`，或改用浏览器从 <https://www.google.com/chrome/> 下载 `.deb` 后，在下载目录执行上面的 `sudo apt install -y ./google-chrome-stable_current_amd64.deb`。

### 1.2 Git

**Windows**

1. 打开 <https://git-scm.com/downloads/win>，下载 **64-bit Git for Windows Setup**（安装包）。
2. 双击安装，安装向导里的选项**全部保持默认**，一路点「Next」，最后点「Install」→「Finish」。

**Mac**

1. 打开「终端」，输入：
   ```bash
   git --version
   ```
2. 如果显示 `git version 2.xx.x`，说明已经有 Git，跳过此步。
3. 如果弹出窗口提示需要安装「命令行开发者工具」（command line developer tools），点「**安装**」（Install），同意协议，等待安装完成后重新打开终端。
4. 也可以参考官网说明：<https://git-scm.com/downloads/mac>

**Linux（Ubuntu）**

在终端执行：

```bash
sudo apt update
sudo apt install -y git
```

**检查（Windows / Mac / Linux 相同）**：重新打开终端，输入

```bash
git --version
```

看到类似 `git version 2.47.1` 的输出就说明安装成功（数字不必完全一致）。

### 1.3 Node.js（会同时安装 npm）

**Windows / Mac（图形安装包）**

1. 打开 Node.js 官网下载页：<https://nodejs.org/zh-cn/download>
2. 选择标注 **LTS** 的版本，下载对应系统的安装包：
   - **Windows**：Windows 安装程序（`.msi`），64 位
   - **Mac**：macOS 安装程序（`.pkg`）
3. 双击安装包，**全部保持默认选项**，一路「下一步 / 继续」直到完成。
   - Windows 安装过程中如果出现「Tools for Native Modules」（安装原生模块编译工具）的勾选项，**不需要勾选**，TabHub 用不到。

**Linux（Ubuntu 22.04 / 24.04）——任选一种方式**

> 不要用 Ubuntu 默认源的 `sudo apt install nodejs`：22.04 / 24.04 自带的 Node 往往**低于**本项目要求的 `20.19`，构建或测试可能失败。请用下面的 **NodeSource** 或 **nvm**。

*方式 A：NodeSource（推荐，装完即可系统级使用 `node` / `npm`）*

```bash
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_24.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt install -y nodejs
```

（`setup_24.x` 对应推荐的 LTS 24.x；若你明确需要 Node 20，可把地址里的 `setup_24.x` 改成 `setup_20.x`，并确认版本 ≥ `20.19`。）

*方式 B：nvm（适合需要多版本 Node 的用户）*

```bash
sudo apt install -y curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
```

关掉终端再重新打开（或执行 `source ~/.bashrc`），然后安装 LTS：

```bash
nvm install --lts
nvm use --lts
```

**检查（Windows / Mac / Linux 相同）**：重新打开终端，依次输入

```bash
node -v
npm -v
```

- `node -v` 应显示 `v24.x.x`（或任何不低于 `v20.19.0` 的版本）。
- `npm -v` 显示任意版本号即可（如 `11.x.x`）。

> 如果提示「`'node' 不是内部或外部命令`」（Windows）或「`command not found: node`」（Mac / Linux），请关掉终端重新打开；仍不行就重启电脑后再试。用 nvm 安装时，务必在**新开的**终端里检查（nvm 依赖 shell 启动脚本）。

---

## 2. 下载代码

我们约定把代码放在一个**固定目录**里，以后不要随意移动（Chrome 会记住这个位置，移动后扩展会失效，见 [FAQ 9.5](#95-移动了代码文件夹后扩展坏了--不见了)）。

| 系统 | 推荐位置 |
|------|----------|
| **Mac** | `~/code/chrome_personal_bookmark`（即 `/Users/<你的用户名>/code/chrome_personal_bookmark`） |
| **Windows** | `C:\Users\<你的用户名>\code\chrome_personal_bookmark` |
| **Linux** | `~/code/chrome_personal_bookmark`（即 `/home/<你的用户名>/code/chrome_personal_bookmark`） |

### Windows（在「命令提示符」里逐行执行）

```bat
mkdir "%USERPROFILE%\code"
cd /d "%USERPROFILE%\code"
git clone https://github.com/yiyunlu/chrome_personal_bookmark.git
cd chrome_personal_bookmark
```

> `%USERPROFILE%` 会自动替换成 `C:\Users\<你的用户名>`。想知道具体路径，可以输入 `echo %USERPROFILE%` 查看。
> 如果 `mkdir` 提示「子目录或文件已经存在」，说明文件夹已建好，忽略即可。

### Mac / Linux（在「终端」里逐行执行）

```bash
mkdir -p ~/code
cd ~/code
git clone https://github.com/yiyunlu/chrome_personal_bookmark.git
cd chrome_personal_bookmark
```

**成功的样子**：`git clone` 会显示 `Cloning into 'chrome_personal_bookmark'...` 和下载进度，最后没有出现 `fatal:` 字样的错误。之后在文件管理器里能看到 `code` 文件夹下多了 `chrome_personal_bookmark` 文件夹。

> 如果提示 `fatal: destination path 'chrome_personal_bookmark' already exists`，说明之前已经下载过，直接 `cd chrome_personal_bookmark` 进入，然后看 [第 6 节 更新](#6-以后如何更新) 即可。

---

## 3. 构建扩展（生成 dist 文件夹）

「构建」会把源代码打包成 Chrome 能直接加载的扩展，结果放在代码目录下的 **`dist`** 文件夹里。**Chrome 加载的是 `dist`，不是整个代码文件夹。**

第一次构建有两种方式，**任选其一**（结果完全一样）。

### 方式 A：手动执行两条命令（推荐第一次用，出错时更容易看清）

确保终端当前位于代码目录（上一步最后的 `cd chrome_personal_bookmark` 已经进入了）。Windows / Mac / Linux 命令相同：

```bash
npm ci
npm run build
```

- `npm ci`：按照仓库里锁定的版本下载依赖，放进 `node_modules` 文件夹。第一次需要几分钟，取决于网速。**只要看到 `added ... packages` 且没有 `npm ERR!` / `npm error` 就算成功**；出现 `npm warn` 黄字警告一般可以忽略。
- `npm run build`：构建扩展。最后一行出现 `✓ built in ...s` 就说明成功；中间那条 `Some chunks are larger than 500 kB` 的提示是正常的，可以忽略。

### 方式 B：直接运行同步脚本

仓库自带「同步脚本」，第一次运行时因为还没有 `node_modules`，它会**自动执行 `npm ci`**，然后执行 `npm run build`：

- **Mac / Linux**：
  ```bash
  cd ~/code/chrome_personal_bookmark
  bash scripts/sync.sh
  ```
- **Windows**（命令提示符）：
  ```bat
  cd /d "%USERPROFILE%\code\chrome_personal_bookmark"
  scripts\sync.cmd
  ```

脚本最后会打印类似：

```
sync: build OK — manifest version 0.1.0, git a108a06
sync: Reload the extension at chrome://extensions (click the reload icon on TabHub).
```

（Windows 上 `—` 显示为 `-`，版本号和 git 编号以实际为准。）

### 检查构建结果

打开代码目录，确认有一个 `dist` 文件夹，里面有 `manifest.json`、`index.html` 等文件：

- Mac / Linux：`~/code/chrome_personal_bookmark/dist`
- Windows：`C:\Users\<你的用户名>\code\chrome_personal_bookmark\dist`

---

## 4. 在 Chrome 中加载扩展

### 4.1 打开扩展程序页面

在 Chrome 地址栏输入下面的地址并回车：

```
chrome://extensions
```

（也可以点右上角「⋮」→「扩展程序」→「管理扩展程序」/ Extensions → Manage Extensions。）

### 4.2 开启「开发者模式」

在页面**右上角**找到「**开发者模式**」（Developer mode）开关，点击打开（开关变蓝）。

### 4.3 加载已解压的扩展程序

1. 开启开发者模式后，页面左上方会出现一排按钮，点击「**加载已解压的扩展程序**」（Load unpacked）。
2. 在弹出的选择文件夹窗口中，找到并选中 **`dist`** 文件夹：
   - **Mac**：按 `⌘ + Shift + G`，粘贴 `~/code/chrome_personal_bookmark/dist`，回车，然后点「**选择**」（Select）。
   - **Windows**：在窗口顶部地址栏粘贴 `%USERPROFILE%\code\chrome_personal_bookmark\dist`（或 `C:\Users\<你的用户名>\code\chrome_personal_bookmark\dist`），回车，然后点「**选择文件夹**」（Select Folder）。
   - **Linux**：在文件选择对话框中导航到 `~/code/chrome_personal_bookmark/dist`（或按 `Ctrl + L` 输入路径 `/home/<你的用户名>/code/chrome_personal_bookmark/dist`），选中 **`dist`** 后确认。
3. 注意：要选的是 **`dist` 这个文件夹本身**（打开后能看到 `manifest.json`），不要选上一层的 `chrome_personal_bookmark`。

成功后，扩展列表里会出现一张 **TabHub** 卡片（显示版本号，如 `0.1.0`），右下角开关为开启状态。

> 如果卡片上出现红色「**错误**」（Errors）按钮或提示「清单文件缺失或不可读取」（Manifest file is missing or unreadable），通常是选错了文件夹，或者还没有成功构建。请回到 [第 3 节](#3-构建扩展生成-dist-文件夹) 确认 `dist` 里有 `manifest.json`。

### 4.4 把 TabHub 图标固定到工具栏（可选，推荐）

1. 点击 Chrome 地址栏右侧的**拼图图标**「扩展程序」（Extensions）。
2. 在列表里找到 TabHub，点它右侧的**图钉图标**「固定」（Pin）。

之后工具栏上会一直显示 TabHub 图标，点击它会打开一个新的 TabHub 标签页。

### 4.5 打开新标签页，并选择「保留」更改

1. 按 `Ctrl + T`（Windows / Linux）或 `⌘ + T`（Mac）打开一个新标签页，应该能看到 TabHub 界面。
2. Chrome 可能会弹出一个提示，告诉你**有扩展更改了新标签页**（英文界面通常为 “Change back to Google?” / “Did you mean to change this page?”）。
3. **请点击「保留」（Keep it）**，不要点「改回」（Change it back）。中文界面按钮的确切文字可能因 Chrome 版本略有不同，选择表示「保留更改」的那个即可。

> 如果不小心点了「改回」（Change it back），Chrome 会**停用** TabHub。解决方法：回到 `chrome://extensions`，把 TabHub 卡片右下角的开关重新打开，再打开新标签页即可。

<!-- TODO: 截图占位 —— chrome://extensions 开发者模式开关 / 加载已解压的扩展程序 / 「保留」提示 -->

---

## 5. 第一次使用

第一次打开 TabHub 新标签页时：

- 如果你的书签里还没有名为 `TabHub` 的文件夹，TabHub 会**自动在 Chrome「书签栏」里创建一个 `TabHub` 文件夹**，作为它的专用书签源。
- 侧栏顶部的「书签源」下拉框可以在 `TabHub`、「书签栏」以及书签栏下的其他顶级文件夹之间切换，直接管理你已有的书签。
- 如果还没有任何自己创建的集合，页面上可能会显示一段新手引导，可以关闭。
- 界面语言默认跟随浏览器语言（中文浏览器显示中文），也可以在侧栏里切换。

几个最常用的功能（全部在本地完成）：

| 功能 | 怎么用 |
|------|--------|
| **全局搜索** | 按 `⌘K`（Mac）或 `Ctrl+K`（Windows / Linux），在一个输入框里同时搜索书签、集合和当前窗口已打开的标签页；`↑` `↓` 选择，`Enter` 打开，`Esc` 关闭 |
| **页面内搜索** | 按 `/` 聚焦顶部搜索框，支持模糊搜索 |
| **一键捕获** | 点工具栏「保存标签页」旁边的「**一键捕获**」，或在页面空白处按 `C`：把当前窗口所有网页标签页存进新集合「Captured · HH:mm」，**默认不关闭标签页**，8 秒内可撤销 |
| **拖已打开标签进集合** | 展开工具栏下方的「**已打开标签**」面板，把某个标签页拖到任意集合上松开，就会在该集合里新建一条书签，8 秒内可撤销 |
| **保存标签页** | 点工具栏「保存标签页」或按 `S`，把当前窗口的标签页保存为书签 |
| **删除与恢复** | 删除的书签会进入回收站（`.TabHub Trash` 文件夹），8 秒内可点「撤销」；之后可在侧栏底栏的「回收站」里恢复 |
| **主题** | 侧栏底栏的主题按钮，在「跟随系统 → 浅色 → 深色」之间循环切换 |

> 单键快捷键（`/`、`S`、`O`、`M`、`C`）只在没有聚焦输入框、也没有打开对话框时生效。

更多功能（编辑/移动书签、批量操作、自动整理、失效链接检测、AI 分类与助手、可选的 Claude API 等）请看 **[用户手册 USER_MANUAL.md](../USER_MANUAL.md)**。

---

## 6. 以后如何更新

当仓库有新版本时，用同步脚本更新，**然后在 Chrome 里重新加载扩展**。

### 6.1 运行同步脚本

**Mac / Linux**（终端）：

```bash
cd ~/code/chrome_personal_bookmark
bash scripts/sync.sh
```

**Windows**，两种方式任选：

- **方式一（双击）**：在文件资源管理器中打开 `C:\Users\<你的用户名>\code\chrome_personal_bookmark\scripts`，**双击 `sync.cmd`**。
  - 注意：脚本运行结束后窗口会**自动关闭**，来不及看结果。如果窗口一闪而过、或者更新后没有变化，请用方式二重新运行，看清提示。
- **方式二（命令提示符，推荐）**：
  ```bat
  cd /d "%USERPROFILE%\code\chrome_personal_bookmark"
  scripts\sync.cmd
  ```

看到 `sync: build OK — manifest version ..., git ...` 就表示更新并构建成功。

### 6.2 在 Chrome 里重新加载

1. 打开 `chrome://extensions`。
2. 在 TabHub 卡片上点击**圆形箭头图标**「重新加载」（Reload）。
3. 打开一个新标签页，就是新版本了（已经打开的 TabHub 标签页可以刷新一下或关掉重开）。

### 6.3 同步脚本到底做了什么

（了解即可，出错时有助于判断原因。）

1. **检查本地有没有改动**：如果仓库里**已被 Git 跟踪的文件**有未提交的修改，脚本会直接停止，不会帮你覆盖或暂存（见 [FAQ 9.2](#92-同步脚本提示-tracked-files-have-uncommitted-changes)）。你自己新建的、未被跟踪的文件不影响。
2. **拉取最新代码**：执行 `git fetch` 和 `git pull --ff-only`，更新的是**当前所在的分支**（不会自动切换到 `main`）。普通用户请保持在 `main` 分支，可用 `git branch --show-current` 查看。
3. **按需安装依赖**：脚本会在需要时自动跑 `npm ci` 重装依赖；如果还是报 `vite` 找不到（见 [FAQ 9.1](#91-vite-不是内部或外部命令--vite-is-not-recognized--vite-command-not-found)），请手动再跑一次 `npm ci`。
4. **构建**：运行 `npm run build`，重新生成 `dist`。
5. **打印结果**：显示扩展版本号和当前代码的 git 短编号，并提醒你去 `chrome://extensions` 重新加载。

> 因为 Chrome 一直指向同一个 `dist` 文件夹，所以更新后**不需要**重新「加载已解压的扩展程序」，只要点「重新加载」。

---

## 7. 数据存在哪里？会不会同步？

| 数据 | 存在哪里 | 会不会跨设备同步 | 卸载扩展后 |
|------|----------|------------------|------------|
| **书签、集合（文件夹）、回收站** | Chrome **原生书签**（通过 Chrome 书签 API 读写）。`TabHub` 文件夹默认在「书签栏」下；回收站是书签源文件夹里的 `.TabHub Trash` 文件夹 | **会**——前提是你登录了 Chrome 帐号并开启了「书签」同步（`chrome://settings/syncSetup`）。同步由 Chrome 完成，TabHub 没有自己的服务器 | **保留**，仍可在 `chrome://bookmarks` 里看到 |
| **界面偏好**：主题、语言、网格/列表视图、排序方式、当前书签源、当前集合、侧栏收起状态、新手引导是否已关闭 | 本机 `chrome.storage.local` | **不会**，只保存在这台电脑的这个 Chrome 配置里 | 被 Chrome 一并清除 |
| **Claude API Key**（仅在你于「设置」里填写时） | 本机 `chrome.storage.local` | **不会** | 被 Chrome 一并清除 |

补充说明：

- 你在 TabHub 里做的增删改，都是直接改 Chrome 书签，所以在 Chrome 自带的书签管理器（`chrome://bookmarks`）里能看到同样的结果，反之亦然。
- **扩展本身不会同步到其他电脑**：每台电脑都需要按本指南单独安装一次。装好后，书签会通过 Chrome 同步出现在各台电脑的 TabHub 里，但主题等界面偏好需要在每台电脑上各自设置。
- 在第二台电脑上安装时，建议先登录 Chrome 并等书签同步完成，再第一次打开 TabHub 新标签页。TabHub 会按名称查找已有的 `TabHub` 文件夹，找不到才新建；如果同步还没到就打开，可能会多出一个同名文件夹（可手动合并或删除）。
- TabHub 不会把书签上传到自己的服务器（它没有服务器）。只有以下情况会联网：
  - 你在「设置」里填写了 Claude API Key 后，AI 分类 / 智能搜索 / 聊天助手会把相关内容发送到 Anthropic 的接口（`api.anthropic.com`）；未填写时这些功能只用本地规则。
  - 使用「失效检测」时，会直接访问你书签里的各个网址来判断链接是否有效。

---

## 8. 卸载

1. 打开 `chrome://extensions`。
2. 在 TabHub 卡片上点击「**移除**」（Remove），在弹窗中再次点「移除」确认。
3. 之后新标签页会恢复为 Chrome 默认页面。

卸载后：

- **书签不会丢失**：`TabHub` 文件夹和 `.TabHub Trash` 文件夹仍保留在 Chrome 书签里。如果不再需要，可以在 `chrome://bookmarks` 里手动删除。
  > ⚠️ 删除 `TabHub` 文件夹会同时删除里面的所有书签；如果开启了 Chrome 同步，其他设备上的也会一起被删除。删除前请确认。
- 主题、语言等界面偏好和 Claude API Key 会被 Chrome 清除。
- **删除代码文件夹**（可选）：
  - Mac：在访达（Finder）中把 `~/code/chrome_personal_bookmark` 拖到废纸篓；或在终端执行 `rm -rf ~/code/chrome_personal_bookmark`（会直接删除，无法从废纸篓恢复）。
  - Linux：在文件管理器中删除 `~/code/chrome_personal_bookmark`；或在终端执行 `rm -rf ~/code/chrome_personal_bookmark`（会直接删除）。
  - Windows：在文件资源管理器中删除 `C:\Users\<你的用户名>\code\chrome_personal_bookmark` 文件夹。
- Git 和 Node.js 如果其他地方用不到，也可以按普通软件的方式卸载：
  - Windows：「设置 → 应用」；
  - Mac：Node.js 无图形卸载程序，保留不影响使用；
  - Linux：若用 NodeSource 安装，可 `sudo apt purge -y nodejs`；若用 nvm，删除 `~/.nvm` 并清理 `~/.bashrc` 里 nvm 相关行即可。Git 可用 `sudo apt remove -y git`。Google Chrome 可用 `sudo apt purge -y google-chrome-stable`。

---

## 9. 常见问题（FAQ）

### 9.1 `'vite' 不是内部或外部命令` / `'vite' is not recognized` / `vite: command not found`

完整报错类似：

- Windows：`'vite' 不是内部或外部命令，也不是可运行的程序或批处理文件。`（英文系统：`'vite' is not recognized as an internal or external command, operable program or batch file.`）
- Mac / Linux：`sh: vite: command not found` / `vite: command not found`

**原因**：依赖没有安装，或安装得不完整（`node_modules` 缺失或过期）。

**解决**：同步脚本会在需要时自动跑 `npm ci` 重装依赖。如果跑过同步脚本（或手动构建）后仍然报 `vite` 找不到，请在代码目录下手动再跑一次 `npm ci`，然后构建：

```bash
npm ci
npm run build
```

（Windows 先 `cd /d "%USERPROFILE%\code\chrome_personal_bookmark"`，Mac / Linux 先 `cd ~/code/chrome_personal_bookmark`。）然后去 `chrome://extensions` 点「重新加载」。

### 9.2 同步脚本提示 `tracked files have uncommitted changes`

完整提示：`sync: ERROR: tracked files have uncommitted changes. Commit, stash, or discard them first.`，下面还会列出被改动的文件。

**原因**：代码目录里有被 Git 跟踪的文件被修改了。脚本为了不覆盖你的改动，主动停止。最常见的情况是运行过 `npm install`（而不是 `npm ci`），导致 `package-lock.json` 被改动。

**解决**：

1. 在代码目录下查看改了什么：
   ```bash
   git status
   ```
2. 如果只有 `package-lock.json` 被改（或者你确定从没手动改过代码），执行下面的命令**放弃这些改动**，然后重新运行同步脚本：
   ```bash
   git restore package-lock.json
   ```
   如果列出的是其他文件、并且你确定不需要这些改动，可以用 `git restore .` 放弃所有已跟踪文件的改动（⚠️ 改动会丢失，无法恢复）。
3. 如果你不确定、想先保留改动，用 `git stash` 把改动暂存起来（之后可以用 `git stash pop` 取回），再运行同步脚本。

### 9.3 Windows：PowerShell 提示「禁止运行脚本」 / 执行策略

典型报错：

- `无法加载文件 ...\sync.ps1，因为在此系统上禁止运行脚本。`（`... cannot be loaded because running scripts is disabled on this system.`）
- `npm : 无法加载文件 C:\Program Files\nodejs\npm.ps1，因为在此系统上禁止运行脚本。`

**原因**：Windows PowerShell 默认的「执行策略」（Execution Policy）不允许运行脚本文件。

**解决**（任选其一）：

- **最简单**：不用 PowerShell，改用「**命令提示符**」(cmd)，并通过 `scripts\sync.cmd` 运行同步脚本。`sync.cmd` 内部会以 `-ExecutionPolicy Bypass` 方式只为这一次调用 PowerShell，**不需要改任何系统设置**。
- 一定要在 PowerShell 里运行同步脚本时，用这条命令（同样只对这一次生效）：
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\sync.ps1
  ```
- 如果希望 PowerShell 里能正常使用 `npm`，可以只为当前用户放宽执行策略（这会改变系统设置，请自行判断）：
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

### 9.4 Chrome 提示开发者模式扩展的警告

以「加载已解压的扩展程序」方式安装的扩展，Chrome 可能会显示一些提醒，例如：

- 部分 Chrome 版本 / 平台在启动时弹出「停用开发者模式扩展程序」（Disable developer mode extensions）之类的提示；
- 扩展页面上显示该扩展不是来自 Chrome 应用商店。

这是 Chrome 对所有未上架扩展的常规提醒，**不是 TabHub 出错**。如果弹窗询问是否停用，请**不要选择停用**，关闭提示或选择「取消」即可。如果 TabHub 已经被停用，到 `chrome://extensions` 把它的开关重新打开。

另外，请保持「开发者模式」开关处于**开启**状态。

### 9.5 移动了代码文件夹后，扩展坏了 / 不见了

**原因**：「加载已解压的扩展程序」只是让 Chrome 记住 `dist` 文件夹的**位置**。把代码文件夹移走、改名或删除后，Chrome 就找不到扩展文件了，扩展会报错或无法加载。

**解决**：

1. 打开 `chrome://extensions`，在出错的 TabHub 卡片上点「移除」（Remove）。
2. 点「加载已解压的扩展程序」，重新选择**新位置**下的 `dist` 文件夹（如果 `dist` 不存在，先在新位置执行 [第 3 节](#3-构建扩展生成-dist-文件夹) 的构建）。

说明：书签保存在 Chrome 书签里，**不会丢失**；但未上架扩展的内部 ID 与文件夹位置有关，换位置重新加载后相当于一个新扩展，主题、语言等界面偏好以及 Claude API Key 需要重新设置。所以建议一开始就放在固定位置（第 2 节推荐的目录），之后不要再移动。

### 9.6 同步脚本提示 `git pull --ff-only failed`

完整提示：`sync: ERROR: git pull --ff-only failed (non-fast-forward or network error). Resolve manually, then re-run.`

- 多数情况是**网络问题**（连不上 GitHub）。检查网络后重新运行脚本。
- 如果网络正常仍失败，可能是本地分支和远程不一致（例如在本地做过提交）。普通用户可以先运行 `git branch --show-current` 确认是否在 `main` 分支；不确定如何处理时，请联系项目维护者。

### 9.7 打开新标签页还是 Chrome 默认页面

- 确认 `chrome://extensions` 里 TabHub 的开关是开启的；
- 如果之前在提示里点了「改回」（Change it back），TabHub 会被停用，重新打开开关即可；
- 如果同时装了其他会修改新标签页的扩展，它们会互相冲突，请停用其他新标签页扩展。

### 9.8 Linux：用了 Ubuntu 自带的 `apt install nodejs`，版本太旧

**现象**：`node -v` 显示低于 `v20.19.0`（例如 `v12` / `v18`），或 `npm ci` / 测试报错与 Node 版本有关。

**解决**：按 [第 1.3 节](#13-nodejs会同时安装-npm) 用 **NodeSource**（`setup_24.x`）或 **nvm** 安装符合要求的 Node，装好后重新打开终端，再在代码目录执行 `npm ci` 与 `npm run build`（或 `bash scripts/sync.sh`）。

### 9.9 Linux：用 Chromium 代替 Google Chrome 可以吗？

可以尝试，但**不推荐作为正式使用路径**。Chromium（含 Snap 版）在新标签页覆盖提示、扩展「加载已解压的扩展程序」的文件对话框、以及部分企业策略上可能与 Google Chrome 不同。TabHub 文档与测试以 **Google Chrome** 为准；若新标签页没有变成 TabHub，或扩展加载异常，请改用官方 Chrome（见 [第 1.1 节](#11-google-chrome)），并对照 [FAQ 9.7](#97-打开新标签页还是-chrome-默认页面)。
