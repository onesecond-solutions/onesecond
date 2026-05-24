-- ════════════════════════════════════════════════════════════════════
-- 2026-05-24 mirror_script seed (메리츠화재 + 흥국생명)
-- ════════════════════════════════════════════════════════════════════
-- 본질:
--   빠른실행 오버레이 → "녹취·스크립트" 그룹 → "메리츠화재" / "흥국생명" 항목 클릭 시
--   회사별 미러링 사전 녹취 스크립트 자료 동적 펼침
--
-- 자료 출처:
--   - 메리츠화재: upgrade_20260521/미러링 사전 스크립트(26.04).pdf
--   - 흥국생명: 팀장님 채팅 자료 (2026-05-24)
--
-- 패턴: UPSERT (ON CONFLICT tab_title = UPDATE)
--   - 기존 row 있으면 자료 갱신
--   - 없으면 신규 INSERT
--
-- 실행 자리: Supabase Dashboard → SQL Editor → 본 자료 통째 붙여넣기 → RUN
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 메리츠화재 (mirror_script) ──────────────────────────────────────
INSERT INTO public.quick_contents (tab_title, tab_key, content_html, is_active, sort_order)
VALUES (
  '메리츠화재',
  'mirror_script',
  $HTML$
<div class="mirror-script">
  <div style="background:#E3F2FD;padding:10px 14px;border-radius:8px;text-align:center;font-weight:800;font-size:1em;margin-bottom:14px;">메리츠화재 한장으로 읽어요 (26년 4월 업데이트 자료)</div>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;text-align:center;font-weight:800;margin-bottom:10px;">상담콜</div>

  <p style="line-height:1.7;margin-bottom:10px;">
    안녕하세요, 메리츠 화재 <span style="color:#1E88E5;">OOOOO 보험대리점</span> 소속 설계사 <span style="color:#1E88E5;">000</span>입니다.<br>
    담당 설계사의 판매 자격등 주요 정보는 보내드리는 계약 서류에 기재된 고유 번호로 E클린 보험서비스에서 조회하실 수 있습니다.
  </p>

  <p style="line-height:1.7;margin-bottom:10px;">
    <span style="color:#E53935;font-weight:700;">(DB취득경로 필수 안내 必)</span><br>
    <span style="color:#E53935;">000고객님의 정보는 00월 00일 OOOOO 보험대리점으로부터 제공받아 연락드림을 안내 드립니다.</span><br>
    고객님께서 가입하시는 상품은 <span style="color:#E53935;">무배당 메리츠 (상품명), 30년납 90세, 보험기간은 2026.00.00~2026.00.00까지이며 월보험료는 000만원</span>입니다.
  </p>

  <p style="line-height:1.7;margin-bottom:14px;">
    보험 가입 담보는 기본계약 일반 상해사망 외 <span style="color:#E53935;">(담보명 풀네임으로/보험료까지 최대 4개이상)</span> 등이 있으며 암 진단비의 경우 암 보장개시일은 최초 계약일 또는 부활일부터 그날을 포함하여 90일이 지난 다음 날 입니다.
  </p>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;text-align:center;font-weight:800;margin-bottom:10px;">가입설계동의</div>

  <p style="line-height:1.7;margin-bottom:8px;">본 동의는 가입설계동의이며, 거부가능하나 정확한 상담은 불가합니다.</p>

  <p style="line-height:1.7;margin-bottom:8px;">
    고유식별정보, 질병상해정보 및 이름, 연락처, 상거래정보 등 일반개인신용정보를 보험설계, 인수결정, 보험중복확인 등을 위해 1년간 수집/이용/보유하는데 동의하십니까? <span style="color:#1976D2;font-weight:700;">(예 확인)</span>
  </p>

  <p style="line-height:1.7;margin-bottom:8px;">
    동일 목적 및 기존 계약과의 중요사항 비교 등을 위해 종합신용정보집중기관 등에서 말씀드린 개인신용정보를 3개월간 조회에 동의하십니까? <span style="color:#1976D2;font-weight:700;">(예 확인)</span>
  </p>

  <p style="line-height:1.7;margin-bottom:8px;">
    인수심사 등을 위해 국내 재보험사, 공공기관 등에 말씀드린 개인신용정보를 제공하고, 위 수집이용 정보항목을 재보험·재재보험 계약시점에 온라인으로 국외 재보험·재재보험에 목적달성시까지 보유이용하도록 제공하는데 각각 동의하십니까? <span style="color:#1976D2;font-weight:700;">(예 확인)</span>
  </p>

  <p style="line-height:1.7;margin-bottom:8px;">
    위 내용과 동일하게 고유식별정보 및 질병상해정보 처리에 각각 동의하십니까? <span style="color:#1976D2;font-weight:700;">(예 확인)</span>
  </p>

  <p style="line-height:1.7;margin-bottom:8px;">
    국외 제공 및 동의 상세내용은 홈페이지 및 문자/톡으로 확인 가능하며, 언제든 동의철회 가능합니다.
  </p>

  <p style="line-height:1.7;margin-bottom:14px;">
    가입설계 및 본인인증을 위한 개인정보 처리에 동의하십니까? <span style="color:#1976D2;font-weight:700;">(예 확인)</span>
  </p>

  <div style="background:#FFFDE7;padding:10px 12px;border-radius:6px;text-align:center;font-weight:800;color:#E53935;">
    ※ 미러링 표준스크립트 콜 : 별도 기준없음<br>
    ※ 승환 관련 사전 질문 : 미진행
  </div>
</div>
  $HTML$,
  true,
  10
)
ON CONFLICT (tab_title) DO UPDATE
  SET content_html = EXCLUDED.content_html,
      is_active    = EXCLUDED.is_active,
      sort_order   = EXCLUDED.sort_order;

