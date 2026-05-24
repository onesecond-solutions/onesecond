-- ════════════════════════════════════════════════════════════════════
-- 2026-05-24 빠른 실행 오버레이 V2 토큰 + 카드 디자인 정합 묶음 1
-- ════════════════════════════════════════════════════════════════════
-- 격차 본질:
--   빠른 실행 오버레이 안 4 row content_html = 인라인 색상 박힘 (라이트 모드 고정)
--   + 카드 디자인 = card_design.png 본질 (좌측 색상 strip + 작은 chip + 다크 카드) 미적용
--
-- 본 묶음 1 대상 4 row:
--   1. recording_script (가입설계/선심사 동의 녹취 스크립트) — 인디고 strip
--   2. bmi_standard (회사별 BMI 심사기준) — 노랑/주황 strip
--   3. system_links (원전산 설계 바로가기) — 파랑 strip (인디고 통합)
--   4. payment_info (보험회사 결제정보) — 보라 strip
--
-- 묶음 2 (별 SQL):
--   - insurance_age (보험연령표) — 청록 strip, 분량 큼 (23K)
--   - contact_info (보험회사 연락처) — 분홍 strip, <style> 블록 정합 + 미박힘 row 추가
--
-- 카드 디자인 본질 (card_design.png 자체):
--   - 좌측 색상 strip = 4~6px border-left, 카테고리 색상
--   - 상단 카테고리 chip = 작은 둥근 라벨 (padding:4px 10px, border-radius:999px)
--   - 다크 카드 배경 = var(--s1)
--   - 둥근 모서리 = 10~12px radius
--   - 제목 = var(--tp) 흰 텍스트
--   - 메타 = var(--ts) 회색 보조
--
-- V2 토큰 매핑 표 (mirror_script SQL 재사용 + 확장):
--   #FFFCF8 / #FFFFFF (흰 배경)        → var(--s1)
--   #F8F4EF / #F2EAE1 / 베이지 7종     → var(--s2)
--   갈색 그라데이션 헤더                  → var(--ac) 단색 또는 var(--s2)
--   #6C4A33 / #6F4428 / 갈색 강조 텍스트 → var(--ac)
--   #1F1A16 / #2A1B12 / 짙은 갈색 텍스트 → var(--tp)
--   #6B7280 / #6A5245 / 회색 보조 텍스트 → var(--ts)
--   #FFC83D / #F6E8BE / 노랑 강조       → var(--warn)
--   #B3472B / #B91C1C / 빨강 강조       → var(--err)
--   #1F4F82 / #2563EB / 파랑 강조       → var(--ac) (인디고 통합)
--   #E4E4E7 / rgba(120,85,60,0.12)    → var(--bd)
--
-- 추가 인라인 색상 (V2 토큰 외 자리):
--   #A78BFA / #C4B5FD (보라) — payment_info 좌측 strip
--   #34D399 (청록)              — 묶음 2 insurance_age 자리
--   #F472B6 (분홍)              — 묶음 2 contact_info 자리
--
-- 실행: Supabase SQL Editor → 통째 붙여넣기 → RUN (한 RUN 트랜잭션)
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. recording_script (가입설계/선심사 동의 녹취 스크립트) ─────────
-- 좌측 strip = 인디고 var(--ac)
UPDATE public.quick_contents
SET content_html = $HTML$
<div style="width:100%; font-family:inherit; line-height:1.65; letter-spacing:-0.2px; color:var(--tp);">
  <!-- Header: 좌측 인디고 strip + 카테고리 chip -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:5px solid var(--ac); border-radius:12px; padding:16px 18px; margin-bottom:14px;">
    <div style="display:inline-block; padding:4px 10px; border-radius:999px; background:rgba(99,102,241,0.18); color:var(--ac); font-size:0.75em; font-weight:800; margin-bottom:8px;">녹취 스크립트</div>
    <div style="font-size:1.125em; font-weight:800; color:var(--tp);">가입설계 / 보장분석 / 선심사 동의 · 녹취 스크립트</div>
    <div style="margin-top:6px; font-size:0.8125em; color:var(--ts);">※ 본 스크립트는 <span style="font-weight:800; color:var(--warn);">피보험자</span>에게 진행합니다. &nbsp;|&nbsp; ※ 심사 후 실제 청약 시에는 <span style="font-weight:800; color:var(--warn);">전체 스크립트 재진행</span>이 필요할 수 있습니다.</div>
  </div>

  <!-- Disclaimer -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:4px solid var(--warn); border-radius:12px; padding:12px 14px; margin-bottom:12px;">
    <div style="display:flex; gap:10px; align-items:flex-start;">
      <div style="min-width:28px; height:28px; border-radius:8px; background:rgba(245,158,11,0.18); border:1px solid rgba(245,158,11,0.30); display:flex; align-items:center; justify-content:center; font-weight:900; color:var(--warn);">!</div>
      <div style="font-size:0.844em; color:var(--tp);">
        <div style="font-weight:900; margin-bottom:4px;">사용 안내</div>
        <div style="color:var(--ts);">본 스크립트는 보수적으로 구성한 예시이며, 실제 적용은 회사 / 보험사 기준과 고객 상황에 따라 조정이 필요합니다. <span style="color:var(--tp); font-weight:700;">최종 사용 및 녹취 진행 책임은 사용자에게 있습니다.</span></div>
      </div>
    </div>
  </div>

  <!-- Notice -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px 16px; margin-bottom:14px;">
    <div style="display:flex; gap:10px; align-items:flex-start;">
      <div style="min-width:28px; height:28px; border-radius:8px; background:rgba(99,102,241,0.18); border:1px solid rgba(99,102,241,0.35); display:flex; align-items:center; justify-content:center; font-weight:900; color:var(--ac);">i</div>
      <div style="font-size:0.844em; color:var(--tp);">
        <div style="font-weight:800; margin-bottom:4px;">녹취 안내</div>
        <div style="color:var(--ts);">고객님, 가입설계 (또는 선심사 / 보장분석)을 위한 동의 받겠습니다. 동의는 언제든지 철회 가능합니다.</div>
      </div>
    </div>
  </div>

  <!-- Section 1: Greeting -->
  <div style="border:1px solid var(--bd); border-left:5px solid var(--ac); border-radius:12px; overflow:hidden; margin-bottom:12px;">
    <div style="background:var(--s2); padding:12px 14px; font-weight:900; color:var(--tp); font-size:0.8947em;">1) 인사말 및 동의 확인 (피보험자 확인)</div>
    <div style="padding:14px 14px 12px 14px; background:var(--s1);">
      <div style="margin-bottom:10px; font-size:0.844em; color:var(--tp);"><span style="font-weight:900;">대상</span> : 지인소개, 가족추가, 피보험자 &nbsp;|&nbsp; <span style="font-weight:900; color:var(--ac);">보장분석 요청 시 → 선심사 동의 필수</span></div>
      <div style="display:inline-block; padding:6px 10px; border-radius:999px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.22); font-size:0.7895em; font-weight:800; color:var(--ac);">공통 안내</div>
      <div style="margin-top:10px; font-size:0.8947em; color:var(--tp);">고객님 성함 <span style="font-weight:900; color:var(--ac);">○○○</span>님 맞으실까요? <span style="color:var(--err); font-weight:900;">(고객 답변 필수)</span></div>
      <div style="margin-top:10px; font-size:0.8947em; padding:12px; border-radius:10px; background:var(--s2); border:1px dashed var(--bd);">
        <div style="font-weight:900; color:var(--tp); margin-bottom:6px;">정보동의 · 개인정보 수집/활용 동의 (공통)</div>
        <div style="color:var(--ts);">「개인정보보호법」 및 「신용정보의 이용 및 보호에 관한 법률」에 따라 성함, 생년월일, 성별, 연락처, 이메일 등을 수집하며, 수집된 정보는 전화/문자/이메일 등으로 보험상품 안내 목적에 한해 사용될 수 있습니다.<br>동의는 거부/철회 가능하나, 동의가 없으면 선심사/보장분석 상담 진행이 어려울 수 있습니다.<br><br>개인정보 수집 및 활용에 동의하십니까? <span style="color:var(--err); font-weight:900;">(고객 답변 필수 · 동의/거절)</span></div>
      </div>
    </div>
  </div>

  <!-- Section 2: Underwriting Consent -->
  <div style="border:1px solid var(--bd); border-left:5px solid var(--ac); border-radius:12px; overflow:hidden; margin-bottom:12px;">
    <div style="background:var(--s2); padding:12px 14px; font-weight:900; color:var(--tp); font-size:0.8947em;">2) 선심사 동의 (녹취)</div>
    <div style="padding:14px 14px 12px 14px; background:var(--s1);">
      <div style="font-size:0.8947em; color:var(--tp);">자세한 보험 계약 상담 및 설계를 위해 개인정보/신용정보 처리에 대한 동의 녹취를 진행하겠습니다. 동의를 거부하시면 정상적인 서비스 제공이 어려울 수 있습니다.</div>
      <div style="margin-top:10px; font-size:0.8947em; color:var(--tp);">보험계약 설명/설계 목적의 신용정보(고유식별정보, 질병/상해정보, 보험거래정보 등) 처리 및 보험 인수심사(검진/계약적부/지급/조회 등) 확인을 위해 필요한 범위 내 제공에 동의하십니까? <span style="color:var(--err); font-weight:900;">(예/아니오 확인)</span></div>
      <div style="margin-top:10px; font-size:0.8947em; color:var(--tp);">앞서 말씀드린 목적(가입설계/선심사/보장분석)을 위해 고유식별정보 및 질병/상해 정보를 처리하는 데 동의하십니까? <span style="color:var(--err); font-weight:900;">(예/아니오 확인)</span></div>
    </div>
  </div>

  <!-- Section 3: Identity / Beneficiary -->
  <div style="border:1px solid var(--bd); border-left:5px solid var(--ac); border-radius:12px; overflow:hidden; margin-bottom:12px;">
    <div style="background:var(--s2); padding:12px 14px; font-weight:900; color:var(--tp); font-size:0.8947em;">3) 본인확인 / 보험금 수익자 안내 (질문 체크)</div>
    <div style="padding:14px 14px 12px 14px; background:var(--s1);">
      <ol style="margin:0; padding-left:18px; font-size:0.8947em; color:var(--tp);">
        <li style="margin:6px 0;">성함과 주민번호(또는 생년월일) 말씀해주시겠습니까?</li>
        <li style="margin:6px 0;">키, 몸무게, 음주/흡연 여부 확인하겠습니다.</li>
        <li style="margin:6px 0;">직장명과 업종, 하시는 일 구체적으로 말씀해주시겠습니까?</li>
        <li style="margin:6px 0;">부업/겸업 또는 계절적으로 종사하는 업무가 있으실까요?</li>
        <li style="margin:6px 0;">현재 운전 여부 확인하겠습니다. (승용/승합/화물/오토바이 등)</li>
        <li style="margin:6px 0;">우편물 수령 가능한 주소 안내 부탁드립니다.</li>
      </ol>
      <div style="margin-top:12px; padding:12px; border-radius:10px; background:rgba(99,102,241,0.10); border:1px solid rgba(99,102,241,0.22);">
        <div style="font-weight:900; color:var(--tp); margin-bottom:6px;">미성년자/법정대리인 안내</div>
        <div style="font-size:0.844em; color:var(--ts);">19세 미만 미성년자를 계약자 또는 피보험자로 지정 시 안내가 필요합니다.<br>법적친권자만 녹취 및 동의 가능 <span style="color:var(--err); font-weight:900;">(법적친권자 여부 확인 필수)</span></div>
      </div>
      <div style="margin-top:10px; padding:12px; border-radius:10px; background:var(--s2); border:1px dashed var(--bd);">
        <div style="font-weight:900; color:var(--tp); margin-bottom:6px;">친권자 확인 질문</div>
        <div style="font-size:0.8947em; color:var(--ts);">고객님께서 ○○님의 친권자 맞으십니까? <span style="color:var(--err); font-weight:900;">(고객 답변 필수)</span><br>배우자님도 이 계약에 동의하십니까? <span style="color:var(--err); font-weight:900;">(고객 답변 필수)</span><br>친권자님 성함/주민번호/직업/연락처 확인 부탁드립니다. <span style="color:var(--err); font-weight:900;">(고객 답변 필수)</span><br>친권자님과 자녀분의 이름/생년월일을 각각 말씀해주시겠습니까? <span style="color:var(--err); font-weight:900;">(고객 답변 필수)</span></div>
      </div>
    </div>
  </div>

  <!-- Footer note -->
  <div style="padding:12px 14px; border-radius:10px; background:var(--s2); border:1px solid var(--bd); color:var(--ac); font-weight:800; font-size:0.844em; text-align:center;">※ 선심사는 보험사 알릴의무 전체 진행이 필요할 수 있습니다.</div>
