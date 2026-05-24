-- ════════════════════════════════════════════════════════════════════
-- 2026-05-25 결제정보 + 연락처 자체 ⚡ 딸깍 = 즉시 복사 → 메뉴형 정정
-- ════════════════════════════════════════════════════════════════════
-- 본질:
--   직전 작업 자체 = ⚡ 딸깍 = 즉시 복사 자체 (격차 자체)
--   정정 자체 = ⚡ 딸깍 = 액션 메뉴 자체 (스킬: .claude/skills/ddalggak/SKILL.md)
--   복사 = 메뉴 항목 중 하나 자체
--
-- 본 SQL 자체:
--   REPLACE 자체 = onclick="copyPaymentCardV2(this)" → showDdalggakMenu(this, '<type>')
--   - 결제정보 자체 자체 = 'payment'
--   - 연락처 자체 자체 = 'contact'
--   - 작은 SQL 자체 자체 = 가동 자체 보장
--
-- 실행: Supabase SQL Editor → 통째 RUN
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- 결제정보 자체 자체 자체 (24 카드)
UPDATE public.quick_contents
SET content_html = REPLACE(content_html, 'copyPaymentCardV2(this)', 'showDdalggakMenu(this, ''payment'')')
WHERE tab_key = 'payment_info';

-- 연락처 자체 자체 자체 (24 카드)
UPDATE public.quick_contents
SET content_html = REPLACE(content_html, 'copyPaymentCardV2(this)', 'showDdalggakMenu(this, ''contact'')')
WHERE tab_key = 'contact_info';

COMMIT;

-- ── 검증 SQL (별 RUN) ──────────────────────────────────────────────
-- SELECT tab_title, tab_key,
--        (LENGTH(content_html) - LENGTH(REPLACE(content_html, 'showDdalggakMenu', ''))) / LENGTH('showDdalggakMenu') AS menu_count,
--        (LENGTH(content_html) - LENGTH(REPLACE(content_html, 'copyPaymentCardV2', ''))) / LENGTH('copyPaymentCardV2') AS old_count
-- FROM public.quick_contents
-- WHERE tab_key IN ('payment_info', 'contact_info');
-- 기대: menu_count = 24 / old_count = 0
