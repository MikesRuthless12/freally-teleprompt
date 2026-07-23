# Freally Teleprompt — 日本語 (Japanese).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = 台本
toolbar-projector = プロジェクターを開く
toolbar-settings = 設定
toolbar-about = このアプリについて
toolbar-bug-report = 問題を報告
toolbar-updates = アップデートを確認

## Window controls (the app draws its own title bar)
window-minimize = 最小化
window-maximize = 最大化
window-restore = 元のサイズに戻す
window-close = 閉じる

## System tray
tray-show = Freally Teleprompt を表示
tray-quit = 終了

## About
about-version = バージョン { $version }
about-tagline = クリエイター・登壇者・演者のための、ローカルで動くテレプロンプターです。1 つの文字単位エンジンが、プレビュー・プロジェクター・ネットワークミラーを同じ単語に保ちます。
about-privacy = AI なし、アカウントなし、テレメトリーなし。台本は端末の中だけに残ります。
about-copyright = © 2026 Mike Weaver — Havoc Software. All rights reserved.
about-website = ウェブサイト
about-source = ソースコード
about-close = 閉じる

## Transport
transport-play = 再生
transport-pause = 一時停止
transport-stop = 停止
transport-restart = 先頭に戻る
transport-rewind = 少し戻る
transport-forward = 少し進む
transport-slower = 遅く
transport-faster = 速く
transport-seek = 台本内を移動

## Editor
editor-label = 台本
editor-placeholder = 台本を入力するか貼り付けてください。" -- " で間が入り、" --2 " で 2 秒止まります。
editor-caesura-hint = 一時停止するには -- と入力
editor-est-time = 読了時間 { $time }
editor-speed = 速度（1 秒あたりの文字数）
editor-speed-bpm = 速度（BPM）
editor-bpm-mode = BPM モード（歌唱）
editor-read-aloud = OS 標準の音声合成で読み上げ
editor-save-failed = 保存できませんでした: { $error }

## Script library
library-title = 台本
library-new = 新規
library-new-placeholder = 新しい台本の名前
library-empty = 台本はまだありません。上で名前を付けて始めてください。
library-open = 開く
library-current = 使用中
library-rename = 名前を変更
library-save-name = 保存
library-delete = 削除
library-delete-confirm = 削除しますか？
library-delete-yes = はい
library-delete-no = いいえ
library-close = 閉じる

## Projector
projector-title = プロジェクターを開く
projector-display = ディスプレイ
projector-windowed = フローティングウィンドウ（この画面）
projector-display-option = ディスプレイ { $n } — { $w }×{ $h }
projector-primary = （メイン）
projector-fill = 画面全体に表示
projector-mirror = 左右反転（ハーフミラー用）
projector-mirror-hint = プロンプターのガラス越しに読む場合のみオンにしてください。ガラスは映像を反転させます。
projector-open = 開く
projector-cancel = キャンセル
projector-exit-hint = Esc キーで終了
projector-window-title = Freally Teleprompt — プロジェクター

## Prompter surface
teleprompter-empty = 台本がまだ読み込まれていません。「台本」から開くか、左側に入力してください。

