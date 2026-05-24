-- ════════════════════════════════════════════════════════════════════
-- 2026-05-24 빠른 실행 오버레이 V2 토큰 + 카드 디자인 정합 묶음 2
-- ════════════════════════════════════════════════════════════════════
-- 격차 본질:
--   빠른 실행 오버레이 남은 2 row content_html = 인라인 색상 박힘 (라이트 모드 고정)
--
-- 본 묶음 2 대상 2 row:
--   1. insurance_age (보험연령표) — 청록 strip #34D399
--   2. contact_info (보험회사 연락처) — 분홍 strip #F472B6 + <style> 블록 통째 제거 + 미박힘 row 7건 추가
--
-- 직전 묶음 1 마감 (PR #43):
--   - recording_script / bmi_standard / system_links / payment_info
--
-- V2 토큰 매핑 + 카드 디자인 본질 = 묶음 1 SQL 자체 정합
--
-- 추가 인라인 색상 (V2 토큰 외):
--   #34D399 (청록) — insurance_age 좌측 strip + 카테고리 chip
--   #F472B6 (분홍) — contact_info 좌측 strip + 카테고리 chip
--
-- 실행: Supabase SQL Editor → 통째 붙여넣기 → RUN (한 RUN 트랜잭션)
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. insurance_age (보험연령표) ─────────────────────────────────
-- 좌측 strip = 청록 #34D399
-- 5세 단위 강조 row = 노랑 / 10세 단위 = 청록 / 15~19세 = 인디고
UPDATE public.quick_contents
SET content_html = $HTML$
<div style="width:100%; font-family:inherit; color:var(--tp); letter-spacing:-0.2px; line-height:1.4;">
  <!-- Header: 좌측 청록 strip + 카테고리 chip -->
  <div style="background:var(--s2); border:1px solid var(--bd); border-left:5px solid #34D399; border-radius:12px; padding:16px 18px; margin-bottom:14px;">
    <div style="display:inline-block; padding:4px 10px; border-radius:999px; background:rgba(52,211,153,0.18); color:#34D399; font-size:0.75em; font-weight:800; margin-bottom:8px;">연령 기준</div>
    <div style="font-size:1.125em; font-weight:900; color:var(--tp);">보험연령표 (2026년 기준)</div>
    <div style="margin-top:6px; font-size:0.8125em; color:var(--ts);">07년생 생일 지나면 성인 · 11년생 생일 지나면 15세</div>
  </div>

  <!-- 범례 (3 chip) -->
  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
    <span style="padding:6px 10px; border-radius:999px; background:rgba(245,158,11,0.14); border:1px solid rgba(245,158,11,0.30); font-size:0.75em; font-weight:800; color:var(--warn);">5세 단위</span>
    <span style="padding:6px 10px; border-radius:999px; background:rgba(52,211,153,0.18); border:1px solid rgba(52,211,153,0.35); font-size:0.75em; font-weight:800; color:#34D399;">10세 단위</span>
    <span style="padding:6px 10px; border-radius:999px; background:rgba(99,102,241,0.14); border:1px solid rgba(99,102,241,0.25); font-size:0.75em; font-weight:800; color:var(--ac);">15~19세</span>
  </div>

  <!-- 4구간 그리드 -->
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">

    <!-- 0~20세 -->
    <div style="border:1px solid var(--bd); border-radius:10px; overflow:hidden; background:var(--s1);">
      <div style="background:var(--s2); color:var(--tp); text-align:center; font-size:0.8947em; font-weight:900; padding:9px 6px; border-bottom:1px solid var(--bd);">0 ~ 20세</div>
      <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:0.7895em; text-align:center; color:var(--tp);">
        <tr style="background:var(--s2); color:var(--tp); font-weight:900;">
          <th style="padding:8px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">출생</th>
          <th style="padding:8px 4px; border-bottom:1px solid var(--bd);">연령</th>
        </tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2026</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">0</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2025</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">1</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2024</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">2</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2023</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">3</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2022</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">4</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">2021</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">5</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2020</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">6</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2019</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">7</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2018</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">8</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2017</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">9</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">2016</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">10</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2015</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">11</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2014</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">12</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2013</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">13</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">2012</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">14</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(99,102,241,0.14); color:var(--ac); font-weight:900;">2011</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(99,102,241,0.14); color:var(--ac); font-weight:900;">15</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(99,102,241,0.14); color:var(--ac); font-weight:900;">2010</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(99,102,241,0.14); color:var(--ac); font-weight:900;">16</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(99,102,241,0.14); color:var(--ac); font-weight:900;">2009</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(99,102,241,0.14); color:var(--ac); font-weight:900;">17</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(99,102,241,0.14); color:var(--ac); font-weight:900;">2008</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(99,102,241,0.14); color:var(--ac); font-weight:900;">18</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(99,102,241,0.14); color:var(--ac); font-weight:900;">2007</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(99,102,241,0.14); color:var(--ac); font-weight:900;">19</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">2006</td><td style="padding:7px 4px; background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">20</td></tr>
      </table>
    </div>

    <!-- 21~40세 -->
    <div style="border:1px solid var(--bd); border-radius:10px; overflow:hidden; background:var(--s1);">
      <div style="background:var(--s2); color:var(--tp); text-align:center; font-size:0.8947em; font-weight:900; padding:9px 6px; border-bottom:1px solid var(--bd);">21 ~ 40세</div>
      <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:0.7895em; text-align:center; color:var(--tp);">
        <tr style="background:var(--s2); color:var(--tp); font-weight:900;">
          <th style="padding:8px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">출생</th>
          <th style="padding:8px 4px; border-bottom:1px solid var(--bd);">연령</th>
        </tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2005</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">21</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2004</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">22</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2003</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">23</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2002</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">24</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">2001</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">25</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">2000</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">26</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1999</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">27</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1998</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">28</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1997</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">29</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">1996</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">30</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1995</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">31</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1994</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">32</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1993</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">33</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1992</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">34</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">1991</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">35</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1990</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">36</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1989</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">37</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1988</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">38</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1987</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">39</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd);">1986</td><td style="padding:7px 4px;">40</td></tr>
      </table>
    </div>

    <!-- 41~60세 -->
    <div style="border:1px solid var(--bd); border-radius:10px; overflow:hidden; background:var(--s1);">
      <div style="background:var(--s2); color:var(--tp); text-align:center; font-size:0.8947em; font-weight:900; padding:9px 6px; border-bottom:1px solid var(--bd);">41 ~ 60세</div>
      <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:0.7895em; text-align:center; color:var(--tp);">
        <tr style="background:var(--s2); color:var(--tp); font-weight:900;">
          <th style="padding:8px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">출생</th>
          <th style="padding:8px 4px; border-bottom:1px solid var(--bd);">연령</th>
        </tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1985</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">41</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1984</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">42</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1983</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">43</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1982</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">44</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">1981</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">45</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1980</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">46</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1979</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">47</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1978</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">48</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1977</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">49</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">1976</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">50</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1975</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">51</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1974</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">52</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1973</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">53</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1972</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">54</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">1971</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">55</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1970</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">56</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1969</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">57</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1968</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">58</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1967</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">59</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd);">1966</td><td style="padding:7px 4px;">60</td></tr>
      </table>
    </div>

    <!-- 61~80세 -->
    <div style="border:1px solid var(--bd); border-radius:10px; overflow:hidden; background:var(--s1);">
      <div style="background:var(--s2); color:var(--tp); text-align:center; font-size:0.8947em; font-weight:900; padding:9px 6px; border-bottom:1px solid var(--bd);">61 ~ 80세</div>
      <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:0.7895em; text-align:center; color:var(--tp);">
        <tr style="background:var(--s2); color:var(--tp); font-weight:900;">
          <th style="padding:8px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">출생</th>
          <th style="padding:8px 4px; border-bottom:1px solid var(--bd);">연령</th>
        </tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1965</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">61</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1964</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">62</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1963</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">63</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1962</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">64</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">1961</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">65</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1960</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">66</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1959</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">67</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1958</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">68</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1957</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">69</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">1956</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">70</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1955</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">71</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1954</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">72</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1953</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">73</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1952</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">74</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">1951</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd); background:rgba(245,158,11,0.14); color:var(--warn); font-weight:900;">75</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1950</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">76</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1949</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">77</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1948</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">78</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); border-bottom:1px solid var(--bd);">1947</td><td style="padding:7px 4px; border-bottom:1px solid var(--bd);">79</td></tr>
        <tr><td style="padding:7px 4px; border-right:1px solid var(--bd); background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">1946</td><td style="padding:7px 4px; background:rgba(52,211,153,0.20); color:#34D399; font-weight:900;">80</td></tr>
      </table>
    </div>

  </div>
