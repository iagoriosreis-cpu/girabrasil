// =============================================
// GIRABRASIL — SERVER.JS
// Servidor backend com streaming para o Gira-Bot
// =============================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

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

REGRA IMPORTANTE: Se o usuário perguntar sobre algo completamente fora desses temas, responda com gentileza que você é especializado apenas em natureza e meio ambiente brasileiro, e sugira um tema relacionado. Exemplo: "Esse tema está um pouco fora da minha floresta! 🌿 Sou especializado em natureza e meio ambiente do Brasil. Posso te falar sobre [sugestão relacionada]?"

Formato das respostas:
- Respostas em português brasileiro
- Use parágrafos bem estruturados
- Use negrito (**texto**) para destacar nomes de espécies e conceitos importantes
- Seja informativo mas não excessivamente longo
- Sempre que possível, termine com um dado curioso ou convite para explorar mais o tema`;

// =============================================
// SERVIDOR HTTP
// =============================================

const server = http.createServer((req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // =============================================
  // ROTA DE STREAMING: POST /api/chat
  // =============================================
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });

    req.on('end', () => {
      let mensagens;
      try {
        const parsed = JSON.parse(body);
        mensagens = parsed.messages;
        if (!mensagens || !Array.isArray(mensagens)) throw new Error('Inválido');
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Requisição inválida' }));
        return;
      }

      // Payload com stream: true
      const payload = JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...mensagens
        ],
        max_tokens: 1024,
        temperature: 0.7,
        stream: true  // ← habilita o streaming
      });

      // Headers SSE — mantém a conexão aberta e envia dados em tempo real
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const groqReq = https.request(options, (groqRes) => {
        let buffer = '';

        groqRes.on('data', chunk => {
          buffer += chunk.toString();

          // Processa linha por linha (formato SSE da Groq)
          const linhas = buffer.split('\n');
          buffer = linhas.pop(); // guarda linha incompleta para próxima iteração

          for (const linha of linhas) {
            const trimmed = linha.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;

            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const token = json.choices?.[0]?.delta?.content;

                if (token) {
                  // Envia cada pedaço de texto para o frontend
                  res.write(`data: ${JSON.stringify({ token })}\n\n`);
                }
              } catch (e) {
                // ignora linhas malformadas
              }
            }
          }
        });

        groqRes.on('end', () => {
          // Sinaliza que terminou
          res.write('data: [DONE]\n\n');
          res.end();
        });
      });

      groqReq.on('error', (e) => {
        console.error('Erro Groq:', e.message);
        res.write(`data: ${JSON.stringify({ error: 'Erro de conexão' })}\n\n`);
        res.end();
      });

      groqReq.write(payload);
      groqReq.end();
    });

    return;
  }

  // =============================================
  // ARQUIVOS ESTÁTICOS
  // =============================================
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(__dirname, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (err2, data2) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 - Página não encontrada');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🌿 GiraBrasil server rodando na porta ${PORT}`);
});
