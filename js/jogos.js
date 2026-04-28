/* =============================================
   GIRABRASIL — JOGOS.JS
   Menu + 5 jogos da floresta
   ============================================= */
(function () {

  /* ── elementos base ── */
  const overlay    = document.getElementById('game-overlay');
  const menuEl     = document.getElementById('games-menu');
  const panelEl    = document.getElementById('game-panel');
  const canvas     = document.getElementById('game-canvas');
  const ctx        = canvas.getContext('2d');
  const screenEl   = document.getElementById('game-screen');
  const screenTitle= document.getElementById('game-screen-title');
  const screenDesc = document.getElementById('game-screen-desc');
  const startBtn   = document.getElementById('btn-start-game');
  const scoreEl    = document.getElementById('score-val');
  const levelEl    = document.getElementById('level-val');
  const livesEl    = document.getElementById('lives-val');
  const titleEl    = document.getElementById('game-title');
  const tipEl      = document.getElementById('game-tip');
  const hudLevel   = document.getElementById('hud-level-wrap');
  const hudLives   = document.getElementById('hud-lives-wrap');
  const canvasWrap = document.getElementById('game-canvas-wrap');

  const W = 720, H = 380;
  const LIVES_MAP = ['❤️❤️❤️','❤️❤️','❤️','💀'];

  let activeGame = null;
  let raf = null;

  if (!overlay) return;

  /* ════════════════════════════════════
     NAVEGAÇÃO MENU ↔ JOGO
  ════════════════════════════════════ */
  function openOverlay() {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    showMenu();
  }
  function closeOverlay() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    stopCurrentGame();
  }
  function showMenu() {
    menuEl.style.display = '';
    panelEl.style.display = 'none';
    stopCurrentGame();
    /* remove botões extras (espécies) */
    const extra = document.getElementById('especies-opcoes');
    if (extra) extra.remove();
  }
  function showPanel(gameId) {
    menuEl.style.display = 'none';
    panelEl.style.display = '';
    loadGame(gameId);
  }
  function stopCurrentGame() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (activeGame && activeGame.cleanup) activeGame.cleanup();
    activeGame = null;
  }

  document.getElementById('btn-open-games').addEventListener('click', openOverlay);
  document.getElementById('btn-close-games').addEventListener('click', closeOverlay);
  document.getElementById('btn-close-game').addEventListener('click', closeOverlay);
  document.getElementById('btn-back').addEventListener('click', showMenu);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('active')) closeOverlay(); });

  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => showPanel(card.dataset.game));
  });

  /* ════════════════════════════════════
     UTILITÁRIOS CANVAS
  ════════════════════════════════════ */
  function clrCanvas() { ctx.clearRect(0, 0, W, H); }
  function updateHUD(score, level, lives, showLevel=true, showLives=true) {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    livesEl.textContent = LIVES_MAP[Math.max(0, 3 - lives)];
    hudLevel.style.display = showLevel ? '' : 'none';
    hudLives.style.display = showLives ? '' : 'none';
  }
  function showScreen(title, desc, btnTxt='Começar!') {
    screenTitle.textContent = title;
    screenDesc.innerHTML = desc;
    startBtn.textContent = btnTxt;
    screenEl.style.display = 'flex';
  }
  function hideScreen() { screenEl.style.display = 'none'; }
  function popup(x, y, color, text) {
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / W; const sy = rect.height / H;
    const wrapRect = canvasWrap.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'hit-popup';
    el.style.left  = (rect.left - wrapRect.left + x * sx) + 'px';
    el.style.top   = (y * sy - 12) + 'px';
    el.style.color = color;
    el.textContent = text;
    canvasWrap.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
  function shakePanel() {
    panelEl.classList.remove('shake');
    void panelEl.offsetWidth;
    panelEl.classList.add('shake');
    setTimeout(() => panelEl.classList.remove('shake'), 200);
  }

  /* ────────────────────────────────
     DESENHO DE FUNDO: FLORESTA
  ──────────────────────────────── */
  function drawForestBg(treePositions) {
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#04100a'); sky.addColorStop(1,'#081e10');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
    const glow = ctx.createRadialGradient(W/2,0,0,W/2,0,W*0.7);
    glow.addColorStop(0,'rgba(34,197,94,0.06)'); glow.addColorStop(1,'transparent');
    ctx.fillStyle = glow; ctx.fillRect(0,0,W,H);
    (treePositions||[{x:50,h:85,w:34,c:'#0f3d22'},{x:140,h:60,w:26,c:'#1a5c35'},{x:580,h:90,w:36,c:'#0f3d22'},{x:670,h:65,w:28,c:'#145228'}]).forEach(t=>{
      ctx.fillStyle='#2d1810'; ctx.fillRect(t.x-4,H-26,8,26);
      ctx.fillStyle=t.c; ctx.beginPath(); ctx.moveTo(t.x,H-26-t.h);
      ctx.lineTo(t.x-t.w/2,H-26); ctx.lineTo(t.x+t.w/2,H-26); ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(34,197,94,0.06)'; ctx.beginPath(); ctx.moveTo(t.x,H-26-t.h);
      ctx.lineTo(t.x-t.w*0.18,H-26-t.h*0.5); ctx.lineTo(t.x,H-26); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle='#0d2e16'; ctx.fillRect(0,H-12,W,12);
    ctx.fillStyle='rgba(34,197,94,0.07)'; ctx.fillRect(0,H-12,W,3);
  }

  /* ════════════════════════════════════
     DISPATCH DE JOGOS
  ════════════════════════════════════ */
  function loadGame(id) {
    stopCurrentGame();
    const extra = document.getElementById('especies-opcoes');
    if (extra) extra.remove();
    switch(id) {
      case 'guarda':   initGuarda();   break;
      case 'fuga':     initFuga();     break;
      case 'chuva':    initChuva();    break;
      case 'rio':      initRio();      break;
    }
  }

  /* ════════════════════════════════════
     JOGO 1 — GUARDA DA FLORESTA
  ════════════════════════════════════ */
  function initGuarda() {
    titleEl.textContent = '🌿 Guarda da Floresta';
    tipEl.textContent   = 'Clique nas motosserras · Poupe os animais · Cada inimigo destruído = +10 pts';
    updateHUD(0,1,3);
    showScreen('Guarda da Floresta',
      'Clique nas <strong>motosserras 🪚</strong> para destruí-las.<br>Não clique nos <strong>animais aliados</strong> 🦋🦜🐸 — eles precisam de você!');

    const ENEMIES=['🪚','🪚','🪚','⛏️'];
    const ALLIES=['🦋','🦜','🐸','🦎','🐦','🌺'];
    let score=0,lives=3,level=1,entities=[],tick=0,interval=85,running=false;

    function spawn(){
      const isE=Math.random()<0.48;
      entities.push({x:50+Math.random()*(W-100),y:-35,emoji:isE?ENEMIES[~~(Math.random()*ENEMIES.length)]:ALLIES[~~(Math.random()*ALLIES.length)],isEnemy:isE,size:26+Math.random()*10,speed:1+level*0.35+Math.random(),dead:false,flash:0});
    }
    function loop(){
      if(!running)return;
      clrCanvas(); drawForestBg();
      tick++; if(tick>=interval){tick=0;interval=Math.max(28,85-level*7);spawn();if(Math.random()<0.3)spawn();}
      entities.forEach(e=>{
        if(e.dead)return; e.y+=e.speed;
        if(e.y>H+30){e.dead=true;if(e.isEnemy){lives--;updateHUD(score,level,lives);shakePanel();if(lives<=0){end(false);return;}}return;}
        ctx.globalAlpha=0.14; ctx.fillStyle='#000'; ctx.beginPath();
        ctx.ellipse(e.x,e.y+e.size*.42,e.size*.38,e.size*.1,0,0,Math.PI*2); ctx.fill();
        if(e.flash>0){ctx.globalAlpha=0.5+e.flash*.05;e.flash--;}else{ctx.globalAlpha=1;}
        ctx.font=`${e.size}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(e.emoji,e.x,e.y); ctx.globalAlpha=1;
      });
      entities=entities.filter(e=>!e.dead);
      if(score>=level*130){level++;updateHUD(score,level,lives);}
      raf=requestAnimationFrame(loop);
    }
    function end(won){
      running=false; cancelAnimationFrame(raf);
      showScreen(won?'🌳 Floresta Salva!':'🔥 A floresta queimou...',
        `Pontuação: <strong>${score}</strong><br>${won?'Você protegeu a biodiversidade!':'Tente de novo — a floresta precisa de você!'}`,
        'Jogar de novo');
    }
    function start(){score=0;lives=3;level=1;entities=[];tick=0;interval=85;running=true;hideScreen();updateHUD(score,level,lives);loop();}
    canvas.onclick=e=>{
      if(!running)return;
      const r=canvas.getBoundingClientRect(),sx=W/r.width,sy=H/r.height;
      const mx=(e.clientX-r.left)*sx,my=(e.clientY-r.top)*sy;
      entities.forEach(en=>{
        if(en.dead)return;
        if(Math.hypot(mx-en.x,my-en.y)<en.size*.7){
          if(en.isEnemy){en.dead=true;score+=10;updateHUD(score,level,lives);popup(en.x,en.y,'#22c55e','+10');}
          else{lives--;en.flash=8;updateHUD(score,level,lives);popup(en.x,en.y,'#f87171','−vida');shakePanel();if(lives<=0)end(false);}
        }
      });
    };
    startBtn.onclick=start;
    activeGame={cleanup:()=>{running=false;canvas.onclick=null;}};
  }

  /* ════════════════════════════════════
     JOGO 2 — FUGA DO DESMATAMENTO
  ════════════════════════════════════ */
  function initFuga() {
    titleEl.textContent = '🐆 Fuga do Desmatamento';
    tipEl.textContent   = 'Espaço ou clique para pular · Agache com ↓ · Colete folhas para acelerar';
    updateHUD(0,1,3,true,true);
    showScreen('Fuga do Desmatamento',
      'Você é uma <strong>onça-pintada</strong> fugindo do desmatamento!<br>Pule obstáculos com <strong>Espaço/Clique</strong> e agache com <strong>↓</strong>.');

    const GH=H; const GROUND=GH-50;
    let score=0,lives=3,level=1,running=false,dist=0;
    let onca={x:90,y:GROUND,vy:0,onGround:true,ducking:false,w:48,h:32};
    let obstacles=[],powerups=[],bgX=0,speed=3.2,tick=0,obsTick=0,obsInterval=110;
    let groundX = 0; 
    const JUMP_V=-11.5, GRAVITY=0.55;
    let jumpTime = 0;
    let jumpDuration = 30;

    /* ── PIXEL ART SPRITES ── */
    const P = 4; // tamanho de cada "pixel" (escala)

    /* Paleta da onça */
    const Y  = '#f59e0b'; // amarelo-dourado
    const YL = '#fde68a'; // amarelo claro (barriga)
    const BK = '#1c0a00'; // preto/manchas
    const _  = null;      // transparente


//ONÇA CORRENDO
const imgRun1 = new Image();
imgRun1.src = 'assets/onca1.png';

const imgRun2 = new Image();
imgRun2.src = 'assets/onca2.png';

const imgRun3 = new Image();
imgRun3.src = 'assets/onca3.png';

const imgRun4 = new Image();
imgRun4.src = 'assets/onca4.png';

const imgRun5 = new Image();
imgRun5.src = 'assets/onca5.png';

const imgRun6 = new Image();
imgRun6.src = 'assets/onca6.png';

const imgRun7 = new Image();
imgRun7.src = 'assets/onca7.png';

const imgRun8 = new Image();
imgRun8.src = 'assets/onca8.png';

// ONÇA PULANDO
const imgJump1 = new Image();
imgJump1.src = 'assets/onca2.png';

const imgJump2 = new Image();
imgJump2.src = 'assets/onca3.png';

const imgJump3 = new Image();
imgJump3.src = 'assets/onca4.png';

const imgJump4 = new Image();
imgJump4.src = 'assets/onca5.png';

const imgJump5 = new Image();
imgJump5.src = 'assets/onca6.png';

//FOGO
const fireImg1 = new Image();
fireImg1.src = 'assets/1F.png';

const fireImg2 = new Image();
fireImg2.src = 'assets/2F.png';

const fireImg3 = new Image();
fireImg3.src = 'assets/3F.png';

const fireImg4 = new Image();
fireImg4.src = 'assets/4F.png';

const fireImg5 = new Image();
fireImg5.src = 'assets/5F.png';

const fireImg6 = new Image();
fireImg6.src = 'assets/6F.png';


//CHÃO
const groundImg = new Image();
groundImg.src = 'assets/chao.png'; 

    function drawPixelSprite(sprite, px, py, scale) {
      const s = scale || P;
      sprite.forEach((row, ry) => {
        row.forEach((col, rx) => {
          if (!col) return;
          ctx.fillStyle = col;
          ctx.fillRect(px + rx * s, py + ry * s, s, s);
        });
      });
    }
function drawOnca() {
  let img;
  
const distToGround = GROUND - onca.y;

if (!onca.onGround) {

  const t = jumpTime / jumpDuration;

  if (t < 0.2) {
    img = imgJump1; // início (baixo)
  } 
  else if (t < 0.4) {
    img = imgJump2; // subida
  } 
  else if (t < 0.6) {
    img = imgJump3; // topo
  } 
  else if (t < 0.8) {
    img = imgJump4; // descida
  } 
  else {
    img = imgJump5; // aterrissagem
  }

}
   else {
    // 🟢 no chão → animação com 3 frames
    const frame = Math.floor(tick / 2.4) % 8;

    if (frame === 0) img = imgRun1;
    else if (frame === 1) img = imgRun2;
    else if (frame === 2) img = imgRun3;
    else if (frame === 3) img = imgRun4;
    else if (frame === 4) img = imgRun5;
    else if (frame === 5) img = imgRun6;
    else if (frame === 6) img = imgRun7;
    else img = imgRun8;
  }

  const w = 80;
  const h = 50;

  const px = onca.x - w / 2;
  const py = onca.y - h;

  ctx.drawImage(img, px, py, w, h);

  // hitbox
  onca.w = w * 0.7;
  onca.h = h;
}

    /* ── ÁRVORE PIXEL ART (inspirada na referência: copa redonda, tronco largo) ── */
    /* Copa: 14×10, Tronco: 4×5 — escala variável */
    const TREE_CANOPY = [
      [_,_,_,BK,'#1a5c35','#22c55e','#16a34a','#22c55e','#1a5c35',BK,_,_,_,_],
      [_,_,BK,'#22c55e','#4ade80','#86efac','#4ade80','#86efac','#22c55e','#16a34a',BK,_,_,_],
      [_,BK,'#16a34a','#4ade80','#86efac','#bbf7d0','#86efac','#4ade80','#86efac','#22c55e','#16a34a',BK,_,_],
      [BK,'#22c55e','#4ade80','#86efac','#bbf7d0','#86efac','#bbf7d0','#86efac','#4ade80','#22c55e','#4ade80','#16a34a',BK,_],
      [BK,'#16a34a','#86efac','#bbf7d0','#86efac','#4ade80','#86efac','#bbf7d0','#86efac','#4ade80','#22c55e','#16a34a',BK,_],
      [_,BK,'#22c55e','#4ade80','#86efac','#4ade80','#22c55e','#4ade80','#86efac','#22c55e','#16a34a',BK,_,_],
      [_,_,BK,'#16a34a','#22c55e','#4ade80','#22c55e','#4ade80','#22c55e','#16a34a',BK,_,_,_],
      [_,_,_,BK,'#16a34a','#22c55e','#16a34a','#22c55e','#16a34a',BK,_,_,_,_],
      [_,_,_,_,BK,'#166534','#16a34a','#166534',BK,_,_,_,_,_],
      [_,_,_,_,_,BK,BK,BK,_,_,_,_,_,_],
    ];
    const TREE_TRUNK = [
      [_,'#92400e','#a16207','#92400e',_],
      ['#78350f','#b45309','#d97706','#a16207','#78350f'],
      ['#78350f','#a16207','#d97706','#b45309','#78350f'],
      ['#92400e','#b45309','#a16207','#92400e','#78350f'],
      ['#78350f','#92400e','#92400e','#78350f','#78350f'],
    ];

    /* Árvores de fundo (menores, mais escuras) */
    const TREE_CANOPY_BG = [
      [_,_,BK,'#0a3320','#0d4428','#0a3320',BK,_,_],
      [_,BK,'#0d4428','#155e38','#1a7a48','#155e38','#0d4428',BK,_],
      [BK,'#0a3320','#155e38','#1a7a48','#155e38','#1a7a48','#155e38','#0a3320',BK],
      [BK,'#0d4428','#1a7a48','#155e38','#0d4428','#155e38','#1a7a48','#0d4428',BK],
      [_,BK,'#0a3320','#0d4428','#155e38','#0d4428','#0a3320',BK,_],
      [_,_,BK,'#0a3320','#0d4428','#0a3320',BK,_,_],
      [_,_,_,BK,BK,BK,_,_,_],
    ];
    const TRUNK_BG = [
      [_,'#3d1f0d','#3d1f0d',_],
      ['#2d1508','#3d1f0d','#3d1f0d','#2d1508'],
      ['#2d1508','#3d1f0d','#2d1508','#2d1508'],
    ];

    /* Pré-renderiza árvores de fundo em offscreen canvas */
    function makeTreeCanvas(canopy, trunk, ps) {
      const cw = canopy[0].length * ps;
      const ch = (canopy.length + trunk.length) * ps;
      const oc = document.createElement('canvas');
      oc.width = cw; oc.height = ch;
      const octx = oc.getContext('2d');
      canopy.forEach((row, ry) => row.forEach((col, rx) => {
        if (!col) return;
        octx.fillStyle = col;
        octx.fillRect(rx * ps, ry * ps, ps, ps);
      }));
      const trunkOffX = Math.floor((canopy[0].length - trunk[0].length) / 2);
      trunk.forEach((row, ry) => row.forEach((col, rx) => {
        if (!col) return;
        octx.fillStyle = col;
        octx.fillRect((trunkOffX + rx) * ps, (canopy.length + ry) * ps, ps, ps);
      }));
      return oc;
    }

    const treeFgCanvas = makeTreeCanvas(TREE_CANOPY, TREE_TRUNK, P);
    const treeBgCanvas = makeTreeCanvas(TREE_CANOPY_BG, TRUNK_BG, 3);

    /* Posições fixas das árvores de fundo */
    const BG_TREES = [
      {x:55, scale:0.9},{x:185, scale:0.7},{x:330, scale:1.0},
      {x:475, scale:0.75},{x:615, scale:0.85},
    ];

    const OBS_TYPES=[
      {w:treeFgCanvas.width*0.7,h:treeFgCanvas.height*0.7,type:'tree'},
      {w:treeFgCanvas.width*0.85,h:treeFgCanvas.height*0.85,type:'tree'},
      {type:'fire', scale:0.6},
      {w:52,h:28,c:'#607d8b',label:'🚜',type:'machine'},
    ];


    function jump(){
  if(running && onca.onGround){
    onca.vy = JUMP_V;
    onca.onGround = false;
    jumpTime = 0; // 👈 importante
  }
}
    function duck(on){if(running)onca.ducking=on;}

    const keyH=e=>{
      if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();jump();}
      if(e.code==='ArrowDown'){e.preventDefault();duck(true);}
    };
    const keyU=e=>{if(e.code==='ArrowDown')duck(false);};
    document.addEventListener('keydown',keyH);
    document.addEventListener('keyup',keyU);
    canvas.onclick=()=>jump();

  function drawFire(ob) {
  let img;

  const frame = Math.floor(tick / 6) % 6;

  if (frame === 0) img = fireImg1;
  else if (frame === 1) img = fireImg2;
  else if (frame === 2) img = fireImg3;
  else if (frame === 3) img = fireImg4;
  else if (frame === 4) img = fireImg5;
  else img = fireImg6;

  const scale = ob.scale || 1;

  // 🔥 usa proporção real da imagem
  const w = img.width * scale;
  const h = img.height * scale;

  const yOffset = 15;

  const y = ob.oy - h; 

ctx.drawImage(img, ob.x, y, w, h);
}

function drawObstacle(ob) {
  if (ob.type === 'tree') {
    const scale = ob.treeScale || 1;
    const dw = treeFgCanvas.width * scale;
    const dh = treeFgCanvas.height * scale;
    ctx.drawImage(treeFgCanvas, ob.x, GROUND - dh, dw, dh);

  } else if (ob.type === 'fire') {
    drawFire(ob);

  } else {
    ctx.font = `${ob.w}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(ob.label, ob.x + ob.w / 2, ob.oy + ob.h);
  }
}

    function spawnObs(){
      const t = OBS_TYPES[~~(Math.random() * OBS_TYPES.length)];
      if (t.type === 'tree') {
        const sc = 0.7 + Math.random() * 0.5;
        const dw = treeFgCanvas.width * sc;
        const dh = treeFgCanvas.height * sc;
        obstacles.push({x:W+20, oy:GROUND-dh, w:dw*0.55, h:dh*0.8, type:'tree', treeScale:sc});

      }
      else if (t.type === 'fire') {

  const scale = t.scale || 1;

  const baseSize = 60; // 👈 CONTROLE REAL DO TAMANHO

  const w = baseSize * scale;
  const h = baseSize * scale;

obstacles.push({
  x: W + 20,
  oy: GROUND,   // base do chão (referência)
  type: 'fire',
  scale: scale
});

} else {
  const isLow = t.type==='low'||t.type==='machine';
  obstacles.push({
    x:W+20,
    y:isLow?GROUND-t.h/2:GROUND-t.h,
    ...t,
    oy:isLow?GROUND-t.h/2:GROUND-t.h
  });
}



      if(Math.random()<0.25)powerups.push({x:W+60+Math.random()*80,y:GROUND-70,emoji:'🍃',alive:true});
    }

    function loop(){
      if(!running)return;
      tick++;
      dist+=speed; score=~~(dist/6);
      speed=3.2+level*0.4; if(dist>level*1200)level++;
      updateHUD(score,level,lives);
      clrCanvas();
      

      /* céu */
      const sky=ctx.createLinearGradient(0,0,0,GH);
      sky.addColorStop(0,'#04100a'); sky.addColorStop(1,'#0d2e16');
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,GH);

      /* árvores pixel art de fundo (paralaxe) */
      bgX -= speed * 0.3;
      if(bgX < -W) bgX = 0;
      [0, W].forEach(ox => {
        BG_TREES.forEach(t => {
          const tx = t.x + ox + bgX;
          const sc = t.scale;
          const dw = treeBgCanvas.width * sc;
          const dh = treeBgCanvas.height * sc;
          ctx.drawImage(treeBgCanvas, tx - dw/2, GROUND - dh, dw, dh);
        });
      });

/* 🆕 CHÃO COM IMAGEM AJUSTADO */
const groundHeight = 320;

// ajuste fino (esse é o segredo)
const groundOffset = 258;

groundX -= speed;

if (groundX <= -groundImg.width) {
  groundX += groundImg.width;
}

ctx.drawImage(
  groundImg,
  groundX,
  GROUND - groundOffset,
  groundImg.width,
  groundHeight
);

ctx.drawImage(
  groundImg,
  groundX + groundImg.width,
  GROUND - groundOffset,
  groundImg.width,
  groundHeight
);

      /* powerups */
      powerups.forEach(p=>{
        if(!p.alive)return;
        ctx.font='22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(p.emoji,p.x,p.y); p.x-=speed;
        if(Math.abs(p.x-onca.x)<30&&Math.abs(p.y-(GROUND-30))<30){p.alive=false;score+=25;popup(p.x,p.y,'#fbbf24','+25🍃');}
        if(p.x<-20)p.alive=false;
      });

      /* obstacles */
      let hit = false;
      obstacles.forEach(ob=>{
        drawObstacle(ob);
        ob.x -= speed;
        /* colisão */
        const oh = onca.ducking ? 14 : onca.h;
        const ox1 = onca.x - onca.w * 0.3;
        const ox2 = onca.x + onca.w * 0.3;
        const oy2 = onca.y - oh;
        const obRight = ob.x + (ob.w || treeFgCanvas.width * 0.55);
        if(!hit && obRight > ox1 && ob.x < ox2 && ob.oy < oy2+oh && ob.oy+ob.h > oy2){
          ob.x = -200; hit = true;
          lives--; shakePanel(); updateHUD(score,level,lives);
          if(lives<=0){end(false);return;}
        }
      });
      obstacles = obstacles.filter(o=>o.x>-200);
      powerups  = powerups.filter(p=>p.alive&&p.x>-30);

/* onça física */
if(!onca.onGround){
  onca.vy += GRAVITY;
  onca.y += onca.vy;

  jumpTime++;
}

/* colisão com o chão (sempre checa) */
if(onca.y >= GROUND){
  onca.y = GROUND;
  onca.vy = 0;
  onca.onGround = true;
  jumpTime = 0;
}
drawOnca();

      /* spawn obs */
      obsTick++; if(obsTick>=obsInterval){obsTick=0;obsInterval=Math.max(55,110-level*8);spawnObs();}

      /* score display */
      ctx.fillStyle='rgba(34,197,94,0.35)'; ctx.font='bold 12px monospace';
      ctx.textAlign='right'; ctx.fillText(`${~~(dist/6)} m`,W-14,22);

      raf=requestAnimationFrame(loop);
    }

    function end(won){
      running=false;cancelAnimationFrame(raf);
      showScreen(won?'🐆 Onça Salva!':'💀 A onça foi capturada...',
        `Distância percorrida: <strong>${~~(dist/6)} m</strong><br>${won?'A onça escapou para a reserva!':'Tente de novo!'}`,
        'Correr de novo');
    }
    function start(){score=0;lives=3;level=1;dist=0;speed=3.2;tick=0;obsTick=0;obsInterval=110;
      obstacles=[];powerups=[];onca={x:90,y:GROUND,vy:0,onGround:true,ducking:false,w:48,h:32};
      running=true;hideScreen();updateHUD(0,1,3);loop();}
    startBtn.onclick=start;
    activeGame={cleanup:()=>{running=false;document.removeEventListener('keydown',keyH);document.removeEventListener('keyup',keyU);canvas.onclick=null;}};
  }

  /* ════════════════════════════════════
     JOGO 3 — CHUVA ÁCIDA
  ════════════════════════════════════ */
  function initChuva() {
    titleEl.textContent = '🌧️ Chuva Ácida';
    tipEl.textContent   = 'Mova o mouse ou toque para mover o guarda-chuva · Proteja a árvore!';
    updateHUD(0,1,3,true,false);
    showScreen('Chuva Ácida',
      'Mova o <strong>guarda-chuva ☂️</strong> com o mouse para bloquear as gotas ácidas.<br>Gotas <strong style="color:#f87171">vermelhas = ácidas</strong> · Gotas <strong style="color:#60a5fa">azuis = limpas</strong> (curam a árvore).');

    const TREE_X=W/2, UMBRELLA_W=90;
    let score=0,level=1,running=false,tick=0,spawnI=55,uxPos=W/2;
    let treeHealth=100, drops=[], survived=0;

    function spawnDrop(){
      const isAcid=Math.random()<0.55+level*0.03;
      drops.push({x:30+Math.random()*(W-60),y:-14,vy:2.2+level*0.3+Math.random()*1.2,r:7+Math.random()*5,acid:isAcid,dead:false});
    }

    const mmove=e=>{
      const r=canvas.getBoundingClientRect();
      uxPos=(e.clientX-r.left)*(W/r.width);
    };
    const tmove=e=>{
      const r=canvas.getBoundingClientRect();
      uxPos=(e.touches[0].clientX-r.left)*(W/r.width);
      e.preventDefault();
    };
    canvas.addEventListener('mousemove',mmove);
    canvas.addEventListener('touchmove',tmove,{passive:false});

    function drawTree(health){
      const GREEN=`rgba(${~~(34+(1-health/100)*180)},${~~(197-(1-health/100)*150)},${~~(94-(1-health/100)*80)},1)`;
      /* tronco */
      ctx.fillStyle='#3e2008';
      ctx.fillRect(TREE_X-10,H-110,20,80);
      /* copa */
      const layers=3;
      for(let i=0;i<layers;i++){
        ctx.fillStyle=GREEN;
        ctx.globalAlpha=0.7+i*0.1;
        ctx.beginPath();
        const ty=H-100-(layers-i)*38;
        ctx.moveTo(TREE_X,ty);
        ctx.lineTo(TREE_X-(36-i*8),ty+50);
        ctx.lineTo(TREE_X+(36-i*8),ty+50);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha=1;
      /* barra saúde */
      const bw=80,bx=TREE_X-bw/2,by=H-128;
      ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(bx,by,bw,8);
      ctx.fillStyle=health>50?'#22c55e':health>25?'#f59e0b':'#ef4444';
      ctx.fillRect(bx,by,bw*(health/100),8);
    }

    function drawUmbrella(x){
      ctx.font='50px serif'; ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText('☂️',x,H-18);
    }

    function loop(){
      if(!running)return;
      tick++; if(tick>=spawnI){tick=0;spawnI=Math.max(22,55-level*4);spawnDrop();}
      survived++; if(survived>level*420){level++;}
      clrCanvas();
      /* fundo céu tempestuoso */
      const sky=ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,'#080d14'); sky.addColorStop(1,'#0a1a0e');
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
      /* relâmpago ocasional */
      if(Math.random()<0.004){
        ctx.fillStyle='rgba(255,255,200,0.05)'; ctx.fillRect(0,0,W,H);
      }
      ctx.fillStyle='#0d2e16'; ctx.fillRect(0,H-30,W,30);

      drawTree(treeHealth);
      drawUmbrella(uxPos);

      const uy=H-65, ux1=uxPos-UMBRELLA_W/2, ux2=uxPos+UMBRELLA_W/2;

      drops.forEach(d=>{
        if(d.dead)return;
        d.y+=d.vy;
        /* cor */
        ctx.beginPath();
        ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
        ctx.fillStyle=d.acid?'rgba(239,68,68,0.85)':'rgba(96,165,250,0.85)';
        ctx.fill();
        /* brilho */
        ctx.beginPath(); ctx.arc(d.x-d.r*.3,d.y-d.r*.3,d.r*.3,0,Math.PI*2);
        ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fill();

        /* colisão guarda-chuva */
        if(d.y>=uy&&d.y<=uy+20&&d.x>=ux1&&d.x<=ux2){
          d.dead=true;
          if(!d.acid){treeHealth=Math.min(100,treeHealth+5);score+=5;popup(d.x,d.y,'#60a5fa','+5💧');}
          else{score+=10;popup(d.x,d.y,'#22c55e','+10');}
        }
        /* chegou na árvore */
        if(d.y>=H-30&&!d.dead){
          d.dead=true;
          if(d.acid){treeHealth-=8;shakePanel();popup(TREE_X,H-80,'#ef4444','-vida🌲');
            if(treeHealth<=0){treeHealth=0;end(false);return;}}
        }
      });
      drops=drops.filter(d=>!d.dead&&d.y<H+20);
      updateHUD(score,level,3,true,false);
      raf=requestAnimationFrame(loop);
    }

    function end(won){
      running=false;cancelAnimationFrame(raf);
      showScreen(won?'🌳 Árvore Salva!':'🍂 A árvore morreu...',
        `Pontuação: <strong>${score}</strong><br>${won?'A floresta sobreviveu à chuva ácida!':'Tente de novo!'}`,
        'Jogar de novo');
    }
    function start(){score=0;level=1;tick=0;spawnI=55;drops=[];treeHealth=100;survived=0;running=true;hideScreen();loop();}
    startBtn.onclick=start;
    activeGame={cleanup:()=>{running=false;canvas.removeEventListener('mousemove',mmove);canvas.removeEventListener('touchmove',tmove);canvas.onclick=null;}};
  }

  /* ════════════════════════════════════
     JOGO 4 — DEFENDER O RIO
  ════════════════════════════════════ */
  function initRio() {
    titleEl.textContent = '🌊 Defender o Rio';
    tipEl.textContent   = 'Clique para colocar filtros no rio · Bloqueie o lixo antes do mar!';
    updateHUD(0,1,3,true,true);
    showScreen('Defender o Rio',
      'O rio está sendo poluído! <strong>Clique na tela</strong> para colocar filtros e bloquear o lixo.<br>Se chegar ao <strong>oceano</strong>, você perde uma vida.');

    const RIVER_Y1=H*.35, RIVER_Y2=H*.65, RIVER_CX=(RIVER_Y1+RIVER_Y2)/2;
    const OCEAN_X=W-60;
    const LIXO_TYPES=['🏭','⛏️','🗑️','🧪','🚢','☢️'];
    const FILTER_TIME=220;

    let score=0,lives=3,level=1,running=false,tick=0,spawnI=90;
    let particles=[],filters=[],waterQuality=100;

    function spawnLixo(){
      particles.push({x:-20,y:RIVER_Y1+10+Math.random()*(RIVER_Y2-RIVER_Y1-20),emoji:LIXO_TYPES[~~(Math.random()*LIXO_TYPES.length)],speed:1.2+level*0.25+Math.random()*.8,dead:false,size:24+~~(Math.random()*10)});
    }

    const clickH=e=>{
      if(!running)return;
      const r=canvas.getBoundingClientRect();
      const fx=(e.clientX-r.left)*(W/r.width);
      const fy=(e.clientY-r.top)*(H/r.height);
      if(fy<RIVER_Y1-10||fy>RIVER_Y2+10)return;
      filters.push({x:fx,y:RIVER_CX,life:FILTER_TIME,max:FILTER_TIME,r:22});
    };
    canvas.addEventListener('click',clickH);

    function drawRiver(){
      /* fundo */
      const sky=ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,'#041208'); sky.addColorStop(0.6,'#061a0c'); sky.addColorStop(1,'#0a1e0e');
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
      /* margens */
      ctx.fillStyle='#0d2e16'; ctx.fillRect(0,0,W,RIVER_Y1);
      ctx.fillStyle='#0a2810'; ctx.fillRect(0,RIVER_Y2,W,H-RIVER_Y2);
      /* vegetação margem */
      for(let i=0;i<8;i++){
        const gx=i*(W/7)+20;
        ctx.font='20px serif'; ctx.textAlign='center';
        ctx.fillText('🌿',gx,RIVER_Y1-4);
        ctx.fillText('🌿',gx,RIVER_Y2+18);
      }
      /* rio */
      const rg=ctx.createLinearGradient(0,RIVER_Y1,0,RIVER_Y2);
      const quality=waterQuality/100;
      rg.addColorStop(0,`rgba(${~~(8+180*(1-quality))},${~~(120*quality)},${~~(200*quality)},0.9)`);
      rg.addColorStop(1,`rgba(${~~(6+160*(1-quality))},${~~(100*quality)},${~~(180*quality)},0.95)`);
      ctx.fillStyle=rg; ctx.fillRect(0,RIVER_Y1,W,RIVER_Y2-RIVER_Y1);
      /* ondas */
      ctx.strokeStyle=`rgba(255,255,255,${0.04+quality*0.06})`; ctx.lineWidth=1;
      for(let i=0;i<5;i++){
        const wy=RIVER_Y1+10+(i*(RIVER_Y2-RIVER_Y1)/5);
        ctx.beginPath();
        for(let x=0;x<W;x+=4){ctx.lineTo(x,wy+Math.sin((x+tick*2+i*30)*0.04)*3);}
        ctx.stroke();
      }
      /* oceano */
      const og=ctx.createLinearGradient(OCEAN_X,0,W,0);
      og.addColorStop(0,'transparent');
      og.addColorStop(1,`rgba(${~~(10+160*(1-quality))},${~~(80*quality)},${~~(160*quality)},0.7)`);
      ctx.fillStyle=og; ctx.fillRect(OCEAN_X,RIVER_Y1,W-OCEAN_X,RIVER_Y2-RIVER_Y1);
      ctx.fillStyle='rgba(34,197,94,0.5)'; ctx.font='bold 10px monospace';
      ctx.textAlign='center'; ctx.fillText('OCEANO',W-28,RIVER_CX+4);
      /* indicador qualidade */
      const qw=120,qx=14,qy=14;
      ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(qx,qy,qw,8);
      ctx.fillStyle=waterQuality>60?'#22c55e':waterQuality>30?'#f59e0b':'#ef4444';
      ctx.fillRect(qx,qy,qw*(waterQuality/100),8);
      ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='9px monospace';
      ctx.textAlign='left'; ctx.fillText(`Qualidade: ${~~waterQuality}%`,qx,qy-2);
    }

    function loop(){
      if(!running)return;
      tick++; spawnI=Math.max(32,90-level*7);
      if(tick%spawnI===0)spawnLixo();
      if(score>=level*110)level++;
      clrCanvas(); drawRiver();

      /* filtros */
      filters=filters.filter(f=>f.life>0);
      filters.forEach(f=>{
        f.life--;
        const alpha=f.life/f.max;
        ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(34,197,94,${alpha*0.25})`; ctx.fill();
        ctx.strokeStyle=`rgba(34,197,94,${alpha*0.7})`; ctx.lineWidth=2; ctx.stroke();
        ctx.font='16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.globalAlpha=alpha; ctx.fillText('🔵',f.x,f.y); ctx.globalAlpha=1;
      });

      /* lixo */
      particles.forEach(p=>{
        if(p.dead)return; p.x+=p.speed;
        ctx.font=`${p.size}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(p.emoji,p.x,p.y);
        /* colisão filtro */
        filters.forEach(f=>{
          if(!p.dead&&Math.hypot(p.x-f.x,p.y-f.y)<f.r+p.size/2){
            p.dead=true; score+=12; waterQuality=Math.min(100,waterQuality+3);
            updateHUD(score,level,lives); popup(p.x,p.y,'#22c55e','+12');
          }
        });
        /* chegou ao oceano */
        if(p.x>OCEAN_X&&!p.dead){
          p.dead=true; lives--; waterQuality=Math.max(0,waterQuality-12);
          shakePanel(); updateHUD(score,level,lives); popup(OCEAN_X,RIVER_CX,'#ef4444','💀 Poluído!');
          if(lives<=0){end(false);return;}
        }
      });
      particles=particles.filter(p=>!p.dead&&p.x<W+30);
      updateHUD(score,level,lives);
      raf=requestAnimationFrame(loop);
    }

    function end(won){
      running=false;cancelAnimationFrame(raf);
      showScreen(won?'🌊 Rio Limpo!':'☠️ Rio destruído...',
        `Poluentes bloqueados: <strong>${score}</strong><br>Qualidade final da água: <strong>${~~waterQuality}%</strong><br>${won?'O ecossistema aquático foi salvo!':'Tente de novo!'}`,
        'Jogar de novo');
    }
    function start(){score=0;lives=3;level=1;tick=0;waterQuality=100;particles=[];filters=[];running=true;hideScreen();updateHUD(0,1,3);loop();}
    startBtn.onclick=start;
    activeGame={cleanup:()=>{running=false;canvas.removeEventListener('click',clickH);canvas.onclick=null;}};
  }

})();