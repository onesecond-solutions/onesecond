-- ════════════════════════════════════════════════════════════════════
-- 2026-05-24 mirror_script 통째 V2 토큰 + 카드 디자인 정합 (재실행 자체)
-- ════════════════════════════════════════════════════════════════════
-- 격차 본질:
--   1. 메리츠/흥국 자체 메인 메뉴 자체 자체 표시 격차 (is_active=true)
--   2. 미러링 전 녹취 스크립트 = 회사 선택 허브 두 버튼 = 단순 흰 테두리 = card_design 본질 미적용
--   3. 메리츠화재 content_html = V2 토큰 미적용 (003.png 자체 자체 자체 확인)
--   4. 흥국생명 content_html = V2 토큰 미적용 (직전 격차 동일 자체)
--
-- 본 SQL 본질:
--   - 4 UPDATE 한 RUN (BEGIN ~ COMMIT 트랜잭션)
--   - 직전 mirror_script_v2_tokens.sql 자체 자체 자체 가동 X 가능 = 재실행 자체
--
-- 색상 매핑 (회사 본질 정합):
--   - 메리츠화재 = 빨강 var(--err)
--   - 흥국생명 = 파랑 var(--ac) (인디고 통합)
--
-- 실행: Supabase SQL Editor → 통째 RUN
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. 메리츠/흥국 메인 메뉴 숨김 (is_active=false) ────────────────
UPDATE public.quick_contents
SET is_active = false
WHERE tab_title IN ('메리츠화재', '흥국생명');

-- ── 2. 미러링 전 녹취 스크립트 (회사 선택 허브 + 카드 강화) ─────────
UPDATE public.quick_contents
SET content_html = $HTML$
<div style="width:100%; font-family:inherit; line-height:1.65; letter-spacing:-0.2px; color:var(--tp);">
  <!-- 상단 안내 -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:5px solid var(--ac); border-radius:12px; padding:14px 16px; margin-bottom:12px;">
    <div style="font-size:1.05em; font-weight:800; color:var(--tp); margin-bottom:4px;">미러링 청약 전 동의 녹취 스크립트</div>
    <div style="font-size:0.85em; color:var(--ts);">※ 본 스크립트는 <span style="color:var(--warn); font-weight:700;">피보험자에게</span> 진행합니다.</div>
  </div>

  <!-- 사용 안내 -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:4px solid var(--warn); border-radius:10px; padding:12px 14px; margin-bottom:12px;">
    <div style="font-size:0.85em; font-weight:700; color:var(--warn); margin-bottom:4px;">! 사용 안내</div>
    <div style="font-size:0.8em; color:var(--ts); line-height:1.6;">본 스크립트는 예시이며 실제 적용은 회사/보험사 기준에 따라 조정이 필요합니다. <span style="color:var(--tp); font-weight:700;">최종 사용 및 녹취 책임은 사용자에게 있습니다.</span></div>
  </div>

  <!-- 미러링 전 동의 녹취 -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-radius:10px; padding:14px 16px; margin-bottom:14px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <div style="font-size:0.95em; font-weight:700; color:var(--tp);">미러링 전 동의 녹취</div>
      <div style="font-size:0.75em; color:var(--ts); font-style:italic;">(핵심만)</div>
    </div>
    <p style="line-height:1.7; margin-bottom:12px; color:var(--tp);">
      고객님 안녕하세요. <span style="font-weight:700; color:var(--tp);">○○○</span>입니다.<br>
      <span style="font-weight:700; color:var(--tp);">[미러링 청약]</span> 진행을 위해 <span style="font-weight:700; color:var(--tp);">미러링(화면 공유)</span>전 동의 녹취 먼저 읽어 드리겠습니다.
    </p>
    <div style="background:var(--s1); border:1px dashed var(--bd); padding:10px 12px; border-radius:8px; font-size:0.8em; color:var(--ts); text-align:center;">
      아래 보험사를 선택하면 해당 녹취 스크립트를 바로 확인할 수 있습니다.
    </div>
  </div>

  <!-- 회사 선택 허브 = 두 버튼 카드 강화 (메리츠 빨강 / 흥국 파랑) -->
  <div style="display:flex; gap:14px; justify-content:center; margin-top:18px; flex-wrap:wrap;">
    <button type="button" onclick="openQuickOverlay('메리츠화재')" style="flex:1; min-width:200px; max-width:240px; padding:16px 18px; background:var(--s2); border:1px solid var(--bd); border-left:5px solid var(--err); border-radius:12px; color:var(--tp); font-family:inherit; cursor:pointer; transition:all 0.15s ease; text-align:left; display:flex; flex-direction:column; align-items:flex-start; gap:6px;">
      <span style="display:inline-block; padding:3px 10px; border-radius:999px; background:rgba(239,68,68,0.18); color:var(--err); font-size:0.7em; font-weight:800;">메리츠</span>
      <span style="font-size:1em; font-weight:800;">메리츠화재</span>
    </button>
    <button type="button" onclick="openQuickOverlay('흥국생명')" style="flex:1; min-width:200px; max-width:240px; padding:16px 18px; background:var(--s2); border:1px solid var(--bd); border-left:5px solid var(--ac); border-radius:12px; color:var(--tp); font-family:inherit; cursor:pointer; transition:all 0.15s ease; text-align:left; display:flex; flex-direction:column; align-items:flex-start; gap:6px;">
      <span style="display:inline-block; padding:3px 10px; border-radius:999px; background:rgba(99,102,241,0.18); color:var(--ac); font-size:0.7em; font-weight:800;">흥국</span>
      <span style="font-size:1em; font-weight:800;">흥국생명</span>
    </button>
  </div>
