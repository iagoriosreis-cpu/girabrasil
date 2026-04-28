/* =============================================
   GIRABRASIL — MAIN.JS
   Scripts da página principal
   ============================================= */

(function () {

  

  // === HEADER SCROLL ===
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 30);
    });
  }

  // === INTERSECTION OBSERVER — Anima elementos ao entrar na viewport ===
  const animEls = document.querySelectorAll('.noticia-card, .stat-item, .banner-content');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animation = 'fadeInUp 0.7s cubic-bezier(0.25,0.46,0.45,0.94) both';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    animEls.forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  // === SMOOTH SCROLL para âncoras internas ===
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // === EFEITO PARALLAX suave no Hero ===
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      if (scrolled < window.innerHeight) {
        heroContent.style.transform = `translateY(${scrolled * 0.18}px)`;
        heroContent.style.opacity = 1 - (scrolled / window.innerHeight) * 1.4;
      }
    }, { passive: true });
  }

  // === EFEITO HOVER nos cards de notícia — ripple ===
  document.querySelectorAll('.noticia-card').forEach(card => {
    card.addEventListener('click', function (e) {
      const link = this.querySelector('.card-link');
      if (link && link.href && link.href !== '#') {
        window.location.href = link.href;
      }
    });
  });

  // === CONTADOR ANIMADO nos stats do hero ===
  function animateCounter(el, target, suffix = '') {
    const start = Date.now();
    const duration = 1800;
    const isFloat = target % 1 !== 0;

    function step() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      el.textContent = (isFloat ? current.toFixed(1) : Math.floor(current)) + suffix;

      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  // Observa as stats para disparar o contador
  const statNums = document.querySelectorAll('.stat-num');
  if ('IntersectionObserver' in window && statNums.length) {
    const statsObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const raw = el.textContent;
          // Extrai número e sufixo do texto ex: "8.5M", "10%"
          const match = raw.match(/^([\d.]+)(.*)$/);
          if (match) {
            animateCounter(el, parseFloat(match[1]), match[2]);
          }
          statsObs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statNums.forEach(el => statsObs.observe(el));
  }

})();
