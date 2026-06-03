const teamColors = ["#ff4545", "#ffe057", "#31d9e6", "#b8ff59", "#bf62dc", "#ff8a1a"];

const playersMarket = [
  { id: "t", name: "選手T", role: "テクニカル", attrs: ["T"], cost: 15, img: "assets/card-t.png" },
  { id: "f", name: "選手F", role: "フィジカル", attrs: ["F"], cost: 15, img: "assets/card-f.png" },
  { id: "h", name: "選手H", role: "ハイド", attrs: ["H"], cost: 15, img: "assets/card-h.png" },
  { id: "hf", name: "選手H&F", role: "ハイド & フィジカル", attrs: ["H", "F"], cost: 25, img: "assets/card-hf.png" },
  { id: "th", name: "選手T&H", role: "テクニカル & ハイド", attrs: ["T", "H"], cost: 25, img: "assets/card-th.png" },
  { id: "ft", name: "選手F&T", role: "フィジカル & テクニカル", attrs: ["F", "T"], cost: 25, img: "assets/card-ft.png" },
];

const lanes = {
  start: { x: 13, y: 32 },
  streamer: [
    { x: 28.6, y: 23.4 },
    { x: 38.4, y: 23.4 },
    { x: 48, y: 23.4 },
    { x: 58, y: 23.4 },
    { x: 67.8, y: 23.4 },
    { x: 78, y: 23.4 },
  ],
  sponsor: [
    { x: 28.6, y: 32.5 },
    { x: 38.4, y: 32.5 },
    { x: 48, y: 32.5 },
    { x: 58, y: 32.5 },
    { x: 67.8, y: 32.5 },
    { x: 78, y: 32.5 },
  ],
  training: [
    { x: 28.6, y: 42.2 },
    { x: 38.4, y: 42.2 },
    { x: 48, y: 42.2 },
    { x: 58, y: 42.2 },
    { x: 67.8, y: 42.2 },
    { x: 78, y: 42.2 },
  ],
  finish: { x: 12, y: 65 },
};

let state = {
  phase: "order",
  week: 1,
  turnIndex: 0,
  draftIndex: 0,
  selectedSponsorTeam: 0,
  selectedTeamDetail: 0,
  sponsorRules: [],
  teams: [],
  log: [],
  currentMatch: null,
};

const $ = (id) => document.getElementById(id);

function blankTeam(index) {
  return {
    id: crypto.randomUUID(),
    name: `チーム${index + 1}`,
    color: teamColors[index],
    orderRoll: null,
    money: 100,
    fans: 0,
    wins: 0,
    losses: 0,
    roster: [],
    sponsorIds: [],
    movedThisWeek: false,
    lane: "start",
    progress: 0,
    moneyHistory: [100],
    opponents: {},
  };
}

function initTeams(count = 4) {
  state.teams = Array.from({ length: count }, (_, i) => blankTeam(i));
}

function save() {
  localStorage.setItem("esports-manager-v2", JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem("esports-manager-v2");
  if (!raw) {
    initTeams(4);
    return;
  }
  try {
    state = JSON.parse(raw);
    state.sponsorRules ||= [];
    state.selectedTeamDetail ||= 0;
    if (!state.teams?.length) initTeams(4);
  } catch {
    initTeams(4);
  }
}

function money(n) {
  return `${Math.round(n)}万ST`;
}

function addLog(text) {
  state.log.unshift(`W${state.week}: ${text}`);
  state.log = state.log.slice(0, 80);
}

function activeTeam() {
  return state.teams[state.turnIndex % state.teams.length];
}

function sponsorIncome(team) {
  return team.sponsorIds.reduce((sum, id) => {
    const sponsor = state.sponsorRules.find((s) => s.id === id);
    return sum + (sponsor ? sponsor.fee : 0);
  }, 0);
}

function switchView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === view));
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  render();
}