-- ── 흥국생명 (mirror_script) ────────────────────────────────────────
INSERT INTO public.quick_contents (tab_title, tab_key, content_html, is_active, sort_order)
VALUES (
  '흥국생명',
  'mirror_script',
  $HTML$
<div class="mirror-script">
  <div style="background:#E3F2FD;padding:10px 14px;border-radius:8px;text-align:center;font-weight:800;font-size:1em;margin-bottom:14px;">흥국생명 VTM 사전녹취스크립트 (2025.11.27 기준)</div>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;font-weight:800;margin-bottom:10px;">모집자 소속 / 성명 / 통화목적</div>
  <p style="line-height:1.7;margin-bottom:10px;">
    안녕하세요. <span style="color:#1E88E5;">[소속회사] [대리점명]</span> 상담원 <span style="color:#1E88E5;">○○○</span>입니다.<br>
    고객님께 <span style="color:#1E88E5;">(상품명) ○○○</span> 설명 드리려고 합니다.<br>
    잠시 통화 괜찮으신지요? (네~ 라고 답변시 상담)
  </p>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;font-weight:800;margin-bottom:10px;">정보취득경로 (개인정보보호취득경로 18.09.01)</div>
  <p style="line-height:1.7;margin-bottom:10px;">
    고객님께서는 <span style="color:#1E88E5;">[소속회사]</span>에서 상담 목적으로 정보 동의해주셨습니다.<br>
    개인정보 처리 정지나 동의를 철회하실 수 있으며, 개인정보 이용·제공 내역은 대표 홈페이지 개인정보 처리방침 및 조회 페이지에서 확인 가능합니다.
  </p>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;font-weight:800;margin-bottom:10px;">두낫콜</div>
  <p style="line-height:1.7;margin-bottom:14px;">원치 않으시면 통화 거절도 가능하십니다.</p>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;font-weight:800;margin-bottom:10px;">상품설명 <span style="color:#E53935;">※ 주계약 및 특약별로 가입한 내용에 따라 보장안내</span></div>
  <p style="line-height:1.7;margin-bottom:8px;">
    가입하시는 상품명 <span style="color:#1E88E5;">○○○</span>은 암, 2대진단, 수술비, 입원비, 간병인사용일당 등으로 구성되어있는 상품이며 (설계에 따라 상이),<br>
    주계약은 가입금액 <span style="color:#1E88E5;">○○만원</span>으로 사망보장 또는 재해장해 보장 입니다 (주계약은 상품에 따라 상이)<br>
    납입기간은 <span style="color:#1E88E5;">○○년</span> 보장기간은 <span style="color:#1E88E5;">○○세</span> 까지입니다.
  </p>
  <p style="line-height:1.7;margin-bottom:8px;color:#E53935;">[갱신형특약있는경우 갱신형 안내]</p>
  <p style="line-height:1.7;margin-bottom:8px;">
    가입하시는 보장으로는 뇌혈관 <span style="color:#1E88E5;">○○만원</span>, 허혈성진단비 <span style="color:#1E88E5;">○○만원</span>, 질병수술비 <span style="color:#1E88E5;">○○만원</span>
  </p>
  <p style="line-height:1.7;margin-bottom:8px;color:#E53935;">[가입담보 안내 - 모든 가입담보 + 가입금액 필수 녹취]</p>
  <p style="line-height:1.7;margin-bottom:14px;">
    월보험료는 <span style="color:#1E88E5;">00,000원</span>이며 고객님과 함께 보며 진행하는 보이는 TM안 미러링으로 청약 진행 됩니다.
  </p>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;font-weight:800;margin-bottom:10px;">신용정보 및 계약관리자 안내</div>
  <p style="line-height:1.7;margin-bottom:8px;color:#E53935;">■ 상담원 소속안내 / 고객확인 / 통화목적등 선안내 (TM상품 이제 보면서 설명 들으세요, 18.12.01 시행)</p>
  <p style="line-height:1.7;margin-bottom:8px;">
    <span style="color:#E53935;">[보험기입 권유전(도중) 상품요약자료 제공 안내 ♣]</span>: 만 65세이상 계약자에게만 안내, 갱신형 계약자에게안내<br>
    보험상품 이해를 위해 상품요약자료를 보내드리고 상담을 진행하겠습니다. LMS(문자), 이메일, 우편으로 가능한데 어떤 방식으로 발송해드릴까요?
  </p>
  <p style="line-height:1.7;margin-bottom:14px;color:#E53935;">■ 지금까지 설명 드린 내용은 상품설명서를 참조하여 주시고, 보장내용에 대한 세부적인 내용은 약관에서 정한 기준에 따라 보장됩니다.</p>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;font-weight:800;margin-bottom:10px;">청약 녹음</div>
  <p style="line-height:1.7;margin-bottom:14px;">
    지금부터 <span style="color:#1E88E5;">○○년 ○○월 ○○일 ○○시</span> <span style="color:#1E88E5;">(상품명) ○○</span> 가입을 위한 청약녹음하겠습니다. 동의하세요? <span style="color:#1976D2;font-weight:700;">(네, 대답필수)</span>
  </p>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;font-weight:800;margin-bottom:10px;">청약서 고지사항 — 계약전 알릴의무</div>
  <p style="line-height:1.7;margin-bottom:8px;color:#E53935;font-weight:700;">★ 고지 방해, 위반 금지 ★</p>
  <p style="line-height:1.7;margin-bottom:8px;">
    계약자나 피보험자가 중요한 사항을 알리는 것을 방해하거나 부실고지를 권유, 유도하는 것을 금지합니다.<br>
    피보험자의 건강상태, 직업, 운전 등의 질문 사항은 보험계약을 인수하는데 필요한 사항으로 사실대로 알리지 않거나 다르게 알리면 보험 가입이 거절될 수 있습니다.<br>
    특히 중요한 사항에 해당하는 경우 보험금 지급이 거절되거나 계약이 해지될 수 있습니다.
  </p>
  <p style="line-height:1.7;margin-bottom:8px;color:#E53935;">■ 건강고지 필수! 피보험자가 미성년자일경우 계약자에게 확인</p>
  <p style="line-height:1.7;margin-bottom:14px;color:#E53935;">■ 질문은 '예'인 경우는 청약서(T-Life) 반드시 기재 → 미기재시 고지의무 누락으로 재제조치 될 수 있음.</p>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;font-weight:800;margin-bottom:10px;">카드 납입</div>
  <p style="line-height:1.7;margin-bottom:8px;color:#E53935;font-weight:700;">[ 1회납 / 2회납 카드납입시 ]</p>
  <p style="line-height:1.7;margin-bottom:8px;color:#E53935;">★ 반드시 고객육성으로 정보확인 필수 카드주, 생년월일, 카드명, 카드번호, 유효기간 확인</p>
  <p style="line-height:1.7;margin-bottom:8px;">
    흥국생명에서 카드주 <span style="color:#1E88E5;">○○○</span>, 생년월일(년,월,일), <span style="color:#1E88E5;">△△카드</span> 카드번호 <span style="color:#1E88E5;">○○-○○-○○-○○</span>, 유효기간( )로 월 보험료 <span style="color:#1E88E5;">○○○원</span> 승인되는것에 동의하세요? <span style="color:#1976D2;font-weight:700;">(네, 대답필수)</span>
  </p>
  <p style="line-height:1.7;margin-bottom:8px;">
    2회부터 매월 15일이 승인일입니다. <span style="color:#1E88E5;">○○카드</span>로 승인되는 것에 동의하시죠? <span style="color:#1976D2;font-weight:700;">(네, 대답 필수)</span>
  </p>
  <p style="line-height:1.7;margin-bottom:14px;">승낙이 이루어진 경우 1회 보험료를 받은 때부터 효력이 발생합니다.</p>

  <div style="background:#FFFDE7;padding:8px 12px;border-radius:6px;font-weight:800;margin-bottom:10px;">계좌 납입</div>
  <p style="line-height:1.7;margin-bottom:8px;color:#E53935;font-weight:700;">[ 1회납 / 2회납 자동이체시 ]</p>
  <p style="line-height:1.7;margin-bottom:8px;color:#E53935;">★ 반드시 고객육성으로 확인 정보 필수 예금주명, 생년월일, 은행, 계좌번호 확인</p>
  <p style="line-height:1.7;margin-bottom:8px;">
    흥국생명에서 예금주 <span style="color:#1E88E5;">○○○</span> 생년월일(년,월,일) <span style="color:#1E88E5;">△△은행</span> 계좌번호 <span style="color:#1E88E5;">○○○-○○○○-○○○</span>에서 월 보험료 <span style="color:#1E88E5;">○○,○○○원</span> 출금되는 것에 동의하세요? <span style="color:#1976D2;font-weight:700;">(네, 대답필수)</span>
  </p>
  <p style="line-height:1.7;margin-bottom:8px;">
    2회 이후부터는 <span style="color:#1E88E5;">△△은행</span> 계좌로 매월 (5,10,15,20,25일) 출금 되는 것에 동의하세요? <span style="color:#1976D2;font-weight:700;">(네, 대답필수)</span>
  </p>
  <p style="line-height:1.7;">승낙이 이루어진 경우 1회 보험료를 받은 때부터 효력이 발생합니다.</p>
</div>
  $HTML$,
  true,
  20
)
ON CONFLICT (tab_title) DO UPDATE
  SET content_html = EXCLUDED.content_html,
      is_active    = EXCLUDED.is_active,
      sort_order   = EXCLUDED.sort_order;

COMMIT;

-- ── 검증 SQL (별 RUN 자료) ─────────────────────────────────────────
-- SELECT tab_title, tab_key, is_active, sort_order, LENGTH(content_html) AS html_len
-- FROM public.quick_contents
-- WHERE tab_key = 'mirror_script'
-- ORDER BY sort_order;
