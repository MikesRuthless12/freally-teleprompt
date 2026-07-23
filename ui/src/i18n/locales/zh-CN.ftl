# Freally Teleprompt — 简体中文 (Simplified Chinese).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = 稿件
toolbar-projector = 打开投影
toolbar-settings = 设置
toolbar-about = 关于
toolbar-bug-report = 报告问题
toolbar-updates = 检查更新

## Window controls (the app draws its own title bar)
window-minimize = 最小化
window-maximize = 最大化
window-restore = 还原
window-close = 关闭

## System tray
tray-show = 显示 Freally Teleprompt
tray-quit = 退出

## About
about-version = 版本 { $version }
about-tagline = 面向创作者、演讲者与表演者的本地提词器。同一套基于字符的引擎，让预览、投影窗口与网络镜像始终停在同一个词上。
about-privacy = 没有 AI，无需账号，不收集任何数据。你的稿件只留在本机。
about-copyright = © 2026 Mike Weaver — Havoc Software. 保留所有权利。
about-website = 官网
about-source = 源代码
about-close = 关闭

## Transport
transport-play = 播放
transport-pause = 暂停
transport-stop = 停止
transport-restart = 回到开头
transport-rewind = 后退
transport-forward = 前进
transport-slower = 更慢
transport-faster = 更快
transport-seek = 在稿件中定位

## Editor
editor-label = 稿件
editor-placeholder = 输入或粘贴你的稿件。用 " -- " 表示停顿，用 " --2 " 停顿 2 秒。
editor-caesura-hint = 输入 -- 表示停顿
editor-est-time = 阅读时长 { $time }
editor-speed = 速度（每秒字符数）
editor-speed-bpm = 速度（BPM）
editor-bpm-mode = BPM 模式（歌唱）
editor-read-aloud = 使用各操作系统的语音合成朗读
editor-save-failed = 无法保存：{ $error }

## Script library
library-title = 稿件
library-new = 新建
library-new-placeholder = 为新稿件命名
library-empty = 还没有稿件。在上方命名一个即可开始。
library-open = 打开
library-current = 当前
library-rename = 重命名
library-save-name = 保存
library-delete = 删除
library-delete-confirm = 确定删除？
library-delete-yes = 是
library-delete-no = 否
library-close = 关闭

## Projector
projector-title = 打开投影窗口
projector-display = 显示器
projector-windowed = 浮动窗口（当前屏幕）
projector-display-option = 显示器 { $n } — { $w }×{ $h }
projector-primary = （主）
projector-fill = 占满整个显示器
projector-mirror = 水平镜像（用于分光玻璃）
projector-mirror-hint = 只有透过提词器玻璃阅读时才需开启，玻璃会把画面左右翻转。
projector-open = 打开
projector-cancel = 取消
projector-exit-hint = 按 Esc 退出
projector-window-title = Freally Teleprompt — 投影窗口

## Prompter surface
teleprompter-empty = 尚未载入稿件。可从“稿件”中打开，或直接在左侧输入。

