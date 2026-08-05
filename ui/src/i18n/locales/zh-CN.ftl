# Freally Teleprompt — 简体中文 (Simplified Chinese).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = 稿件
toolbar-import = 导入
toolbar-find = 查找
toolbar-shortcuts = 快捷键
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
about-copyright = © 2026 Mike Weaver. 保留所有权利。
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
editor-dictate = 语音输入
editor-dictate-stop = 停止语音输入
editor-dictate-hint = 按录音开始语音输入
editor-dictate-hint-stop = 按停止结束语音输入
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
settings-theme-system = 跟随系统
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

## Onboarding tour (FT-50)
tour-step = 第 { $n } 步，共 { $total } 步
tour-skip = 跳过
tour-back = 上一步
tour-next = 下一步
tour-done = 开始写稿
tour-welcome-title = 欢迎使用 Freally Teleprompt
tour-welcome-body = 一款完全在你自己电脑上运行的提词器。没有账号，没有云端，没有人工智能，也不用订阅。这大约需要一分钟——随时可以跳过，也可以在设置里重新看一遍。
tour-write-title = 写下你的稿子
tour-write-body = 在左侧输入或粘贴。想保存多份就打开「稿件」；你写的内容会随时保存。两个连字符表示一处你想停顿的地方，光标前浅色的建议会替你补全长词。
tour-read-title = 定下你的语速
tour-read-body = 速度是真实的朗读节奏——每秒多少个字——如果你在跟着节拍说唱或演唱，也可以切换到 BPM。播放、暂停和倒回就在编辑器下方，或者直接点预览里的任意一个字，从那里开始。亮起的字始终停在阅读线上。
tour-show-title = 让念稿的人看到
tour-show-body = 投影会把稿子送到第二块屏幕上；如果你透过分光镜玻璃阅读，可以左右翻转，也可以投到同一网络下的手机上。其余的一切——字体、颜色、边距、语言、主题——都在标题栏的齿轮里。
settings-tour-section = 新手上路
settings-tour-replay = 再看一次导览
settings-tour-replay-note = 重新播放关于编辑器、语速控制和投影的四步介绍。设置会先关闭，这样你才能看清它指的是什么。

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
settings-dictation-enabled = 用说话来写稿
settings-dictation-note = 按下稿件上方的录音按钮，你说的话就会写进稿件。识别在本机完成——无需账户、无需联网，你说的内容也不会写入任何文件。麦克风仅在录音时开启。如果稿件正镜像到你网络中的设备，语音输入的文字一写进稿件就会传到那些设备，和你手动输入的内容一样。
settings-dictation-unavailable-model = 尚未安装语音模型，无法进行语音输入。
settings-dictation-unavailable-build = 此版本不支持语音输入。

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = 第 { $bar } 小节 · 第 { $beat } 拍
tempo-count-in = 预备拍 { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = 排练并记录我的朗读用时
pace-behind = 超时 { $time }
pace-ahead = 提前 { $time }
rehearsal-title = 排练报告
rehearsal-empty = 还没有任何计时。打开这项，把稿子完整播放一遍，然后再关掉。
rehearsal-col-section = 段落
rehearsal-col-planned = 计划
rehearsal-col-actual = 实际
rehearsal-col-delta = 差值
rehearsal-unfinished = 未读完
rehearsal-suggest = 你实际上以每秒约 { $to } 个字符在读，而不是 { $from }。
rehearsal-suggest-apply = 采用该速度
rehearsal-close = 关闭

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = 计时
settings-tempo-section = 速度
settings-metronome = 按当前速度播放节拍声
settings-metronome-note = 稿子滚动时每拍发出一声轻响，小节第一拍加重。开始前的倒计时正好充当预备拍。声音由应用自己合成，不下载任何文件。
settings-beats-per-bar = 每小节拍数
settings-calibration-section = 你自己的速度
settings-chars-per-beat = 每拍 { $value } 个字符
settings-chars-per-beat-note = 速度通过一个数字变成朗读速度：你在一拍里能读过多少字符。按你实际演唱的速度敲击，这个数字就会依据你的朗读速度测得，而不是凭空假设。
settings-tap-tempo = 敲击
settings-tap-hint = 敲击三次以上
settings-tap-bpm = 已测：{ $bpm } BPM
settings-tap-apply = 采用此速度
settings-tap-reset = 恢复默认
settings-skip-section = 你不演唱的词
settings-skip-words = 要跳过的词
settings-skip-words-note = 每行一个。整行只有其中一个词时 — 副歌、第一段、桥段 — 完全不占时间，歌词因此仍落在你写它时的那一小节上。同一个词出现在真正的歌词行里，则只跳过它本身。它们仍以暗色留在屏幕上，朗读功能也绝不会念出来。
settings-skip-words-placeholder = 每行一个词

## Document import (FT-M01)
import-title = 导入文档
import-choose = 选择文档...
import-hint = 支持 Word、RTF、PDF、纯文本和 Markdown。
import-filter = 文档
import-reading = 正在读取文档...
import-format-txt = 纯文本
import-format-markdown = Markdown
import-format-docx = Word 文档
import-format-rtf = RTF
import-format-pdf = PDF
import-summary = 已读取 { $format }：{ $paragraphs } 个段落，共 { $chars } 个字符。
import-flattened = 粗体、斜体、字体和颜色已简化为提词用的纯文本。
import-truncated = 文档超出了脚本的长度上限，已被截断。
import-nothing-dropped = 没有其他内容被舍弃。
import-not-itemised = PDF 的内容无法逐项列出，请将文本与原件比对。
import-drop-encoding = 文件未以 Unicode 保存，已按西欧文本读取。
import-drop-images = 舍弃的图片：{ $count }
import-drop-footnotes = 舍弃的脚注：{ $count }
import-drop-comments = 舍弃的批注：{ $count }
import-drop-headersFooters = 舍弃的页眉页脚：{ $count }
import-drop-linkTargets = 舍弃的链接地址（文字保留）：{ $count }
import-drop-objects = 舍弃的嵌入对象：{ $count }
import-preview = 提词文本
import-name = 另存为
import-confirm = 导入
import-cancel = 取消

## Find and replace (FT-M07)
find-title = 查找和替换
find-what = 查找
find-with = 替换为
find-case = 区分大小写
find-whole-word = 仅匹配整词
find-count = 第 { $at } 个，共 { $total } 个
find-none = 没有匹配项
find-replaced = 已替换 { $count } 处
find-previous = 上一个
find-next = 下一个
find-replace = 替换
find-replace-all = 全部替换
find-close = 关闭

## 快捷键、脚踏板与全局热键 (FT-M04 / FT-M13 / FT-M16)
shortcuts-title = 快捷键与脚踏板
shortcuts-intro = 点按要修改的绑定，然后按下你想用的按键、遥控器按钮或脚踏板。「应用内」快捷键在 Freally Teleprompt 处于前台时有效；「任何位置」的快捷键无论你在哪里都有效。
shortcuts-search = 搜索命令和按键
shortcuts-command = 命令
shortcuts-in-app = 应用内
shortcuts-global = 任何位置
shortcuts-window-only = 仅限应用内
shortcuts-no-matches = 没有匹配的命令。
shortcuts-listening = 请按下用于「{ $command }」的按键，按 Esc 取消
shortcuts-listening-short = 请按一个键…
shortcuts-rebind = 修改「{ $command }」的绑定
shortcuts-clear = 清除「{ $command }」的绑定
shortcuts-conflict = 也绑定到 { $others }
shortcuts-not-registered = 另一个程序正在使用此按键（{ $reason }）
shortcuts-wayland = Wayland 不允许应用在系统级占用按键，因此本次会话中「任何位置」的绑定可能无效。
shortcuts-reset = 恢复默认
shortcuts-cancel = 取消
shortcuts-apply = 应用
cmd-play-pause = 播放 / 暂停
cmd-stop = 停止
cmd-top = 回到开头
cmd-faster = 加快
cmd-slower = 放慢
cmd-step-back = 后退一步
cmd-step-forward = 前进一步
cmd-next-marker = 下一段
cmd-prev-marker = 上一段
cmd-find = 查找和替换

## Section markers (FT-M05)
marker-list = 跳转到段落
marker-previous = 上一段落
marker-next = 下一段落
marker-none-yet = 第一个标记之前

## Script statistics (FT-M03)
stats-counts = { $words } 个词，{ $chars } 个字符
stats-long-line = 第 { $line } 行很长（{ $chars } 个字符）
