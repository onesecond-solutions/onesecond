-- ════════════════════════════════════════════════════════════════════
-- 2026-05-24 contact_info 카드 우측 상단 "⚡ 딸깍" 복사 버튼 자체 추가
-- ════════════════════════════════════════════════════════════════════
-- 본 SQL 자체:
--   contact_info content_html 전체 UPDATE
--   - 직전 contact_info 자체 자체 자체 자체 (분홍 strip #F472B6 + <style> 블록 제거 + 미박힘 7건)
--   - 각 회사 카드 자체 자체 (24개) = 우측 상단 ⚡ 딸깍 버튼 자체 추가
--   - 카드 자체 자체 = class "pay-card" + position:relative 자체
--   - 클릭 시 자체 = window.copyPaymentCardV2(this) 자체 자체 자체 (payment_info 자체 동일 함수)
--     → 카드 본문 자체 자체 = clipboard 복사 + "복사 완료. 카카오톡에 붙여넣기 하세요." 안내
--
-- 손해보험 그룹 (14 카드) = 인디고 버튼 색상
-- 생명보험 그룹 (10 카드) = 보라 #A78BFA 버튼 색상
-- 미박힘 7 카드 (dashed) = 버튼 자체 X (정보 준비 중 자체)
--
-- 실행: Supabase SQL Editor → 통째 RUN
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 2. contact_info (보험회사 연락처) ─────────────────────────────
-- 좌측 strip = 분홍 #F472B6 + <style> 블록 통째 제거 + 미박힘 row 7건 추가
UPDATE public.quick_contents
SET content_html = $HTML$
<div style="width:100%; font-family:inherit; line-height:1.6; letter-spacing:-0.2px; color:var(--tp);">
  <!-- Header: 좌측 분홍 strip + 카테고리 chip -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:5px solid #F472B6; border-radius:12px; padding:16px 18px; margin-bottom:14px;">
    <div style="display:inline-block; padding:4px 10px; border-radius:999px; background:rgba(244,114,182,0.18); color:#F472B6; font-size:0.75em; font-weight:800; margin-bottom:8px;">연락처</div>
    <div style="font-size:1.125em; font-weight:900; color:var(--tp);">보험회사 연락처</div>
    <div style="margin-top:6px; font-size:0.8125em; color:var(--ts);">고객센터 · 인콜 모니터링 · 전산 헬프데스크 · 보험금 청구팩스</div>
  </div>

  <!-- 손해보험 (인디고) -->
  <div style="margin-top:14px; font-size:1em; font-weight:900; color:var(--ac);">손해보험</div>
  <div style="margin-top:10px; display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:12px;">

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">메리츠</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1566-7711</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1577-7711</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-3786-2777</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-021-3400</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">DB손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-0100</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1566-0757</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-2262-1241</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-181-4862</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">KB손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1544-0114</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1544-0019</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 1544-8119</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-136-6500</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">흥국화재</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1688-1688</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1688-6997</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 031-786-8088</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0504-800-0700</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">한화손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1566-8000</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1670-1882</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-316-0111</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0502-779-1004</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">삼성화재</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-5114</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1566-0553</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 1899-5005</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-162-0872</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">롯데손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-3344</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1600-5182</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 1599-8260</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0507-333-9999</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">현대해상</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-5656</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1577-3223</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-2628-4567</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0507-774-6060</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">NH농협손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1644-9000</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1644-9600</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 1644-0090</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-060-7000</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">예별손해보험(YBI)</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-5959</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1577-3777</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-3788-2261</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-088-1646</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">라이나손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1566-5800</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1566-5800</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-6922-5100</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 02-6742-3992</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">하나손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1566-3000</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 02-6299-6821</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-6670-8110</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0504-3764-0765</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">AIG손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1544-2792</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1544-2792</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-2260-6855</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 02-2011-4607</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:var(--ts); font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">AXA손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-5898</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1588-2513</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 1588-2937</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 02-2021-4540</div>
      </div>
    </div>

  </div>

  <!-- 생명보험 (보라) -->
  <div style="margin-top:18px; font-size:1em; font-weight:900; color:#A78BFA;">생명보험</div>
  <div style="margin-top:10px; display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:12px;">

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:#A78BFA; font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">교보생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-1001</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1588-1636</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-721-3130</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 고객센터 안내</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:#A78BFA; font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">동양생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1577-1004</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 080-899-1004</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-728-9900</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 02-3289-4517</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:#A78BFA; font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">라이나생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-0058</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1588-2442</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-3781-2006</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 02-6944-1200</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:#A78BFA; font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">메트라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-9600</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1588-9609</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 1899-0751</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 02-2011-4607</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:#A78BFA; font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">삼성생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-3114</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1588-3115</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-311-4500</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 고객센터 안내</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:#A78BFA; font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">신한라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-5580</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1522-2285</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-3455-4119</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 고객센터 안내</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:#A78BFA; font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">처브라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1599-4600</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1599-4600</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 1599-4646</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 02-3480-7801</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:#A78BFA; font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">푸본현대생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1577-3311</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> -</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 080-860-1212</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 0505-106-0311</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:#A78BFA; font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">한화생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-6363</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1800-6633</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 1522-6379</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 고객센터 안내</div>
      </div>
    </div>

    <div class="pay-card" style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; position:relative;"><button class="pay-copy-btn" onclick="copyPaymentCardV2(this)" style="position:absolute; top:8px; right:8px; padding:3px 8px; background:transparent; border:1px solid var(--bd); border-radius:6px; color:#A78BFA; font-size:0.7em; font-weight:700; cursor:pointer; font-family:inherit;">⚡ 딸깍</button>
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">하나생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1577-1112</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1577-1112</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-3709-8602~3</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 고객센터 안내</div>
      </div>
    </div>

    <!-- 미박힘 row 7건 추가 (직전 원본 자체 "팀장님이 리스트 전체를 이미 가지고 계시니, 위 'oss-mini' 블록만 동일하게 붙여 넣으면 됩니다" 자체 안내 자체 = 본인 추정 격차 회피 자체 = "정보 준비 중" 자체 자체) -->
    <div style="background:var(--s1); border:1px dashed var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; opacity:0.65;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">ABL생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">정보 준비 중</div>
    </div>

    <div style="background:var(--s1); border:1px dashed var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; opacity:0.65;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">BNP파리바 카디프생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">정보 준비 중</div>
    </div>

    <div style="background:var(--s1); border:1px dashed var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; opacity:0.65;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">DB생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">정보 준비 중</div>
    </div>

    <div style="background:var(--s1); border:1px dashed var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; opacity:0.65;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">IBK연금보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">정보 준비 중</div>
    </div>

    <div style="background:var(--s1); border:1px dashed var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; opacity:0.65;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">iM라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">정보 준비 중</div>
    </div>

    <div style="background:var(--s1); border:1px dashed var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; opacity:0.65;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">KDB생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">정보 준비 중</div>
    </div>

    <div style="background:var(--s1); border:1px dashed var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px; opacity:0.65;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">KB라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">정보 준비 중</div>
    </div>

  </div>

  <!-- Footer note -->
  <div style="margin-top:18px; font-size:0.7895em; color:var(--ts); padding:0 4px;">* 미박힘 회사 자체 = "정보 준비 중" 자체 안내. 본인 추정 격차 회피 자체.</div>
</div>
$HTML$
WHERE tab_title = '보험회사 (모니터링) 연락처'
  AND tab_key = 'contact_info';

COMMIT;

-- ── 검증 SQL (별 RUN) ──────────────────────────────────────────────
-- SELECT tab_title, tab_key, is_active, sort_order,
--        LENGTH(content_html) AS html_len,
--        SUBSTRING(content_html, 1, 200) AS first_200
-- FROM public.quick_contents
-- WHERE tab_key = 'contact_info';
