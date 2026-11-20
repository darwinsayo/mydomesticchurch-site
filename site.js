/* Edit these to change what the pages show. */
var SITE = { monthly: "$10", email: "hello@mydomesticchurch.org" };
var m = document.getElementById("price-monthly"); if (m) m.textContent = SITE.monthly;
var href = "mailto:" + SITE.email + "?subject=My%20Domestic%20Church";
["contact-btn","mail"].forEach(function(id){var e=document.getElementById(id); if(e) e.href=href;});
Array.prototype.forEach.call(document.querySelectorAll('[data-mail]'),function(e){e.href="mailto:"+SITE.email+"?subject=Help%20with%20My%20Domestic%20Church";});
/* Header: mark the page you're on, and close the Menu when you tap elsewhere or press Escape. */
(function(){
  var here = location.pathname.replace(/\.html$/,"").replace(/\/$/,"") || "/";
  if (here.indexOf("/blog/") === 0) here = "/blog";
  Array.prototype.forEach.call(document.querySelectorAll(".mnav a:not(.hbtn)"), function(a){
    if (a.getAttribute("href") === here) a.setAttribute("aria-current","page");
  });
  var menu = document.querySelector(".menu");
  if (!menu) return;
  document.addEventListener("click", function(e){ if (menu.open && !menu.contains(e.target)) menu.open = false; });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && menu.open){ menu.open = false; menu.querySelector("summary").focus(); } });
})();
/* Google Analytics events. Only the event name and where it happened; never names, emails or anything typed. */
function track(name, params){ try { if (typeof gtag === "function") gtag("event", name, params || {}); } catch (e) {} }
/* Count taps on any "Start your free 30 days" button, with which button it was. */
document.addEventListener("click", function(e){
  var a = e.target.closest && e.target.closest('a[href$="#waitlist"], a[href$="#quick"]'); if (!a) return;
  var where = a.closest(".menu-panel") ? "menu" : a.closest(".mnav") ? "header" : "page";
  track("waitlist_click", { link_location: where });
});
/* Waitlist forms (the short box under the top of the page, and the full one at the bottom): both send to /api/waitlist and say thank you in place. */
function wireWaitlist(f, msgId, btnId, onDone){
  if (!f) return;
  var msg = document.getElementById(msgId), btn = document.getElementById(btnId), opened = Date.now();
  function say(t, bad){ msg.textContent = t; msg.className = "wl-msg" + (bad ? " err" : ""); }
  f.addEventListener("submit", function(e){
    e.preventDefault();
    var d = {}; Array.prototype.forEach.call(f.elements, function(el){ if (el.name) d[el.name] = el.type === "checkbox" ? el.checked : el.value.trim(); });
    if (!d.name || !d.email) { say("Please fill in your name and email.", true); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { say("That email address doesn't look right. Please check it.", true); return; }
    d.ms = Date.now() - opened;
    btn.disabled = true; say("Sending...");
    fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { ok: r.ok, j: j }; }); })
      .then(function(res){
        if (res.ok) {
          track("sign_up", { method: "tester_waitlist" });
          btn.disabled = false;
          var more = document.getElementById("wl-more");
          if (more && res.j.id) { f.hidden = true; onDone(more); more.hidden = false; more.dataset.id = res.j.id; more.dataset.email = d.email; more.scrollIntoView({ block: "center" }); f.reset(); return; }
          f.reset(); say("Thank you! Watch your email for your setup link."); return;
        }
        btn.disabled = false;
        say(res.j.error || ("Sorry, that didn't go through. Please write to " + SITE.email + " instead."), true);
      })
      .catch(function(){ btn.disabled = false; say("Sorry, that didn't go through. Check your connection, or write to " + SITE.email + ".", true); });
  });
}
wireWaitlist(document.getElementById("wl-form"), "wl-msg", "wl-send", function(){});
/* From the short box, the optional extra questions open right underneath it. */
wireWaitlist(document.getElementById("wl-quick"), "ql-msg", "ql-send", function(more){ document.getElementById("wl-quick").parentNode.appendChild(more); });
/* After sign-up: optional "a few more questions", saved on the same waitlist row. */
(function(){
  var m = document.getElementById("wl-more"); if (!m) return;
  var msg = document.getElementById("wm-msg"), btn = document.getElementById("wm-send");
  function done(t){ m.innerHTML = '<h3 class="wl-thanks">' + t + '</h3><p class="wl-note" style="text-align:center">Watch your email for your setup link.</p>'; }
  document.getElementById("wm-skip").addEventListener("click", function(){ done("Thank you! Watch your email for your setup link."); });
  m.addEventListener("submit", function(e){
    e.preventDefault();
    var a = {}; Array.prototype.forEach.call(m.elements, function(el){ if (el.tagName === "TEXTAREA" && el.value.trim()) a[el.name] = el.value.trim(); });
    if (!Object.keys(a).length) { done("Thank you! Watch your email for your setup link."); return; }
    btn.disabled = true; msg.textContent = "Sending..."; msg.className = "wl-msg";
    fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ more: true, id: m.dataset.id, email: m.dataset.email, answers: a }) })
      .then(function(r){ if (!r.ok) throw 0; done("Thank you, that helps a lot."); })
      .catch(function(){ btn.disabled = false; msg.textContent = "Sorry, that didn't go through. You can skip it and I'll ask by email."; msg.className = "wl-msg err"; });
  });
})();
