// Vincen runtime activity collector.
// Captures what happens on the live site — page loads, SPA route changes, JS
// errors, and FAILED backend requests (non-2xx / network error, with the
// response body) — and beacons them to the Worker so the building agent can see
// what actually broke and fix it next turn. Successful requests are NOT logged
// (keeps volume + cost down; the agent only needs the failures).
//
// Identity (siteId + logUrl) comes from `window.__VINCEN__`, an inline script
// baked into index.html at publish time. With no identity it still beacons
// (siteId:"") — the Worker drops anonymous logs. Everything here is wrapped so a
// collector bug can never break the site.
(function () {
  var V = window.__VINCEN__ || {};
  var LOG_URL = V.logUrl || '/__vincen__/log';
  var SITE_ID = V.siteId || '';
  var SID = (function () {
    try { return (crypto && crypto.randomUUID && crypto.randomUUID()) || (Date.now() + '.' + Math.random()); }
    catch (e) { return Date.now() + '.r'; }
  })();

  var buf = [];
  var MAX = 100;          // ring buffer cap (drop oldest)
  var timer = null;

  function path(u) {
    try { var a = new URL(u, location.href); return a.pathname + a.search; }
    catch (e) { return String(u || '').slice(0, 200); }
  }
  function push(e) {
    e.ts = Date.now();
    buf.push(e);
    if (buf.length > MAX) buf.shift();
    if (!timer) timer = setTimeout(flush, 2000);     // debounce
  }
  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!buf.length) return;
    var batch = { siteId: SITE_ID, sid: SID, v: 1, logs: buf.splice(0, buf.length) };
    try {
      var body = JSON.stringify(batch);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(LOG_URL, new Blob([body], { type: 'text/plain' }));
      } else {
        fetch(LOG_URL, { method: 'POST', body: body, keepalive: true,
          headers: { 'Content-Type': 'text/plain' } }).catch(function () {});
      }
    } catch (e) { /* never throw from the collector */ }
  }

  // Page load
  try {
    addEventListener('load', function () {
      var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
      push({ t: 'pageload', u: path(location.href), load: Math.round(nav.loadEventEnd || 0) });
    });
  } catch (e) {}

  // SPA route changes
  try {
    var _ps = history.pushState;
    history.pushState = function () {
      var r = _ps.apply(this, arguments);
      try { push({ t: 'route', u: path(location.href) }); } catch (e) {}
      return r;
    };
    addEventListener('popstate', function () { push({ t: 'route', u: path(location.href) }); });
  } catch (e) {}

  // JS errors
  addEventListener('error', function (ev) {
    push({ t: 'error', u: path(location.href), msg: String(ev.message || ''),
      src: ev.filename, ln: ev.lineno, col: ev.colno,
      stack: ev.error && String(ev.error.stack || '').slice(0, 1000) });
  });
  addEventListener('unhandledrejection', function (ev) {
    var r = ev.reason;
    push({ t: 'unhandledrejection', u: path(location.href),
      msg: String((r && r.message) || r || ''),
      stack: r && String(r.stack || '').slice(0, 1000) });
  });
  var _ce = console.error;
  console.error = function () {
    try { push({ t: 'consoleerror', u: path(location.href),
      msg: Array.prototype.map.call(arguments, String).join(' ').slice(0, 800) }); } catch (e) {}
    return _ce.apply(console, arguments);
  };

  // fetch — log FAILURES only (non-2xx or network throw), with the response body.
  if (window.fetch) {
    var _f = window.fetch;
    window.fetch = function (input, init) {
      var t0 = Date.now();
      var method = (init && init.method) || (input && input.method) || 'GET';
      var u = (input && input.url) || String(input);
      return _f.apply(this, arguments).then(function (res) {
        if (!res.ok) {
          var ent = { t: 'fetch', u: path(u), m: method, st: res.status, ms: Date.now() - t0, ok: false };
          try { res.clone().text().then(function (b) { ent.body = String(b || '').slice(0, 2000); push(ent); }, function () { push(ent); }); }
          catch (e) { push(ent); }
        }
        return res;
      }, function (err) {
        push({ t: 'fetch', u: path(u), m: method, st: 0, ms: Date.now() - t0, ok: false,
          body: String((err && err.message) || err).slice(0, 300) });
        throw err;
      });
    };
  }

  // XHR — log failures only.
  try {
    var _open = XMLHttpRequest.prototype.open, _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u) { this.__v = { m: m, u: u, t0: Date.now() }; return _open.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () {
      var self = this;
      try {
        self.addEventListener('loadend', function () {
          var v = self.__v || {};
          if (self.status === 0 || self.status >= 400) {
            push({ t: 'xhr', u: path(v.u), m: v.m, st: self.status, ms: Date.now() - (v.t0 || Date.now()),
              ok: false, body: String(self.responseText || '').slice(0, 2000) });
          }
        });
      } catch (e) {}
      return _send.apply(this, arguments);
    };
  } catch (e) {}

  // Flush on hide / unload.
  addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);
})();
