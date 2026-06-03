const spaces = [
  { x: 13, y: 32, type: "start", name: "START" },
  { x: 28.6, y: 23.4, type: "pr", name: "PR案件" },
  { x: 38.4, y: 23.4, type: "pr", name: "PR案件" },
  { x: 48.0, y: 23.4, type: "pr", name: "PR案件" },
  { x: 58.0, y: 23.4, type: "pr", name: "PR案件" },
  { x: 67.8, y: 23.4, type: "pr", name: "PR案件" },
  { x: 78.0, y: 23.4, type: "pr", name: "PR案件" },
  { x: 88.8, y: 32.0, type: "event", name: "イベント" },
  { x: 74.2, y: 76.6, type: "draft", name: "ドラフト" },
  { x: 64.0, y: 64.0, type: "training", name: "選手育成" },
  { x: 54.5, y: 64.0, type: "sponsor", name: "スポンサー営業" },
  { x: 45.4, y: 64.0, type: "training", name: "選手育成" },
  { x: 36.7, y: 76.8, type: "event", name: "イベント" },
  { x: 45.4, y: 90.0, type: "pr", name: "PR案件" },
  { x: 54.5, y: 90.0, type: "pr", name: "PR案件" },
  { x: 64.0, y: 90.0, type: "pr", name: "PR案件" },
  { x: 36.7, y: 76.8, type: "event", name: "イベント" },
  { x: 21.8, y: 65.5, type: "finish", name: "FINISH" },
];

const cardDeck = [
  { key: "T", img: "assets/card-t.png", name: "テクニカル", tech: 4, hype: 1, physical: 1 },
  { key: "F", img: "assets/card-f.png", name: "フィジカル", tech: 1, hype: 1, physical: 4 },
  { key: "H", img: "assets/card-h.png", name: "ハイド", tech: 1, hype: 4, physical: 1 },
  { key: "H/F", img: "assets/card-hf.png", name: "ハイド & フィジカル", tech: 1, hype: 3, physical: 3 },
  { key: "T/H", img: "assets/card-th.png", name: "テクニカル & ハイド", tech: 3, hype: 3, physical: 1 },
  { key: "F/T", img: "assets/card-ft.png", name: "フィジカル & テクニカル", tech: 3, hype: 1, physical: 3 },
];

const events = [
  ["大型大会で注目", (p) => (p.fans += 80)],
  ["スポンサー商談成功", (p) => (p.sponsor += 2)],
  ["練習配信が話題", (p) => (p.fans += 50)],
  ["機材トラブル", (p) => (p.fans = Math.max(0, p.fans - 30))],
  ["育成合宿", (p) => (p.training += 2)],
  ["炎上対応", (p) => (p.sponsor = Math.max(0, p.sponsor - 1))],
];

const colors = ["#ff4545", "#ffe057", "#31d9e6", "#b8ff59", "#bf5ddd", "#ff8a1f"];
let players = [];
let turn = 0;
let lastCard = cardDeck[0];

const el = {
  tokens: document.querySelector("#tokens"),
  players: document.querySelector("#players"),
  turnName: document.querySelector("#turnName"),
  dice: document.querySelector("#diceValue"),
  cardImage: document.querySelector("#cardImage"),
  cardText: document.querySelector("#cardText"),
  log: document.querySelector("#log"),
  playerCount: document.querySelector("#playerCount"),
};

function newPlayer(index) {
  return {
    name: `プレイヤー${index + 1}`,
    pos: 0,
    fans: 0,
    sponsor: 0,
    training: 0,
    team: [],
    finished: false,
  };
}

function score(p) {
  const cardPower = p.team.reduce((sum, c) => sum + c.tech + c.hype + c.physical, 0);
  return p.fans + p.sponsor * 40 + p.training * 25 + cardPower * 15;
}

function save() {
  localStorage.setItem("esports-sim", JSON.stringify({ players, turn, lastCard }));
}

function load() {
  const raw = localStorage.getItem("esports-sim");
  if (!raw) {
    players = Array.from({ length: 4 }, (_, i) => newPlayer(i));
    return;
  }
  try {
    const data = JSON.parse(raw);
    players = data.players;
    turn = data.turn || 0;
    lastCard = data.lastCard || cardDeck[0];
  } catch {
    players = Array.from({ length: 4 }, (_, i) => newPlayer(i));
  }
}

