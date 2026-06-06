// supabase/functions/satori-render/index.ts
//
// Quick 카드 v2 렌더러 — JSON(핵심 추출 결과) → PNG. 서버 렌더라 "다른 PC 에러" 근본 차단
// (브라우저 html2canvas의 color-mix/oklch/CDN 파편화 없음, 모든 사용자 동일 결과).
//
// 보완1 구조: 데이터 모델·렌더 파이프라인은 1개. theme(A/B/C)로 스타일(색·배치)만 분기.
//   카드 필드 추가 시 buildCard 한 곳만 수정.
//
// 입력 (POST JSON):
//   { title: string, brand?: string, rows?: {k,v,big?}[], lines?: string[], notice?: string,
//     footer?: { name?: string, phone?: string }, theme?: 'A'|'B'|'C' }
//   rows = 항목:값 표(딸깍 카드 룩, 우선). lines = 구버전 불릿(하위호환 폴백).
// 출력 (200): image/png (binary)
// 실패 (4xx/5xx JSON): { error: string }
//
// ⚠️ 배포 후 실호출 검증 필수: satori(npm) + resvg-wasm + 한글 폰트(Noto Sans KR) 로딩이 1차 리스크.

import satori from "npm:satori@0.10.13";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// ── 폰트 (Noto Sans KR · 한글 subset woff). warm 인스턴스 캐시 ──
// cold start 시 CDN 연결 리셋(os error 104) 대비: 폴백 CDN(jsdelivr→unpkg) + 각 2회 재시도.
let FONTS: Array<{ name: string; data: ArrayBuffer; weight: number; style: string }> | null = null;
async function fetchFont(file: string): Promise<ArrayBuffer> {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr@5.0.18/files/${file}`,
    `https://unpkg.com/@fontsource/noto-sans-kr@5.0.18/files/${file}`,
  ];
  let lastErr: unknown = null;
  for (const url of urls) {
    for (let i = 0; i < 2; i++) {
      try {
        const r = await fetch(url);
        if (r.ok) return await r.arrayBuffer();
        lastErr = new Error(`HTTP ${r.status}`);
      } catch (e) { lastErr = e; }
      await new Promise((res) => setTimeout(res, 150 * (i + 1)));
    }
  }
  throw new Error(`폰트 로드 실패(${file}): ${(lastErr as Error)?.message || String(lastErr)}`);
}
async function loadFonts() {
  if (FONTS) return FONTS;
  const [reg, bold] = await Promise.all([
    fetchFont("noto-sans-kr-korean-400-normal.woff"),
    fetchFont("noto-sans-kr-korean-700-normal.woff"),
  ]);
  FONTS = [
    { name: "Noto", data: reg, weight: 400, style: "normal" },
    { name: "Noto", data: bold, weight: 700, style: "normal" },
  ];
  return FONTS;
}