function render() {
  $("phaseLabel").textContent = phaseName();
  $("turnLabel").textContent = turnName();
  renderSetup();
  renderBoard();
  renderSponsors();
  renderBattle();
  renderFinance();
  save();
}

function phaseName() {
  return {
    order: "準備",
    draft: "選手スカウト",
    play: `第${state.week}週`,
    battle: `第${state.week}週 試合`,
    finance: "決算",
  }[state.phase] || "進行中";
}

function turnName() {
  if (state.phase === "draft") return `${state.teams[state.draftIndex]?.name || ""} が選手獲得`;
  if (state.phase === "play") return `${activeTeam()?.name || ""} のターン`;
  if (state.phase === "battle") return "BO3対戦";
  return "順番決め";
}

function renderSetup() {
  $("teamCount").textContent = state.teams.length;
  $("orderList").innerHTML = state.teams
    .map(
      (t, i) => `
      <article class="team-card ${i === state.turnIndex ? "active" : ""}">
        <div class="team-main">
          <span class="dot" style="background:${t.color}"></span>
          <input class="team-name-input" data-team-name="${i}" value="${escapeHtml(t.name)}" aria-label="チーム名">
          <span class="score">${t.orderRoll || "-"}</span>
        </div>
        <div class="stats">資金 ${money(t.money)} / 選手 ${t.roster.length}/3 / スポンサー ${t.sponsorIds.length}</div>
      </article>`
    )
    .join("");

  const draftTeam = state.teams[state.draftIndex] || state.teams[0];
  $("draftHero").innerHTML =
    state.phase === "draft"
      ? `<span>現在スカウト中</span><strong>${draftTeam.name}</strong><em>残り資金 ${money(draftTeam.money)} / 選手 ${draftTeam.roster.length}/3</em>`
      : `<span>現在スカウト中</span><strong>順番決定待ち</strong><em>サイコロで順番を決めてください</em>`;
  $("scoutStatus").textContent =
    state.phase === "draft" ? `${draftTeam.name}: 残り資金 ${money(draftTeam.money)} / 選手 ${draftTeam.roster.length}/3` : "順番決定後にスカウトできます";
  $("market").innerHTML = playersMarket
    .map((p) => {
      const disabled = state.phase !== "draft" || draftTeam.roster.length >= 3 || draftTeam.money < p.cost;
      return `
      <article class="player-card">
        <img src="${p.img}" alt="${p.name}">
        <strong>${p.role}</strong>
        <span class="stats">費用 ${money(p.cost)} / 属性 ${p.attrs.join("/")}</span>
        <button data-buy="${p.id}" ${disabled ? "disabled" : ""}>獲得</button>
      </article>`;
    })
    .join("");
}

function renderBoard() {
  const current = activeTeam();
  $("currentTeamCard").innerHTML = current
    ? `<strong>${current.name}</strong><div class="stats">資金 ${money(current.money)} / ファン ${current.fans} / スポンサー収入 ${money(sponsorIncome(current))}/ターン / 選手 ${current.roster.length}</div>`
    : "";

  $("teamsPanel").innerHTML = state.teams.map(teamCard).join("");
  renderTeamDetail();
  $("tokens").innerHTML = state.teams
    .map((t, i) => {
      const pos = tokenPos(t);
      return `<div class="token" style="left:${pos.x + (i - 1.5) * 0.9}%;top:${pos.y + (i % 2 ? 1 : -1)}%;background:${t.color}">${i + 1}</div>`;
    })
    .join("");
}

function tokenPos(team) {
  if (team.lane === "start") return lanes.start;
  if (team.progress >= lanes[team.lane].length) return lanes.finish;
  return lanes[team.lane][team.progress];
}

