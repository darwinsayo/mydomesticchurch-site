/* Edit these to change what the pages show. */
var SITE = { monthly: "$10", email: "darwin.sayo@gmail.com" };
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
/* Waitlist form: sends to /api/waitlist and says thank you in place. */
(function(){
  var f = document.getElementById("wl-form"); if (!f) return;
  var msg = document.getElementById("wl-msg"), btn = document.getElementById("wl-send"), opened = Date.now();
  function say(t, bad){ msg.textContent = t; msg.className = "wl-msg" + (bad ? " err" : ""); }
  f.addEventListener("submit", function(e){
    e.preventDefault();
    var d = {}; Array.prototype.forEach.call(f.elements, function(el){ if (el.name) d[el.name] = el.type === "checkbox" ? el.checked : el.value.trim(); });
    if (!d.name || !d.email || !d.kids) { say("Please fill in your name, email and your children's ages.", true); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { say("That email address doesn't look right. Please check it.", true); return; }
    d.ms = Date.now() - opened;
    btn.disabled = true; say("Sending...");
    fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { ok: r.ok, j: j }; }); })
      .then(function(res){
        if (res.ok) { f.reset(); say("Thank you! You're on the list. I'll write to you when there's a place for your family."); btn.disabled = false; return; }
        btn.disabled = false;
        say(res.j.error || ("Sorry, that didn't go through. Please write to " + SITE.email + " instead."), true);
      })
      .catch(function(){ btn.disabled = false; say("Sorry, that didn't go through. Check your connection, or write to " + SITE.email + ".", true); });
  });
})();
