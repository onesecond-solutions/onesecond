-- ════════════════════════════════════════════════════════════════════
-- 2026-05-24 흥국화재 카드납 변경 정정 (payment_info row 자체 자체 자체)
-- ════════════════════════════════════════════════════════════════════
-- 격차 본질:
--   흥국화재 카드납 = 직전 'all 카드 가능' → '전 카드사 가능 (초회) / 삼성·신한만 (계속분)'
--   결제일 13일만 + 콜센터 1688-1688 + 신규등록 자체 자체 자체
--
-- 본 SQL 자체:
--   payment_info content_html 전체 UPDATE (직전 batch1 자체 자체 + 흥국화재 정정)
--
-- 실행: Supabase SQL Editor → 통째 RUN
-- ════════════════════════════════════════════════════════════════════

BEGIN;

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
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">흥국화재 <span style="font-size:0.7em; color:var(--warn); font-weight:700;">※ 카드납 변경 자체</span></div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">초회</b> · 은행: 모두 가능 / 카드: <b style="color:var(--warn);">전 카드사 가능</b></div>
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">계속분 (은행)</b> · 모든 은행 / <b style="color:var(--tp);">이체일</b>: 5, 10, 15, 20, 25<br/>
        <b style="color:var(--ac);">납입 관계</b>: 계약자 · 직계(배우자/부모/자녀/형제자매) <span style="color:#A78BFA;">(서면: 가족관계증명서/등본/신분증 · 모바일: 계약자만)</span></div>
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">계속분 (카드)</b> · <b style="color:var(--warn);">삼성·신한만 가능</b> <span style="color:#A78BFA;">(초회 타카드 가능해도 계속분 등록 불가)</span><br/>
        계속분 카드 진입 3가지: ① 매달 콜센터 결제요청 / ② 삼성·신한카드 등록 / ③ 계좌등록</div>
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">계속분 1회성</b>: 콜센터 (☎ 1688-1688)</div>
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">카드 자동이체 신규등록</b>: 삼성·신한만, 계약자본인 + 배우자/자녀/부모<br/>
        <b style="color:var(--tp);">결제일자</b>: <b style="color:var(--warn);">13일만 가능</b> <span style="color:#A78BFA;">(실패시 26일 재청구)</span></div>
        <div style="margin-bottom:6px;"><b style="color:var(--ac);">기존 카드고객 변경</b>: 유효기간 만료 시 동일카드사 동일카드주만 가능</div>
        <div><b style="color:var(--ac);">구비서류</b>: 계약자 본인 = 신분증 / 직계 = 계약자신분증 + 카드주신분증 + 가족관계증명서 (3개월 이내)</div>
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
  AND tab_key = 'payment_info';

COMMIT;

-- 검증 SQL (별 RUN):
-- SELECT tab_title, LENGTH(content_html) AS html_len,
--        SUBSTRING(content_html FROM POSITION('흥국화재' IN content_html) FOR 400) AS heungkuk_part
-- FROM public.quick_contents
-- WHERE tab_key = 'payment_info';