## Settings
settings-title = 設定
settings-search-placeholder = 設定を検索…
settings-search-none = 一致する設定はありません。
settings-changed = 開いてから変更あり
settings-ok = OK
settings-cat-general = 一般
settings-cat-editor = エディター
settings-cat-reading = 読み
settings-cat-appearance = 外観
settings-cat-projector = プロジェクター
settings-cat-network = ネットワーク
settings-language = 言語
settings-language-auto = システムに合わせる
settings-theme = テーマ
settings-theme-dark = ダーク
settings-theme-light = ライト
settings-window-section = ウィンドウ
settings-minimize-to-tray = 通知領域に最小化する
settings-minimize-to-tray-note = 最小化ボタンがタスクバーではなくウィンドウを非表示にします。通知領域のアイコンをクリックすると戻ります。アイコンはウィンドウが非表示の間だけ存在し、元に戻すと消えます。
settings-autocomplete-section = オートコンプリート
settings-autocomplete = 入力中に単語を提案する
settings-autocomplete-note = 候補のテキストはカーソルの先に薄く表示されます。Tab キーで確定、Esc キーで取り消します。候補はアプリに内蔵された単語リストから提示され、入力内容がどこかへ送信されることはありません。
settings-autocomplete-language = 候補の言語
settings-autocomplete-language-auto = アプリの言語と同じ
settings-lan-off-hint = ミラーはオフです。オンにして「適用」を押すと、リンクと QR コードが表示されます。
settings-section-reading = 読み上げ設定
settings-speed = 読み上げ速度：毎秒 { $value } 文字
settings-font-size = 文字サイズ：{ $value } px
settings-caesura = " -- " の既定の間：{ $value } 秒
settings-countdown = 開始前のカウントダウン：{ $value } 秒
settings-section-appearance = 外観
settings-font-family = 書体
settings-font-system = システム
settings-font-sans = サンセリフ
settings-font-serif = セリフ
settings-font-mono = 等幅
settings-font-rounded = 丸ゴシック
settings-font-slab = スラブセリフ
settings-font-weight = 太さ
settings-text-color = 文字色
settings-line-height = 行間 — { $value }
settings-margins = 左右の余白 — { $value } %
settings-guide = リーディングガイド — 上から { $value } %
settings-section-projector = プロジェクター
settings-mirror = 投影を左右反転する（ビームスプリッターガラス用）
settings-section-mirror = ネットワークにミラー
settings-lan-enabled = 同じネットワークの端末に台本をミラーする
settings-lan-all-interfaces = このパソコン以外の端末も許可する
settings-lan-warning = リンクには使い捨てのキーが含まれ、暗号化されていません。信頼できるネットワークでのみ使用してください。ミラーは読み取り専用で、台本がどこかへアップロードされることはありません。
settings-lan-port = ポート
settings-lan-open = ブラウザーで開く
settings-lan-open-hint = コードを読み取るか、同じネットワーク上の端末でこのリンクを開いてください。
settings-lan-failed = ミラーを開始できませんでした: { $error }
mirror-qr-aria = ミラーのリンクの QR コード
settings-cancel = キャンセル
settings-apply = 適用

## First-run agreement
eula-title = エンドユーザー使用許諾契約
eula-version = バージョン { $version }
eula-intro = この契約をお読みください。Freally Teleprompt をご利用いただく前に同意が必要です。
eula-scroll-hint = 続けるには最後までスクロールしてください。
eula-thanks = お読みいただきありがとうございます。
eula-agree = 同意します
eula-decline = 拒否して終了

## Problem report
bug-title = 問題を報告
bug-intro = 自動的に送信されるものはありません。送信方法はご自身で選べます。送信される内容は下でそのまま確認できます。
bug-crash-attached = 前回、Freally Teleprompt が予期せず終了しました。詳細を下に添付しています。
bug-what-happened = 何が起きましたか？
bug-what-happened-placeholder = 問題が起きたとき、何をしていましたか？
bug-preview-label = 送信される内容の正確な表示
bug-open-github = GitHub issue を開く
bug-compose-gmail = Gmailで作成
bug-send-email = メールで送信
bug-copy = レポートをコピー
bug-copied = コピーしました
bug-dismiss-crash = クラッシュを閉じる
bug-close = 閉じる

## Updates
updates-title = アップデートがあります
updates-available = Freally Teleprompt { $version } が公開されています。現在のバージョンは { $current } です。
updates-notes-label = 新着情報
updates-yes = はい、今すぐ更新
updates-no = いいえ、後で
updates-installing = ダウンロードしてインストールしています…
updates-none = 最新バージョンです。
updates-error = アップデートを確認できませんでした。
updates-checking = 更新を確認しています…

## Startup
startup-failed = Freally Teleprompt を起動できませんでした。

## Voice control (FT-31)
settings-cat-voice = 音声
settings-voice-enabled = 音声でプロンプターを操作する
settings-voice-note = コマンドはこのデバイス上で実行され、あなた自身の声の短い録音と照合されます。モデルもネットワークもありません — マイクは聞き取り中のみ開き、話した内容がファイルに保存されることは一切ありません。
settings-voice-mode = 聞き取るタイミング
settings-voice-mode-ptt = ボタンを押している間だけ
settings-voice-mode-always = 有効な間は常に
settings-voice-commands = あなたのコマンド
settings-voice-commands-note = 各コマンドを自分の声で2〜3回録音してください。録音が多いほど安定します。
settings-voice-record = 録音
settings-voice-recording = 聞き取り中…
settings-voice-forget = 削除
settings-voice-takes = { $count } 件録音済み
settings-voice-untrained = 未録音
voice-cmd-next = 次の一時停止
voice-listening = 聞き取り中
voice-hold-to-talk = 押している間だけ話す
