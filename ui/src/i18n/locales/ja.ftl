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
about-copyright = © 2026 Mike Weaver. All rights reserved.
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
editor-dictate = 音声入力
editor-dictate-stop = 音声入力を停止
editor-dictate-hint = 録音を押すと音声入力を開始します
editor-dictate-hint-stop = 停止を押すと音声入力を終了します
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
settings-theme-system = システムに合わせる
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

## Onboarding tour (FT-50)
tour-step = { $total } 件中 { $n } 件目
tour-skip = スキップ
tour-back = 戻る
tour-next = 次へ
tour-done = 書きはじめる
tour-welcome-title = Freally Teleprompt へようこそ
tour-welcome-body = すべてお使いのパソコンの中だけで動くテレプロンプターです。アカウントもクラウドも AI もサブスクリプションもありません。所要時間は約 1 分です。いつでもスキップでき、設定からもう一度見ることもできます。
tour-write-title = 原稿を書く
tour-write-body = 左側に入力するか貼り付けてください。複数の原稿を持つには「原稿」を開きます。書いているそばから自動で保存されます。ハイフン 2 つで「ここで間を取る」という印になり、カーソルの先に薄く出る候補が長い単語を補ってくれます。
tour-read-title = 読む速さを決める
tour-read-body = 速度は実際の読み上げペース、つまり 1 秒あたりの文字数です。ビートに合わせてラップや歌をのせるなら BPM に切り替えてください。再生・一時停止・巻き戻しはエディターの下にあります。プレビューの好きな単語をクリックすれば、そこから始められます。光っている単語はつねに読み取り線の上にとどまります。
tour-show-title = 読み手に見せる
tour-show-body = プロジェクターは原稿を 2 つ目の画面に映します。ハーフミラー越しに読む場合は左右反転でき、自宅のネットワーク上のスマートフォンに映すこともできます。書体・色・余白・言語・テーマなど、そのほかの設定はタイトルバーの歯車の中にあります。
settings-tour-section = はじめに
settings-tour-replay = ツアーをもう一度見る
settings-tour-replay-note = エディター、速度の操作、プロジェクターについての 4 ステップの案内をもう一度表示します。何を指しているか見えるよう、先に設定を閉じます。

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
settings-dictation-enabled = 話して原稿を書く
settings-dictation-note = 原稿の上にある録音ボタンを押すと、話した内容がそのまま書き込まれます。認識はこの端末で行われ、アカウントもネットワークも不要で、話した内容がファイルに保存されることはありません。マイクは録音中だけ開きます。台本を同じネットワークの端末にミラーしている場合、音声入力した語も書き込まれた時点でそちらに届きます。入力した文字とまったく同じ扱いです。
settings-dictation-unavailable-model = 音声モデルが未インストールのため、音声入力を実行できません。
settings-dictation-unavailable-build = このビルドでは音声入力を利用できません。

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = { $bar } 小節 · { $beat } 拍
tempo-count-in = カウントイン { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = リハーサルして読みを計測する
pace-behind = { $time } 遅れています
pace-ahead = { $time } 先行しています
rehearsal-title = リハーサル結果
rehearsal-empty = まだ何も計測されていません。これをオンにして原稿を最後まで再生し、もう一度オフにしてください。
rehearsal-col-section = セクション
rehearsal-col-planned = 予定
rehearsal-col-actual = 実際
rehearsal-col-delta = 差
rehearsal-unfinished = 未完了
rehearsal-suggest = 実際には毎秒約 { $to } 文字で読んでいます。設定は { $from } です。
rehearsal-suggest-apply = その速度を使う
rehearsal-close = 閉じる

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = タイミング
settings-tempo-section = テンポ
settings-metronome = 現在のテンポでクリック音を鳴らす
settings-metronome-note = 原稿が流れている間、各拍に控えめなクリック音が鳴り、小節の頭が強調されます。開始前のカウントダウンがそのままカウントインになります。音はアプリ自身が生成し、何もダウンロードしません。
settings-beats-per-bar = 1 小節の拍数
settings-calibration-section = あなた自身のテンポ
settings-chars-per-beat = 1 拍あたり { $value } 文字
settings-chars-per-beat-note = テンポは 1 つの数字で読み速度になります。1 拍で何文字進むか、です。実演するテンポでタップすれば、推測ではなくあなたの読み速度から測定されます。
settings-tap-tempo = タップ
settings-tap-hint = 3 回以上タップしてください
settings-tap-bpm = タップ結果: { $bpm } BPM
settings-tap-apply = このテンポを使う
settings-tap-reset = 既定値に戻す
settings-skip-section = 読み上げない語
settings-skip-words = スキップする語
settings-skip-words-note = 1 行に 1 語。その語だけの行 — サビ、1番、ブリッジ — は時間をまったく消費しないので、歌詞は書いたとおりの小節に残ります。実際の行の中にある同じ語は、その語だけがスキップされます。画面には薄く表示されたまま残り、読み上げが発声することはありません。
settings-skip-words-placeholder = 1 行に 1 語