</div>
$HTML$
WHERE tab_title = '가입설계 / 선심사 동의 녹취 스크립트'
  AND tab_key = 'recording_script';

-- ── 2. bmi_standard (회사별 BMI 심사기준) ─────────────────────────
-- 좌측 strip = 노랑 var(--warn) + 카드 안 chip 3색 (기본범위/할증/거절)
UPDATE public.quick_contents
SET content_html = $HTML$
<div style="width:100%; font-family:inherit; line-height:1.65; letter-spacing:-0.2px; color:var(--tp);">
  <!-- Header: 좌측 노랑 strip + 카테고리 chip -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:5px solid var(--warn); border-radius:12px; padding:16px 18px; margin-bottom:14px;">
    <div style="display:inline-block; padding:4px 10px; border-radius:999px; background:rgba(245,158,11,0.18); color:var(--warn); font-size:0.75em; font-weight:800; margin-bottom:8px;">심사 기준</div>
    <div style="font-size:1.125em; font-weight:900; color:var(--tp);">회사별 BMI 심사 기준</div>
    <div style="margin-top:6px; font-size:0.8125em; color:var(--ts);">※ 현장 메모 기반 요약입니다. 최종 심사 기준은 보험사/상품/고객 조건에 따라 달라질 수 있습니다.</div>
  </div>

  <!-- Disclaimer -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:4px solid var(--warn); border-radius:12px; padding:12px 14px; margin-bottom:12px;">
    <div style="display:flex; gap:10px; align-items:flex-start;">
      <div style="min-width:22px; height:22px; border-radius:6px; background:rgba(245,158,11,0.18); border:1px solid rgba(245,158,11,0.35); display:flex; align-items:center; justify-content:center; font-weight:900; color:var(--warn); font-size:0.7895em;">!</div>
      <div style="font-size:0.8125em; color:var(--ts);"><b style="color:var(--tp);">사용 안내</b><br/>본 내용은 <b>가장 보수적인 기준을 토대로 작성된 예시</b>이며, 실제 적용은 회사/보험사 기준과 고객 상황에 따라 조정이 필요합니다. <b style="color:var(--tp);">최종 사용 및 안내(녹취) 책임은 사용자에게 있습니다.</b></div>
    </div>
  </div>

  <!-- Legend (3 chip) -->
  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
    <span style="padding:6px 10px; border-radius:999px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.22); font-size:0.7895em; font-weight:800; color:var(--ac);">기본범위</span>
    <span style="padding:6px 10px; border-radius:999px; background:rgba(245,158,11,0.14); border:1px solid rgba(245,158,11,0.30); font-size:0.7895em; font-weight:800; color:var(--warn);">할증/검토</span>
    <span style="padding:6px 10px; border-radius:999px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.25); font-size:0.7895em; font-weight:800; color:var(--err);">방진/거절</span>
  </div>

  <!-- Grid (회사별 카드) -->
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; align-items:stretch;">

    <!-- 메리츠 (할증) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--warn); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">메리츠</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">성별 기준</div>
      </div>
      <div style="padding:10px 12px; border-radius:8px; background:rgba(245,158,11,0.10); border:1px solid rgba(245,158,11,0.22); font-size:0.8125em; color:var(--tp);">
        <b>남</b> : 18 미만 / 30 이상<br/>
        <b>여</b> : 16 미만 / 29 이상
      </div>
    </div>

    <!-- DB손해보험 (방진) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--err); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">DB손해보험</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">17 ~ 27.99</div>
      </div>
      <div style="padding:10px 12px; border-radius:8px; background:rgba(239,68,68,0.10); border:1px dashed rgba(239,68,68,0.25); font-size:0.8125em; color:var(--err); font-weight:700;">28부터 방진</div>
    </div>

    <!-- KB손해보험 (할증) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--warn); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">KB손해보험</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">17 ~ 30</div>
      </div>
      <div style="padding:10px 12px; border-radius:8px; background:rgba(245,158,11,0.10); border:1px solid rgba(245,158,11,0.22); font-size:0.8125em; color:var(--warn); font-weight:700;">30 이상 : 할증심사</div>
    </div>

    <!-- 흥국화재 (기본범위) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">흥국화재</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">17 ~ 30</div>
      </div>
      <div style="font-size:0.8125em; color:var(--ts);">범위 내 확인</div>
    </div>

    <!-- 한화손해보험 (기본범위) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">한화손해보험</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">19 ~ 30</div>
      </div>
      <div style="font-size:0.8125em; color:var(--ts);">범위 내 확인</div>
    </div>

    <!-- 삼성화재 (방진) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--err); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">삼성화재</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">29 초과</div>
      </div>
      <div style="padding:10px 12px; border-radius:8px; background:rgba(239,68,68,0.10); border:1px dashed rgba(239,68,68,0.25); font-size:0.8125em; color:var(--err); font-weight:700;">방진</div>
    </div>

    <!-- 롯데손해보험 (기본범위) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">롯데손해보험</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">17 ~ 30</div>
      </div>
      <div style="font-size:0.8125em; color:var(--ts);">범위 내 확인</div>
    </div>

    <!-- 현대해상 (고지 조건) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">현대해상</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">고지 여부</div>
      </div>
      <div style="padding:10px 12px; border-radius:8px; background:var(--s2); border:1px solid var(--bd); font-size:0.8125em; color:var(--tp);">
        <b>BMI 병력 무고지 시</b> 제한 없음<br/>
        <b>BMI 병력 고지 시</b> 제한 가능 / 거절 가능
      </div>
    </div>

    <!-- 농협손해보험 (할증 + 방문진단) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--warn); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">농협손해보험</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">16 ~ 30</div>
      </div>
      <div style="padding:10px 12px; border-radius:8px; background:rgba(245,158,11,0.10); border:1px solid rgba(245,158,11,0.22); font-size:0.8125em; color:var(--tp);">
        <b style="color:var(--warn);">30 ~ 32</b> : 담보에 따라 검토대상<br/>
        <b style="color:var(--err);">33 이상</b> : 방문진단
      </div>
    </div>

    <!-- MG손보 (거절) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--err); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">MG손보</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">17 ~ 29</div>
      </div>
      <div style="padding:10px 12px; border-radius:8px; background:rgba(239,68,68,0.10); border:1px dashed rgba(239,68,68,0.25); font-size:0.8125em; color:var(--err); font-weight:700;">16 이하 / 30 이상 거절</div>
    </div>

    <!-- 흥국생명 (방진+거절) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--err); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">흥국생명</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">17 이상 30 미만</div>
      </div>
      <div style="padding:10px 12px; border-radius:8px; background:rgba(239,68,68,0.10); border:1px dashed rgba(239,68,68,0.25); font-size:0.8125em; color:var(--err);">
        <b>30 이상</b> 방진<br/>
        <b>34 이상</b> 거절
      </div>
    </div>

    <!-- 동양생명 (질환별) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:8px;">
        <div style="font-weight:900; color:var(--tp);">동양생명</div>
        <div style="font-weight:800; color:var(--ts); font-size:0.8125em;">질환별</div>
      </div>
      <div style="padding:10px 12px; border-radius:8px; background:var(--s2); border:1px solid var(--bd); font-size:0.8125em; color:var(--tp);">
        <b>암</b> : 17 이상 36 미만<br/>
        <b>뇌/심장/질병/수술/사망</b> : 17 이상 30 미만<br/>
        <b>상해</b> : <span style="color:var(--err); font-weight:900;">(확인 필요)</span>
      </div>
    </div>

  </div>

  <!-- Footer note -->
  <div style="margin-top:12px; font-size:0.7895em; color:var(--ts);">※ '방진/거절/할증' 표현은 현장 메모 기준이며, 실제 심사는 상품/가입조건/고지/심사부 판단에 따라 달라질 수 있습니다.</div>