function teamCard(t) {
  const index = state.teams.indexOf(t);
  const rate = t.wins + t.losses ? Math.round((t.wins / (t.wins + t.losses)) * 100) : 0;
  return `
    <article class="team-card ${index === state.selectedTeamDetail ? "active" : ""}">
      <div class="team-main">
        <span class="dot" style="background:${t.color}"></span>
        <strong>${t.name}</strong>
        <button data-team-detail="${index}">確認</button>
      </div>
      <div class="stats">資金 ${money(t.money)} / ファン ${t.fans} / 勝率 ${rate}% / スポンサー ${t.sponsorIds.length} / 選手 ${t.roster.map((r) => r.role).join("・") || "未獲得"}</div>
    </article>`;
}

function renderTeamDetail() {
  const team = state.teams[state.selectedTeamDetail] || state.teams[0];
  if (!team) {
    $("teamDetail").innerHTML = "";
    return;
  }
  $("teamDetail").innerHTML = `
    <h2>${team.name} の選手</h2>
    <div class="owned-roster">
      ${
        team.roster.length
          ? team.roster
              .map(
                (p) => `
                <article>
                  <img src="${p.img}" alt="${p.role}">
                  <strong>${p.role}</strong>
                  <span>${p.attrs.join("/")}</span>
                </article>`
              )
              .join("")
          : `<p class="note">まだ選手を獲得していません。</p>`
      }
    </div>`;
}

function renderSponsors() {
  $("sponsorTeamSelect").innerHTML = state.teams
    .map((t, i) => `<button data-sponsor-team="${i}" class="${i === state.selectedSponsorTeam ? "primary" : ""}">${t.name}</button>`)
    .join("");
  const team = state.teams[state.selectedSponsorTeam] || state.teams[0];
  $("sponsorList").innerHTML = state.sponsorRules.length
    ? state.sponsorRules
    .map((s) => {
      const ok = canContract(team, s);
      const signed = team.sponsorIds.includes(s.id);
      return `
      <article class="sponsor-card">
        <strong>${s.name}</strong>
        <span class="stats">条件: ファン${s.fans}以上 / 勝利${s.wins}以上 / 選手${s.players}人以上</span>
        <span class="stats">スポンサー料金: ${money(s.fee)} / 自分のターンごと</span>
        <button data-contract="${s.id}" ${ok && !signed ? "" : "disabled"}>${signed ? "契約中" : ok ? "契約する" : "条件未達"}</button>
      </article>`;
    })
    .join("")
    : `<article class="sponsor-card"><strong>スポンサー条件未登録</strong><span class="stats">資料の条件を登録すると、条件判定と契約ボタンが使えます。</span></article>`;
  $("contractList").innerHTML = state.teams
    .map((t) => `<article class="team-card"><strong>${t.name}</strong><div class="stats">${t.sponsorIds.map((id) => state.sponsorRules.find((s) => s.id === id)?.name).filter(Boolean).join(" / ") || "契約なし"}</div></article>`)
    .join("");
}

function canContract(team, sponsor) {
  return team.fans >= sponsor.fans && team.wins >= sponsor.wins && team.roster.length >= sponsor.players;
}

function renderBattle() {
  if (!state.currentMatch) createMatch(false);
  const match = state.currentMatch;
  match.pickStep ||= "a";
  const a = state.teams[match.a];
  const b = state.teams[match.b];
  $("matchInfo").innerHTML = `${a.name} vs ${b.name}<br>BO3: ${match.scoreA}-${match.scoreB} / ラウンド${match.round}`;
  const side = match.pickStep === "b" ? "b" : "a";
  const team = side === "a" ? a : b;
  const used = side === "a" ? match.usedA : match.usedB;
  const available = team.roster.filter((_, idx) => match.round === 3 || !used.includes(idx));
  $("battlePick").innerHTML =
    match.pickStep === "ready"
      ? `<div class="secret-ready"><strong>両チーム選択完了</strong><span>3,2,1 の後に同時公開します</span></div>`
      : `<div class="pick-column secret-pick">
          <strong>${team.name} が選択中</strong>
          <span class="stats">相手に見えないように、選んだら「次へ」を押してください。</span>
          <select id="secretPick">
            ${available.map((p) => `<option value="${team.roster.indexOf(p)}">${p.role}</option>`).join("")}
          </select>
        </div>`;
}

