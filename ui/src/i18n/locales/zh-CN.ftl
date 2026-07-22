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
toolbar-bug-report = 报告问题
toolbar-updates = 检查更新

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
editor-unsaved = 未保存的稿件
editor-caesura-hint = 输入 -- 表示停顿
editor-est-time = 阅读时长 { $time }
editor-preview = 预览
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
settings-language = 语言
settings-language-auto = 跟随系统
settings-theme = 主题
settings-theme-dark = 深色
settings-theme-light = 浅色
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
