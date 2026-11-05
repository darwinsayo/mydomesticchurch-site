/* Edit these to change what the pages show. */
var SITE = { monthly: "$10", email: "darwin.sayo@gmail.com" };
var m = document.getElementById("price-monthly"); if (m) m.textContent = SITE.monthly;
var href = "mailto:" + SITE.email + "?subject=My%20Domestic%20Church";
["contact-btn","mail","start"].forEach(function(id){var e=document.getElementById(id); if(e) e.href=href;});
Array.prototype.forEach.call(document.querySelectorAll('a[href="/#start"],a[href="#start"]'),function(e){e.href=href;});
Array.prototype.forEach.call(document.querySelectorAll('[data-mail]'),function(e){e.href="mailto:"+SITE.email+"?subject=Help%20with%20My%20Domestic%20Church";});
