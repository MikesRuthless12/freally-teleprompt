# Freally Teleprompt — 日本語 (Japanese).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-settings = 設定
toolbar-bug-report = 問題を報告
toolbar-updates = アップデートを確認

## Transport
transport-play = 再生
transport-pause = 一時停止
transport-restart = 先頭に戻る

## Editor
editor-label = 台本
editor-placeholder = 台本を入力するか貼り付けてください。" -- " で間が入り、" --2 " で 2 秒止まります。
editor-load = プロンプターに読み込む

## Prompter surface
teleprompter-empty = まだ台本が読み込まれていません。左側に入力してから「プロンプターに読み込む」を選んでください。

## Settings
settings-title = 設定
settings-language = 言語
settings-language-auto = システムに合わせる
settings-theme = テーマ
settings-theme-dark = ダーク
settings-theme-light = ライト
settings-speed = 読み上げ速度：毎秒 { $value } 文字
settings-font-size = 文字サイズ：{ $value } px
settings-caesura = " -- " の既定の間：{ $value } 秒
settings-countdown = 開始前のカウントダウン：{ $value } 秒
settings-mirror = 投影を左右反転する（ビームスプリッターガラス用）
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
