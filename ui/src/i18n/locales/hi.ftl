# Freally Teleprompt — हिन्दी (Hindi).
#
# Translated from en.ftl: same keys, same order. `npm run i18n:lint` fails the
# build on any drift. Placeables and the literal " -- " token are app syntax and
# must survive translation untouched.

## App shell
app-name = Freally Teleprompt
toolbar-library = स्क्रिप्ट
toolbar-import = आयात
toolbar-find = खोजें
toolbar-shortcuts = शॉर्टकट
toolbar-projector = प्रोजेक्टर खोलें
toolbar-settings = सेटिंग्स
toolbar-about = परिचय
toolbar-bug-report = समस्या की रिपोर्ट करें
toolbar-updates = अपडेट जाँचें

## Window controls (the app draws its own title bar)
window-minimize = छोटा करें
window-maximize = बड़ा करें
window-restore = पहले जैसा करें
window-close = बंद करें

## System tray
tray-show = Freally Teleprompt दिखाएँ
tray-quit = बाहर निकलें

## About
about-version = संस्करण { $version }
about-tagline = क्रिएटर, वक्ताओं और कलाकारों के लिए स्थानीय रूप से चलने वाला टेलीप्रॉम्प्टर। एक ही अक्षर-आधारित इंजन पूर्वावलोकन, प्रोजेक्टर और नेटवर्क मिरर को एक ही शब्द पर रखता है।
about-privacy = कोई AI नहीं, कोई खाता नहीं, कोई टेलीमेट्री नहीं। आपकी स्क्रिप्ट आपके ही उपकरण पर रहती है।
about-copyright = © 2026 Mike Weaver. सर्वाधिकार सुरक्षित।
about-website = वेबसाइट
about-source = स्रोत कोड
about-close = बंद करें

## Transport
transport-play = चलाएँ
transport-pause = रोकें
transport-stop = रोकें
transport-restart = शुरुआत पर लौटें
transport-rewind = पीछे जाएँ
transport-forward = आगे जाएँ
transport-slower = धीमा
transport-faster = तेज़
transport-seek = स्क्रिप्ट में आगे-पीछे जाएँ

## Editor
editor-label = स्क्रिप्ट
editor-dictate = बोलकर लिखें
editor-dictate-stop = बोलना बंद करें
editor-dictate-hint = बोलकर लिखना शुरू करने के लिए रिकॉर्ड दबाएँ
editor-dictate-hint-stop = बोलना बंद करने के लिए रोकें दबाएँ
editor-placeholder = अपनी स्क्रिप्ट टाइप करें या पेस्ट करें। ठहराव के लिए " -- " का उपयोग करें, या 2 सेकंड रुकने के लिए " --2 " का।
editor-caesura-hint = रुकने के लिए -- टाइप करें
editor-est-time = पढ़ने का समय { $time }
editor-speed = गति (अक्षर प्रति सेकंड)
editor-speed-bpm = गति (BPM)
editor-bpm-mode = BPM मोड (गायन)
editor-read-aloud = प्रति-OS वाक् संश्लेषण से ज़ोर से पढ़ें
editor-save-failed = सहेजा नहीं जा सका: { $error }

## Script library
library-title = स्क्रिप्ट
library-new = नई
library-new-placeholder = नई स्क्रिप्ट का नाम
library-empty = अभी कोई स्क्रिप्ट नहीं है। शुरू करने के लिए ऊपर नाम दें।
library-open = खोलें
library-current = खुली है
library-rename = नाम बदलें
library-save-name = सहेजें
library-delete = हटाएँ
library-delete-confirm = हटाएँ?
library-delete-yes = हाँ
library-delete-no = नहीं
library-close = बंद करें

