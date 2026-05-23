/*
  spa-router.js — 단일 페이지 라우터 (2026-05-23 신설, SPA 전환 Phase 1)

  본질: app.html 안에서 hash 자료로 view 전환.
        예: /app.html#field-voice/team → FieldVoiceModule.render('team')

  쓰임 (app.html 하단):
    window.appRouter = new SpaRouter({
      'field-voice/team':   () => FieldVoiceModule.render('team'),
      'field-voice/voice':  () => FieldVoiceModule.render('voice'),
      'field-voice/smart':  () => FieldVoiceModule.render('smart'),
      'field-voice/branch': () => FieldVoiceModule.render('branch'),
    });
    window.appRouter.start('field-voice/team');

  view container 자리:
    <main id="app-view"></main>
*/
class SpaRouter {
  constructor(routes, rootId = 'app-view') {
    this.routes = routes;
    this.root = document.getElementById(rootId);

    window.addEventListener('hashchange', () => this.render());
  }

  start(defaultRoute = 'field-voice/team') {
    if (!location.hash) {
      location.hash = defaultRoute;
      return;
    }
    this.render();
  }

  navigate(route) {
    location.hash = route;
  }

  render() {
    const route = location.hash.replace('#', '') || 'field-voice/team';
    const handler = this.routes[route] || this.routes['field-voice/team'];

    if (!this.root || !handler) return;

    this.root.innerHTML = handler();
    document.dispatchEvent(
      new CustomEvent('route:rendered', { detail: { route } })
    );
  }
}

window.SpaRouter = SpaRouter;