function render() {
  const active = players[turn % players.length];
  el.turnName.textContent = active?.finished ? "ゲーム終了" : active.name;
  el.playerCount.textContent = players.length;
  el.tokens.innerHTML = "";
  players.forEach((p, index) => {
    const s = spaces[Math.min(p.pos, spaces.length - 1)];
    const token = document.createElement("div");
    token.className = "token";
    token.style.left = `${s.x + (index - 1.5) * 0.9}%`;
    token.style.top = `${s.y + (index % 2 ? 1.1 : -1.1)}%`;
    token.style.background = colors[index];
    token.textContent = index + 1;
    el.tokens.appendChild(token);
  });

  el.players.innerHTML = "";
  players
    .map((p, index) => ({ p, index }))
    .sort((a, b) => score(b.p) - score(a.p))
    .forEach(({ p, index }) => {
      const row = document.createElement("div");
      row.className = `player ${index === turn ? "active" : ""}`;
      row.innerHTML = `
        <span class="dot" style="background:${colors[index]}"></span>
        <span>
          <strong>${p.name}${p.finished ? " / FINISH" : ""}</strong>
          <span class="stats">ファン${p.fans} / SP${p.sponsor} / 育成${p.training} / 選手${p.team.length}</span>
        </span>
        <span class="score">${score(p)}</span>
      `;
      el.players.appendChild(row);
    });

  el.cardImage.src = lastCard.img;
  el.cardText.textContent = `${lastCard.name}  技術${lastCard.tech}・ハイド${lastCard.hype}・フィジカル${lastCard.physical}`;
  save();
}

function log(text) {
  const item = document.createElement("li");
  item.textContent = text;
  el.log.prepend(item);
  while (el.log.children.length > 40) el.log.lastElementChild.remove();
}

function nextTurn() {
  if (players.every((p) => p.finished)) return;
  do {
    turn = (turn + 1) % players.length;
  } while (players[turn].finished);
}

function drawCard(player = players[turn]) {
  const card = cardDeck[Math.floor(Math.random() * cardDeck.length)];
  lastCard = card;
  player.team.push(card);
  player.training += Math.max(card.tech, card.hype, card.physical);
  log(`${player.name} が ${card.name} の選手を獲得`);
  render();
}

function applySpace(player, dice) {
  const space = spaces[player.pos];
  if (space.type === "pr") {
    const gain = 30 + dice * 10 + player.team.length * 8;
    player.fans += gain;
    log(`${player.name}: PR案件でファン +${gain}`);
  } else if (space.type === "sponsor") {
    const gain = 1 + Math.floor(player.fans / 160);
    player.sponsor += gain;
    log(`${player.name}: スポンサー +${gain}`);
  } else if (space.type === "training") {
    player.training += dice;
    log(`${player.name}: 選手育成 +${dice}`);
  } else if (space.type === "draft") {
    drawCard(player);
  } else if (space.type === "event") {
    const [name, effect] = events[Math.floor(Math.random() * events.length)];
    effect(player);
    log(`${player.name}: ${name}`);
  } else if (space.type === "finish") {
    player.finished = true;
    log(`${player.name} がFINISH。最終スコア ${score(player)}`);
  }
}

document.querySelector("#rollBtn").addEventListener("click", () => {
  const player = players[turn];
  if (!player || player.finished) return;
  const dice = Math.floor(Math.random() * 6) + 1;
  el.dice.textContent = dice;
  player.pos = Math.min(player.pos + dice, spaces.length - 1);
  log(`${player.name} が ${dice} マス進む: ${spaces[player.pos].name}`);
  applySpace(player, dice);
  nextTurn();
  render();
});

document.querySelector("#drawBtn").addEventListener("click", () => drawCard());
document.querySelector("#shuffleBtn").addEventListener("click", () => {
  lastCard = cardDeck[Math.floor(Math.random() * cardDeck.length)];
  log("山札を混ぜた");
  render();
});
document.querySelector("#clearLog").addEventListener("click", () => {
  el.log.innerHTML = "";
});
document.querySelector("#resetBtn").addEventListener("click", () => {
  localStorage.removeItem("esports-sim");
  players = Array.from({ length: 4 }, (_, i) => newPlayer(i));
  turn = 0;
  lastCard = cardDeck[0];
  el.log.innerHTML = "";
  render();
});
document.querySelector("#addPlayer").addEventListener("click", () => {
  if (players.length >= 6) return;
  players.push(newPlayer(players.length));
  render();
});
document.querySelector("#removePlayer").addEventListener("click", () => {
  if (players.length <= 1) return;
  players.pop();
  turn %= players.length;
  render();
});

load();
render();
