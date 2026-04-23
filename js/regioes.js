/* =============================================
   GIRABRASIL — REGIOES.JS
   Interatividade do mapa e painel de info
   ============================================= */

(function () {

  let regiaoAtiva = null;

  // Seleciona todos os grupos de região no SVG
  const grupos = document.querySelectorAll('.regiao');
  const infoPanel = document.getElementById('info-panel');
  const infoEmpty = document.getElementById('info-empty');
  const infoContent = document.getElementById('info-content');

  // Inicializa os eventos de cada região
  grupos.forEach(grupo => {
    grupo.addEventListener('click', () => {
      const key = grupo.dataset.regiao;
      selecionarRegiao(key, grupo);
    });

    grupo.addEventListener('mouseenter', () => {
      if (!grupo.classList.contains('active')) {
        grupo.querySelector('.regiao-path').style.cursor = 'pointer';
      }
    });
  });

  function selecionarRegiao(key, grupoEl) {
    const dados = REGIOES_DATA[key];
    if (!dados) return;

    // Remove active de todos
    grupos.forEach(g => g.classList.remove('active'));

    // Ativa o grupo clicado
    grupoEl.classList.add('active');
    regiaoAtiva = key;

    // Preenche o painel
    preencherPainel(dados);
  }

  function preencherPainel(dados) {
    // Esconde estado vazio, mostra conteúdo
    infoEmpty.style.display = 'none';
    infoContent.style.display = 'block';

    // Remove e re-adiciona animação
    infoContent.style.animation = 'none';
    infoContent.offsetHeight; // reflow
    infoContent.style.animation = 'slideInRight 0.45s cubic-bezier(0.4,0,0.2,1) both';

    // Tag
    document.getElementById('info-tag').textContent = dados.nome;

    // Título
    document.getElementById('info-title').innerHTML =
      `<em>${dados.titulo.split(' ')[0]}</em> ${dados.titulo.split(' ').slice(1).join(' ')}`;

    // Descrição
    document.getElementById('info-desc').textContent = dados.descricao;

    // Stats
    const statsEl = document.getElementById('info-stats');
    statsEl.innerHTML = dados.stats.map(s => `
      <div class="stat-box">
        <span class="stat-box-num">${s.val}</span>
        <span class="stat-box-label">${s.label}</span>
      </div>
    `).join('');

    // Biomas
    const biomasEl = document.getElementById('biomas-list');
    biomasEl.innerHTML = dados.biomas.map(b => `
      <span class="bioma-tag">${b}</span>
    `).join('');

    // Fauna
    const faunaEl = document.getElementById('fauna-list');
    faunaEl.innerHTML = dados.fauna.map(f => `
      <div class="fauna-item">
        <span class="fauna-emoji">${f.emoji}</span>
        <span class="fauna-name">${f.nome}</span>
      </div>
    `).join('');

    // Link de notícias
    const btnNoticias = document.getElementById('btn-noticias');
    btnNoticias.href = dados.paginaNoticias;
    btnNoticias.querySelector('span').textContent =
      `Ver notícias da região ${dados.nome}`;

    // Scroll suave ao painel em mobile
    if (window.innerWidth <= 900) {
      infoPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Função global para fechar o painel
  window.fecharInfo = function () {
    infoEmpty.style.display = 'flex';
    infoContent.style.display = 'none';
    grupos.forEach(g => g.classList.remove('active'));
    regiaoAtiva = null;
  };

  // Scroll do header
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Tooltip ao hover no mapa
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: fixed;
    pointer-events: none;
    background: rgba(4,13,7,0.95);
    border: 1px solid rgba(34,197,94,0.4);
    color: #4ade80;
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    padding: 0.4rem 0.9rem;
    border-radius: 20px;
    z-index: 999;
    opacity: 0;
    transition: opacity 0.2s ease;
    backdrop-filter: blur(8px);
    transform: translateY(-4px);
  `;
  document.body.appendChild(tooltip);

  grupos.forEach(grupo => {
    grupo.addEventListener('mouseenter', (e) => {
      tooltip.textContent = grupo.dataset.nome;
      tooltip.style.opacity = '1';
    });

    grupo.addEventListener('mousemove', (e) => {
      tooltip.style.left = (e.clientX + 14) + 'px';
      tooltip.style.top  = (e.clientY - 30) + 'px';
    });

    grupo.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });
  });

})();
