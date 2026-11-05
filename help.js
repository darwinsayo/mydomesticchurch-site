/* Help page: search, open a question from the address (/help#forgot-password), and mark the topic in view. */
(function () {
  var items = [].slice.call(document.querySelectorAll('.help-body details'));
  var secs = [].slice.call(document.querySelectorAll('.hsec'));
  var links = [].slice.call(document.querySelectorAll('.topics a'));
  var q = document.getElementById('q'), none = document.getElementById('none');

  // Open the question (or topic) named in the address, e.g. a link from the app's Settings.
  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'DETAILS') el.open = true;
    setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30);
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  // Each question gets its own address when opened, so it can be shared.
  items.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open && history.replaceState) history.replaceState(null, '', '#' + d.id);
    });
  });

  // Search: show only the questions whose words match, and open them.
  var norm = function (s) { return s.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' '); };
  items.forEach(function (d) { d._text = norm(d.textContent); });
  if (q) q.addEventListener('input', function () {
    var words = norm(q.value).trim().split(' ').filter(Boolean);
    var shown = 0;
    items.forEach(function (d) {
      var hit = words.every(function (w) { return d._text.indexOf(w) > -1; });
      d.hidden = words.length && !hit;
      if (words.length) d.open = hit && words.join('').length > 2; else d.open = false;
      if (!d.hidden) shown++;
    });
    secs.forEach(function (s) { s.hidden = !s.querySelector('details:not([hidden])'); });
    document.body.classList.toggle('searching', words.length > 0);
    none.hidden = shown > 0;
  });

  // Phone: a small Topics button once you have scrolled past the topic list.
  var tt = document.getElementById('toTopics'), tl = document.getElementById('topics');
  if (tt && tl) window.addEventListener('scroll', function () {
    tt.classList.toggle('show', tl.getBoundingClientRect().bottom < 0 && !document.body.classList.contains('searching'));
  }, { passive: true });

  // Desktop: light up the topic being read.
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }
})();
