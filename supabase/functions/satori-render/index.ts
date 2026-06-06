// supabase/functions/satori-render/index.ts
//
// Quick 카드 v2 렌더러 — JSON(핵심 추출 결과) → PNG. 서버 렌더라 "다른 PC 에러" 근본 차단
// (브라우저 html2canvas의 color-mix/oklch/CDN 파편화 없음, 모든 사용자 동일 결과).
//
// 보완1 구조: 데이터 모델·렌더 파이프라인은 1개. theme(A/B/C)로 스타일(색·배치)만 분기.
//   카드 필드 추가 시 buildCard 한 곳만 수정.
//
// 입력 (POST JSON):
//   { title: string, tag?: string, lines?: string[], notice?: string,
//     footer?: { name?: string, phone?: string }, theme?: 'A'|'B'|'C' }
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
let FONTS: Array<{ name: string; data: ArrayBuffer; weight: number; style: string }> | null = null;
async function loadFonts() {
  if (FONTS) return FONTS;
  const base = "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr@5.0.18/files";
  const [reg, bold] = await Promise.all([
    fetch(`${base}/noto-sans-kr-korean-400-normal.woff`).then((r) => r.arrayBuffer()),
    fetch(`${base}/noto-sans-kr-korean-700-normal.woff`).then((r) => r.arrayBuffer()),
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
  if (theme === "B") return { mode: "gradient", bg: "#ffffff", headFrom: "#4f46e5", headTo: "#7c3aed", title: "#0f172a", body: "#334155", accent: "#7c3aed", sub: "#9aa5b4", line: "#eef2f7" };
  if (theme === "C") return { mode: "dark", bg: "#0f1629", headFrom: "", headTo: "", title: "#f8fafc", body: "#cbd5e1", accent: "#60a5fa", sub: "#64748b", line: "#1f2a44" };
  return { mode: "bar", bg: "#ffffff", headFrom: "", headTo: "", title: "#0f172a", body: "#334155", accent: "#2563eb", sub: "#9aa5b4", line: "#eef2f7" };
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
    out.push(el({ display: "flex", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${p.line}`, fontSize: 14, fontWeight: 700, color: p.title }, [name, phone].filter(Boolean).join(" | ")));
  }
  out.push(el({ display: "flex", marginTop: 6, fontSize: 11, color: p.sub }, "※ 상담 참고용 · 보장은 약관 기준"));
  return out;
}
function lineEls(d: any, p: ReturnType<typeof palette>) {
  return (d.lines || []).slice(0, 6).map((ln: string) =>
    el({ display: "flex", marginBottom: 9, fontSize: 15, color: p.body }, [
      el({ color: p.accent, fontWeight: 700, marginRight: 8 }, "✓"),
      el({ display: "flex", flex: 1 }, String(ln)),
    ])
  );
}

// 카드 element (theme만 분기)
function buildCard(d: any): El {
  const p = palette(d.theme);
  const tag = d.tag ? String(d.tag) : "";
  const title = String(d.title || "");

  if (p.mode === "gradient") {
    // B: 상단 그라데이션 헤더(tag/title) + 흰 본문(lines/footer)
    const head: El[] = [];
    if (tag) head.push(el({ display: "flex", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }, tag));
    head.push(el({ display: "flex", fontSize: 23, fontWeight: 700, color: "#ffffff", marginTop: 5 }, title));
    return el({ display: "flex", flexDirection: "column", width: 360, background: p.bg, borderRadius: 18, overflow: "hidden" }, [
      el({ display: "flex", flexDirection: "column", padding: "22px", backgroundImage: `linear-gradient(135deg, ${p.headFrom}, ${p.headTo})` }, head),
      el({ display: "flex", flexDirection: "column", padding: "20px 22px" }, [...lineEls(d, p), ...footerEls(d, p)]),
    ]);
  }

  // A(bar) / C(dark) 공통 = 단일 컬럼. A는 좌측 바.
  const colInner: El[] = [];
  if (tag) colInner.push(el({ display: "flex", fontSize: 13, fontWeight: 700, color: p.accent, marginBottom: 6 }, tag));
  colInner.push(el({ display: "flex", fontSize: 24, fontWeight: 700, color: p.title, marginBottom: 14 }, title));
  colInner.push(...lineEls(d, p), ...footerEls(d, p));

  if (p.mode === "bar") {
    return el({ display: "flex", width: 360, background: p.bg, borderRadius: 18, overflow: "hidden" }, [
      el({ display: "flex", width: 6, background: p.accent }, ""),
      el({ display: "flex", flexDirection: "column", flex: 1, padding: "24px 22px" }, colInner),
    ]);
  }
  // C dark
  return el({ display: "flex", flexDirection: "column", width: 360, background: p.bg, borderRadius: 18, padding: "24px 22px", border: `1px solid ${p.line}` }, colInner);
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
