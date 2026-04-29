/* =============================================
   GIRABRASIL — GIRABOT.JS
   Lógica do chat com IA via Anthropic API
   ============================================= */

(function () {

  // =============================================
  // CONFIGURAÇÃO DO BOT
  // =============================================

  const SYSTEM_PROMPT = `Você é o Gira-Bot, a inteligência artificial oficial do site GiraBrasil — um portal de notícias e informações sobre a natureza e as florestas do Brasil.

Sua personalidade:
- Você é apaixonado pela natureza brasileira, curioso e acolhedor
- Usa linguagem acessível mas com embasamento científico
- Ocasionalmente usa emojis relacionados à natureza para tornar a conversa mais viva 🌿
- É positivo sobre soluções de conservação, mas honesto sobre os desafios ambientais

Sua especialidade abrange EXCLUSIVAMENTE:
- Biomas brasileiros: Amazônia, Cerrado, Mata Atlântica, Caatinga, Pantanal, Pampa, Zona Costeira
- Fauna e flora nativa do Brasil (animais, plantas, fungos, etc.)
- Desmatamento, queimadas e degradação ambiental no Brasil
- Mudanças climáticas e seus efeitos no território brasileiro
- Recursos hídricos: rios, aquíferos, rios voadores, chuvas
- Povos indígenas e comunidades tradicionais e sua relação com a floresta
- Políticas ambientais, legislação e órgãos como IBAMA, ICMBio, INPE
- Biodiversidade, espécies ameaçadas e programas de conservação
- Bioeconomia, extrativismo sustentável e ecoturismo no Brasil
- Notícias e temas recentes do meio ambiente brasileiro

REGRA IMPORTANTE: Se o usuário perguntar sobre algo completamente fora desses temas (como política geral, esportes, tecnologia, culinária, etc.), responda com gentileza que você é especializado apenas em natureza e meio ambiente brasileiro, e sugira um tema relacionado ao Brasil que você possa abordar. Exemplo: "Esse tema está um pouco fora da minha floresta! 🌿 Sou especializado em natureza e meio ambiente do Brasil. Posso te falar sobre [sugestão relacionada]?"

Formato das respostas:
- Respostas em português brasileiro
- Para respostas longas, use parágrafos bem estruturados
- Use negrito (**texto**) para destacar nomes de espécies e conceitos importantes
- Seja informativo mas não excessivamente longo — foque no essencial
- Sempre que possível, termine com um dado curioso ou convite para explorar mais o tema`;

  // =============================================
  // ESTADO DO CHAT
  // =============================================

  let mensagens = []; // histórico de mensagens para a API
  let aguardando = false;

  // =============================================
  // ELEMENTOS DO DOM
  // =============================================

  const chatWelcome  = document.getElementById('chat-welcome');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput    = document.getElementById('chat-input');
  const sendBtn      = document.getElementById('chat-send-btn');
  const novaChatBtn  = document.getElementById('btn-nova-conversa');
  const sugestoes    = document.querySelectorAll('.sugestao-btn');

  // =============================================
  // FUNÇÕES AUXILIARES
  // =============================================

  function getHoraAtual() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Converte markdown simples para HTML
  function markdownParaHTML(texto) {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*)/gm, '<h3>$1</h3>')
      .replace(/^## (.*)/gm,  '<h3>$1</h3>')
      .replace(/^\- (.*)/gm,  '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hul])/gm, '')
      .replace(/\n/g, '<br>')
      .replace(/^(.+)$/gm, (match) => {
        if (match.startsWith('<')) return match;
        return match;
      });
  }

  // Renderiza texto com parágrafos
  function renderTexto(texto) {
    const linhas = texto.split('\n\n');
    return linhas.map(bloco => {
      bloco = bloco.trim();
      if (!bloco) return '';

      // Títulos
      if (bloco.startsWith('### ')) return `<h3>${bloco.slice(4)}</h3>`;
      if (bloco.startsWith('## '))  return `<h3>${bloco.slice(3)}</h3>`;

      // Listas
      if (bloco.includes('\n- ') || bloco.startsWith('- ')) {
        const itens = bloco.split('\n').filter(l => l.trim());
        return '<ul>' + itens.map(item => {
          const t = item.startsWith('- ') ? item.slice(2) : item;
          return `<li>${formatInline(t)}</li>`;
        }).join('') + '</ul>';
      }

      return `<p>${formatInline(bloco)}</p>`;
    }).join('');
  }

  function formatInline(texto) {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  // =============================================
  // RENDERIZAÇÃO DE MENSAGENS
  // =============================================

  function esconderBoasVindas() {
    if (chatWelcome && chatWelcome.parentNode) {
      chatWelcome.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      chatWelcome.style.opacity = '0';
      chatWelcome.style.transform = 'scale(0.95)';
      setTimeout(() => chatWelcome.remove(), 300);
    }
  }

  function criarMsgBot(texto, isTyping = false) {
    const msg = document.createElement('div');
    msg.className = 'msg msg-bot' + (isTyping ? ' msg-typing' : '');

    const avatarSVG = `
      <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="22" r="14" fill="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.6)" stroke-width="1.5"/>
        <circle cx="24" cy="20" r="3" fill="rgba(34,197,94,0.8)"/>
        <circle cx="36" cy="20" r="3" fill="rgba(34,197,94,0.8)"/>
        <circle cx="25" cy="19" r="1" fill="#040d07"/>
        <circle cx="37" cy="19" r="1" fill="#040d07"/>
        <path d="M24 26 Q30 31 36 26" stroke="rgba(34,197,94,0.8)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <line x1="30" y1="8" x2="30" y2="3" stroke="rgba(34,197,94,0.6)" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="30" cy="2" r="2" fill="rgba(34,197,94,0.9)"/>
        <path d="M18 36 Q30 28 42 36 Q36 50 30 52 Q24 50 18 36Z" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.4)" stroke-width="1"/>
      </svg>`;

    const conteudo = isTyping
      ? `<div class="typing-dots"><span></span><span></span><span></span></div>`
      : `${renderTexto(texto)}`;

    msg.innerHTML = `
      <div class="msg-avatar msg-avatar-bot">${avatarSVG}</div>
      <div class="msg-content">
        <div class="msg-name">Gira-Bot</div>
        <div class="msg-bubble">${conteudo}</div>
        ${!isTyping ? `<div class="msg-time">${getHoraAtual()}</div>` : ''}
      </div>`;

    return msg;
  }

  function criarMsgUsuario(texto) {
    const msg = document.createElement('div');
    msg.className = 'msg msg-user';
    msg.innerHTML = `
      <div class="msg-avatar msg-avatar-user">EU</div>
      <div class="msg-content">
        <div class="msg-name">Você</div>
        <div class="msg-bubble">${texto.replace(/\n/g, '<br>')}</div>
        <div class="msg-time">${getHoraAtual()}</div>
      </div>`;
    return msg;
  }

  function criarMsgErro() {
    const msg = document.createElement('div');
    msg.className = 'msg msg-bot msg-error';
    msg.innerHTML = `
      <div class="msg-avatar msg-avatar-bot">
        <svg viewBox="0 0 60 60" fill="none" width="22" height="22">
          <circle cx="30" cy="22" r="14" stroke="rgba(252,165,165,0.6)" stroke-width="1.5"/>
          <circle cx="24" cy="20" r="3" fill="rgba(252,165,165,0.8)"/>
          <circle cx="36" cy="20" r="3" fill="rgba(252,165,165,0.8)"/>
          <path d="M24 28 Q30 24 36 28" stroke="rgba(252,165,165,0.8)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
      </div>
      <div class="msg-content">
        <div class="msg-name">Gira-Bot</div>
        <div class="msg-bubble">
          <p>Ops! Tive um problema para me conectar. 🌿 Verifique sua conexão e tente novamente.</p>
        </div>
        <div class="msg-time">${getHoraAtual()}</div>
      </div>`;
    return msg;
  }

  function scrollParaFim() {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
  }

  // =============================================
  // ENVIO DE MENSAGEM
  // =============================================

  async function enviarMensagem(texto) {
    if (!texto.trim() || aguardando) return;

    aguardando = true;
    sendBtn.disabled = true;
    chatInput.disabled = true;

    // Esconde boas-vindas na primeira mensagem
    esconderBoasVindas();

    // Mostra mensagem do usuário
    const msgUser = criarMsgUsuario(texto);
    chatMessages.appendChild(msgUser);
    scrollParaFim();

    // Adiciona ao histórico
    mensagens.push({ role: 'user', content: texto });

    // Indicador de digitação
    const typing = criarMsgBot('', true);
    chatMessages.appendChild(typing);
    scrollParaFim();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: mensagens })
      });

      const data = await response.json();

      // Remove indicador de digitação
      typing.remove();

      if (data.resposta) {
        const resposta = data.resposta;

        // Adiciona resposta ao histórico
        mensagens.push({ role: 'assistant', content: resposta });

        // Mostra resposta
        const msgBot = criarMsgBot(resposta);
        chatMessages.appendChild(msgBot);
        scrollParaFim();

      } else {
        throw new Error('Resposta inválida da API');
      }

    } catch (err) {
      typing.remove();
      console.error('Gira-Bot erro:', err);
      const msgErro = criarMsgErro();
      chatMessages.appendChild(msgErro);
      scrollParaFim();

      // Remove última mensagem do usuário do histórico se deu erro
      mensagens.pop();
    }

    aguardando = false;
    sendBtn.disabled = chatInput.value.trim() === '';
    chatInput.disabled = false;
    chatInput.focus();
  }

  // =============================================
  // EVENTOS
  // =============================================

  // Input do textarea — habilita botão e auto-resize
  chatInput.addEventListener('input', () => {
    sendBtn.disabled = chatInput.value.trim() === '' || aguardando;

    // Auto-resize
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
  });

  // Enter envia (Shift+Enter quebra linha)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        const texto = chatInput.value.trim();
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;
        enviarMensagem(texto);
      }
    }
  });

  // Clique no botão enviar
  sendBtn.addEventListener('click', () => {
    const texto = chatInput.value.trim();
    if (texto) {
      chatInput.value = '';
      chatInput.style.height = 'auto';
      sendBtn.disabled = true;
      enviarMensagem(texto);
    }
  });

  // Botão sugestões
  sugestoes.forEach(btn => {
    btn.addEventListener('click', () => {
      const pergunta = btn.dataset.pergunta;
      if (pergunta && !aguardando) {
        enviarMensagem(pergunta);
      }
    });
  });

  // Botão nova conversa
  novaChatBtn.addEventListener('click', () => {
    mensagens = [];
    chatMessages.innerHTML = '';

    // Recria boas-vindas
    if (!document.getElementById('chat-welcome')) {
      const welcome = document.createElement('div');
      welcome.id = 'chat-welcome';
      welcome.className = 'chat-welcome';
      welcome.innerHTML = `
        <div class="welcome-bot-glow"></div>
        <div class="welcome-avatar">
          <div class="welcome-avatar-ring ring-1"></div>
          <div class="welcome-avatar-ring ring-2"></div>
          <div class="welcome-avatar-core">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="56" height="56">
              <circle cx="40" cy="28" r="18" fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.5)" stroke-width="1.5"/>
              <circle cx="32" cy="25" r="4" fill="rgba(34,197,94,0.9)"/><circle cx="48" cy="25" r="4" fill="rgba(34,197,94,0.9)"/>
              <circle cx="33.5" cy="23.5" r="1.5" fill="#040d07"/><circle cx="49.5" cy="23.5" r="1.5" fill="#040d07"/>
              <path d="M32 33 Q40 39 48 33" stroke="rgba(34,197,94,0.9)" stroke-width="2" stroke-linecap="round" fill="none"/>
              <line x1="40" y1="10" x2="40" y2="4" stroke="rgba(34,197,94,0.7)" stroke-width="2" stroke-linecap="round"/>
              <circle cx="40" cy="3" r="3" fill="rgba(34,197,94,1)"/>
              <path d="M22 46 Q40 36 58 46 Q50 64 40 67 Q30 64 22 46Z" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.35)" stroke-width="1"/>
            </svg>
          </div>
        </div>
        <h2 class="welcome-title">Olá! Eu sou o <em>Gira-Bot</em></h2>
        <p class="welcome-desc">Sua inteligência artificial especializada na natureza e florestas do Brasil. Pergunte sobre biomas, fauna, flora, desmatamento, povos da floresta e muito mais.</p>
        <div class="welcome-chips">
          <span class="welcome-chip">🌿 Amazônia</span>
          <span class="welcome-chip">🐆 Fauna brasileira</span>
          <span class="welcome-chip">💧 Recursos hídricos</span>
          <span class="welcome-chip">🌱 Preservação</span>
          <span class="welcome-chip">🪶 Povos indígenas</span>
          <span class="welcome-chip">🔥 Queimadas</span>
        </div>`;
      chatMessages.parentNode.insertBefore(welcome, chatMessages);
    }

    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    chatInput.focus();
  });

  // Header scroll
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

})();

  // =============================================
  // MENU MOBILE — SIDEBAR DRAWER
  // =============================================
  const sidebar = document.querySelector('.girabot-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btnMenu = document.getElementById('btn-menu-mobile');
  const btnNovaMobile = document.getElementById('btn-nova-conversa-mobile');

  function abrirSidebar() {
    if (sidebar) sidebar.classList.add('sidebar-aberta');
    if (overlay) overlay.classList.add('ativo');
    document.body.style.overflow = 'hidden';
  }

  function fecharSidebar() {
    if (sidebar) sidebar.classList.remove('sidebar-aberta');
    if (overlay) overlay.classList.remove('ativo');
    document.body.style.overflow = '';
  }

  if (btnMenu) btnMenu.addEventListener('click', abrirSidebar);
  if (overlay) overlay.addEventListener('click', fecharSidebar);

  // Nova conversa mobile
  if (btnNovaMobile) {
    btnNovaMobile.addEventListener('click', () => {
      mensagens = [];
      chatMessages.innerHTML = '';
      if (!document.getElementById('chat-welcome')) {
        novaChatBtn.click();
      }
      chatInput.value = '';
      chatInput.style.height = 'auto';
      sendBtn.disabled = true;
      chatInput.focus();
    });
  }

  // Fecha sidebar ao clicar numa sugestão no mobile
  sugestoes.forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 768) fecharSidebar();
    });
  });