## Projector
projector-title = प्रोजेक्टर खोलें
projector-display = डिस्प्ले
projector-windowed = तैरती हुई विंडो (यह स्क्रीन)
projector-display-option = डिस्प्ले { $n } — { $w }×{ $h }
projector-primary = (प्राथमिक)
projector-fill = पूरी स्क्रीन भरें
projector-mirror = क्षैतिज रूप से दर्पण करें (बीम-स्प्लिटर काँच के लिए)
projector-mirror-hint = इसे तभी चालू करें जब प्रॉम्प्टर काँच से पढ़ा जा रहा हो — वह छवि उलट देता है।
projector-open = खोलें
projector-cancel = रद्द करें
projector-exit-hint = बाहर निकलने के लिए Esc दबाएँ
projector-window-title = Freally Teleprompt — प्रोजेक्टर

## Prompter surface
teleprompter-empty = अभी कोई स्क्रिप्ट लोड नहीं है। स्क्रिप्ट से कोई खोलें, या बाईं ओर लिखना शुरू करें।

## Settings
settings-title = सेटिंग्स
settings-search-placeholder = सेटिंग्स खोजें…
settings-search-none = कोई सेटिंग मेल नहीं खाती।
settings-changed = खोलने के बाद बदला गया
settings-ok = ठीक है
settings-cat-general = सामान्य
settings-cat-editor = संपादक
settings-cat-reading = पठन
settings-cat-appearance = दिखावट
settings-cat-projector = प्रोजेक्टर
settings-cat-network = नेटवर्क
settings-language = भाषा
settings-language-auto = मेरे सिस्टम जैसी
settings-theme = थीम
settings-theme-system = मेरे सिस्टम जैसी
settings-theme-dark = गहरा
settings-theme-light = हल्का
settings-window-section = विंडो
settings-minimize-to-tray = सिस्टम ट्रे में छोटा करें
settings-minimize-to-tray-note = छोटा करें बटन विंडो को टास्कबार में भेजने के बजाय छिपा देता है। इसे वापस लाने के लिए ट्रे आइकॉन पर क्लिक करें। आइकॉन तभी तक रहता है जब तक विंडो छिपी हो — वापस लाते ही वह हट जाता है।
settings-autocomplete-section = स्वतः पूर्णता
settings-autocomplete = टाइप करते समय शब्द सुझाएँ
settings-autocomplete-note = सुझाया गया पाठ कर्सर के आगे धुँधला दिखाई देता है। इसे स्वीकार करने के लिए Tab दबाएँ, या हटाने के लिए Esc। सुझाव ऐप के भीतर मौजूद शब्द-सूचियों से आते हैं — आप जो लिखते हैं वह कहीं नहीं भेजा जाता।
settings-autocomplete-language = सुझावों की भाषा
settings-autocomplete-language-auto = ऐप की भाषा के समान
settings-lan-off-hint = मिरर बंद है। इसे चालू करके लागू करें दबाएँ, फिर लिंक और QR कोड मिलेगा।
settings-section-reading = पठन
settings-speed = पढ़ने की गति — { $value } वर्ण प्रति सेकंड
settings-font-size = फ़ॉन्ट आकार — { $value } px
settings-caesura = " -- " के लिए डिफ़ॉल्ट ठहराव — { $value } सेकंड
settings-countdown = शुरू होने से पहले काउंटडाउन — { $value } सेकंड
settings-section-appearance = रूप
settings-font-family = टाइपफ़ेस
settings-font-system = सिस्टम
settings-font-sans = सैन्स-सेरिफ़
settings-font-serif = सेरिफ़
settings-font-mono = मोनोस्पेस
settings-font-rounded = गोलाकार
settings-font-slab = स्लैब
settings-font-weight = मोटाई
settings-text-color = पाठ का रंग
settings-line-height = पंक्ति अंतराल — { $value }
settings-margins = किनारों का मार्जिन — { $value }%
settings-guide = पठन रेखा — ऊपर से { $value }%
settings-section-projector = प्रोजेक्टर
settings-mirror = प्रोजेक्टर की छवि दर्पण करें (बीम-स्प्लिटर ग्लास के लिए)
settings-section-mirror = मेरे नेटवर्क पर मिरर करें
settings-lan-enabled = मेरे नेटवर्क के उपकरणों पर स्क्रिप्ट मिरर करें
settings-lan-all-interfaces = सिर्फ़ इस कंप्यूटर ही नहीं, दूसरे उपकरणों को भी अनुमति दें
settings-lan-warning = लिंक में एक-बार की कुंजी होती है और वह एन्क्रिप्टेड नहीं है, इसलिए इसे केवल भरोसेमंद नेटवर्क पर उपयोग करें। मिरर केवल-पढ़ने के लिए है और आपकी स्क्रिप्ट कहीं अपलोड नहीं होती।
settings-lan-port = पोर्ट
settings-lan-open = मेरे ब्राउज़र में खोलें
settings-lan-open-hint = कोड स्कैन करें, या इस लिंक को उसी नेटवर्क के किसी उपकरण पर खोलें।
settings-lan-failed = मिरर शुरू नहीं हो सका: { $error }
mirror-qr-aria = मिरर लिंक का QR कोड
settings-cancel = रद्द करें
settings-apply = लागू करें

