(() => {
 const nav=document.querySelector('.nav'), menu=document.querySelector('.menu-button');
 const closeMenu=(returnFocus=false)=>{if(!nav.classList.contains('open'))return;nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');if(returnFocus)menu.focus();};
 menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
 nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu(true);});
 document.addEventListener('pointerdown',e=>{if(!nav.contains(e.target)&&!menu.contains(e.target))closeMenu();});
 window.addEventListener('resize',()=>{if(window.innerWidth>990)closeMenu();},{passive:true});
 let prev=window.scrollY;const header=document.querySelector('.site-header');
 window.addEventListener('scroll',()=>{const y=Math.max(0,window.scrollY),d=y-prev;if(document.documentElement.classList.contains('jygen-section-transition')){header.classList.remove('is-hidden');prev=y;return;}if(y<=140||d<-.5)header.classList.remove('is-hidden');else if(y>140&&d>2&&!nav.classList.contains('open'))header.classList.add('is-hidden');prev=y;},{passive:true});
 if('IntersectionObserver' in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const els=document.querySelectorAll('.reveal');document.documentElement.classList.add('motion-ready');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.08,rootMargin:'0px 0px -30px 0px'});els.forEach(el=>observer.observe(el));}
 const aboutArt=document.querySelector('.about-brand-art img');
 if(aboutArt){const failed=()=>aboutArt.parentElement.classList.add('art-failed');aboutArt.addEventListener('error',failed);if(aboutArt.complete&&!aboutArt.naturalWidth)failed();}
})();
