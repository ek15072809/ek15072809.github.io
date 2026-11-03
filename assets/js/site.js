/* Shared behaviour for all pages: footer year, scroll reveal, mobile menu. */
(function () {
  'use strict';

  var ICON_BARS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var ICON_CLOSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var reveals = document.querySelectorAll('.reveal:not(.fade-in)');
  var fadeIns = document.querySelectorAll('.reveal.fade-in');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });
  reveals.forEach(function (el) { io.observe(el); });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveals.forEach(function (el) { el.classList.add('in'); });
    fadeIns.forEach(function (el) { el.classList.add('in'); });
  }

  // .fade-in 要素はスクロール後に初めて表示
  if (fadeIns.length > 0) {
    var scrollStarted = false;
    var ioFade = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && scrollStarted) {
          entry.target.classList.add('in');
          ioFade.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
    fadeIns.forEach(function (el) { ioFade.observe(el); });

    window.addEventListener('scroll', function onFirstScroll() {
      scrollStarted = true;
      // スクロール開始後、すでにビューポート内にある要素も即表示
      fadeIns.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('in');
          ioFade.unobserve(el);
        }
      });
      window.removeEventListener('scroll', onFirstScroll);
    }, { once: true });
  }

  var hbtn = document.getElementById('hamburger-btn');
  var mmenu = document.getElementById('mobile-menu');
  if (hbtn && mmenu) {
    hbtn.addEventListener('click', function () {
      var isOpen = mmenu.classList.toggle('open');
      hbtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      hbtn.innerHTML = isOpen ? ICON_CLOSE : ICON_BARS;
    });
  }
})();
