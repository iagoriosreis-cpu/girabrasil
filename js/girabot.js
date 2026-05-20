/* =============================================
   GIRABRASIL — GIRABOT.JS
   Chat com IA — Streaming (texto aparece em tempo real)
   ============================================= */

(function () {

  const SYSTEM_PROMPT = ''; // prompt fica no server.js

  let mensagens = [];
  let aguardando = false;

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

  function formatInline(texto) {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  function renderTexto(texto) {
    const linhas = texto.split('\n\n');
    return linhas.map(bloco => {
      bloco = bloco.trim();
      if (!bloco) return '';
      if (bloco.startsWith('### ')) return `<h3>${bloco.slice(4)}</h3>`;
      if (bloco.startsWith('## '))  return `<h3>${bloco.slice(3)}</h3>`;
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

  // =============================================
  // RENDERIZAÇÃO
  // =============================================

  function esconderBoasVindas() {
    if (chatWelcome && chatWelcome.parentNode) {
      chatWelcome.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      chatWelcome.style.opacity = '0';
      chatWelcome.style.transform = 'scale(0.95)';
      setTimeout(() => chatWelcome.remove(), 300);
    }
  }

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

  function criarMsgBotVazia() {
    // Cria o balão do bot já sem os pontinhos — vai receber o texto via streaming
    const msg = document.createElement('div');
    msg.className = 'msg msg-bot';
    msg.innerHTML = `
      <div class="msg-avatar msg-avatar-bot">${avatarSVG}</div>
      <div class="msg-content">
        <div class="msg-name">Gira-Bot</div>
        <div class="msg-bubble msg-bubble-stream">
          <span class="cursor-stream">▍</span>
        </div>
      </div>`;
    return msg;
  }

  function criarMsgTyping() {
    const msg = document.createElement('div');
    msg.className = 'msg msg-bot msg-typing';
    msg.innerHTML = `
      <div class="msg-avatar msg-avatar-bot">${avatarSVG}</div>
      <div class="msg-content">
        <div class="msg-name">Gira-Bot</div>
        <div class="msg-bubble">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
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
  // ENVIO COM STREAMING
  // =============================================

  async function enviarMensagem(texto) {
    if (!texto.trim() || aguardando) return;

    aguardando = true;
    sendBtn.disabled = true;
    chatInput.disabled = true;

    esconderBoasVindas();

    // Mensagem do usuário
    chatMessages.appendChild(criarMsgUsuario(texto));
    scrollParaFim();

    mensagens.push({ role: 'user', content: texto });

    // Mostra pontinhos enquanto aguarda o primeiro token
    const typing = criarMsgTyping();
    chatMessages.appendChild(typing);
    scrollParaFim();

    let textoCompleto = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: mensagens })
      });

      if (!response.ok) throw new Error('Erro HTTP ' + response.status);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let msgBot = null;
      let bubble = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const linhas = buffer.split('\n');
        buffer = linhas.pop();

        for (const linha of linhas) {
          const trimmed = linha.trim();
          if (!trimmed) continue;

          if (trimmed === 'data: [DONE]') {
            // Streaming terminou — finaliza a mensagem
            if (bubble) {
              // Remove o cursor piscante e renderiza o markdown completo
              bubble.innerHTML = renderTexto(textoCompleto);

              // Adiciona o horário
              const timeEl = document.createElement('div');
              timeEl.className = 'msg-time';
              timeEl.textContent = getHoraAtual();
              msgBot.querySelector('.msg-content').appendChild(timeEl);
            }
            break;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));

              if (json.error) throw new Error(json.error);

              if (json.token) {
                // Primeiro token — remove os pontinhos e cria o balão de streaming
                if (!msgBot) {
                  typing.remove();
                  msgBot = criarMsgBotVazia();
                  chatMessages.appendChild(msgBot);
                  bubble = msgBot.querySelector('.msg-bubble-stream');
                }

                textoCompleto += json.token;

                // Atualiza o texto bruto com cursor piscante no final
                bubble.textContent = textoCompleto;
                bubble.innerHTML = textoCompleto.replace(/\n/g, '<br>') + '<span class="cursor-stream">▍</span>';
                scrollParaFim();
              }
            } catch (e) {
              // ignora linha malformada
            }
          }
        }
      }

      // Salva a resposta completa no histórico
      if (textoCompleto) {
        mensagens.push({ role: 'assistant', content: textoCompleto });
      } else {
        throw new Error('Resposta vazia');
      }

    } catch (err) {
      typing.remove();
      console.error('Gira-Bot erro:', err);
      chatMessages.appendChild(criarMsgErro());
      scrollParaFim();
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

  chatInput.addEventListener('input', () => {
    sendBtn.disabled = chatInput.value.trim() === '' || aguardando;
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
  });

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

  sendBtn.addEventListener('click', () => {
    const texto = chatInput.value.trim();
    if (texto) {
      chatInput.value = '';
      chatInput.style.height = 'auto';
      sendBtn.disabled = true;
      enviarMensagem(texto);
    }
  });

  sugestoes.forEach(btn => {
    btn.addEventListener('click', () => {
      const pergunta = btn.dataset.pergunta;
      if (pergunta && !aguardando) enviarMensagem(pergunta);
    });
  });

  novaChatBtn.addEventListener('click', () => {
    mensagens = [];
    chatMessages.innerHTML = '';

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
        <p class="welcome-desc">Sua inteligência artificial especializada na natureza e florestas do Brasil.</p>
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

  // Menu mobile sidebar
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

  if (btnNovaMobile) {
    btnNovaMobile.addEventListener('click', () => {
      novaChatBtn.click();
      fecharSidebar();
    });
  }

  sugestoes.forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 768) fecharSidebar();
    });
  });

})();