function renderFinance() {
  const ranked = [...state.teams].sort((a, b) => victoryScore(b) - victoryScore(a));
  $("ranking").innerHTML = ranked
    .map((t, i) => {
      const detail = victoryBreakdown(t);
      return `
      <article class="rank-card">
        <strong>${i + 1}位 ${t.name}: ${detail.total}点</strong>
        <span class="stats">勝率 ${detail.winRatePoint} / スポンサー ${detail.sponsorPoint} / ファン ${detail.fanPoint} / 資金 ${detail.moneyPoint}</span>
      </article>`;
    })
    .join("");
  const maxMoney = Math.max(100, ...state.teams.map((t) => Math.max(...t.moneyHistory)));
  $("moneyChart").innerHTML = state.teams
    .map((t) => {
      const width = Math.max(4, (t.money / maxMoney) * 100);
      return `<div class="bar-row"><strong>${t.name}</strong><div class="bar"><span style="width:${width}%"></span></div><span>${money(t.money)}</span></div>`;
    })
    .join("");
  $("log").innerHTML = state.log.map((l) => `<li>${l}</li>`).join("");
}

function victoryScore(team) {
  return victoryBreakdown(team).total;
}

function victoryBreakdown(team) {
  const games = team.wins + team.losses;
  const rate = games ? (team.wins / games) * 100 : 0;
  const winRatePoint = games < 5 ? 0 : tier(rate, [80, 60, 40, 20, 0], [20, 10, 8, 6, 4], 80, 5);
  const sponsorPoint = tier(team.sponsorIds.length, [4, 3, 2, 1, 0], [20, 10, 8, 6, 4]);
  const fanPoint = tier(team.fans, [20000, 15000, 12000, 10000, 8000, 6000], [20, 10, 8, 6, 4, 2], 20000, 2000);
  const moneyPoint = tier(team.money, [500, 400, 300, 200, 100], [10, 8, 6, 4, 2], 500, 100);
  return { winRatePoint, sponsorPoint, fanPoint, moneyPoint, total: winRatePoint + sponsorPoint + fanPoint + moneyPoint };
}

function tier(value, thresholds, points, bonusStart, bonusStep) {
  if (bonusStart !== undefined && value > bonusStart) return points[0] + Math.floor((value - bonusStart) / bonusStep);
  for (let i = 0; i < thresholds.length; i++) if (value >= thresholds[i]) return points[i];
  return 0;
}

function buyPlayer(id) {
  const team = state.teams[state.draftIndex];
  const player = playersMarket.find((p) => p.id === id);
  if (!team || !player || team.roster.length >= 3 || team.money < player.cost) return;
  team.money -= player.cost;
  team.roster.push(player);
  addLog(`${team.name} が ${player.role} を ${money(player.cost)}で獲得`);
  state.draftIndex = (state.draftIndex + 1) % state.teams.length;
  render();
}

function passDraft() {
  if (state.phase !== "draft") return;
  addLog(`${state.teams[state.draftIndex].name} がスカウトをパス`);
  state.draftIndex = (state.draftIndex + 1) % state.teams.length;
}

function startTurnIncome() {
  const team = activeTeam();
  const income = sponsorIncome(team);
  if (income) {
    team.money += income;
    team.moneyHistory.push(team.money);
    addLog(`${team.name} がスポンサー料金 ${money(income)} を獲得`);
  }
}