</div>
$HTML$
WHERE tab_title = '미러링 전 녹취 스크립트'
  AND tab_key = 'mirror_script';

-- ── 3. 메리츠화재 V2 토큰 정정 ─────────────────────────────────────
UPDATE public.quick_contents
SET content_html = $HTML$
<div style="width:100%; font-family:inherit; line-height:1.65; letter-spacing:-0.2px; color:var(--tp);">
  <!-- Header -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:5px solid var(--err); border-radius:10px; padding:12px 16px; text-align:center; font-weight:800; font-size:1em; margin-bottom:14px; color:var(--tp);">
    메리츠화재 한장으로 읽어요 (26년 4월 업데이트 자료)
  </div>

  <!-- 상담콜 -->
  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; text-align:center; font-weight:800; margin-bottom:10px; color:var(--tp);">상담콜</div>

  <p style="line-height:1.7; margin-bottom:10px; color:var(--tp);">
    안녕하세요, 메리츠 화재 <span style="color:var(--ac);">OOOOO 보험대리점</span> 소속 설계사 <span style="color:var(--ac);">000</span>입니다.<br>
    담당 설계사의 판매 자격등 주요 정보는 보내드리는 계약 서류에 기재된 고유 번호로 E클린 보험서비스에서 조회하실 수 있습니다.
  </p>

  <p style="line-height:1.7; margin-bottom:10px; color:var(--tp);">
    <span style="color:var(--err); font-weight:700;">(DB취득경로 필수 안내 必)</span><br>
    <span style="color:var(--err);">000고객님의 정보는 00월 00일 OOOOO 보험대리점으로부터 제공받아 연락드림을 안내 드립니다.</span><br>
    고객님께서 가입하시는 상품은 <span style="color:var(--err);">무배당 메리츠 (상품명), 30년납 90세, 보험기간은 2026.00.00~2026.00.00까지이며 월보험료는 000만원</span>입니다.
  </p>

  <p style="line-height:1.7; margin-bottom:14px; color:var(--tp);">
    보험 가입 담보는 기본계약 일반 상해사망 외 <span style="color:var(--err);">(담보명 풀네임으로/보험료까지 최대 4개이상)</span> 등이 있으며 암 진단비의 경우 암 보장개시일은 최초 계약일 또는 부활일부터 그날을 포함하여 90일이 지난 다음 날 입니다.
  </p>

  <!-- 가입설계동의 -->
  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; text-align:center; font-weight:800; margin-bottom:10px; color:var(--tp);">가입설계동의</div>

  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">본 동의는 가입설계동의이며, 거부가능하나 정확한 상담은 불가합니다.</p>

  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    고유식별정보, 질병상해정보 및 이름, 연락처, 상거래정보 등 일반개인신용정보를 보험설계, 인수결정, 보험중복확인 등을 위해 1년간 수집/이용/보유하는데 동의하십니까? <span style="color:var(--ac); font-weight:700;">(예 확인)</span>
  </p>

  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    동일 목적 및 기존 계약과의 중요사항 비교 등을 위해 종합신용정보집중기관 등에서 말씀드린 개인신용정보를 3개월간 조회에 동의하십니까? <span style="color:var(--ac); font-weight:700;">(예 확인)</span>
  </p>

  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    인수심사 등을 위해 국내 재보험사, 공공기관 등에 말씀드린 개인신용정보를 제공하고, 위 수집이용 정보항목을 재보험·재재보험 계약시점에 온라인으로 국외 재보험·재재보험에 목적달성시까지 보유이용하도록 제공하는데 각각 동의하십니까? <span style="color:var(--ac); font-weight:700;">(예 확인)</span>
  </p>

  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    위 내용과 동일하게 고유식별정보 및 질병상해정보 처리에 각각 동의하십니까? <span style="color:var(--ac); font-weight:700;">(예 확인)</span>
  </p>

  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    국외 제공 및 동의 상세내용은 홈페이지 및 문자/톡으로 확인 가능하며, 언제든 동의철회 가능합니다.
  </p>

  <p style="line-height:1.7; margin-bottom:14px; color:var(--tp);">
    가입설계 및 본인인증을 위한 개인정보 처리에 동의하십니까? <span style="color:var(--ac); font-weight:700;">(예 확인)</span>
  </p>

  <div style="background:var(--s2); padding:10px 12px; border-radius:8px; text-align:center; font-weight:800; color:var(--err);">
    ※ 미러링 표준스크립트 콜 : 별도 기준없음<br>
    ※ 승환 관련 사전 질문 : 미진행
  </div>
