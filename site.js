/* Edit these to change what the pages show. */
var SITE = { monthly: "$10", email: "darwin.sayo@gmail.com" };
var m = document.getElementById("price-monthly"); if (m) m.textContent = SITE.monthly;
var href = "mailto:" + SITE.email + "?subject=My%20Domestic%20Church";
["contact-btn","mail","start"].forEach(function(id){var e=document.getElementById(id); if(e) e.href=href;});
Array.prototype.forEach.call(document.querySelectorAll('a[href="/#start"],a[href="#start"]'),function(e){e.href=href;});
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