function moveTeam(type) {
  if (state.phase !== "play") return;
  const team = activeTeam();
  if (team.movedThisWeek) return;
  team.lane = type;
  team.progress += 1;
  team.movedThisWeek = true;
  if (type === "streamer") {
    const gain = 900 + team.roster.length * 300;
    team.fans += gain;
    addLog(`${team.name} がストリーマーマスでファン +${gain}`);
  }
  if (type === "sponsor") {
    addLog(`${team.name} がスポンサー交渉へ`);
    switchView("sponsor");
  }
  if (type === "training") {
    team.roster.forEach((p) => (p.trained = (p.trained || 0) + 1));
    addLog(`${team.name} が選手育成を実施`);
  }
  nextTurn();
  render();
}

function nextTurn() {
  if (state.teams.every((t) => t.movedThisWeek)) {
    endWeek();
    return;
  }
  do {
    state.turnIndex = (state.turnIndex + 1) % state.teams.length;
  } while (state.teams[state.turnIndex].movedThisWeek);
  startTurnIncome();
}

function endWeek() {
  state.teams.forEach((t) => {
    t.movedThisWeek = false;
    t.moneyHistory.push(t.money);
  });
  if (state.week % 2 === 1) {
    state.phase = "battle";
    createMatch(true);
    addLog(`第${state.week}週終了。奇数週の試合を開始`);
    switchView("battle");
  } else {
    state.week += 1;
    state.turnIndex = 0;
    state.phase = "play";
    startTurnIncome();
    addLog(`第${state.week}週開始`);
  }
}

function createMatch(force) {
  if (state.currentMatch && !force) return;
  const [a, b] = chooseOpponents();
  state.currentMatch = { a, b, round: 1, scoreA: 0, scoreB: 0, usedA: [], usedB: [], locked: false, pickA: null, pickB: null, pickStep: "a" };
}

function chooseOpponents() {
  const indices = state.teams.map((_, i) => i);
  for (let tries = 0; tries < 80; tries++) {
    const a = indices[Math.floor(Math.random() * indices.length)];
    const b = indices.filter((i) => i !== a)[Math.floor(Math.random() * (indices.length - 1))];
    const key = state.teams[b].id;
    if ((state.teams[a].opponents[key] || 0) < 2) return [a, b];
  }
  return [0, 1];
}

async function battleNext() {
  const match = state.currentMatch;
  if (!match) return;
  if (match.pickStep === "a") {
    match.pickA = Number($("secretPick").value);
    match.pickStep = "b";
    $("reveal").innerHTML = "";
    $("countdown").textContent = "NEXT";
    render();
    return;
  }
  if (match.pickStep === "b") {
    match.pickB = Number($("secretPick").value);
    match.pickStep = "ready";
    $("reveal").innerHTML = "";
    $("countdown").textContent = "READY";
    render();
    return;
  }
  await revealRound();
}

async function revealRound() {
  const match = state.currentMatch;
  const a = state.teams[match.a];
  const b = state.teams[match.b];
  for (const text of ["3", "2", "1"]) {
    $("countdown").textContent = text;
    await new Promise((resolve) => setTimeout(resolve, 650));
  }
  $("countdown").textContent = "SHOW";
  $("reveal").innerHTML = [a.roster[match.pickA], b.roster[match.pickB]]
    .map((p, i) => `<div class="reveal-card"><img src="${p.img}" alt="${p.role}"><strong>${i === 0 ? a.name : b.name}: ${p.role}</strong></div>`)
    .join("");
  $("countdown").textContent = "勝敗登録";
  match.locked = true;
  save();
}

