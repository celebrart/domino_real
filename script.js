// ---------- Modelo de dados básico ----------

const RANKS = [0, 1, 2, 3, 4, 5, 6]; // Dominó duplo-seis clássico.[web:19]
let deck = [];
let playerHand = [];
let cpuHand = [];
let table = []; // array de peças na ordem jogada
let currentPlayer = "player"; // "player" | "cpu"
let buyingPile = []; // cemitério
let gameOver = false;
let scores = { player: 0, cpu: 0 };
let targetScore = 6;
let difficulty = "normal";
let skin = "classic";

// ---------- Utilidades ----------

function createDeck() {
  const d = [];
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = i; j < RANKS.length; j++) {
      d.push({ a: RANKS[i], b: RANKS[j], id: `${RANKS[i]}-${RANKS[j]}` });
    }
  }
  return d;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isDouble(piece) {
  return piece.a === piece.b;
}

function calcPips(piece) {
  return piece.a + piece.b;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---------- UI helpers ----------

const $ = (sel) => document.querySelector(sel);

function showToast(msg, duration = 2200) {
  const toast = $("#toast");
  toast.textContent = msg;
  toast.classList.add("toast-visible");
  setTimeout(() => {
    toast.classList.remove("toast-visible");
  }, duration);
}

function logHistory(text) {
  const container = $("#historyLog");
  const entry = document.createElement("div");
  entry.className = "history-log-entry";
  entry.textContent = text;
  container.prepend(entry);
}

function setOverlay(visible, title = "", message = "", buttonLabel = "") {
  const overlay = $("#boardOverlay");
  if (!visible) {
    overlay.classList.add("hidden");
    return;
  }
  $("#overlayTitle").textContent = title;
  $("#overlayMessage").textContent = message;
  $("#overlayButton").textContent = buttonLabel || "Ok";
  overlay.classList.remove("hidden");
}

// ---------- Renderização das peças ----------

function pipPattern(value) {
  const pip = () => {
    const div = document.createElement("div");
    div.className = "domino-pip";
    return div;
  };

  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gridTemplateColumns = "repeat(3, 1fr)";
  container.style.gridTemplateRows = "repeat(2, 1fr)";
  container.style.justifyItems = "center";
  container.style.alignItems = "center";
  container.style.width = "80%";
  container.style.height = "80%";

  const add = (idxArr) => {
    idxArr.forEach((idx) => {
      const p = pip();
      p.style.gridColumn = ((idx % 3) || 3);
      p.style.gridRow = Math.floor(idx / 3) + 1;
      container.appendChild(p);
    });
  };

  // índices de 0 a 5 (3x2)
  switch (value) {
    case 0:
      break;
    case 1:
      add([2]);
      break;
    case 2:
      add([0, 5]);
      break;
    case 3:
      add([0, 2, 5]);
      break;
    case 4:
      add([0, 2, 3, 5]);
      break;
    case 5:
      add([0, 2, 2, 3, 5]); // “dois” no meio reforça visualmente a cruz
      break;
    case 6:
      add([0, 1, 2, 3, 4, 5]);
      break;
  }

  return container;
}

function createDominoElement(piece, options = {}) {
  const { hidden = false, clickable = false, onClick, skinOverride } = options;
  const el = document.createElement("div");
  el.className = "domino";
  el.dataset.id = piece.id;

  const finalSkin = skinOverride || skin;
  if (finalSkin === "neon") el.classList.add("skin-neon");
  if (finalSkin === "wood") el.classList.add("skin-wood");

  if (hidden) {
    // verso para CPU
    const back = document.createElement("div");
    back.className = "domino-back";
    el.appendChild(back);
  } else {
    const inner = document.createElement("div");
    inner.className = "domino-inner";

    const halfA = document.createElement("div");
    halfA.className = "domino-half";
    halfA.appendChild(pipPattern(piece.a));

    const divider = document.createElement("div");
    divider.className = "domino-divider";

    const halfB = document.createElement("div");
    halfB.className = "domino-half";
    halfB.appendChild(pipPattern(piece.b));

    inner.appendChild(halfA);
    inner.appendChild(divider);
    inner.appendChild(halfB);
    el.appendChild(inner);
  }

  if (clickable) {
    el.classList.add("domino-clickable");
    el.addEventListener("click", () => {
      if (typeof onClick === "function") onClick(piece);
    });
  }

  return el;
}

function renderHands() {
  const playerHandEl = $("#playerHand");
  const cpuHandEl = $("#cpuHand");
  playerHandEl.innerHTML = "";
  cpuHandEl.innerHTML = "";

  playerHand.forEach((p) => {
    const clickable = !gameOver && currentPlayer === "player";
    const el = createDominoElement(p, {
      hidden: false,
      clickable,
      onClick: (piece) => handlePlayerClick(piece),
    });
    playerHandEl.appendChild(el);
  });

  cpuHand.forEach((p) => {
    const el = createDominoElement(p, { hidden: true });
    cpuHandEl.appendChild(el);
  });
}

function renderTable() {
  const tableLine = $("#tableLine");
  tableLine.innerHTML = "";
  table.forEach((piece) => {
    const el = createDominoElement(piece, { hidden: false });
    el.classList.add("domino-played");
    tableLine.appendChild(el);
  });
}

// ---------- Lógica de regras ----------

function canPlay(piece, left, right) {
  if (table.length === 0) return true;
  return piece.a === left || piece.b === left || piece.a === right || piece.b === right;
}

function getEnds() {
  if (table.length === 0) return { left: null, right: null };
  const left = table[0].a;
  const right = table[table.length - 1].b;
  return { left, right };
}

function placePiece(piece, side) {
  if (table.length === 0) {
    table.push({ a: piece.a, b: piece.b, id: piece.id });
    return;
  }
  const { left, right } = getEnds();
  const newPiece = clone(piece);

  if (side === "left") {
    // encaixar no lado esquerdo
    if (newPiece.b === left) {
      // ok
    } else if (newPiece.a === left) {
      const tmp = newPiece.a;
      newPiece.a = newPiece.b;
      newPiece.b = tmp;
    } else {
      return false;
    }
    table.unshift(newPiece);
  } else {
    // lado direito
    if (newPiece.a === right) {
      // ok
    } else if (newPiece.b === right) {
      const tmp = newPiece.a;
      newPiece.a = newPiece.b;
      newPiece.b = tmp;
    } else {
      return false;
    }
    table.push(newPiece);
  }
  return true;
}

function hasPlayable(hand) {
  if (table.length === 0) return hand.length > 0;
  const { left, right } = getEnds();
  return hand.some((p) => canPlay(p, left, right));
}

function sumHand(hand) {
  return hand.reduce((acc, p) => acc + calcPips(p), 0);
}

// ---------- Fluxo de partida ----------

function startRound() {
  gameOver = false;
  deck = shuffle(createDeck());
  playerHand = [];
  cpuHand = [];
  table = [];

  // distribuir 7 para cada jogador, restante vai para o cemitério.[web:6][web:13]
  for (let i = 0; i < 7; i++) {
    playerHand.push(deck.pop());
    cpuHand.push(deck.pop());
  }
  buyingPile = [...deck];

  // quem tem o 6-6 começa; se ninguém tiver, usa maior dupla.[web:6][web:16]
  const all = [...playerHand, ...cpuHand];
  const doubles = all.filter(isDouble).sort((a, b) => calcPips(b) - calcPips(a));
  let starter = null;
  if (doubles.length) {
    const bestDouble = doubles[0].id;
    const inPlayer = playerHand.find((p) => p.id === bestDouble);
    const inCpu = cpuHand.find((p) => p.id === bestDouble);
    if (inPlayer) starter = "player";
    else if (inCpu) starter = "cpu";
  } else {
    // fallback: maior peça pela soma.[web:16]
    const sorted = all.slice().sort((a, b) => calcPips(b) - calcPips(a));
    const best = sorted[0].id;
    const inPlayer = playerHand.find((p) => p.id === best);
    starter = inPlayer ? "player" : "cpu";
  }

  currentPlayer = starter || "player";
  logHistory(`Nova rodada. Quem começa: ${currentPlayer === "player" ? "Você" : "CPU"}.`);

  renderHands();
  renderTable();
  updateHUD();

  if (currentPlayer === "cpu") {
    cpuTurn();
  } else {
    showToast("Você começa! Jogue uma peça.");
  }
}

function updateHUD() {
  $("#scorePlayer").textContent = scores.player;
  $("#scoreCPU").textContent = scores.cpu;
  $("#playerHint").textContent = currentPlayer === "player" ? "Sua vez" : "Aguardando...";
}

// compra do cemitério

function drawFromPile(hand) {
  if (buyingPile.length === 0) return null;
  const piece = buyingPile.pop();
  hand.push(piece);
  return piece;
}

// ---------- Turno do jogador ----------

function handlePlayerClick(piece) {
  if (gameOver || currentPlayer !== "player") return;

  // se a mesa está vazia, joga direto no centro
  if (table.length === 0) {
    table.push(piece);
    playerHand = playerHand.filter((p) => p.id !== piece.id);
    logHistory(`Você iniciou com ${piece.a}-${piece.b}.`);
    afterMove("player");
    return;
  }

  const { left, right } = getEnds();
  if (!canPlay(piece, left, right)) {
    showToast("Essa peça não encaixa, tente outra.");
    return;
  }

  // escolha automática de lado: tenta bloquear mais
  let side = "right";
  if (piece.a === left || piece.b === left) side = "left";

  placePiece(piece, side);
  playerHand = playerHand.filter((p) => p.id !== piece.id);
  logHistory(`Você jogou ${piece.a}-${piece.b} no lado ${side === "left" ? "esquerdo" : "direito"}.`);

  afterMove("player");
}

// ---------- Turno da CPU (IA simples) ----------

function cpuTurn() {
  if (gameOver) return;
  currentPlayer = "cpu";
  updateHUD();

  setTimeout(() => {
    const move = pickCpuMove();
    if (move) {
      const { piece, side } = move;
      placePiece(piece, side);
      cpuHand = cpuHand.filter((p) => p.id !== piece.id);
      logHistory(`CPU jogou ${piece.a}-${piece.b} no lado ${side === "left" ? "esquerdo" : "direito"}.`);
      afterMove("cpu");
    } else {
      // não tem jogada: tenta comprar
      const drawn = drawFromPile(cpuHand);
      if (drawn) {
        logHistory(`CPU comprou uma peça.`);
        renderHands();
        // tentar novamente
        setTimeout(cpuTurn, 550);
      } else {
        logHistory("CPU passa a vez (sem jogadas e sem peças para comprar).");
        passTurn("cpu");
      }
    }
  }, difficulty === "easy" ? 450 : difficulty === "normal" ? 650 : 900);
}

function pickCpuMove() {
  const hand = cpuHand.slice();
  if (table.length === 0) {
    // joga a maior peça (tende a soltar peso cedo)
    hand.sort((a, b) => calcPips(b) - calcPips(a));
    const piece = hand[0];
    return { piece, side: "right" };
  }

  const { left, right } = getEnds();
  const candidates = hand.filter((p) => canPlay(p, left, right));
  if (!candidates.length) return null;

  // heurísticas por dificuldade
  if (difficulty === "easy") {
    // qualquer compatível, com leve preferência por não duplicar numerais
    const shuffled = shuffle(candidates);
    return {
      piece: shuffled[0],
      side: Math.random() > 0.5 ? "left" : "right",
    };
  }

  if (difficulty === "normal") {
    // tenta bloquear: joga peça que aparece mais vezes na mão, em um lado que aumente chance de trancar.
    const freq = {};
    hand.forEach((p) => {
      freq[p.a] = (freq[p.a] || 0) + 1;
      freq[p.b] = (freq[p.b] || 0) + 1;
    });

    candidates.sort((a, b) => {
      const fa = (freq[a.a] || 0) + (freq[a.b] || 0);
      const fb = (freq[b.a] || 0) + (freq[b.b] || 0);
      // mais frequente primeiro, depois maior soma de pips
      if (fb !== fa) return fb - fa;
      return calcPips(b) - calcPips(a);
    });

    const piece = candidates[0];
    const side =
      piece.a === left || piece.b === left
        ? "left"
        : piece.a === right || piece.b === right
        ? "right"
        : "right";
    return { piece, side };
  }

  // difícil: similar ao normal, mas evita liberar números que a CPU tem pouco
  const freq = {};
  const allSeen = [...cpuHand, ...table];
  allSeen.forEach((p) => {
    freq[p.a] = (freq[p.a] || 0) + 1;
    freq[p.b] = (freq[p.b] || 0) + 1;
  });

  candidates.sort((a, b) => {
    const fa = (freq[a.a] || 0) + (freq[a.b] || 0);
    const fb = (freq[b.a] || 0) + (freq[b.b] || 0);
    // menor frequência primeiro (guarda números “raro”)
    if (fa !== fb) return fa - fb;
    return calcPips(a) - calcPips(b); // solta peças mais “leves”
  });

  const piece = candidates[0];
  const side =
    piece.a === left || piece.b === left
      ? "left"
      : piece.a === right || piece.b === right
      ? "right"
      : "right";
  return { piece, side };
}

// ---------- Pós-jogada, checagem de vitória / tranca ----------

function afterMove(player) {
  renderHands();
  renderTable();
  updateHUD();

  // vitória por esvaziar mão.[web:13]
  const hand = player === "player" ? playerHand : cpuHand;
  if (hand.length === 0) {
    const winner = player;
    endRound(winner, "batida");
    return;
  }

  // verificar tranca: ninguém consegue jogar e não há cemitério
  const noMovesPlayer = !hasPlayable(playerHand);
  const noMovesCPU = !hasPlayable(cpuHand);
  if (noMovesPlayer && noMovesCPU && buyingPile.length === 0) {
    endRound(null, "tranca");
    return;
  }

  // passa a vez
  if (player === "player") {
    currentPlayer = "cpu";
    updateHUD();
    cpuTurn();
  } else {
    currentPlayer = "player";
    updateHUD();
    showToast("Sua vez!");
  }
}

function passTurn(player) {
  if (player === "player") {
    currentPlayer = "cpu";
    updateHUD();
    cpuTurn();
  } else {
    currentPlayer = "player";
    updateHUD();
    showToast("Sua vez!");
  }
}

// ---------- Fim de rodada e pontuação ----------

function endRound(winner, type) {
  gameOver = true;
  let ptsPlayer = 0;
  let ptsCPU = 0;
  let msg = "";

  if (type === "batida") {
    if (winner === "player") {
      ptsPlayer = sumHand(cpuHand);
      scores.player += 1; // 1 ponto por batida simples (configurável).[web:6]
      msg = `Você bateu! Ganhou ${ptsPlayer} pontos em pedras do adversário (placar +1).`;
    } else {
      ptsCPU = sumHand(playerHand);
      scores.cpu += 1;
      msg = `CPU bateu. Ela somou ${ptsCPU} pontos da sua mão (placar +1).`;
    }
  } else if (type === "tranca") {
    const sumPlayer = sumHand(playerHand);
    const sumCPU = sumHand(cpuHand);
    if (sumPlayer < sumCPU) {
      scores.player += 1;
      msg = `Jogo trancado. Você tem menos pontos (${sumPlayer} x ${sumCPU}), então leva +1 no placar.`;
    } else if (sumCPU < sumPlayer) {
      scores.cpu += 1;
      msg = `Jogo trancado. CPU tem menos pontos (${sumCPU} x ${sumPlayer}), então leva +1 no placar.`;
    } else {
      msg = `Jogo trancado com empate de pontos (${sumPlayer}). Ninguém pontua.`;
    }
  }

  logHistory(msg);
  updateHUD();

  let overlayTitle = "";
  let overlayMsg = msg;
  if (scores.player >= targetScore) {
    overlayTitle = "Você ganhou a partida!";
    overlayMsg += " Você alcançou a meta de pontos.";
  } else if (scores.cpu >= targetScore) {
    overlayTitle = "CPU venceu a partida.";
    overlayMsg += " Ela alcançou a meta de pontos.";
  } else {
    overlayTitle = winner === "player" ? "Você venceu a rodada!" : winner === "cpu" ? "CPU venceu a rodada." : "Rodada trancada";
  }

  setOverlay(true, overlayTitle, overlayMsg, "Próxima rodada");
}

// ---------- Configurações, tema e skins ----------

function applySkinButtons() {
  const buttons = document.querySelectorAll("#skinSelector .chip");
  buttons.forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.skin === skin);
  });
  renderHands();
  renderTable();
}

