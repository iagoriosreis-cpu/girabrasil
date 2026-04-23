/* =============================================
   GIRABRASIL — PARTICLES.JS
   Partículas flutuantes de floresta
   ============================================= */

(function () {
  const canvas = document.getElementById('particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrameId;

  // Redimensiona o canvas
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', () => {
    resize();
    initParticles();
  });

  resize();

  // Tipos de partículas temáticas
  const TYPES = ['spore', 'leaf', 'dust', 'firefly'];

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function createParticle() {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    return {
      type,
      x: randomBetween(0, canvas.width),
      y: randomBetween(-20, canvas.height + 20),
      size: type === 'leaf' ? randomBetween(3, 7)
           : type === 'firefly' ? randomBetween(1.5, 3)
           : randomBetween(0.5, 2),
      speedX: randomBetween(-0.4, 0.4),
      speedY: type === 'spore' ? randomBetween(-0.8, -0.2)
            : type === 'dust'  ? randomBetween(-0.3, -0.1)
            : type === 'leaf'  ? randomBetween(0.1, 0.5)
            : randomBetween(-0.2, 0.2),
      opacity: randomBetween(0.05, 0.35),
      opacityTarget: randomBetween(0.05, 0.4),
      opacitySpeed: randomBetween(0.003, 0.01),
      rotation: randomBetween(0, Math.PI * 2),
      rotSpeed: randomBetween(-0.015, 0.015),
      wobble: randomBetween(0, Math.PI * 2),
      wobbleSpeed: randomBetween(0.01, 0.03),
      wobbleAmount: randomBetween(0.2, 0.8),
      // Firefly pulsing
      glowPhase: randomBetween(0, Math.PI * 2),
      glowSpeed: randomBetween(0.02, 0.06),
    };
  }

  function initParticles() {
    const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 18000));
    particles = Array.from({ length: count }, createParticle);
  }

  function drawParticle(p) {
    ctx.save();
    ctx.globalAlpha = p.opacity;

    if (p.type === 'firefly') {
      // Vaga-lume com glow
      const glow = Math.sin(p.glowPhase) * 0.5 + 0.5;
      const r = p.size * (0.8 + glow * 0.6);

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
      grad.addColorStop(0, `rgba(74, 222, 128, ${0.9 * glow})`);
      grad.addColorStop(0.3, `rgba(34, 197, 94, ${0.5 * glow})`);
      grad.addColorStop(1, 'rgba(34, 197, 94, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(200, 255, 220, ${0.9 * glow})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

    } else if (p.type === 'leaf') {
      // Folha giratória
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = `rgba(34, 197, 94, ${p.opacity * 1.5})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (p.type === 'spore') {
      // Esporo circular simples
      ctx.fillStyle = `rgba(74, 222, 128, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Poeira — ponto difuso
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      grad.addColorStop(0, `rgba(200, 230, 208, ${p.opacity})`);
      grad.addColorStop(1, 'rgba(200, 230, 208, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function updateParticle(p) {
    // Movimento com wobble lateral
    p.wobble += p.wobbleSpeed;
    p.x += p.speedX + Math.sin(p.wobble) * p.wobbleAmount;
    p.y += p.speedY;
    p.rotation += p.rotSpeed;

    // Firefly glow
    if (p.type === 'firefly') {
      p.glowPhase += p.glowSpeed;
    }

    // Fade in/out suave
    if (p.opacity < p.opacityTarget) {
      p.opacity = Math.min(p.opacity + p.opacitySpeed, p.opacityTarget);
    } else if (p.opacity > p.opacityTarget) {
      p.opacity = Math.max(p.opacity - p.opacitySpeed, p.opacityTarget);
    } else {
      p.opacityTarget = randomBetween(0.03, 0.4);
    }

    // Reposiciona ao sair da tela
    const margin = 30;
    if (p.y < -margin) p.y = canvas.height + margin;
    if (p.y > canvas.height + margin) p.y = -margin;
    if (p.x < -margin) p.x = canvas.width + margin;
    if (p.x > canvas.width + margin) p.x = -margin;
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      updateParticle(p);
      drawParticle(p);
    });

    animFrameId = requestAnimationFrame(loop);
  }

  initParticles();
  loop();

  // Pausa quando a aba não está visível (economia de CPU)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrameId);
    } else {
      loop();
    }
  });

})();
