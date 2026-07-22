# Freally Teleprompt — 简体中文 (Simplified Chinese).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = 设置
toolbar-bug-report = 报告问题
toolbar-updates = 检查更新

## Transport
transport-play = 播放
transport-pause = 暂停
transport-restart = 回到开头

## Editor
editor-label = 稿件
editor-placeholder = 输入或粘贴你的稿件。用 " -- " 表示停顿，用 " --2 " 停顿 2 秒。
editor-load = 载入提词器

## Prompter surface
teleprompter-empty = 尚未载入稿件。请在左侧输入，然后选择“载入提词器”。

## Settings
settings-title = 设置
settings-language = 语言
settings-language-auto = 跟随系统
settings-theme = 主题
settings-theme-dark = 深色
settings-theme-light = 浅色
settings-speed = 朗读速度：每秒 { $value } 个字符
settings-font-size = 字号：{ $value } 像素
settings-caesura = " -- " 的默认停顿：{ $value } 秒
settings-countdown = 开始前倒计时：{ $value } 秒
settings-mirror = 镜像投影画面（用于分光镜玻璃）
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