## Onboarding tour (FT-50)
tour-step = { $total } में से { $n }
tour-skip = छोड़ें
tour-back = पीछे
tour-next = आगे
tour-done = लिखना शुरू करें
tour-welcome-title = Freally Teleprompt में आपका स्वागत है
tour-welcome-body = एक टेलीप्रॉम्प्टर जो पूरी तरह आपकी अपनी मशीन पर चलता है। न कोई खाता, न क्लाउड, न एआई, न कोई सदस्यता। इसमें लगभग एक मिनट लगेगा — कभी भी छोड़ सकते हैं, और सेटिंग्स से दोबारा देख सकते हैं।
tour-write-title = अपनी स्क्रिप्ट लिखें
tour-write-body = बाईं ओर टाइप करें या चिपकाएँ। एक से ज़्यादा रखने के लिए स्क्रिप्ट खोलें; आप जो लिखते हैं वह साथ-साथ सहेजा जाता है। दो हाइफ़न उस ठहराव को दर्शाते हैं जिसे आप थामना चाहते हैं, और कर्सर के आगे दिखते धुँधले सुझाव लंबे शब्द आपके लिए पूरे कर देते हैं।
tour-read-title = अपनी रफ़्तार तय करें
tour-read-body = गति असल पढ़ने की रफ़्तार है — प्रति सेकंड अक्षर — या अगर आप किसी बीट पर रैप या गा रहे हैं तो BPM पर चले जाइए। चलाना, रोकना और पीछे करना संपादक के नीचे हैं, या पूर्वावलोकन में किसी भी शब्द पर क्लिक करके वहीं से शुरू कीजिए। जलता हुआ शब्द हमेशा पढ़ने की रेखा पर रहता है।
tour-show-title = पढ़ने वाले को दिखाइए
tour-show-body = प्रोजेक्टर स्क्रिप्ट को दूसरी स्क्रीन पर भेजता है — अगर आप काँच के आर-पार पढ़ते हैं तो उलटा करके, या अपने ही नेटवर्क के किसी फ़ोन पर। बाक़ी सब कुछ — टाइपफ़ेस, रंग, हाशिये, भाषा, थीम — शीर्षक पट्टी के गियर के पीछे है।
settings-tour-section = शुरुआत
settings-tour-replay = परिचय दोबारा दिखाएँ
settings-tour-replay-note = संपादक, रफ़्तार के नियंत्रण और प्रोजेक्टर का चार-चरणों वाला परिचय दोबारा चलाता है। पहले सेटिंग्स बंद होंगी, ताकि आप देख सकें कि बात किसकी हो रही है।