</div>
$HTML$
WHERE tab_title = '메리츠화재'
  AND tab_key = 'mirror_script';

-- ── 4. 흥국생명 V2 토큰 정정 ─────────────────────────────────────
UPDATE public.quick_contents
SET content_html = $HTML$
<div style="width:100%; font-family:inherit; line-height:1.65; letter-spacing:-0.2px; color:var(--tp);">
  <!-- Header -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:5px solid var(--ac); border-radius:10px; padding:12px 16px; text-align:center; font-weight:800; font-size:1em; margin-bottom:14px; color:var(--tp);">
    흥국생명 VTM 사전녹취스크립트 (2025.11.27 기준)
  </div>

  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; font-weight:800; margin-bottom:10px; color:var(--tp);">모집자 소속 / 성명 / 통화목적</div>
  <p style="line-height:1.7; margin-bottom:10px; color:var(--tp);">
    안녕하세요. <span style="color:var(--ac);">[소속회사] [대리점명]</span> 상담원 <span style="color:var(--ac);">○○○</span>입니다.<br>
    고객님께 <span style="color:var(--ac);">(상품명) ○○○</span> 설명 드리려고 합니다.<br>
    잠시 통화 괜찮으신지요? (네~ 라고 답변시 상담)
  </p>

  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; font-weight:800; margin-bottom:10px; color:var(--tp);">정보취득경로 (개인정보보호취득경로 18.09.01)</div>
  <p style="line-height:1.7; margin-bottom:10px; color:var(--tp);">
    고객님께서는 <span style="color:var(--ac);">[소속회사]</span>에서 상담 목적으로 정보 동의해주셨습니다.<br>
    개인정보 처리 정지나 동의를 철회하실 수 있으며, 개인정보 이용·제공 내역은 대표 홈페이지 개인정보 처리방침 및 조회 페이지에서 확인 가능합니다.
  </p>

  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; font-weight:800; margin-bottom:10px; color:var(--tp);">두낫콜</div>
  <p style="line-height:1.7; margin-bottom:14px; color:var(--tp);">원치 않으시면 통화 거절도 가능하십니다.</p>

  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; font-weight:800; margin-bottom:10px; color:var(--tp);">상품설명 <span style="color:var(--err);">※ 주계약 및 특약별로 가입한 내용에 따라 보장안내</span></div>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    가입하시는 상품명 <span style="color:var(--ac);">○○○</span>은 암, 2대진단, 수술비, 입원비, 간병인사용일당 등으로 구성되어있는 상품이며 (설계에 따라 상이),<br>
    주계약은 가입금액 <span style="color:var(--ac);">○○만원</span>으로 사망보장 또는 재해장해 보장 입니다 (주계약은 상품에 따라 상이)<br>
    납입기간은 <span style="color:var(--ac);">○○년</span> 보장기간은 <span style="color:var(--ac);">○○세</span> 까지입니다.
  </p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--err);">[갱신형특약있는경우 갱신형 안내]</p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    가입하시는 보장으로는 뇌혈관 <span style="color:var(--ac);">○○만원</span>, 허혈성진단비 <span style="color:var(--ac);">○○만원</span>, 질병수술비 <span style="color:var(--ac);">○○만원</span>
  </p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--err);">[가입담보 안내 - 모든 가입담보 + 가입금액 필수 녹취]</p>
  <p style="line-height:1.7; margin-bottom:14px; color:var(--tp);">
    월보험료는 <span style="color:var(--ac);">00,000원</span>이며 고객님과 함께 보며 진행하는 보이는 TM안 미러링으로 청약 진행 됩니다.
  </p>

  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; font-weight:800; margin-bottom:10px; color:var(--tp);">신용정보 및 계약관리자 안내</div>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--err);">■ 상담원 소속안내 / 고객확인 / 통화목적등 선안내 (TM상품 이제 보면서 설명 들으세요, 18.12.01 시행)</p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    <span style="color:var(--err);">[보험기입 권유전(도중) 상품요약자료 제공 안내 ♣]</span>: 만 65세이상 계약자에게만 안내, 갱신형 계약자에게안내<br>
    보험상품 이해를 위해 상품요약자료를 보내드리고 상담을 진행하겠습니다. LMS(문자), 이메일, 우편으로 가능한데 어떤 방식으로 발송해드릴까요?
  </p>
  <p style="line-height:1.7; margin-bottom:14px; color:var(--err);">■ 지금까지 설명 드린 내용은 상품설명서를 참조하여 주시고, 보장내용에 대한 세부적인 내용은 약관에서 정한 기준에 따라 보장됩니다.</p>

  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; font-weight:800; margin-bottom:10px; color:var(--tp);">청약 녹음</div>
  <p style="line-height:1.7; margin-bottom:14px; color:var(--tp);">
    지금부터 <span style="color:var(--ac);">○○년 ○○월 ○○일 ○○시</span> <span style="color:var(--ac);">(상품명) ○○</span> 가입을 위한 청약녹음하겠습니다. 동의하세요? <span style="color:var(--ac); font-weight:700;">(네, 대답필수)</span>
  </p>

  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; font-weight:800; margin-bottom:10px; color:var(--tp);">청약서 고지사항 — 계약전 알릴의무</div>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--err); font-weight:700;">★ 고지 방해, 위반 금지 ★</p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    계약자나 피보험자가 중요한 사항을 알리는 것을 방해하거나 부실고지를 권유, 유도하는 것을 금지합니다.<br>
    피보험자의 건강상태, 직업, 운전 등의 질문 사항은 보험계약을 인수하는데 필요한 사항으로 사실대로 알리지 않거나 다르게 알리면 보험 가입이 거절될 수 있습니다.<br>
    특히 중요한 사항에 해당하는 경우 보험금 지급이 거절되거나 계약이 해지될 수 있습니다.
  </p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--err);">■ 건강고지 필수! 피보험자가 미성년자일경우 계약자에게 확인</p>
  <p style="line-height:1.7; margin-bottom:14px; color:var(--err);">■ 질문은 '예'인 경우는 청약서(T-Life) 반드시 기재 → 미기재시 고지의무 누락으로 재제조치 될 수 있음.</p>

  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; font-weight:800; margin-bottom:10px; color:var(--tp);">카드 납입</div>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--err); font-weight:700;">[ 1회납 / 2회납 카드납입시 ]</p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--err);">★ 반드시 고객육성으로 정보확인 필수 카드주, 생년월일, 카드명, 카드번호, 유효기간 확인</p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    흥국생명에서 카드주 <span style="color:var(--ac);">○○○</span>, 생년월일(년,월,일), <span style="color:var(--ac);">△△카드</span> 카드번호 <span style="color:var(--ac);">○○-○○-○○-○○</span>, 유효기간( )로 월 보험료 <span style="color:var(--ac);">○○○원</span> 승인되는것에 동의하세요? <span style="color:var(--ac); font-weight:700;">(네, 대답필수)</span>
  </p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    2회부터 매월 15일이 승인일입니다. <span style="color:var(--ac);">○○카드</span>로 승인되는 것에 동의하시죠? <span style="color:var(--ac); font-weight:700;">(네, 대답 필수)</span>
  </p>
  <p style="line-height:1.7; margin-bottom:14px; color:var(--tp);">승낙이 이루어진 경우 1회 보험료를 받은 때부터 효력이 발생합니다.</p>

  <div style="background:var(--s2); padding:8px 12px; border-radius:8px; font-weight:800; margin-bottom:10px; color:var(--tp);">계좌 납입</div>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--err); font-weight:700;">[ 1회납 / 2회납 자동이체시 ]</p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--err);">★ 반드시 고객육성으로 확인 정보 필수 예금주명, 생년월일, 은행, 계좌번호 확인</p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    흥국생명에서 예금주 <span style="color:var(--ac);">○○○</span> 생년월일(년,월,일) <span style="color:var(--ac);">△△은행</span> 계좌번호 <span style="color:var(--ac);">○○○-○○○○-○○○</span>에서 월 보험료 <span style="color:var(--ac);">○○,○○○원</span> 출금되는 것에 동의하세요? <span style="color:var(--ac); font-weight:700;">(네, 대답필수)</span>
  </p>
  <p style="line-height:1.7; margin-bottom:8px; color:var(--tp);">
    2회 이후부터는 <span style="color:var(--ac);">△△은행</span> 계좌로 매월 (5,10,15,20,25일) 출금 되는 것에 동의하세요? <span style="color:var(--ac); font-weight:700;">(네, 대답필수)</span>
  </p>
  <p style="line-height:1.7; color:var(--tp);">승낙이 이루어진 경우 1회 보험료를 받은 때부터 효력이 발생합니다.</p>
</div>
$HTML$
WHERE tab_title = '흥국생명'
  AND tab_key = 'mirror_script';

COMMIT;

-- ── 검증 SQL (별 RUN) ──────────────────────────────────────────────
-- SELECT tab_title, tab_key, is_active, sort_order, LENGTH(content_html) AS html_len
-- FROM public.quick_contents
-- WHERE tab_key = 'mirror_script'
-- ORDER BY sort_order;

-- ── 다음 단계 (단계 2/3) — 메리츠화재 + 흥국생명 V2 토큰 정정 ──────
-- 별 Edit으로 본 파일 자체 추가 자체.