// ── resvg WASM init. 1회만 ──
let WASM_READY = false;
async function ensureWasm() {
  if (WASM_READY) return;
  await initWasm(fetch("https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));
  WASM_READY = true;
}

// ── 테마 팔레트 (스타일만 분기, 데이터 동일) ──
function palette(theme?: string) {
  // C: 다크 본문 + 인디고 솔리드 헤더
  if (theme === "C") return {
    headType: "solid", headColor: "#4f46e5", headFrom: "", headTo: "",
    headText: "#ffffff", headSub: "rgba(255,255,255,0.85)",
    bg: "#0f1629", k: "#94a3b8", v: "#f8fafc", accent: "#8b9cff",
    line: "#1f2a44", sig: "#e2e8f0", foot: "#64748b", border: "#1f2a44",
  };
  // B: 그라데이션 헤더 + 흰 본문
  if (theme === "B") return {
    headType: "gradient", headColor: "", headFrom: "#4f46e5", headTo: "#7c3aed",
    headText: "#ffffff", headSub: "rgba(255,255,255,0.85)",
    bg: "#ffffff", k: "#52525b", v: "#18181b", accent: "#6d28d9",
    line: "#eef2f7", sig: "#27272a", foot: "#9ca3af", border: "#ececed",
  };
  // A(기본): 인디고 솔리드 헤더 + 흰 본문 (딸깍 룩)
  return {
    headType: "solid", headColor: "#6366f1", headFrom: "", headTo: "",
    headText: "#ffffff", headSub: "rgba(255,255,255,0.82)",
    bg: "#ffffff", k: "#52525b", v: "#18181b", accent: "#6366f1",
    line: "#e4e4e7", sig: "#27272a", foot: "#9ca3af", border: "#ececed",
  };
}

// satori element 헬퍼 (JSX 없이 객체 트리)
type El = { type: string; props: Record<string, unknown> };
function el(style: Record<string, unknown>, children?: unknown): El {
  return { type: "div", props: children != null ? { style, children } : { style } };
}

function footerEls(d: any, p: ReturnType<typeof palette>) {
  const out: El[] = [];
  const name = d.footer?.name, phone = d.footer?.phone;
  if (name || phone) {
    out.push(el({ display: "flex", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${p.line}`, fontSize: 14, fontWeight: 700, color: p.sig }, [name, phone].filter(Boolean).join(" · ")));
  }
  out.push(el({ display: "flex", marginTop: 6, fontSize: 11, color: p.foot }, "상담 참고용 · 보장은 약관 기준"));
  return out;
}
// rows[{k,v,big}] → 항목:값 표 (딸깍 카드 룩). big = 강조색·큰 글씨.
function rowsEls(d: any, p: ReturnType<typeof palette>) {
  const rows = (Array.isArray(d.rows) ? d.rows : []).slice(0, 6);
  return rows.map((r: any, i: number) =>
    el({
      display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
      padding: "10px 0",
      borderBottom: i < rows.length - 1 ? `1px solid ${p.line}` : "0px solid rgba(0,0,0,0)",
    }, [
      el({ display: "flex", fontSize: 14, color: p.k }, String(r.k || "")),
      el({ display: "flex", fontSize: r.big ? 19 : 15, fontWeight: 700, color: r.big ? p.accent : p.v, marginLeft: 12 }, String(r.v || "")),
    ])
  );
}
// 하위호환: rows 없고 lines만 오면 불릿 나열.
function lineEls(d: any, p: ReturnType<typeof palette>) {
  return (d.lines || []).slice(0, 6).map((ln: string) =>
    el({ display: "flex", marginBottom: 9, fontSize: 15, color: p.v }, [
      el({ color: p.accent, fontWeight: 700, marginRight: 8 }, "·"),
      el({ display: "flex", flex: 1 }, String(ln)),
    ])
  );
}
function bodyEls(d: any, p: ReturnType<typeof palette>) {
  return (Array.isArray(d.rows) && d.rows.length) ? rowsEls(d, p) : lineEls(d, p);
}

// 카드 element — 컬러 헤더(brand+title) + 본문(rows/lines) + 서명/푸터. theme로 색만 분기.
function buildCard(d: any): El {
  const p = palette(d.theme);
  const brand = String(d.brand || d.tag || "");
  const title = String(d.title || "");

  const head: El[] = [];
  if (brand) head.push(el({ display: "flex", fontSize: 13, fontWeight: 600, color: p.headSub, marginBottom: 4 }, brand));
  head.push(el({ display: "flex", fontSize: 21, fontWeight: 700, color: p.headText, lineHeight: 1.3 }, title));

  const headStyle: Record<string, unknown> = { display: "flex", flexDirection: "column", padding: "18px 20px" };
  if (p.headType === "gradient") headStyle.backgroundImage = `linear-gradient(135deg, ${p.headFrom}, ${p.headTo})`;
  else headStyle.background = p.headColor;

  return el({ display: "flex", flexDirection: "column", width: 360, background: p.bg, borderRadius: 16, overflow: "hidden", border: `1px solid ${p.border}` }, [
    el(headStyle, head),
    el({ display: "flex", flexDirection: "column", padding: "8px 20px 20px" }, [...bodyEls(d, p), ...footerEls(d, p)]),
  ]);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST 요청만 허용됩니다." }, 405);

  let d: any;
  try { d = await req.json(); } catch { return json({ error: "JSON 파싱 실패." }, 400); }
  if (!d || !d.title) return json({ error: "title 은 필수입니다." }, 400);
  if (d.theme && !["A", "B", "C"].includes(d.theme)) return json({ error: "theme 은 A·B·C 중 하나." }, 400);

  try {
    const fonts = await loadFonts();
    const svg = await satori(buildCard(d) as unknown as Parameters<typeof satori>[0], { width: 360, fonts });
    await ensureWasm();
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 720 } }); // 2x 고해상도
    const png = resvg.render().asPng();
    return new Response(png, { headers: { ...CORS, "Content-Type": "image/png" } });
  } catch (e) {
    return json({ error: "카드 렌더 실패: " + ((e as Error)?.message || String(e)) }, 500);
  }
});
