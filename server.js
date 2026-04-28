// =============================================
// GIRABRASIL — SERVER.JS
// Servidor backend para o Gira-Bot
// Fica entre o site e a API da Groq
// =============================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Tipos MIME para servir arquivos estáticos
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

// Prompt do sistema do Gira-Bot
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

  // Headers CORS — permite o site chamar o servidor
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // =============================================
  // ROTA DA API DO GIRA-BOT: POST /api/chat
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

      // Monta o payload para a Groq
      const payload = JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...mensagens
        ],
        max_tokens: 1024,
        temperature: 0.7,
      });

      // Chama a API da Groq
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
        let data = '';
        groqRes.on('data', chunk => { data += chunk; });
        groqRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            const resposta = json.choices?.[0]?.message?.content;

            if (resposta) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ resposta }));
            } else {
              throw new Error('Sem resposta');
            }
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Erro ao processar resposta' }));
          }
        });
      });

      groqReq.on('error', (e) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro de conexão com a IA' }));
      });

      groqReq.write(payload);
      groqReq.end();
    });

    return;
  }

  // =============================================
  // ARQUIVOS ESTÁTICOS (site)
  // =============================================
  let urlPath = req.url.split('?')[0]; // remove query string
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(__dirname, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Tenta servir index.html para rotas não encontradas
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