</div>
$HTML$
WHERE tab_title = '회사별 BMI 심사기준'
  AND tab_key = 'bmi_standard';

-- ── 3. system_links (원전산 설계 바로가기) ────────────────────────
-- 좌측 strip = 인디고 var(--ac) (손해보험) + 보라 #A78BFA (생명보험)
UPDATE public.quick_contents
SET content_html = $HTML$
<div style="width:100%; font-family:inherit; line-height:1.55; letter-spacing:-0.2px; color:var(--tp);">
  <!-- Header: 좌측 인디고 strip + 카테고리 chip -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:5px solid var(--ac); border-radius:12px; padding:16px 18px; margin-bottom:14px;">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <div>
        <div style="display:inline-block; padding:4px 10px; border-radius:999px; background:rgba(99,102,241,0.18); color:var(--ac); font-size:0.75em; font-weight:800; margin-bottom:8px;">바로가기</div>
        <div style="font-size:1.0625em; font-weight:900; color:var(--tp);">보험사 바로가기</div>
        <div style="margin-top:4px; font-size:0.7895em; color:var(--ts);">손해보험 / 생명보험</div>
      </div>
      <div style="font-size:0.7895em; font-weight:700; color:var(--warn); background:rgba(245,158,11,0.18); border:1px solid rgba(245,158,11,0.30); padding:6px 10px; border-radius:999px; white-space:nowrap;">통화 중 1초 실행</div>
    </div>
  </div>

  <!-- 2 Column Grid -->
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">

    <!-- 손해보험 (인디고) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="display:flex; align-items:center; gap:10px; padding-bottom:10px; margin-bottom:10px; border-bottom:1px dashed var(--bd);">
        <div style="width:6px; height:18px; border-radius:3px; background:var(--ac);"></div>
        <div style="font-size:0.8947em; font-weight:900; color:var(--tp);">손해보험</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <a href="https://www.mdbins.com/chrome.html?ver=202602271537" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">DB손해보험</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://nsales.kbinsure.co.kr/eus/ch/ch_index.jsp" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">KB손해보험</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://sales.meritzfire.com" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">메리츠화재</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://sales.heungkukfire.co.kr/#/login" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">흥국화재</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://login.samsungfire.com/nl/p/login/ui/SPGENLP00000" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">삼성화재</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://portal.hwgeneralins.com" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">한화손해보험</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://lottero.lotteins.co.kr/ncrmwebroot/webfw/html/nawlogon.jsp" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">롯데손해보험</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://ss.nhfire.co.kr/smartweb_prj/index_t.jsp" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">NH농협손해보험</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://ga.linagi.com/html/gap/GA/GAZ911M0.html" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">라이나손보</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://sso.aig.co.kr/gaLogin/gaLogin.jsp" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">AIG손해보험</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://sp.hi.co.kr" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">현대해상</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://sfa.saleshana.com/index.html" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">하나손해보험</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
        <a href="https://mganet.mggeneralins.com" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">예별손해보험</div><div style="font-size:0.7895em; font-weight:800; color:var(--ac);">열기 →</div></div></a>
      </div>
    </div>

    <!-- 생명보험 (보라) -->
    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="display:flex; align-items:center; gap:10px; padding-bottom:10px; margin-bottom:10px; border-bottom:1px dashed var(--bd);">
        <div style="width:6px; height:18px; border-radius:3px; background:#A78BFA;"></div>
        <div style="font-size:0.8947em; font-weight:900; color:var(--tp);">생명보험</div>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <a href="https://ga.abllife.co.kr/ui2/login/login.jsp" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">ABL생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://etopia.idblife.com/SSSCO99999M.mvc" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">DB생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://sf.ibki.co.kr/websquare/websquare.html?w2xPath=/ui/SF/CO/SFCO100M01.xml" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">IBK연금보험</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://fgs.dgbfnlife.com:8443/" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">iM라이프</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://sfa.kblife.co.kr/scr/m/sfa-login?request=sfaLogin" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">KB라이프</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://sfa.nhlife.co.kr:8443/" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">NH농협생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://kss.kdblife.co.kr/Install/x_installAX.html" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">KDB생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://ga.kyobo.com" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">교보생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://1004.myangel.co.kr/colgnsf001m.wqv" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">동양생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://ga.lina.co.kr/html/gap/GA/GAZ911M0.html" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">라이나생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://loveageplan.com/websquare/websquare.jsp?w2xPath=/view/lap/ui/lg/lga/PLGA010M00.xml" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">미래에셋생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://metplus.metlife.co.kr/nexacro/AgentPortal/index.jsp" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">메트라이프</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://connectplus.samsunglife.com:10443/gasso/login" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">삼성생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://ga.shinhanlife.co.kr:11043/colomga010m.msv" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">신한라이프</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://hmp.hanwhalife.com/online/solutions/websquare/websquare.html?w2xPath=/online/ui/uv/gmn/uvgmn010mvw.xml" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">한화생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://t-life.heungkuklife.co.kr/webfw/html/nawlogon.html" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">흥국생명(T-Life)</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://sales.heungkuklife.co.kr/" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">흥국생명(e-life)</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://esmart.chubblife.co.kr/index.do" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">처브라이프</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://imap.aia.co.kr/NBSE/aiaone/" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">AIA생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <a href="https://ga.hanalife.co.kr" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit;"><div style="padding:10px 12px; border-radius:10px; border:1px solid var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">하나생명</div><div style="font-size:0.7895em; font-weight:800; color:#A78BFA;">열기 →</div></div></a>
        <div style="padding:10px 12px; border-radius:10px; border:1px dashed var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px; opacity:0.6;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">BNP파리바 카디프생명</div><div style="font-size:0.7895em; font-weight:800; color:var(--ts);">URL 없음</div></div>
        <div style="padding:10px 12px; border-radius:10px; border:1px dashed var(--bd); background:var(--s2); display:flex; justify-content:space-between; align-items:center; gap:10px; opacity:0.6;"><div style="font-size:0.8125em; font-weight:700; color:var(--tp);">푸본현대생명</div><div style="font-size:0.7895em; font-weight:800; color:var(--ts);">URL 없음</div></div>
      </div>
    </div>
  </div>

  <!-- Footer note -->
  <div style="margin-top:12px; font-size:0.6875em; color:var(--ts); padding:0 4px;">* 링크는 새 창으로 열립니다.</div>