## First-run agreement
eula-title = अंतिम उपयोगकर्ता लाइसेंस अनुबंध
eula-version = संस्करण { $version }
eula-intro = कृपया यह अनुबंध पढ़ें। Freally Teleprompt का उपयोग करने से पहले आपको इसे स्वीकार करना होगा।
eula-scroll-hint = जारी रखने के लिए अंत तक स्क्रॉल करें।
eula-thanks = पढ़ने के लिए धन्यवाद।
eula-agree = मैं सहमत हूँ
eula-decline = अस्वीकार करें और बाहर निकलें

## Problem report
bug-title = समस्या की रिपोर्ट करें
bug-intro = कुछ भी अपने आप नहीं भेजा जाता। भेजने का तरीका आप चुनते हैं, और नीचे दिया गया पूरा पाठ आप पहले पढ़ सकते हैं।
bug-crash-attached = पिछली बार Freally Teleprompt अचानक बंद हो गया था। विवरण नीचे संलग्न है।
bug-what-happened = क्या हुआ था?
bug-what-happened-placeholder = जब समस्या हुई तब आप क्या कर रहे थे?
bug-preview-label = बिल्कुल वही जो भेजा जाएगा
bug-open-github = GitHub पर issue खोलें
bug-compose-gmail = Gmail में लिखें
bug-send-email = ईमेल से भेजें
bug-copy = रिपोर्ट कॉपी करें
bug-copied = कॉपी हो गई
bug-dismiss-crash = क्रैश खारिज करें
bug-close = बंद करें

## Updates
updates-title = अपडेट उपलब्ध है
updates-available = Freally Teleprompt { $version } उपलब्ध है। आपके पास { $current } है।
updates-notes-label = नया क्या है
updates-yes = हाँ, अभी अपडेट करें
updates-no = नहीं, अभी नहीं
updates-installing = डाउनलोड और इंस्टॉल हो रहा है…
updates-none = आप नवीनतम संस्करण पर हैं।
updates-error = अपडेट की जाँच नहीं हो सकी।
updates-checking = अपडेट जाँचे जा रहे हैं…

## Startup
startup-failed = Freally Teleprompt शुरू नहीं हो सका।

## Voice control (FT-31)
settings-cat-voice = आवाज़
settings-dictation-enabled = बोलकर अपनी स्क्रिप्ट लिखें
settings-dictation-note = स्क्रिप्ट के ऊपर रिकॉर्ड बटन दबाएँ और आप जो कहेंगे वह उसमें लिखा जाएगा। पहचान इसी डिवाइस पर होती है — कोई खाता नहीं, कोई नेटवर्क नहीं, और आपकी कही बात कभी किसी फ़ाइल में सहेजी नहीं जाती। माइक्रोफ़ोन केवल रिकॉर्डिंग के दौरान खुला रहता है। यदि स्क्रिप्ट आपके नेटवर्क के उपकरणों पर मिरर हो रही है, तो बोले गए शब्द लिखे जाते ही वहाँ पहुँच जाते हैं — ठीक वैसे ही जैसे आपका टाइप किया हुआ कुछ भी।
settings-dictation-unavailable-model = स्पीच मॉडल इंस्टॉल नहीं है, इसलिए डिक्टेशन नहीं चल सकता।
settings-dictation-unavailable-build = इस बिल्ड में डिक्टेशन उपलब्ध नहीं है।

## Musical time (FT-N03 / FT-N04)
tempo-bar-beat = ताल { $bar } · { $beat }
tempo-count-in = आरंभिक गिनती { $count }

## Rehearsal and pace (FT-N01 / FT-N05)
editor-rehearse = रिहर्सल करें और मेरे पाठ का समय मापें
pace-behind = { $time } पीछे
pace-ahead = { $time } आगे
rehearsal-title = रिहर्सल रिपोर्ट
rehearsal-empty = अभी तक कुछ भी नहीं मापा गया। इसे चालू करें, स्क्रिप्ट पूरी चलाएँ, फिर बंद कर दें।
rehearsal-col-section = खंड
rehearsal-col-planned = नियोजित
rehearsal-col-actual = वास्तविक
rehearsal-col-delta = अंतर
rehearsal-unfinished = पूरा नहीं हुआ
rehearsal-suggest = आपने इसे लगभग { $to } अक्षर प्रति सेकंड की गति से पढ़ा, { $from } नहीं।
rehearsal-suggest-apply = वही गति अपनाएँ
rehearsal-close = बंद करें

