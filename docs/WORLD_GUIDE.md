# 월드·NPC 웹 안내

기존 그림자 도감은 `/shadow-codex/`에 유지하고 아래 두 페이지를 별도로 제공한다.

- `/shadow-codex/atlas/`: 63개 지역, 4장의 월드 일러스트, 확대/스크롤, 맵 이름·환경·대표 그림자 검색,
  지역 유형 필터, 권장 레벨, 입장 조건, 연결 지역과 출구 방향, 대표 그림자 도감 링크, NPC 링크, 출발지별 연결 경로.
- `/shadow-codex/npcs/`: 65명의 전용 이미지, 이름·역할·지역 검색과 필터, 등장 조건, 대략 위치 안내도,
  관련 대화 퀘스트, 선택해서 펼치는 대화 미리보기. 지역별 보기 `?region=prologue_theater` 지원.
- 두 페이지 모두 `#regionId` 또는 `#npcId`로 상세 링크를 공유할 수 있다. 브라우저 뒤로/앞으로 이동 지원.

## 데이터 기준

`world-data.json`의 `sourceCommit`이 기준 Unity 커밋이다. 최초 기준은 unityGame `587cf39`.
지역/세계 좌표/인물 이름·아트/퀘스트/대화/동행 이벤트는 Unity JSON에서 가져온다.
스토리 NPC와 지역 출입구 좌표는 `PlayablePrologueGenerator.cs` 호출에서 추출한다.
마을 서비스 좌표·역할·비용·등장 단계는 해당 생성기와 `TownServices`, `TownResidentRequest`, `TownRecoveryNpc`를 확인해 반영했다.

- 20명 이야기 NPC, 3명 기억 NPC, 7개 마을 × 6명 서비스 NPC = 65명.
- 장인은 복구 2단계(재건), 돌아온 상인은 3단계(번영)부터 등장한다.
- NPC 도판은 원래 NPC 아틀라스의 셀과 `cropTop`/`cropHeight`를 그대로 추출했다.
- 위치 안내도는 초기 배치 좌표를 기준으로 한다. 마을 서비스는 가까운 통행 가능 칸으로 이동 배치되며 순찰한다.
  생성된 Unity 씬의 실제 지형·현재 개체 좌표를 제공하는 지도는 아니다.
- 지역 경로는 `connectedRegionIds`로 탐색하며 현재 플레이어의 세이브/해금 상태를 읽지 않는다.
- `RegionProgress.MeetsTravelRequirement`에 따라 일반 지역의 `quest_*_complete`는 필수 관문으로 표시하지 않는다.
  보스·숨은 길·동행 이벤트의 입장 조건은 유지한다. 향후 이동 정책이 바뀌면 내보내기도 함께 수정해야 한다.
- 상인 NPC는 복구 소식을 안내하며 물품 구매는 게임의 마을 상점 메뉴를 사용한다.

## 갱신과 검증

Python + Pillow, Node + Playwright/Chromium이 필요하다.

```sh
python tools/export-world-guide.py --source ../unityGame
python tools/check-world-data.py
npm run build
# 별도 터미널에서 public 폴더만 제공
python -m http.server 4174 --bind 127.0.0.1 --directory public
node tools/check-world-guide.cjs
```

내보내기는 Unity 저장소를 읽기만 하며 게임 소스·생성 씬·저장 데이터를 변경하지 않는다.
서비스 NPC의 행동이나 배치 기본값이 바뀌면 내보내기 스크립트의 서비스 설명/좌표도 갱신한다.

확인 완료: 데이터 참조/등장 조건/63개 지역 연결성, 69개 아트 파일,
63개 지역·65개 NPC의 브라우저 상세/이미지, 검색/초기화/유형·지역 필터,
지도 확대, 지역↔NPC 링크, 길찾기, 초상 컨테이너 크기,
320/390/768/1440px 가로 넘침, JavaScript/로컬 HTTP 오류 없음, Vite 빌드.
기존 그림자 도감의 191개 카드·11개 신규 상세·속성표·모바일 회귀 검사도 통과했다.

## 배포

Vite가 `public/shadow-codex/`를 그대로 `dist/shadow-codex/`에 복사하므로 별도 서버 API나 라우팅 설정이 필요 없다.
openWorld main push가 기존 Vercel Git 연동의 배포 트리거다. 실제 배포 성공 상태는 Vercel 대시보드에서 확인한다.

