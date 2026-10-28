# 글 쓰는 법

말투, 금지 표현, 단계, 명령은 여기 적지 않습니다.

- 말투와 제목: `STYLE.md`
- 단계와 명령: `WORKFLOW.md`
- 금지 표현: `rules/banned.yaml`
- 최신 수정: `docs/개선기록.md`

## 프론트매터

`title`, `serpTitle`, `description`, `date`, `updated`, `publishAt`, `category`, `tags`, `sources`, `featured`, `구성`, `제목틀`, `검색어`, `근거`.

선택: `series`, `baseDate`, `applyPeriod`, `status`, `faq`, `thumbStyle`, `thumbNumber`, `thumbImage`, `author`.

`author`를 비우면 백현입니다. 실명을 쓰지 않습니다.

`publishAt`이 미래면 빌드에서 빠집니다.

슬러그는 파일 이름입니다. 연도 폴더를 쓰지 않습니다.

## 본문 부품

`AtAGlance`, `Term`, `EligibilityChecklist`, `WorkedExample`, `Calculator`, `ApplyBox`, `AdSlot`, `Figure`.

계산기 `preset`은 `pension-timing`, `severance`, `health`, `housing`, `living-gap`.

광고는 섹션 사이에만, 글당 3개 이하. `example`이 붙은 계산 상자는 예시 숫자로 치고 사실 원장 검사에서 뺍니다.

## 사실 원장

`work/<슬러그>/facts.yaml`의 `F1`… 각 항목에 `value`, `source`, `checkedAt`. 본문의 숫자, 날짜, 금액, 퍼센트는 여기 있어야 합니다.

## 확인

`npm run check`
