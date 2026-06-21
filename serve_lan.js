/**
 * serve_lan.js — LAN 전용 테스트 서버
 *
 * 운영 : 실기기 SMS 인증 검수 전용. 저장소 커밋 금지.
 * 실행 : run_test_server.bat 또는 아래 모드 직접 실행
 *   set TEST_ANON_KEY=eyJ... && node serve_lan.js
 *
 * 보안 제약:
 *   - TEST_ANON_KEY 환경변수에서만 읽음. 코드에 하드코딩 금지.
 *   - anon key 원문을 콘솔·로그·HTTP 응답 바디에 출력하지 않음.
 *   - 본 파일을 저장소에 커밋할 때 TEST_ANON_KEY 값을 포함하지 마세요.
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = 8000;
const ROOT_DIR = __dirname;

// 환경변수에서만 읽기 (콘솔 미출력)
const ANON_KEY = process.env.TEST_ANON_KEY || '';

if (!ANON_KEY) {
  console.warn('[WARN] TEST_ANON_KEY 환경변수가 설정되지 않았습니다.');
  console.warn('[WARN] 진단 패널의 "anon key 주입" 항목이 ⛔로 표시됩니다.');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js'  : 'application/javascript; charset=utf-8',
  '.css' : 'text/css; charset=utf-8',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.svg' : 'image/svg+xml',
  '.ico' : 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

// HTML 응답에 anon key 주입 스크립트 삽입
function injectAnonKey(html) {
  const injection = '<script>window.__TEST_ANON_KEY__="' + ANON_KEY + '";<' + '/script>';
  // <head> 다음에 삽입
  if (html.includes('<head>')) return html.replace('<head>', '<head>' + injection);
  if (html.includes('<HEAD>')) return html.replace('<HEAD>', '<HEAD>' + injection);
  return injection + html;
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT_DIR, urlPath);

  // 디렉토리 트래버심 방지
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found: ' + urlPath);
      return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    if (ext === '.html' && ANON_KEY) {
      const injected = injectAnonKey(data.toString('utf8'));
      res.writeHead(200, { 'Content-Type': mime });
      res.end(injected, 'utf8');
    } else {
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('[OK] 서버 시작: http://192.168.0.8:' + PORT);
  console.log('[OK] 검수 페이지: http://192.168.0.8:' + PORT + '/test/sms_auth_integration.html');
  console.log('[OK] anon key 주입 상태:', ANON_KEY ? '활성화' : '비활성화 (진단 패널 주의)');
});