</div>
$HTML$
WHERE tab_title = '보험연령표'
  AND tab_key = 'insurance_age';

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

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">메리츠</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1566-7711</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1577-7711</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-3786-2777</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-021-3400</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">DB손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-0100</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1566-0757</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-2262-1241</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-181-4862</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">KB손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1544-0114</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1544-0019</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 1544-8119</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-136-6500</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">흥국화재</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1688-1688</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1688-6997</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 031-786-8088</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0504-800-0700</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">한화손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1566-8000</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1670-1882</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-316-0111</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0502-779-1004</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">삼성화재</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-5114</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1566-0553</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 1899-5005</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-162-0872</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">롯데손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-3344</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1600-5182</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 1599-8260</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0507-333-9999</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">현대해상</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-5656</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1577-3223</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-2628-4567</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0507-774-6060</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">NH농협손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1644-9000</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1644-9600</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 1644-0090</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-060-7000</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">예별손해보험(YBI)</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1588-5959</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1577-3777</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-3788-2261</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0505-088-1646</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">라이나손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1566-5800</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1566-5800</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-6922-5100</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 02-6742-3992</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">하나손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1566-3000</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 02-6299-6821</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-6670-8110</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 0504-3764-0765</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">AIG손해보험</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:var(--ac);">고객센터</b> 1544-2792</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">인콜 모니터링</b> 1544-2792</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">전산 헬프데스크</b> 02-2260-6855</div>
        <div><b style="display:inline-block; width:110px; color:var(--ac);">보험금 청구팩스</b> 02-2011-4607</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid var(--ac); border-radius:12px; padding:14px;">
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

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">교보생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-1001</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1588-1636</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-721-3130</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 고객센터 안내</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">동양생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1577-1004</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 080-899-1004</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-728-9900</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 02-3289-4517</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">라이나생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-0058</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1588-2442</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-3781-2006</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 02-6944-1200</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">메트라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-9600</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1588-9609</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 1899-0751</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 02-2011-4607</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">삼성생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-3114</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1588-3115</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-311-4500</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 고객센터 안내</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">신한라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-5580</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1522-2285</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 02-3455-4119</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 고객센터 안내</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">처브라이프</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1599-4600</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1599-4600</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 1599-4646</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 02-3480-7801</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">푸본현대생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1577-3311</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> -</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 080-860-1212</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 0505-106-0311</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
      <div style="font-size:1em; font-weight:900; color:var(--tp); margin-bottom:8px;">한화생명</div>
      <div style="font-size:0.8125em; color:var(--ts); line-height:1.7;">
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">고객센터</b> 1588-6363</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">인콜 모니터링</b> 1800-6633</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">전산 헬프데스크</b> 1522-6379</div>
        <div><b style="display:inline-block; width:110px; color:#A78BFA;">보험금 청구팩스</b> 고객센터 안내</div>
      </div>
    </div>

    <div style="background:var(--s1); border:1px solid var(--bd); border-left:4px solid #A78BFA; border-radius:12px; padding:14px;">
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
-- SELECT tab_title, tab_key, is_active, sort_order, LENGTH(content_html) AS html_len
-- FROM public.quick_contents
-- WHERE tab_key IN ('insurance_age', 'contact_info')
-- ORDER BY sort_order;
