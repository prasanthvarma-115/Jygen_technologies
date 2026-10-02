
(() => {
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.nav');
  const menu = document.querySelector('.menu-button');
  const closeMenu = (returnFocus = false) => {
    if (!nav.classList.contains('open')) return;
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
    
    if (returnFocus) menu.focus();
  };
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    
  });
  nav.addEventListener('click', event => {
    if (!event.target.closest('a')) return;
    closeMenu();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(true); });
  document.addEventListener('pointerdown', event => { if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 990) closeMenu(); }, { passive: true });
  let previousY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = Math.max(0,window.scrollY);
    const delta = y - previousY;
    if (document.documentElement.classList.contains('jygen-section-transition')) {
      header.classList.remove('is-hidden');
      previousY = y;
      return;
    }
    if (y <= 140 || delta < -.5) header.classList.remove('is-hidden');
    else if (y > 140 && delta > 2 && !nav.classList.contains('open')) header.classList.add('is-hidden');
    previousY = y;
  }, { passive: true });

  document.querySelectorAll('#landing .pixel-motion').forEach(motion => {
    const tiles = document.createDocumentFragment();
    for (let row=0; row<5; row++) for (let col=0; col<11; col++) {
      const tile=document.createElement('span');
      tile.style.setProperty('--delay', `${-(row*.49 + col*.25 + ((col*7+row*3)%5)*.11).toFixed(2)}s`);
      tiles.appendChild(tile);
    }
    motion.appendChild(tiles);
  });

  document.querySelectorAll('#approach .step-art, #capabilities .feature-art').forEach(image => {
    const target=image.closest('.step,.feature');
    image.addEventListener('error', () => target.classList.add('art-failed'));
    if (image.complete && !image.naturalWidth) target.classList.add('art-failed');
  });
  const factory=document.querySelector('#about .factory');
  factory.addEventListener('error', () => factory.parentElement.classList.add('art-failed'));
  if (factory.complete && !factory.naturalWidth) factory.parentElement.classList.add('art-failed');

  const questions=[...document.querySelectorAll('#faq .faq-question')];
  questions.forEach(question => question.addEventListener('click', () => {
    const wasOpen=question.getAttribute('aria-expanded') === 'true';
    questions.forEach(button => {
      const panel=document.getElementById(button.getAttribute('aria-controls'));
      button.setAttribute('aria-expanded','false');
      panel.setAttribute('aria-hidden','true');
      panel.classList.remove('is-open');
      panel.inert=true;
    });
    if (!wasOpen) {
      const panel=document.getElementById(question.getAttribute('aria-controls'));
      question.setAttribute('aria-expanded','true');
      panel.setAttribute('aria-hidden','false');
      panel.inert=false;
      panel.classList.add('is-open');
    }
  }));

  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const targets = document.querySelectorAll('#services .visual, #services .service-item, #approach .intro, #approach .step, #about .about-copy, #about .about-art, #capabilities .frameworks, #capabilities .feature, #faq .faq-intro, #faq .faq-item, #contact .statements, #contact .hero h2, #contact .hero-subtitle, #contact .project-cta');
    targets.forEach((element,index) => {
      element.classList.add('reveal-target');
      element.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
    });
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });
    targets.forEach(element => observer.observe(element));
  }
})();
