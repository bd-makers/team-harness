// `origin/HEAD` 를 읽어 기본 브랜치 **이름**을 돌려주는 한 곳.
//
// 이 읽기가 저장소에 세 벌 있었고 방법이 제각각이었다: `symbolic-ref -q` 로 전체 ref 를 받아
// `refs/remotes/` 를 잘라내는 곳(remote-task), `--short` 로 받아 `origin/` 을 지우는 곳(summary
// 의 defaultBranchCandidates), 같은 값을 받아 `refs/remotes/` 로 되돌려 조립하는 곳(summary 의
// isSyncedWithDefault). 플래그도 파싱도 달라서 이 읽기에 결함이 생기면 세 곳을 따로 고쳐야 했다.
//
// **폴백 정책은 여기 없다.** origin/HEAD 가 없을 때 무엇으로 대신할지는 호출자마다 다르고, 그 차이는
// 의도된 것이다 — 이름 경로는 관용적 이름 둘로 넓히고(`['main','master']`), 커밋 비교 경로는 넓히지
// 않는다(쓰기가 열리기 때문, summary.mjs 의 isSyncedWithDefault 주석이 정본). 여기서 폴백을 정하면
// 그 구분이 사라진다. 이 함수는 "origin/HEAD 가 뭐라고 말하는가" 하나만 답하고 모르면 null 을 준다.
//
// `exec` 도 호출자가 준다. remote-task 는 `GIT_NO_LAZY_FETCH=1` + timeout 을 건 exec 을, summary 는
// plain exec 을 쓴다. 실행 정책까지 여기서 정하면 호출자의 동작이 바뀐다 — 공유하는 것은 명령과
// 파싱뿐이다.

// `--short` 는 `origin/main` 모양을 준다. 로컬 브랜치나 태그가 이 이름을 답으로 가로채지 못하게
// 하려면 비교 시점에 `refs/remotes/` 로 되돌려 조립해야 하는데, 그 책임은 호출자에게 남는다
// (summary.mjs 의 isSyncedWithDefault 가 그렇게 한다).
const ORIGIN_HEAD_REF = 'refs/remotes/origin/HEAD';

/**
 * @param {(args: string[]) => Promise<string>} exec
 *        `git -C <targetDir>` 뒤에 붙일 인수 배열을 받아 stdout 을 돌려주는 실행기.
 *        대상 디렉터리는 호출자가 이 함수에 닫아 넣는다 — 실행 정책(env·timeout)과 함께 묶여 있다.
 * @returns {Promise<string|null>} 기본 브랜치 이름(예: 'main'), 판정 불가면 null.
 */
export async function readOriginHead(exec) {
  try {
    const raw = (await exec(['symbolic-ref', '--quiet', '--short', ORIGIN_HEAD_REF])).trim();
    // `origin/` 으로 시작하지 않으면 모른다고 답한다. git 이 만드는 origin/HEAD 는 항상
    // `refs/remotes/origin/<branch>` 이고, 손으로 `refs/heads/<branch>` 를 가리키게 만든 저장소에서
    // `--short` 는 `develop` 같은 **로컬** 브랜치 이름을 준다. 그것을 원격 기본 브랜치의 답으로
    // 채택하면 로컬 브랜치가 원격 기본 브랜치 행세를 하게 된다 — 이 계열 작업이 없애려는 혼동 그 자체다.
    // (옛 remote-task 구현도 `refs/remotes/` 접두를 확인하고서야 채택했다. 옛 defaultBranchCandidates
    // 만 이 값을 받아들였고, 이제 셋이 같은 답을 한다.)
    if (!raw.startsWith('origin/')) return null;
    // 접두만 벗긴다 — 브랜치 이름 자체에 슬래시가 들어갈 수 있다(`release/2026-09`).
    return raw.slice('origin/'.length) || null;
  } catch {
    // origin/HEAD 미설정 · git 아님 · 실행 실패 — 전부 "모른다" 하나로 합친다. 무엇으로 대신할지는
    // 호출자가 자기 정책으로 정한다.
    return null;
  }
}