function registerRound(winnerSide) {
  const match = state.currentMatch;
  if (!match.locked) return;
  const a = state.teams[match.a];
  const b = state.teams[match.b];
  match.usedA.push(match.pickA);
  match.usedB.push(match.pickB);
  if (winnerSide === "a") match.scoreA += 1;
  if (winnerSide === "b") match.scoreB += 1;
  if (match.scoreA === 2 || match.scoreB === 2 || match.round === 3) {
    const winner = match.scoreA >= match.scoreB ? a : b;
    const loser = winner === a ? b : a;
    winner.wins += 1;
    loser.losses += 1;
    winner.fans += 1800;
    loser.fans += 600;
    a.opponents[b.id] = (a.opponents[b.id] || 0) + 1;
    b.opponents[a.id] = (b.opponents[a.id] || 0) + 1;
    addLog(`${a.name} vs ${b.name} は ${winner.name} の勝利`);
    state.week += 1;
    state.phase = "play";
    state.turnIndex = 0;
    state.currentMatch = null;
    startTurnIncome();
    switchView("board");
    return;
  }
  match.round += 1;
  match.locked = false;
  match.pickA = null;
  match.pickB = null;
  match.pickStep = "a";
  $("reveal").innerHTML = "";
  $("countdown").textContent = "READY";
  render();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.view) switchView(target.dataset.view);
  if (target.id === "addTeam" && state.teams.length < 6) state.teams.push(blankTeam(state.teams.length));
  if (target.id === "removeTeam" && state.teams.length > 2) state.teams.pop();
  if (target.id === "rollOrder") {
    state.teams.forEach((t) => (t.orderRoll = Math.floor(Math.random() * 6) + 1));
    state.teams.sort((a, b) => b.orderRoll - a.orderRoll);
    addLog("サイコロで順番を決定");
  }
  if (target.id === "startDraft") state.phase = "draft";
  if (target.dataset.buy) buyPlayer(target.dataset.buy);
  if (target.id === "passDraft") passDraft();
  if (target.id === "finishDraft") {
    state.phase = "play";
    state.turnIndex = 0;
    startTurnIncome();
    switchView("board");
  }
  if (target.dataset.move) moveTeam(target.dataset.move);
  if (target.dataset.teamDetail) {
    state.selectedTeamDetail = Number(target.dataset.teamDetail);
    switchView("board");
  }
  if (target.id === "endWeekBtn") endWeek();
  if (target.dataset.sponsorTeam) state.selectedSponsorTeam = Number(target.dataset.sponsorTeam);
  if (target.dataset.contract) {
    const team = state.teams[state.selectedSponsorTeam];
    const s = state.sponsorRules.find((item) => item.id === target.dataset.contract);
    if (canContract(team, s) && !team.sponsorIds.includes(s.id)) {
      team.sponsorIds.push(s.id);
      addLog(`${team.name} が ${s.name} と契約`);
    }
  }
  if (target.id === "addSponsorRule") {
    const name = $("sponsorName").value.trim();
    const fee = Number($("sponsorFee").value || 0);
    const fans = Number($("sponsorFans").value || 0);
    const wins = Number($("sponsorWins").value || 0);
    const players = Number($("sponsorPlayers").value || 0);
    if (name && fee > 0) {
      state.sponsorRules.push({ id: crypto.randomUUID(), name, fee, fans, wins, players });
      addLog(`スポンサー条件「${name}」を登録`);
      ["sponsorName", "sponsorFee", "sponsorFans", "sponsorWins", "sponsorPlayers"].forEach((id) => ($(id).value = ""));
    }
  }
  if (target.id === "makeMatch") createMatch(true);
  if (target.id === "battleNext") battleNext();
  if (target.id === "teamAWins") registerRound("a");
  if (target.id === "teamBWins") registerRound("b");
  if (target.id === "resetBtn") {
    localStorage.removeItem("esports-manager-v2");
    state = { phase: "order", week: 1, turnIndex: 0, draftIndex: 0, selectedSponsorTeam: 0, selectedTeamDetail: 0, sponsorRules: [], teams: [], log: [], currentMatch: null };
    initTeams(4);
  }
  render();
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.dataset?.teamName) {
    const team = state.teams[Number(target.dataset.teamName)];
    if (team) {
      team.name = target.value || `チーム${Number(target.dataset.teamName) + 1}`;
      save();
    }
  }
});

load();
render();