## Settings
settings-title = 设置
settings-search-placeholder = 搜索设置…
settings-search-none = 没有匹配的设置。
settings-changed = 打开后已更改
settings-ok = 确定
settings-cat-general = 常规
settings-cat-editor = 编辑器
settings-cat-reading = 阅读
settings-cat-appearance = 外观
settings-cat-projector = 投影窗口
settings-cat-network = 网络
settings-language = 语言
settings-language-auto = 跟随系统
settings-theme = 主题
settings-theme-dark = 深色
settings-theme-light = 浅色
settings-window-section = 窗口
settings-minimize-to-tray = 最小化到系统托盘
settings-minimize-to-tray-note = 最小化按钮会隐藏窗口，而不是把它放到任务栏。点击托盘图标即可重新显示。该图标只在窗口隐藏时存在，窗口恢复后就会消失。
settings-autocomplete-section = 自动补全
settings-autocomplete = 输入时建议词语
settings-autocomplete-note = 建议的文字会以浅色显示在光标前方。按 Tab 接受，按 Esc 取消。建议来自应用内置的词表——你输入的任何内容都不会被发送到任何地方。
settings-autocomplete-language = 建议语言
settings-autocomplete-language-auto = 与应用语言相同
settings-lan-off-hint = 镜像已关闭。开启后按“应用”即可获得链接和二维码。
settings-section-reading = 阅读
settings-speed = 朗读速度：每秒 { $value } 个字符
settings-font-size = 字号：{ $value } 像素
settings-caesura = " -- " 的默认停顿：{ $value } 秒
settings-countdown = 开始前倒计时：{ $value } 秒
settings-section-appearance = 外观
settings-font-family = 字体
settings-font-system = 系统
settings-font-sans = 无衬线
settings-font-serif = 衬线
settings-font-mono = 等宽
settings-font-rounded = 圆体
settings-font-slab = 粗衬线
settings-font-weight = 字重
settings-text-color = 文字颜色
settings-line-height = 行距 — { $value }
settings-margins = 左右边距 — { $value } %
settings-guide = 阅读引导线 — 距顶部 { $value } %
settings-section-projector = 投影窗口
settings-mirror = 镜像投影画面（用于分光镜玻璃）
settings-section-mirror = 镜像到我的网络
settings-lan-enabled = 把稿件镜像到我网络中的设备
settings-lan-all-interfaces = 允许其他设备，而不只是这台电脑
settings-lan-warning = 链接带有一次性密钥且未加密，请仅在你信任的网络中使用。镜像为只读，你的稿件不会被上传到任何地方。
settings-lan-port = 端口
settings-lan-open = 在浏览器中打开
settings-lan-open-hint = 扫描二维码，或在同一网络的任意设备上打开该链接。
settings-lan-failed = 无法启动镜像：{ $error }
mirror-qr-aria = 镜像链接的二维码
settings-cancel = 取消
settings-apply = 应用

## First-run agreement
eula-title = 最终用户许可协议
eula-version = 版本 { $version }
eula-intro = 请阅读本协议。使用 Freally Teleprompt 之前必须接受本协议。
eula-scroll-hint = 滚动到末尾以继续。
eula-thanks = 感谢阅读。
eula-agree = 我同意
eula-decline = 拒绝并退出

## Problem report
bug-title = 报告问题
bug-intro = 不会自动发送任何内容。发送方式由你决定，你也可以先阅读下方将要发送的完整内容。
bug-crash-attached = Freally Teleprompt 上次意外停止运行。详细信息已附在下方。
bug-what-happened = 发生了什么？
bug-what-happened-placeholder = 出问题时你正在做什么？
bug-preview-label = 将确切发送的内容
bug-open-github = 打开 GitHub issue
bug-compose-gmail = 在 Gmail 中撰写
bug-send-email = 通过电子邮件发送
bug-copy = 复制报告
bug-copied = 已复制
bug-dismiss-crash = 忽略崩溃
bug-close = 关闭

## Updates
updates-title = 有可用更新
updates-available = Freally Teleprompt { $version } 已发布。你当前使用的是 { $current }。
updates-notes-label = 更新内容
updates-yes = 是，立即更新
updates-no = 否，暂不更新
updates-installing = 正在下载并安装…
updates-none = 你已是最新版本。
updates-error = 无法检查更新。
updates-checking = 正在检查更新…

## Startup
startup-failed = Freally Teleprompt 无法启动。

## Voice control (FT-31)
settings-cat-voice = 语音
settings-voice-enabled = 用我的声音控制提词器
settings-voice-note = 命令在本设备上运行，并与你本人声音的简短录音进行匹配。没有模型，也没有网络——麦克风仅在聆听时开启，你所说的内容绝不会保存到文件。
settings-voice-mode = 何时聆听
settings-voice-mode-ptt = 仅在我按住按钮时
settings-voice-mode-always = 启用时始终聆听
settings-voice-commands = 你的命令
settings-voice-commands-note = 用你自己的声音把每条命令录制两到三次。录音越多，识别越稳定。
settings-voice-record = 录制
settings-voice-recording = 正在聆听…
settings-voice-forget = 忘记
settings-voice-takes = 已录制 { $count } 条
settings-voice-untrained = 未录制
voice-cmd-next = 下一个停顿
voice-listening = 正在聆听
voice-hold-to-talk = 按住说话