## 진화·아이템 안내와 연결

- `/shadow-codex/evolution/`: 173개 진화 형태를 검색하고 레벨/선행 기억복원/조건 충족 경로/최종 조작을 확인한다.
- `/shadow-codex/items/`: 21개 도구의 효과, 기본 가격, 구매 지역과 복구 단계, 퀘스트·동행 보상 획득법을 확인한다.
- 기존 그림자 카드의 진화 영역에서 상세 방법으로 이동한다. 각 단계의 NPC·지역·아이템 칩을 누르면 해당 안내를 연다.
- NPC·지역 안내에도 관련 진화 링크를 제공한다. 모바일 직접 링크는 선택한 상세로 스크롤하며 검색으로 돌아가는 버튼을 제공한다.
- 보유 개체가 필요하다. 진명은 기억복원 이후 가능하며 각본집에서 구원/원한을 한 번 고른다.
- 현재 MemoryAwakeningService는 레벨·기억 조건을 검사하며 진화 자체의 아이템/금화 비용을 소비하지 않는다.
  퀘스트 보상과 선택적 기록/경험치 도구를 진화 재료와 분리해서 표시한다.
- 44개 기억 조건은 개인 여정 완료, NPC 대화(후속 선택지 포함), 보스 승리/후일담, 동행 이벤트까지 소스를 역추적했다.
  초기 6종의 개인 기억 여정과 스토리 이정표 별칭은 **둘 중 하나**로 안내한다.
- 동행 이벤트 걸음 수는 같은 동행을 유지할 때 기준이다. 이동 이벤트에서 전투/대화가 끝난 뒤 발동할 수 있다.
- 아이템 획득처는 상점/퀘스트/동행 보상 경로를 제공한다. 모든 야생 드롭을 열거하는 표는 아니다.

세계 안내를 갱신한 뒤 진화 안내를 내보내야 양방향 링크가 함께 갱신된다.

```sh
python tools/export-world-guide.py --source ../unityGame
python tools/export-evolution-guide.py --source ../unityGame
python tools/check-world-data.py
python tools/check-evolution-guide.py
node tools/check-evolution-guide.cjs
```

기존 Unity의 `sync-shadow-codex.py`로 그림자 본문을 갱신한 경우에도 위의 두 내보내기를 마지막에 실행한다.
진화 추적기는 해결하지 못한 조건이 있으면 실패하며, 데이터 검사기는 모든 형태·기억 조건·참조 대상과 보상/소모 구분을 검사한다.
현재 조건 그래프는 JSON과 에디터 생성기/성장 서비스의 규칙을 기반으로 한다. 성장/아이템 정책을 바꿀 때 내보내기도 함께 검토한다.

### 경험치 대본 구간

게임의 TrainingItemLimits.json에서 사용 범위와 성장 상한을 읽어 아이템 안내에 함께 내보낸다.
연습용은 Lv.1~19에서 최대 20, 주석은 Lv.20~49에서 최대 50, 완성은 Lv.50~79에서 최대 80까지 성장시킨다.
상한까지 남은 경험치만 지급하며 Lv.80 이후는 전투 경험치로 성장한다.
진화에 대본을 필수 재료로 요구하지 않는 기존 안내는 유지한다.
## 후반 보급 거점

Unity의 `JourneyHubCatalog.json`에서 유리 해안/뒤집힌 로비의 거점 이름·보급대/귀환 칸·상품을 읽는다.
상점 소스의 기본 휴식 요금도 함께 내보낸다. NPC 수와 기존 7개 마을 분류는 유지한다.
월드 아틀라스의 보급 거점 필터/이름 검색과 상세 안내, 각 8종 아이템 구입처를 양방향 링크로 연결했다.
두 지역은 야생 조우가 있는 필드이며 방문/이야기 조건을 충족해야 빠른 이동할 수 있다고 안내한다.

```sh
python tools/export-world-guide.py --source ../unityGame
python tools/export-evolution-guide.py --source ../unityGame
python tools/check-world-data.py
python tools/check-evolution-guide.py
node tools/check-hub-guide.cjs
npm run build
```

2개 거점/아이템 링크/유형·이름 검색/320·390·1440px Chromium 검사와 기존 지역·NPC·진화 안내 브라우저 검사 통과.
Vite 빌드 통과. 게임의 Unity 실행·저장·귀환은 웹 검사 범위에 포함하지 않는다.