function toggleTheme() {
  document.body.classList.toggle("theme-light");
}

function loadSettings() {
  const stored = localStorage.getItem("dominoX_settings");
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    if (parsed.targetScore) targetScore = parsed.targetScore;
    if (parsed.difficulty) difficulty = parsed.difficulty;
    if (parsed.skin) skin = parsed.skin;
  } catch (e) {}
}

function saveSettings() {
  localStorage.setItem(
    "dominoX_settings",
    JSON.stringify({ targetScore, difficulty, skin })
  );
}

// ---------- Eventos de UI ----------

function initUI() {
  $("#btnNewMatch").addEventListener("click", () => {
    setOverlay(false);
    startRound();
  });

  $("#btnTheme").addEventListener("click", () => {
    toggleTheme();
    saveSettings();
  });

  $("#btnSettings").addEventListener("click", () => {
    $("#settingsModal").classList.remove("hidden");
    $("#inputTargetScore").value = targetScore;
    $("#selectDifficulty").value = difficulty;
  });

  $("#btnCloseSettings").addEventListener("click", () => {
    $("#settingsModal").classList.add("hidden");
  });

  $("#btnSaveSettings").addEventListener("click", () => {
    const v = parseInt($("#inputTargetScore").value, 10);
    if (!isNaN(v) && v >= 1 && v <= 20) {
      targetScore = v;
    }
    difficulty = $("#selectDifficulty").value;
    saveSettings();
    $("#settingsModal").classList.add("hidden");
    showToast("Configurações atualizadas.");
  });

  $("#overlayButton").addEventListener("click", () => {
    if (scores.player >= targetScore || scores.cpu >= targetScore) {
      scores.player = 0;
      scores.cpu = 0;
    }
    setOverlay(false);
    startRound();
  });

  document.querySelectorAll("#skinSelector .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      skin = btn.dataset.skin;
      applySkinButtons();
      saveSettings();
    });
  });
}

// ---------- Inicialização ----------

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  applySkinButtons();
  initUI();
  setOverlay(
    true,
    "DominoX",
    "Dominó com regras brasileiras, IA inteligente e animações suaves. Clique abaixo para começar.",
    "Iniciar partida"
  );
});
