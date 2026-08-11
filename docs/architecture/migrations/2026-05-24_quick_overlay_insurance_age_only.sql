-- ════════════════════════════════════════════════════════════════════
-- 2026-05-24 insurance_age 단독 SQL (묶음 2 분할 자체 — C안 자체)
-- ════════════════════════════════════════════════════════════════════
-- 격차 본질:
--   직전 묶음 2 SQL (PR #45, 492줄) = 자체 가동 X 본질 격차
--   분할 자체 = insurance_age 단독 + contact_info 단독 (각각 별 PR 자체)
--
-- 본 SQL 자체:
--   insurance_age (보험연령표) 단독 — 청록 strip #34D399
--
-- contact_info 자체 자체 = 별 PR 자체
--   파일 자체: 2026-05-24_quick_overlay_contact_info_only.sql
--
-- 실행: Supabase SQL Editor → 통째 RUN
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

COMMIT;

-- ── 검증 SQL (별 RUN) ──────────────────────────────────────────────
-- SELECT tab_title, tab_key, is_active, sort_order,
--        LENGTH(content_html) AS html_len,
--        SUBSTRING(content_html, 1, 200) AS first_200
-- FROM public.quick_contents
-- WHERE tab_key = 'insurance_age';
