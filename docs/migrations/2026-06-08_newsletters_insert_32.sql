-- 소식지 32개사 단체방 일괄 등록 (2026-06-08) — §4
-- 🚨 실행 전 신버전 확인: onesecond-v1-restore-0420 / pdnwgzneooyygfejrvbg
-- 🚨 실행 = 팀장님. 게이트: §5-1(기존 첨부 회귀) 통과 + §3 업로드(아래 경로와 1:1 일치) 후.
-- attachments = jsonb_build_array(...)로 구성(CRLF/이스케이프 사고 회피).
-- 경로 규약: newsletters/2026-06/{회사}/{파일} — 업로드 경로와 글자 단위 일치해야 서명 성공.
-- 라이나손보·하나손보의 페이지 jpg 16장은 PDF와 중복이라 첨부 제외(PDF가 본체).

insert into public.team_notices (notice_type, scope, team_id, author_id, title, content, attachments)
values
-- ── 손해보험 12사 ──
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] AIG손보 2026년 6월','AIG손보 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','AIG손보 GA매거진 26.06.pdf','bucket','newsletters','path','2026-06/AIG손보/AIG손보 GA매거진 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] DB손보 2026년 6월','DB손보 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','DB손보 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/DB손보/DB손보 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] KB손보 2026년 6월','KB손보 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(
   jsonb_build_object('name','KB손보 미라클러닝 26.06.pdf','bucket','newsletters','path','2026-06/KB손보/KB손보 미라클러닝 26.06.pdf'),
   jsonb_build_object('name','KB손보 영업자료(소식지) 26.06.pdf','bucket','newsletters','path','2026-06/KB손보/KB손보 영업자료(소식지) 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 농협손보 2026년 6월','농협손보 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','농협손보 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/농협손보/농협손보 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 라이나손보 2026년 6월','라이나손보 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','라이나손보 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/라이나손보/라이나손보 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 롯데손보 2026년 6월','롯데손보 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(
   jsonb_build_object('name','롯데손보 GA상품소식지 26.06.pdf','bucket','newsletters','path','2026-06/롯데손보/롯데손보 GA상품소식지 26.06.pdf'),
   jsonb_build_object('name','롯데손보 GA표준교안 26.06.pdf','bucket','newsletters','path','2026-06/롯데손보/롯데손보 GA표준교안 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 메리츠화재 2026년 6월','메리츠화재 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','메리츠화재 영업자료(소식지) 26.06.pdf','bucket','newsletters','path','2026-06/메리츠화재/메리츠화재 영업자료(소식지) 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 삼성화재 2026년 6월','삼성화재 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(
   jsonb_build_object('name','삼성화재 6월 1주차 1매형(CR완료).pdf','bucket','newsletters','path','2026-06/삼성화재/삼성화재 6월 1주차 1매형(CR완료).pdf'),
   jsonb_build_object('name','삼성화재 GA소식지(단면) 26.06.pdf','bucket','newsletters','path','2026-06/삼성화재/삼성화재 GA소식지(단면) 26.06.pdf'),
   jsonb_build_object('name','삼성화재 순통치 판매비법서(CR완료)26.06.pdf','bucket','newsletters','path','2026-06/삼성화재/삼성화재 순통치 판매비법서(CR완료)26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 하나손보 2026년 6월','하나손보 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(
   jsonb_build_object('name','하나손보 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/하나손보/하나손보 GA소식지 26.06.pdf'),
   jsonb_build_object('name','하나손해보험 영업방향 26.06.pdf','bucket','newsletters','path','2026-06/하나손보/하나손해보험 영업방향 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 한화손보 2026년 6월','한화손보 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(
   jsonb_build_object('name','한화손보 GA뉴스 26.06.pdf','bucket','newsletters','path','2026-06/한화손보/한화손보 GA뉴스 26.06.pdf'),
   jsonb_build_object('name','한화손보 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/한화손보/한화손보 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 현대해상 2026년 6월','현대해상 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(
   jsonb_build_object('name','현대해상 GA매거진 26.06.pdf','bucket','newsletters','path','2026-06/현대해상/현대해상 GA매거진 26.06.pdf'),
   jsonb_build_object('name','현대해상 GA영업전략 26.06.pptx','bucket','newsletters','path','2026-06/현대해상/현대해상 GA영업전략 26.06.pptx'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 흥국화재 2026년 6월','흥국화재 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(
   jsonb_build_object('name','흥국화재 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/흥국화재/흥국화재 GA소식지 26.06.pdf'),
   jsonb_build_object('name','흥국화재 상품세일즈가이드 GA지원팀 26.06.pdf','bucket','newsletters','path','2026-06/흥국화재/흥국화재 상품세일즈가이드 GA지원팀 26.06.pdf'))),
-- ── 생명보험 20사 ──
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] ABL생명 2026년 6월','ABL생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','ABL생명 GA소식지(Issue)26.06.pdf','bucket','newsletters','path','2026-06/ABL생명/ABL생명 GA소식지(Issue)26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] AIA 2026년 6월','AIA 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','AIA소식지 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/AIA/AIA소식지 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] DB생명 2026년 6월','DB생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','DB생명 위드유매거진 26.06.pdf','bucket','newsletters','path','2026-06/DB생명/DB생명 위드유매거진 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] IBK연금보험 2026년 6월','IBK연금보험 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','IBK연금보험 소식지 26.06.pdf','bucket','newsletters','path','2026-06/IBK연금보험/IBK연금보험 소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] iM라이프 2026년 6월','iM라이프 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','iM라이프 GA매거진 26.06.pdf','bucket','newsletters','path','2026-06/iM라이프/iM라이프 GA매거진 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] KB라이프 2026년 6월','KB라이프 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','KB라이프 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/KB라이프/KB라이프 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] KDB생명 2026년 6월','KDB생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','KDB생명 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/KDB생명/KDB생명 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 교보생명 2026년 6월','교보생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','교보생명 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/교보생명/교보생명 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 농협생명 2026년 6월','농협생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','농협생명 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/농협생명/농협생명 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 동양생명 2026년 6월','동양생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','동양생명 GA소식지 안내 26.06.pdf','bucket','newsletters','path','2026-06/동양생명/동양생명 GA소식지 안내 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 라이나생명 2026년 6월','라이나생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','라이나생명 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/라이나생명/라이나생명 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 메트라이프 2026년 6월','메트라이프 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','메트라이프 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/메트라이프/메트라이프 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 미래에셋생명 2026년 6월','미래에셋생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','미래에셋 생명 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/미래에셋생명/미래에셋 생명 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 삼성생명 2026년 6월','삼성생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(
   jsonb_build_object('name','삼성생명 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/삼성생명/삼성생명 GA소식지 26.06.pdf'),
   jsonb_build_object('name','삼성생명 GA소식지 26.06.pptx','bucket','newsletters','path','2026-06/삼성생명/삼성생명 GA소식지 26.06.pptx'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 신한라이프 2026년 6월','신한라이프 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','신한라이프 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/신한라이프/신한라이프 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 처브라이프 2026년 6월','처브라이프 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','처브라이프 영업자료(소식지) 26.06.pdf','bucket','newsletters','path','2026-06/처브라이프/처브라이프 영업자료(소식지) 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 푸본현대생명 2026년 6월','푸본현대생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','푸본현대생명 영업자료(소식지) 26.06.pdf','bucket','newsletters','path','2026-06/푸본현대생명/푸본현대생명 영업자료(소식지) 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 하나생명 2026년 6월','하나생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','하나생명 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/하나생명/하나생명 GA소식지 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 한화생명 2026년 6월','한화생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(jsonb_build_object('name','한화생명 상품판매방향(소식지) 26.06.pdf','bucket','newsletters','path','2026-06/한화생명/한화생명 상품판매방향(소식지) 26.06.pdf'))),
('product','team_internal','5fccd362-9ee3-4165-8960-7cb0b7ec72fa','98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','[소식지] 흥국생명 2026년 6월','흥국생명 2026년 6월 GA 소식지입니다. 신상품·개정·영업 안내 등 상세는 첨부를 확인해 주세요.',
 jsonb_build_array(
   jsonb_build_object('name','흥국생명 GA소식지 26.06.pdf','bucket','newsletters','path','2026-06/흥국생명/흥국생명 GA소식지 26.06.pdf'),
   jsonb_build_object('name','흥국생명 GA영업방향 26.06.pdf','bucket','newsletters','path','2026-06/흥국생명/흥국생명 GA영업방향 26.06.pdf')));

-- 검증 (읽기)
-- select count(*) from public.team_notices where notice_type='product' and title like '[소식지]%' and created_at::date = current_date;  -- 32 기대
-- select title, jsonb_array_length(attachments) as files from public.team_notices where title like '[소식지]%' order by title;