</div>
$HTML$
WHERE tab_title = '원전산 설계 바로가기'
  AND tab_key = 'system_links';

-- ── 4. payment_info (보험회사 결제정보) ─────────────────────────
-- 좌측 strip = 보라 #A78BFA (결제정보 카테고리) + 그룹별 strip (손해 인디고 / 생명 보라)
UPDATE public.quick_contents
SET content_html = $HTML$
<div style="width:100%; font-family:inherit; line-height:1.65; letter-spacing:-0.2px; color:var(--tp);">
  <!-- Header: 좌측 보라 strip + 카테고리 chip -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:5px solid #A78BFA; border-radius:12px; padding:16px 18px; margin-bottom:14px;">
    <div style="display:inline-block; padding:4px 10px; border-radius:999px; background:rgba(167,139,250,0.20); color:#A78BFA; font-size:0.75em; font-weight:800; margin-bottom:8px;">결제정보</div>
    <div style="font-size:1.125em; font-weight:900; color:var(--tp);">보험사 결제/이체 가능 요약</div>
    <div style="margin-top:6px; font-size:0.8125em; color:var(--ts);">기준일: <b style="color:var(--tp);">2026.01.22</b> · onesecond 운영표</div>
  </div>

  <!-- 공통 주의 -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:4px solid var(--warn); border-radius:12px; padding:12px 14px; margin-bottom:14px; font-size:0.8125em; color:var(--tp);">
    <b style="color:var(--warn);">공통 주의</b><br/>
    초회는 기본적으로 <b>계약자 본인 명의</b> 기준. 필요 시 <b>가상계좌</b> 활용.<br/>
    <span style="color:var(--ts);">(은행/카드사 및 보험사별 예외가 있으니, 실제 진행 전 확인 권장)</span>
  </div>

  <!-- 손해보험 (인디고) -->
  <div style="margin-top:14px; font-size:1em; font-weight:900; color:var(--ac);">손해보험</div>
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:12px; margin-top:10px;">

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">메리츠화재</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드: 계약자 명의 카드 가능</div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:var(--ac);">납입 관계(은행)</b>: 계약자 · 직계 및 제3자 가능 (제3자 동의서/모바일-계약자만)<br/>
        <b style="color:var(--ac);">카드(등록)</b>: 모든 카드 등록 가능 (계약자 명의 or 직계 / 직계 등록 시 제3자 동의 필수)<br/>
        <b style="color:var(--ac);">승인일</b>: 5, 11, 15, 21, 25</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">DB손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 <span style="color:#A78BFA;">(개인사업자: 이율연계 / 사업자명 계좌 불가)</span><br/>
        카드: 계약자 명의 카드 가능 <span style="color:#A78BFA;">(초회만, 2회차부터 계좌등록 필수)</span></div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 11, 15, 21<br/>
        <b style="color:var(--ac);">납입 관계(은행)</b>: 계약자, 제3자 가능 (제3자 동의서/모바일-계약자만)<br/>
        <b style="color:var(--ac);">카드(등록)</b>: 모든 카드 등록 가능 <span style="color:#A78BFA;">(콜센터 직접 등록 후 담당배서)</span><br/>
        <b style="color:var(--ac);">승인일</b>: TM 11, 15, 21</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">KB손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드: <b style="color:var(--err);">불가</b> <span style="color:var(--ts);">(수납시 카드결제 요청 가능)</span></div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:var(--ac);">납입 관계(은행)</b>: 계약자 · 직계 및 제3자 가능 <span style="color:#A78BFA;">(서면: 예금주 신분증 / 모바일: 계약자만)</span><br/>
        <b style="color:var(--ac);">카드(등록)</b>: 모든 카드 등록 가능 <span style="color:#A78BFA;">(배서접수로 자동이체 해지 후 결제카드 등록)</span><br/>
        <b style="color:var(--ac);">승인일</b>: TM 14, 24</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">흥국화재</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드: 계약자 명의 카드 가능</div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:var(--ac);">납입 관계(은행)</b>: 계약자 · 직계(배우자/부모/자녀/형제자매) 가능<br/>
        <span style="color:#A78BFA;">(서면: 가족관계증명서/등본/신분증 · 모바일: 계약자만)</span><br/>
        <b style="color:var(--ac);">카드(등록)</b>: 모든 카드 등록 가능 <span style="color:#A78BFA;">(콜센터 가능/대리점 접수 불가)</span><br/>
        <span style="color:#A78BFA;">※ 제3자(직계가족) 카드 등록 초회는 가상계좌로 진행 가능</span><br/>
        <b style="color:var(--ac);">승인일</b>: 13</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">한화손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드사: 국민, 하나(외환), 비씨, 삼성(체크가능), 엘지, 롯데, 현대, 신한, 갤러리아, KT월드패스, NH농협, 산은, 63카드</div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 11, 15, 21, 25<br/>
        <b style="color:var(--ac);">납입 관계(은행)</b>: 계약자 · 직계 및 제3자 가능 <span style="color:#A78BFA;">(서면: 동의서 서명 필수 / 모바일: 계약자만)</span><br/>
        <b style="color:var(--ac);">카드(등록)</b>: 모든 카드 등록 가능<br/>
        <b style="color:var(--ac);">승인일</b>: 11, 21</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">삼성화재</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드: 계약자 명의 카드 가능 <span style="color:var(--ts);">(직계가족 카드 진행 시 녹취 필요)</span></div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 13, 15, 23<br/>
        <b style="color:var(--ac);">납입 관계(은행)</b>: 계약자 · 직계 및 제3자 가능 <span style="color:#A78BFA;">(서면: 예금주 신분증 / 모바일: 계약자만)</span><br/>
        <b style="color:var(--ac);">카드(등록)</b>: 모든 카드 등록 가능 <span style="color:#A78BFA;">(대리점/콜센터 가능)</span><br/>
        <b style="color:var(--ac);">승인일</b>: TM 계약일</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">롯데손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드사: 롯데, 삼성, 비씨, 신한, 국민, 현대, 하나, 농협, 씨티, 엘지</div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 10, 20, 25<br/>
        <b style="color:var(--ac);">납입 관계(은행)</b>: 계약자 · 가족 및 제3자 가능 <span style="color:#A78BFA;">(서면: 신청서/예금주 신분증/모바일: 계약자만)</span><br/>
        <b style="color:var(--ac);">카드(등록)</b>: 모든 카드 등록 가능 <span style="color:#A78BFA;">(TM: 대리점 접수/콜센터 불가)</span><br/>
        <b style="color:var(--ac);">승인일</b>: 11, 21</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">현대해상</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드: 모두 가능</div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 10, 20, 25<br/>
        <b style="color:var(--ac);">납입 관계(은행)</b>: 계약자 · 직계 및 제3자 가능 <span style="color:#A78BFA;">(서면: 예금주 신분증 / 모바일: 계약자만)</span><br/>
        <b style="color:var(--ac);">카드(등록)</b>: 모든 카드 등록 가능 <span style="color:#A78BFA;">(대리점 수기승인/배서접수)</span><br/>
        <b style="color:var(--ac);">승인일</b>: 5, 10, 15, 20, 25</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">농협손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드사: 농협, BC, 국민, 하나, 삼성, 신한 <span style="color:var(--ts);">(해외 겸용카드 불가)</span></div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:var(--ac);">납입 관계</b>: 은행=계약자 (모바일-계약자만) / 카드=계약자 명의만<br/>
        <b style="color:var(--ac);">카드(등록)</b>: 신규(농협/국민/BC/하나/삼성/신한), 변경(현대/롯데-신규등록불가)<br/>
        <span style="color:#A78BFA;">대리점 접수(콜센터 불가) / 수기 가능</span><br/>
        <b style="color:var(--ac);">승인일</b>: 10, 20</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">예별손보</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드: 모두 가능</div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:var(--ac);">납입 관계(은행)</b>: 계약자 · 직계(배우자/부모/자녀/형제자매) <span style="color:#A78BFA;">(모바일-계약자만)</span><br/>
        <b style="color:var(--ac);">카드</b>: 불가(내서 접수 가능) / <b style="color:var(--ac);">카드등록</b>: 모든 카드 등록 가능<br/>
        <b style="color:var(--ac);">승인일</b>: 5, 10, 15, 20, 25</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">하나손보</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드: 모두 가능 <span style="color:var(--ts);">(계약자 명의 카드에 한해)</span></div>
        <div><b style="color:var(--ac);">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 21, 25<br/>
        <b style="color:var(--ac);">납입 관계(은행)</b>: 계약자 및 피보험자 / 직계(배우자/부모/자녀) <span style="color:#A78BFA;">(서면-신청서로 가능)</span><br/>
        <b style="color:var(--ac);">카드</b>: 불가 / <b style="color:var(--ac);">카드(등록)</b>: 모든 카드 등록 가능 <span style="color:#A78BFA;">(대리점 접수-콜센터 불가)</span><br/>
        <b style="color:var(--ac);">승인</b>: 매월자동승인 불가</div>
      </div>
    </div>

  </div>

  <!-- 생명보험 (보라) -->
  <div style="margin-top:18px; font-size:1em; font-weight:900; color:#A78BFA;">생명보험</div>
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:12px; margin-top:10px;">

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">흥국생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드사: 삼성, 현대, 신한, 농협, 롯데 <span style="color:var(--ac);">(카드주 녹취 필수)</span></div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 초회와 동일 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:#A78BFA;">납입 관계(은행)</b>: 계약자, 피보험자 / 직계(법인가족 이내)<br/>
        <b style="color:#A78BFA;">카드</b>: 삼성, 현대, 신한, 농협, 롯데 <span style="color:var(--ac);">(카드주 녹취 필수)</span><br/>
        <b style="color:#A78BFA;">승인일</b>: 15일 <span style="color:var(--ts);">(재청구일 25일)</span></div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">IBK연금</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드: 불가</div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:#A78BFA;">납입 관계(은행)</b>: 계약자, 직계(배우자/부모/조부모/형제자매/자녀) <span style="color:var(--ac);">(가족관계 증명서 필요)</span><br/>
        <b style="color:#A78BFA;">카드/승인</b>: 불가</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">라이나생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드사: BC, KB, 하나, 삼성, 신한, 현대, 롯데, 씨티, 농협 <span style="color:var(--ac);">(종신보험 외 상품 가능)</span></div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 모두 가능 / <b style="color:var(--tp);">이체일</b>: 10, 15, 25, 말일<br/>
        <b style="color:#A78BFA;">납입 관계</b>: 계약자, 직계(부모/자녀/형제자매), 배우자 <span style="color:var(--ac);">(모바일-계약자만)</span><br/>
        <b style="color:#A78BFA;">카드사</b>: BC, KB, 하나, 삼성, 신한, 현대, 롯데, 씨티, 농협 <span style="color:var(--ac);">(종신보험 외)</span><br/>
        <b style="color:#A78BFA;">승인일</b>: 15일</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">ABL생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드: 불가</div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 모두 가능 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:#A78BFA;">납입 관계</b>: 계약자, 직계(배우자/자녀)<br/>
        <b style="color:#A78BFA;">카드/승인</b>: 불가</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">iM라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드: 불가</div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 모두 가능 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:#A78BFA;">납입 관계</b>: 계약자 본인만 가능<br/>
        <b style="color:#A78BFA;">카드/승인</b>: 불가</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">한화생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드: 불가</div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 모두 가능 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:#A78BFA;">납입 관계</b>: 계약자, 직계(배우자/부모/조부모/형제자매/자녀)<br/>
        <span style="color:var(--ac);">※ 제3자 동의서/예금주 신분증/가족관계증명서 (모바일-계약자만)</span><br/>
        <b style="color:#A78BFA;">카드/승인</b>: 불가</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">KDB생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드: 불가</div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 모두 가능 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:#A78BFA;">납입 관계</b>: 계약자, 피보험자(직계/피준속) <span style="color:var(--ac);">(신청서 필수)</span><br/>
        <b style="color:#A78BFA;">카드/승인</b>: 불가</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">삼성생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드: 불가</div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 초회와 동일 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:#A78BFA;">납입 관계</b>: 계약자, 직계존비속 <span style="color:var(--ac);">(사실혼 관계 불가)</span><br/>
        <b style="color:#A78BFA;">카드</b>: 삼성카드 (종신보험 불가 / 순수보장성 상품만) <span style="color:var(--ac);">(콜센터 등록-삼성카드만)</span><br/>
        <b style="color:#A78BFA;">승인</b>: 고객의 삼성카드 이체일</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">동양생명 <span style="color:var(--err); font-weight:700; font-size:0.8em;">※ 상품별 확인</span></div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드사: 신한, 삼성, 롯데, 현대, 비씨, 국민, 우리 <span style="color:var(--ts);">(메인미래 BC, 동양생명 제휴 카드만)</span></div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 모두 가능 / <b style="color:var(--tp);">이체일</b>: 10, 15, 20, 25, 말일<br/>
        <b style="color:#A78BFA;">납입 관계</b>: 계약자, 피보험자, 수익자 / 카드: 계약자만<br/>
        <b style="color:#A78BFA;">카드사</b>: 신한, 삼성, 롯데, 현대, 비씨, 국민, 우리<br/>
        <b style="color:#A78BFA;">승인일</b>: 5, 10, 15, 20, 25</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">KB라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드: 불가</div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 모두 가능 / <b style="color:var(--tp);">이체일</b>: 10, 15, 20, 25, 말일<br/>
        <b style="color:#A78BFA;">납입 관계</b>: 계약자, 직계존비속 <span style="color:var(--ac);">(형제자매 및 배우자부모: 지정서/가족관계확인서류 첨부)</span><br/>
        <b style="color:#A78BFA;">카드/승인</b>: 불가</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">신한라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드사: 신한, BC, 국민, 외환, 삼성, 현대, 롯데, 수협, 하나, 농협, 제주, 광주, 전북, 씨티, 우리BC <span style="color:var(--ac);">(종신보험 제외)</span></div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 초회와 동일 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:#A78BFA;">납입 관계</b>: 계약자, 피보험자 / 카드: 계약자, 직계가족 및 제3자 가능<br/>
        <b style="color:#A78BFA;">승인일</b>: 10, 20</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">농협생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:#A78BFA;">초회</b> · 은행: 모두 가능 / 카드사: BC, 현대, 롯데, NH</div>
        <div><b style="color:#A78BFA;">계속분</b> · 은행: 모두 가능 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25, 말일<br/>
        <b style="color:#A78BFA;">납입 관계</b>: 계약자, 피보험자 / 카드: 계약자 명의만<br/>
        <b style="color:#A78BFA;">카드사</b>: BC, 현대, 롯데, NH<br/>
        <b style="color:#A78BFA;">승인일</b>: 10, 20, 30일</div>
      </div>
    </div>

  </div>

  <!-- Footer: 현장 1초 멘트 -->
  <div style="margin-top:18px; padding:14px 16px; border-radius:12px; background:var(--s2); border:1px solid var(--bd); border-left:4px solid var(--warn); font-size:0.8125em; color:var(--tp);">
    <b style="color:var(--warn);">현장 1초 멘트</b><br/>
    "초회는 계약자 본인 기준으로 먼저 잡고, 계속분(자동이체/카드)은 회사별 가능한 관계 · 승인일이 달라서 확인 후 진행하겠습니다."
  </div>
</div>
$HTML$
WHERE tab_title = '보험회사 결제정보'
  AND tab_key = 'payment_info';

COMMIT;

-- ── 검증 SQL (별 RUN) ──────────────────────────────────────────────
-- SELECT tab_title, tab_key, is_active, sort_order, LENGTH(content_html) AS html_len
-- FROM public.quick_contents
-- WHERE tab_key IN ('recording_script', 'bmi_standard', 'system_links', 'payment_info')
-- ORDER BY sort_order;
