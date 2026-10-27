# 토도독 룸

화면 모서리에 작게 띄워 두는 타자 소리 방꾸미기. 키를 누를 때마다 토독(◆)이 쌓이고, 캐릭터는 방에서 알아서 지낸다
(타자 치면 책상에서 같이 치고, 밤엔 침대에서 잔다). 토독으로 가구·벽지·바닥·옷·반려동물을 산다.

- 실행: `npm start` (VS Code 터미널에서는 `ELECTRON_RUN_AS_NODE`를 지우고 실행)
- 설치 파일: `npx electron-builder --win` → `dist/TodokRoom-Setup-<버전>.exe`
- 스냅샷 확인: `TODOK_SNAPSHOT=<png>`, `TODOK_DEMO=1`(가구가 갖춰진 가짜 저장), `TODOK_EVAL=<js>`, `TODOK_DELAY=<ms>`

갤럭시(안드로이드) 앱: 같은 렌더러를 Capacitor로 감싼다. 방 아래 메모장에 입력하면 쌓이고, 설정에서 "폰 전체 입력"을 고르고
접근성 권한(설정 → 접근성 → 설치된 앱 → 토도독 룸 타자 세기)을 켜면 다른 앱 입력도 센다(글자가 바뀐 횟수만 세고 내용은 안 읽음).
- 빌드: `JAVA_HOME`을 Android Studio의 `jbr`로 두고 `npm run phone:apk` → `android/app/build/outputs/apk/debug/app-debug.apk`
- 웹 파일만 다시 넣기: `npm run phone` (`scripts/build-phone.js`가 `www/`를 만들고 `cap sync`)
- 폰 전용 코드: `src/phone/`(셸·스타일), `android/app/src/main/java/com/todok/room/`(`TypingService` 접근성 서비스, `TypingPlugin`)
- APK로 직접 설치하면 안드로이드 13+에서는 접근성 권한이 "제한된 설정"으로 막힐 수 있다: 앱 정보 → ⋮ → 제한된 설정 허용.

구조: `src/main.js`(모서리 창, 위치 기억, 항상 위, 전역 키 감지) · `renderer/data.js`(가격·목록) · `game.js`(저장, 토독, 구매, 배치)
· `room.js`(방 그리기, 캐릭터·반려동물, 꾸미기) · `ui.js`(바, 패널, 꾸미기 모드) · `character.js`, `furniture.js`, `sprites.js`,
`audio.js`, `ambient.js`, `music.js`, `sounds.js`(토도독 하우스에서 가져옴).
