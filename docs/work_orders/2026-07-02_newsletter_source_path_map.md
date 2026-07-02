# 7월 소식지 Storage 연결표 — 김실장·기획팀장 create_draft 등록 원장 (2026-07-02)

> **총괄팀장(Code) 산출.** newsletters 버킷 업로드 완료분(23건) 매핑 = **create_draft 등록 원장.**
> - **업로드 전용** — newsletters INSERT(행 생성)는 김실장·기획팀장 create_draft 몫. Code는 업로드 + 본 연결표 + (등록 후) source_path UPDATE.
> - 용도 ①: 등록 시 `file_hash`(중복판단)·`publish_year/month`·`insurance_type` 참조 · 용도 ②: create_draft 후 Code의 `source_path` UPDATE 매칭키.
> - 버킷: newsletters(private) · 키=`2026-07/<sha256>.pdf`(ASCII·멱등) · 프로젝트 pdnwgzneooyygfejrvbg.
> - 검증: Storage 실측 23/23 존재+크기 일치(info API 200) · sha256 원장(#1032) 전수 일치 · Storage=매니페스트=원장=연결표.
> - insurance_type 등록 허용값 매핑: **생명→`생명` / 손해→`손해`** (등록 API 허용값 {생명, 손해}).

| # | 구분(insurance_type) | 회사명(파일명 기준) | source_filename | source_path | publish_year | publish_month | 크기(bytes) | file_hash (sha256) |
|---|---|---|---|---|---|---|---|---|
| 1 | 생명 | ABL생명 | ABL생명 영업 Issue 26.07.pdf | `2026-07/1e49d4315f33d1c8c17e6b613c94daf963fa0021c46cdfcac2a88ab478f4f7e8.pdf` | 2026 | 7 | 4225758 | `1e49d4315f33d1c8c17e6b613c94daf963fa0021c46cdfcac2a88ab478f4f7e8` |
| 2 | 생명 | DB생명 | DB생명 위드유매거진 26.07.pdf | `2026-07/f3255a0b8c52262e1a4463edebf92bcbd0a614b4666b81b312c5b9e47b5698ae.pdf` | 2026 | 7 | 8665807 | `f3255a0b8c52262e1a4463edebf92bcbd0a614b4666b81b312c5b9e47b5698ae` |
| 3 | 생명 | 농협생명 | 농협생명GA소식지 26.07.pdf | `2026-07/568aeee342c14cd418148739a51654420cef30ca32d5f3e268bf5a13f41875f1.pdf` | 2026 | 7 | 6383124 | `568aeee342c14cd418148739a51654420cef30ca32d5f3e268bf5a13f41875f1` |
| 4 | 생명 | 동양생명 | 동양생명 GA소식지 26.07.pdf | `2026-07/f90de3ce7540d874d07a69f37e7aaaedacaaaa9c9f008497ac858307e120982a.pdf` | 2026 | 7 | 12614081 | `f90de3ce7540d874d07a69f37e7aaaedacaaaa9c9f008497ac858307e120982a` |
| 5 | 생명 | 라이나생명 | 라이나생명 GA소식지 26.07.pdf | `2026-07/b899d232f3cff9a9b75ed2758ffc7ab43b1d864c4a174c6101bf32789007bd22.pdf` | 2026 | 7 | 9850736 | `b899d232f3cff9a9b75ed2758ffc7ab43b1d864c4a174c6101bf32789007bd22` |
| 6 | 생명 | 메트라이프생명 | 메트라이프생명 GA소식지 26.07.pdf | `2026-07/a5577c5cd8ff1e98efe6d7f664ab5b230efcb8d5edc764344853aff642fbe502.pdf` | 2026 | 7 | 22210905 | `a5577c5cd8ff1e98efe6d7f664ab5b230efcb8d5edc764344853aff642fbe502` |
| 7 | 생명 | 미래에셋생명 | 미래에셋생명 GA소식지 26.07.pdf | `2026-07/3394be369dfc475a2397ba67cb240f4360226ca1c2ea687089b9f0446d6fe3c1.pdf` | 2026 | 7 | 5232451 | `3394be369dfc475a2397ba67cb240f4360226ca1c2ea687089b9f0446d6fe3c1` |
| 8 | 생명 | 삼성생명 | 삼성생명 GA소식지 26.07.pdf | `2026-07/d84a99ba3cfe212d9411cb245012b8fca96e82d30d910b5de7f0e0b79ce07591.pdf` | 2026 | 7 | 11056248 | `d84a99ba3cfe212d9411cb245012b8fca96e82d30d910b5de7f0e0b79ce07591` |
| 9 | 생명 | 신한라이프 | 신한라이프 GA소식지 26.07.pdf | `2026-07/fe411fcf23f7ae54ca7bfeab171aa1d09f5c0980e7ed0b1ca9a1329fa540b6f5.pdf` | 2026 | 7 | 18973283 | `fe411fcf23f7ae54ca7bfeab171aa1d09f5c0980e7ed0b1ca9a1329fa540b6f5` |
| 10 | 생명 | 하나생명 | 하나생명 GA소식지 26.07.pdf | `2026-07/73415e35da7c328deaeefedf0432a3d3f71e249c34e8a745742510542b94372f.pdf` | 2026 | 7 | 4446173 | `73415e35da7c328deaeefedf0432a3d3f71e249c34e8a745742510542b94372f` |
| 11 | 생명 | 한화생명 | 한화생명 상품판매방향(소식지) 26.07.pdf | `2026-07/45727411374c9050fcddcf778e915a09a226fec98379297eedbd8541afedb476.pdf` | 2026 | 7 | 9961910 | `45727411374c9050fcddcf778e915a09a226fec98379297eedbd8541afedb476` |
| 12 | 손해 | DB손보 | DB손보 GA소식지 26.07.pdf | `2026-07/7cea47ad49c73a7a0fcd2314287d6bb00c2163456684137967d5f0cadd317922.pdf` | 2026 | 7 | 12094373 | `7cea47ad49c73a7a0fcd2314287d6bb00c2163456684137967d5f0cadd317922` |
| 13 | 손해 | 롯데손보 | 롯데손보 GA상품소식지 26.07.pdf | `2026-07/24e35519aba950a8323139828f12d09055135be42a46b5604b1e39f6e9ced8b6.pdf` | 2026 | 7 | 3844740 | `24e35519aba950a8323139828f12d09055135be42a46b5604b1e39f6e9ced8b6` |
| 14 | 손해 | 하나손보 | 하나손보 GA소식지 26.07(단면).pdf | `2026-07/a69075fb2934909944241baffa520d1d3b5f0c93bde0fcd3cf53cdd977af47a1.pdf` | 2026 | 7 | 3737317 | `a69075fb2934909944241baffa520d1d3b5f0c93bde0fcd3cf53cdd977af47a1` |
| 15 | 손해 | 하나손보 | 하나손보 GA소식지 26.07.pdf | `2026-07/0c15d8f963a2f7d97bfe6c970b97576ad6599c4275098a73ee3c54f30b9b229c.pdf` | 2026 | 7 | 3715549 | `0c15d8f963a2f7d97bfe6c970b97576ad6599c4275098a73ee3c54f30b9b229c` |
| 16 | 손해 | 하나손보 | 하나손보 영업이슈 리플렛 26.07.pdf | `2026-07/def14ba6684bbfb87a837da841bc771dce8178d53d3c04a1771650ba8756260d.pdf` | 2026 | 7 | 496620 | `def14ba6684bbfb87a837da841bc771dce8178d53d3c04a1771650ba8756260d` |
| 17 | 손해 | 하나손보 | 하나손보 운전자보험 강의안 20260616.pdf | `2026-07/efe303e11aff2ce30d1840eafd18a9100384fb3c5a11c0452c3bc1b09edae8f8.pdf` | 2026 | 7 | 126857 | `efe303e11aff2ce30d1840eafd18a9100384fb3c5a11c0452c3bc1b09edae8f8` |
| 18 | 손해 | 하나손해보험 | 하나손해보험 영업방향 26.07.pdf | `2026-07/0866e7759db849eafbac31ad583625be7fbcb9912220a15f23e9637757339f41.pdf` | 2026 | 7 | 8128926 | `0866e7759db849eafbac31ad583625be7fbcb9912220a15f23e9637757339f41` |
| 19 | 손해 | 한화손보 | 한화손보 GA뉴스 GA영업부문 26.07.pdf | `2026-07/8deb8bc6fc2daf46ef1c3a63f08013f44f67ac9d1e6de3f7536967171e6a38cb.pdf` | 2026 | 7 | 1840434 | `8deb8bc6fc2daf46ef1c3a63f08013f44f67ac9d1e6de3f7536967171e6a38cb` |
| 20 | 손해 | 한화손보 | 한화손보 GA소식지 26.07.pdf | `2026-07/6a679e5992bb26f90321fbd9a9b241dc0362af3c353c9c2e4e58a9955614adc9.pdf` | 2026 | 7 | 9641714 | `6a679e5992bb26f90321fbd9a9b241dc0362af3c353c9c2e4e58a9955614adc9` |
| 21 | 손해 | 현대해상 | 현대해상 GA매거진 26.07.pdf | `2026-07/0c26e9a0b4626b3f2b0165bef56958c103336f773b8e6de438a8c115e5c5074b.pdf` | 2026 | 7 | 31209879 | `0c26e9a0b4626b3f2b0165bef56958c103336f773b8e6de438a8c115e5c5074b` |
| 22 | 손해 | 흥국화재 | 흥국화재 GA소식지 26.07.pdf | `2026-07/b861d4cee3c1b74c199ae8c9241b6577519d317ed61765572846258d3a9f4d2d.pdf` | 2026 | 7 | 6867237 | `b861d4cee3c1b74c199ae8c9241b6577519d317ed61765572846258d3a9f4d2d` |
| 23 | 손해 | 흥국화재 | 흥국화재 상품 세일즈 가이드 GA지원팀 26.07.pdf | `2026-07/a35371c9a65ca1d4ec83272f6420b9f83c0995e5a71aa9239389d5da1e68cd5c.pdf` | 2026 | 7 | 6935624 | `a35371c9a65ca1d4ec83272f6420b9f83c0995e5a71aa9239389d5da1e68cd5c` |

> ⚠️ 회사명은 파일명 표기 기준(하나손보/하나손해보험 등 원본 표기). 정규화는 등록·검수 단계 적용.
> ⚠️ 등록은 먼저 `check_duplicate`(회사·발행월·자료유형·해시) 후 `create_draft`(status=reviewing) 권장. 발행 승격(published)은 총괄팀장 시스템 검수 후.