## Timing, calibration and skipped words (FT-N02 / FT-M02)
settings-cat-timing = समय-निर्धारण
settings-tempo-section = लय
settings-metronome = वर्तमान लय पर क्लिक बजाएँ
settings-metronome-note = स्क्रिप्ट चलते समय हर मात्रा पर एक धीमी टिक, ताल की पहली मात्रा पर ज़ोर के साथ। शुरुआती उलटी गिनती ही उसकी आरंभिक गिनती बन जाती है। ध्वनि ऐप स्वयं बनाता है — कुछ भी डाउनलोड नहीं होता।
settings-beats-per-bar = प्रति ताल मात्राएँ
settings-calibration-section = आपकी अपनी लय
settings-chars-per-beat = प्रति मात्रा { $value } अक्षर
settings-chars-per-beat-note = एक लय केवल एक संख्या से पढ़ने की गति बन जाती है: आप एक मात्रा में कितने अक्षर तय करते हैं। जिस लय पर आप प्रस्तुति देते हैं उस पर थपथपाएँ, और यह संख्या अनुमान के बजाय आपकी पढ़ने की गति से मापी जाएगी।
settings-tap-tempo = थपथपाएँ
settings-tap-hint = तीन या अधिक बार थपथपाएँ
settings-tap-bpm = मापा गया: { $bpm } BPM
settings-tap-apply = यही लय अपनाएँ
settings-tap-reset = डिफ़ॉल्ट पर लौटें
settings-skip-section = वे शब्द जो आप नहीं गाते
settings-skip-words = छोड़े जाने वाले शब्द
settings-skip-words-note = हर पंक्ति में एक। जिस पंक्ति में इनमें से केवल एक ही हो — मुखड़ा, अंतरा 1, ब्रिज — वह बिलकुल समय नहीं लेती, इसलिए आपके बोल उसी ताल पर बने रहते हैं जिसके लिए आपने लिखे थे। असली पंक्ति के भीतर वही शब्द केवल स्वयं को छोड़ता है। वे स्क्रीन पर धुंधले दिखते रहते हैं, और ज़ोर से पढ़ना उन्हें कभी नहीं बोलता।
settings-skip-words-placeholder = हर पंक्ति में एक शब्द

## Document import (FT-M01)
import-title = दस्तावेज़ आयात करें
import-choose = दस्तावेज़ चुनें...
import-hint = Word, RTF, PDF, सादा पाठ या Markdown।
import-filter = दस्तावेज़
import-reading = दस्तावेज़ पढ़ा जा रहा है...
import-format-txt = सादा पाठ
import-format-markdown = Markdown
import-format-docx = Word दस्तावेज़
import-format-rtf = RTF
import-format-pdf = PDF
import-summary = { $format } पढ़ा गया: { $paragraphs } अनुच्छेदों में { $chars } अक्षर।
import-flattened = मोटा, तिरछा, फ़ॉन्ट और रंग सादे प्रॉम्प्टर पाठ में बदल दिए गए।
import-truncated = दस्तावेज़ स्क्रिप्ट की अधिकतम लंबाई से बड़ा था, इसलिए छोटा कर दिया गया।
import-nothing-dropped = और कुछ नहीं छूटा।
import-not-itemised = PDF की सामग्री सूचीबद्ध नहीं की जा सकती - पाठ की तुलना मूल से करें।
import-drop-encoding = फ़ाइल यूनिकोड में सहेजी नहीं गई थी; उसे पश्चिमी यूरोपीय पाठ के रूप में पढ़ा गया।
import-drop-images = छोड़ी गई तस्वीरें: { $count }
import-drop-footnotes = छोड़े गए पाद-टिप्पण: { $count }
import-drop-comments = छोड़ी गई टिप्पणियाँ: { $count }
import-drop-headersFooters = छोड़े गए शीर्षलेख और पादलेख: { $count }
import-drop-linkTargets = छोड़े गए लिंक पते (शब्द बने रहते हैं): { $count }
import-drop-objects = छोड़ी गई अंतर्निहित वस्तुएँ: { $count }
import-preview = प्रॉम्प्टर का पाठ
import-name = इस नाम से सहेजें
import-confirm = आयात करें
import-cancel = रद्द करें

