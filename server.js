// =============================================
// GIRABRASIL — SERVER.JS
// Servidor backend para o Gira-Bot e banco de dados
// =============================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg'); // driver do PostgreSQL

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// =============================================
// CONEXÃO COM O BANCO DE DADOS
// A DATABASE_URL vem automaticamente do Railway
// =============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log('✅ Banco de dados conectado!'))
  .catch(err => console.error('❌ Erro ao conectar no banco:', err));

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

REGRA IMPORTANTE: Se o usuário perguntar sobre algo fora desses temas, responda com gentileza que você é especializado apenas em natureza e meio ambiente brasileiro, e sugira um tema relacionado.

Formato das respostas:
- Respostas em português brasileiro
- Use parágrafos bem estruturados
- Use negrito (**texto**) para destacar nomes de espécies e conceitos importantes
- Seja informativo mas não excessivamente longo
- Sempre que possível, termine com um dado curioso ou convite para explorar mais o tema`;

// =============================================
// FUNÇÃO AUXILIAR — lê o body de uma requisição
// =============================================
function lerBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // =============================================
  // ROTA: POST /api/chat — Gira-Bot (sem alterações)
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

      const payload = JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...mensagens
        ],
        max_tokens: 1024,
        temperature: 0.7,
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
        console.error('Erro Groq:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro de conexão com a IA' }));
      });

      groqReq.write(payload);
      groqReq.end();
    });
    return;
  }

  // =============================================
  // ROTA: POST /api/usuarios — cadastra usuário
  // =============================================
  if (req.method === 'POST' && req.url === '/api/usuarios') {
    try {
      const { nome, email, senha_hash } = await lerBody(req);

      if (!nome || !email || !senha_hash) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'nome, email e senha_hash são obrigatórios' }));
        return;
      }

      const result = await pool.query(
        'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING *',
        [nome, email, senha_hash]
      );

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.rows[0]));
    } catch (err) {
      // erro de email duplicado
      if (err.code === '23505') {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email já cadastrado' }));
      } else {
        console.error('Erro ao cadastrar usuário:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno' }));
      }
    }
    return;
  }

  // =============================================
  // ROTA: GET /api/noticias — lista notícias
  // ROTA: POST /api/noticias — cadastra notícia
  // =============================================
  if (req.url.startsWith('/api/noticias')) {

    // Lista todas ou filtra por região: GET /api/noticias?regiao=norte
    if (req.method === 'GET') {
      try {
        const regiao = new URL(req.url, 'http://localhost').searchParams.get('regiao');

        let result;
        if (regiao) {
          result = await pool.query(
            'SELECT * FROM noticias WHERE regiao = $1 ORDER BY criado_em DESC',
            [regiao]
          );
        } else {
          result = await pool.query('SELECT * FROM noticias ORDER BY criado_em DESC');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.rows));
      } catch (err) {
        console.error('Erro ao buscar notícias:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno' }));
      }
      return;
    }

    // Cadastra nova notícia
    if (req.method === 'POST') {
      try {
        const { titulo, conteudo, regiao } = await lerBody(req);

        if (!titulo || !conteudo || !regiao) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'titulo, conteudo e regiao são obrigatórios' }));
          return;
        }

        const result = await pool.query(
          'INSERT INTO noticias (titulo, conteudo, regiao) VALUES ($1, $2, $3) RETURNING *',
          [titulo, conteudo, regiao]
        );

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.rows[0]));
      } catch (err) {
        console.error('Erro ao cadastrar notícia:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno' }));
      }
      return;
    }
  }

  // =============================================
  // ROTA: GET /api/comentarios?noticia_id=1 — busca comentários
  // ROTA: POST /api/comentarios — cadastra comentário
  // =============================================
  if (req.url.startsWith('/api/comentarios')) {

    // Lista comentários de uma notícia
    if (req.method === 'GET') {
      try {
        const noticia_id = new URL(req.url, 'http://localhost').searchParams.get('noticia_id');

        if (!noticia_id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'noticia_id é obrigatório' }));
          return;
        }

        // busca comentários junto com o nome do usuário
        const result = await pool.query(
          `SELECT c.id, c.conteudo, c.criado_em, u.nome AS autor
           FROM comentarios c
           JOIN usuarios u ON c.usuario_id = u.id
           WHERE c.noticia_id = $1
           ORDER BY c.criado_em ASC`,
          [noticia_id]
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.rows));
      } catch (err) {
        console.error('Erro ao buscar comentários:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno' }));
      }
      return;
    }

    // Cadastra novo comentário
    if (req.method === 'POST') {
      try {
        const { conteudo, usuario_id, noticia_id } = await lerBody(req);

        if (!conteudo || !usuario_id || !noticia_id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'conteudo, usuario_id e noticia_id são obrigatórios' }));
          return;
        }

        const result = await pool.query(
          'INSERT INTO comentarios (conteudo, usuario_id, noticia_id) VALUES ($1, $2, $3) RETURNING *',
          [conteudo, usuario_id, noticia_id]
        );

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.rows[0]));
      } catch (err) {
        console.error('Erro ao cadastrar comentário:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno' }));
      }
      return;
    }
  }

  // =============================================
  // ARQUIVOS ESTÁTICOS (sem alterações)
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
