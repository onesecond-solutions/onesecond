/*
  field-voice.module.js — 현장의 소리 SPA 모듈 (2026-05-23 신설, SPA 전환 Phase 1)

  본질: pages/voice.html (네비게이션방) + pages/team_chat.html (단체방) +
        스마트 게시판 + 지점 게시판을 app.html 내부 단일 SPA 모듈로 통합.

  현재 상태: Phase 1 = 골격 + mock 자료만.
  Phase 2 (다음 단계): voice.html / team_chat.html 실제 본문 + CSS + JS 흡수.

  view 4종:
    - team   : 4팀 단체방
    - voice  : 네비게이션방
    - smart  : 스마트 게시판
    - branch : 지점 게시판

  URL 자료:
    /app.html#field-voice/team
    /app.html#field-voice/voice
    /app.html#field-voice/smart
    /app.html#field-voice/branch
*/
const FieldVoiceModule = (() => {
  const rooms = {
    team: {
      title: '4팀 단체방',
      subtitle: '4팀 내부 공지와 실무 공유 공간입니다.',
      activeTab: 'team'
    },
    voice: {
      title: '네비게이션방',
      subtitle: '보험사별 인수 가능 여부와 현장 질문을 공유합니다.',
      activeTab: 'voice'
    },
    smart: {
      title: '스마트 게시판',
      subtitle: '업무 자료와 반복 질문을 정리하는 공간입니다.',
      activeTab: 'smart'
    },
    branch: {
      title: '지점 게시판',
      subtitle: '지점 단위 공지와 소통 공간입니다.',
      activeTab: 'branch'
    }
  };

  function render(roomKey = 'team') {
    const room = rooms[roomKey] || rooms.team;

    return `
      <section class="field-voice">
        <div class="ttl">현장의 소리 <span class="ac">· ${room.title}</span></div>
        <div class="sub">${room.subtitle}</div>

        <div class="tabs">
          ${tab('team', '4팀 단체방', room.activeTab)}
          ${tab('voice', '네비게이션방', room.activeTab)}
          ${tab('smart', '스마트 게시판', room.activeTab)}
          ${tab('branch', '지점 게시판', room.activeTab)}
        </div>

        <div class="chips">
          <div class="chip on">전체</div>
          <div class="chip">공지사항</div>
          <div class="chip">인수 같음</div>
          <div class="chip">상품 같음</div>
          <div class="chip">기타</div>
        </div>

        <div class="split">
          <div class="col list-col">
            <div class="lhead">
              <span class="cnt">${room.title} <b>10건</b></span>
              <div class="lacts">
                <button class="lbtn2">⌕</button>
                <button class="newb">질문하기</button>
              </div>
            </div>

            <div class="list">
              ${mockList(roomKey)}
            </div>
          </div>

          <div class="col viewer-col">
            ${mockViewer(roomKey)}
          </div>
        </div>
      </section>
    `;
  }

  function tab(key, label, active) {
    return `
      <div class="tab ${key === active ? 'on' : ''}"
           onclick="window.appRouter.navigate('field-voice/${key}')">
        ${label}
      </div>
    `;
  }

  function mockList(roomKey) {
    if (roomKey === 'voice') {
      return `
        <div class="item on"><span class="badge">인수 같음</span><div class="it">70년 남 사무직 뇌경색/부정맥/고혈압 보장 문의</div><div class="id">5월 15일 · 답변 3</div></div>
        <div class="item"><span class="badge">상품 같음</span><div class="it">암보험 매월 생활비 받는 상품</div><div class="id">5월 12일 · 답변 3</div></div>
      `;
    }

    return `
      <div class="item on"><span class="badge">공지사항</span><div class="it">4팀 이번 주 공유사항 확인 부탁드립니다</div><div class="id">오늘 · 댓글 5</div></div>
      <div class="item"><span class="badge">업무공유</span><div class="it">청약 진행 시 자주 묻는 질문 정리</div><div class="id">어제 · 댓글 2</div></div>
    `;
  }

  function mockViewer(roomKey) {
    if (roomKey === 'voice') {
      return `
        <div class="viewer">
          <span class="vbadge">인수 같음</span>
          <div class="vttl">70년 남 사무직 뇌경색/부정맥/고혈압 순환계 기왕증 보장</div>
          <div class="vmeta">5월 15일 16:28 · 답변 3</div>
          <div class="vbody">
            네비게이션방 상세 본문 영역입니다.
            <div class="answer"><div class="who">한화손보 답변</div>간편 2대치료비 가능.</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="viewer">
        <span class="vbadge">공지사항</span>
        <div class="vttl">4팀 단체방 공지/대화 상세 영역</div>
        <div class="vmeta">오늘 · 댓글 5</div>
        <div class="vbody">4팀 단체방 상세 본문 영역입니다.</div>
      </div>
    `;
  }

  return { render };
})();

window.FieldVoiceModule = FieldVoiceModule;
