/* util-format.js — 순수 포맷터·이스케이프 헬퍼 (DB/인증/DOM 상태 무관, 부작용 0)
   app.html 인라인 <script>에서 분리(파일 분리 Phase 2, 2026-07-08). 함수 본문 무변경.
   인라인 <script>(line 3613~)보다 먼저 로드 → 인라인의 bare 호출(_escHtml·fmtYMD 등)이 전역으로 해소.
   전역 등록: window._escHtml / fmtYMD / fmtFileSize / fmtHomeDate / escHomeHtml / fmtMysDate
   revert: 각 함수를 app.html 원위치(포인터 주석 자리)로 복원 + <script src="/js/util-format.js"> 제거. */

/* Gemini 카드 결과(window._genCard) 또는 데모(cards[cur]) 렌더용 동적 데이터 escape. */
function _escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
window._escHtml=_escHtml;

function fmtYMD(d){
  if(!d) return '';
  var y = d.getFullYear();
  var m = String(d.getMonth()+1).padStart(2,'0');
  var dd = String(d.getDate()).padStart(2,'0');
  return y + '-' + m + '-' + dd;
}
window.fmtYMD=fmtYMD;

function fmtFileSize(bytes){
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}
window.fmtFileSize=fmtFileSize;

function fmtHomeDate(iso){
  if(!iso)return '';
  var d=new Date(iso);if(isNaN(d.getTime()))return '';
  return (d.getMonth()+1)+'월 '+d.getDate()+'일';
}
window.fmtHomeDate=fmtHomeDate;

function escHomeHtml(s){return String(s||'').replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
window.escHomeHtml=escHomeHtml;

function fmtMysDate(iso){
  if(!iso)return '';
  var d=new Date(iso);if(isNaN(d.getTime()))return '';
  return (d.getMonth()+1)+'월 '+d.getDate()+'일 저장';
}
window.fmtMysDate=fmtMysDate;
