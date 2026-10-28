# 오늘의 머니팁

퇴직 전후 돈 정보를 정적 사이트로 만드는 Astro 엔진입니다. 사이트마다 `site.config.ts`만 바꿉니다.

말투와 단계는 `STYLE.md`, `WORKFLOW.md`를 봅니다.

## 로컬

```bash
nvm use
npm install
npm run dev
```

개발 서버는 `http://localhost:4321` 입니다.

## 빌드

```bash
npm run build
npm run preview
```

`npm run build`는 썸네일을 만든 뒤 `dist/`에 정적 파일을 넣습니다. 검색 색인(Pagefind)도 그 안에 있습니다.

`npm run check`는 사실 원장, 링크, 금지 표현, 발행 계획을 검사합니다.

## Cloudflare Pages

정적 출력만 씁니다. Workers와 Functions는 없습니다.

| 항목 | 값 |
| --- | --- |
| 프레임워크 | Astro |
| 프로덕션 브랜치 | main |
| 루트 디렉터리 | `/` |
| 빌드 명령 | `npm run build` |
| 출력 디렉터리 | `dist` |
| 환경 변수 | `NODE_VERSION` = `22` |
| Node | `.nvmrc`와 같음 |

광고, 분석, 인증 메타는 `site.config.ts`가 비어 있으면 스크립트를 넣지 않습니다.

## 새 블로그로 복제

1. 저장소를 복사합니다.
2. `site.config.ts`의 이름, 도메인, 분류, 색, 메일, 광고, 분석, IndexNow 키를 바꿉니다.
3. `src/content/posts`와 `work/`를 새 글로 바꿉니다.
4. `data/keyword-seeds.json`과 `schedule.config.json`을 고칩니다.
5. `npm run check`와 `npm run build`를 통과시킵니다.

## 키워드와 발행

키 없이도 `npm run keywords -- --category pension`이 대기열을 만듭니다. 키 이름은 `.env.example`에만 적혀 있습니다.

`npm run work -- plan`은 앞으로 14일의 발행 칸을 보여 줍니다. 미래 `publishAt` 글은 빌드에서 빠지고, 그 시각 이후 다시 빌드하면 공개됩니다.

## 필명

글쓴이는 백현입니다. 실명을 넣지 않습니다.
