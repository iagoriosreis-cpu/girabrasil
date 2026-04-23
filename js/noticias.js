/* =============================================
   GIRABRASIL — NOTICIAS.JS
   Script compartilhado das páginas de notícias
   ============================================= */

(function () {

  // Header scroll
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 30);
    });
  }

  // Filtros de categoria
  const filtros = document.querySelectorAll('.filtro-btn');
  const cards = document.querySelectorAll('.noticia-12-card');

  filtros.forEach(btn => {
    btn.addEventListener('click', () => {
      filtros.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const categoria = btn.dataset.filtro;

      cards.forEach(card => {
        if (categoria === 'todos' || card.dataset.categoria === categoria) {
          card.style.display = '';
          card.style.animation = 'fadeInUp 0.4s ease both';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Animação de entrada com IntersectionObserver
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    cards.forEach(c => obs.observe(c));
  }

})();