## Find and replace (FT-M07)
find-title = खोजें और बदलें
find-what = खोजें
find-with = इससे बदलें
find-case = अक्षर-आकार का मिलान करें
find-whole-word = केवल पूरे शब्द
find-count = { $total } में से { $at }
find-none = कोई मिलान नहीं
find-replaced = { $count } बदले गए
find-previous = पिछला
find-next = अगला
find-replace = बदलें
find-replace-all = सभी बदलें
find-close = बंद करें

## शॉर्टकट, फ़ुट पेडल और सिस्टम-व्यापी हॉटकी (FT-M04 / FT-M13 / FT-M16)
shortcuts-title = शॉर्टकट और पेडल
shortcuts-intro = जिस बंधन को बदलना है उस पर दबाएँ, फिर मनचाही कुंजी, रिमोट का बटन या फ़ुट पेडल दबाएँ। «ऐप में» वाले शॉर्टकट तब चलते हैं जब Freally Teleprompt सामने हो; «कहीं भी» वाले आप जहाँ भी हों वहाँ चलते हैं।
shortcuts-search = कमांड और कुंजियाँ खोजें
shortcuts-command = कमांड
shortcuts-in-app = ऐप में
shortcuts-global = कहीं भी
shortcuts-window-only = केवल ऐप में
shortcuts-no-matches = कोई कमांड मेल नहीं खाता।
shortcuts-listening = { $command } के लिए कोई कुंजी दबाएँ, या रद्द करने के लिए Esc
shortcuts-listening-short = कोई कुंजी दबाएँ…
shortcuts-rebind = { $command } का बंधन बदलें
shortcuts-clear = { $command } का बंधन मिटाएँ
shortcuts-conflict = { $others } को भी दिया गया है
shortcuts-not-registered = यह कुंजी कोई दूसरा प्रोग्राम इस्तेमाल कर रहा है ({ $reason })
shortcuts-wayland = Wayland ऐप्लिकेशन को पूरे सिस्टम की कुंजियाँ रोकने नहीं देता, इसलिए इस सत्र में «कहीं भी» वाले बंधन शायद काम न करें।
shortcuts-reset = डिफ़ॉल्ट पर लौटाएँ
shortcuts-cancel = रद्द करें
shortcuts-apply = लागू करें
cmd-play-pause = चलाएँ / रोकें
cmd-stop = बंद करें
cmd-top = शुरुआत पर लौटें
cmd-faster = तेज़ करें
cmd-slower = धीमा करें
cmd-step-back = एक कदम पीछे
cmd-step-forward = एक कदम आगे
cmd-next-marker = अगला अनुभाग
cmd-prev-marker = पिछला अनुभाग
cmd-find = खोजें और बदलें

## Section markers (FT-M05)
marker-list = किसी खंड पर जाएँ
marker-previous = पिछला खंड
marker-next = अगला खंड
marker-none-yet = पहले चिह्न से पहले

## Script statistics (FT-M03)
stats-counts = { $words } शब्द, { $chars } अक्षर
stats-long-line = पंक्ति { $line } बहुत लंबी है ({ $chars } अक्षर)
