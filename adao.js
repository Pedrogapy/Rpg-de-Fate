// adao.js
// Página do Adão — cartas + sequência (até 3) + ações.
// Tema reusa simulador.css. Texto estilo D&D. Não fala de Volumen/lobos/fluxo.

function $(id){ return document.getElementById(id); }

// ============================
// Cartas
// ============================

const CARDS = [
  { key:"quick",  label:"Quick",  css:"quick",  icon:"assets/card_quick.svg",  desc:"Vários alvos (área). Se a técnica termina em Quick: 1d6 por alvo." },
  { key:"arts",   label:"Arts",   css:"arts",   icon:"assets/card_arts.svg",   desc:"Efeito (controle, bênção, dissipação). Normalmente sem dano direto." },
  { key:"buster", label:"Buster", css:"buster", icon:"assets/card_buster.svg", desc:"1 alvo (foco). Se a técnica termina em Buster: até 1d10 de dano." },
];

function cardByKey(k){ return CARDS.find(c=>c.key===k); }

// ============================
// Ações (nomeadas)
// req = sequência exata (ordem importa), 1 a 3 cartas.
// damageMode: "buster" (1d10), "quick" (1d6 por alvo), "none"
// ============================

const ACTIONS = [
  {
    id:"corte_penitencia",
    name:"Corte de Penitência",
    kind:"Ataque",
    req:["buster"],
    tags:"Alvo único • impacto direto",
    damageMode:"buster",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: à vista",
      "Alvos: 1 criatura",
      "",
      "Efeito:",
      "Você estala a corrente e lança a lâmina em linha curta, como um golpe que “puxa” a própria punição até o alvo.",
      "O impacto é seco e concentrado, feito para atravessar guarda e encerrar uma troca rápida.",
      "",
      "Dano:",
      "1d10 (corte/impacto).",
    ].join("\n")
  },
  {
    id:"varredura_rosario",
    name:"Varredura do Rosário",
    kind:"Ataque",
    req:["quick"],
    tags:"Vários alvos • varredura",
    damageMode:"quick",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: zona escolhida à vista",
      "Alvos: múltiplas criaturas na área",
      "",
      "Efeito:",
      "A corrente gira em arco amplo, varrendo o espaço como um círculo de aço e fé. Quem estiver na zona precisa se proteger ou recuar.",
      "",
      "Dano:",
      "1d6 em cada alvo atingido.",
    ].join("\n")
  },
  {
    id:"selo_abjuracao",
    name:"Selo de Abjuração",
    kind:"Efeito",
    req:["arts"],
    tags:"Efeito • dissipação/negação",
    damageMode:"none",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: à vista",
      "Alvos: 1 criatura, objeto ou efeito ativo",
      "",
      "Efeito:",
      "Você traça um gesto curto e impõe uma regra simples: aquilo que está sustentado por energia instável perde firmeza.",
      "Isso pode enfraquecer uma conjuração, desmontar uma preparação ou quebrar um truque persistente, se for coerente com a cena.",
      "",
      "Observação:",
      "Não é dano. É intervenção e controle.",
    ].join("\n")
  },

  // 2 cartas
  {
    id:"rosario_giratorio",
    name:"Rosário Giratório",
    kind:"Ataque",
    req:["quick","quick"],
    tags:"Vários alvos • pressão constante",
    damageMode:"quick",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: zona escolhida à vista",
      "Alvos: múltiplas criaturas na área",
      "",
      "Efeito:",
      "A corrente entra em rotação contínua, mantendo a área “ocupada”. O alvo não encontra janela fácil para avançar sem pagar o preço.",
      "O efeito é mais sobre manter distância e ritmo do que sobre um único golpe fatal.",
      "",
      "Dano:",
      "1d6 em cada alvo atingido.",
    ].join("\n")
  },
  {
    id:"laco_de_luz",
    name:"Laço de Luz",
    kind:"Controle",
    req:["quick","arts"],
    tags:"Vários alvos • condição leve",
    damageMode:"none",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: zona escolhida à vista",
      "Alvos: múltiplas criaturas na área",
      "",
      "Efeito:",
      "O giro da corrente desenha um laço no espaço. A área fica hostil para movimento e conjuração limpa.",
      "Criaturas na zona podem ter passos travados, visão atrapalhada ou mãos presas em micro-aberturas, conforme o mestre julgar.",
    ].join("\n")
  },
  {
    id:"arrasto_corrente",
    name:"Arrasto de Corrente",
    kind:"Ataque",
    req:["buster","quick"],
    tags:"Alvo único • puxão/queda",
    damageMode:"buster",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: à vista",
      "Alvos: 1 criatura",
      "",
      "Efeito:",
      "Você acerta e, no mesmo instante, usa o peso da corrente para deslocar o alvo: puxar para perto, derrubar, ou abrir a guarda com um tranco brutal.",
      "Se fizer sentido, o alvo perde posição e fica vulnerável a uma sequência.",
      "",
      "Dano:",
      "1d10 (corte/impacto).",
    ].join("\n")
  },
  {
    id:"marca_exorcismo",
    name:"Marca de Exorcismo",
    kind:"Ataque/Efeito",
    req:["buster","arts"],
    tags:"Alvo único • marca • punição",
    damageMode:"buster",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: à vista",
      "Alvos: 1 criatura",
      "",
      "Efeito:",
      "O golpe não é só corte: ele deixa um símbolo breve que gruda como um julgamento. A marca facilita punições e impede o alvo de “passar ileso” por truques fáceis.",
      "Se o mestre permitir, isso pode impor desvantagem na próxima ação do alvo, ou facilitar a próxima aplicação de efeito contra ele.",
      "",
      "Dano:",
      "1d10 (corte/impacto).",
    ].join("\n")
  },
  {
    id:"bencao_breve",
    name:"Bênção Breve",
    kind:"Suporte",
    req:["arts","arts"],
    tags:"Aliado/si mesmo • bônus contextual",
    damageMode:"none",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: à vista",
      "Alvos: 1 aliado (ou você)",
      "",
      "Efeito:",
      "Você firma o pulso e “assenta” a intenção do próximo movimento. Um aliado recebe um bônus contextual coerente (vantagem, redução de penalidade ou tentativa liberada).",
      "É uma proteção breve e prática, do tipo que transforma um turno ruim em um turno viável.",
    ].join("\n")
  },

  // 3 cartas
  {
    id:"exorcismo_final",
    name:"Exorcismo Final",
    kind:"Ataque/Efeito",
    req:["buster","buster","arts"],
    tags:"Alvo único • encerramento • remoção",
    damageMode:"buster",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: à vista",
      "Alvos: 1 criatura",
      "",
      "Efeito:",
      "Você encadeia dois golpes pesados e sela o fim com uma imposição curta. O alvo sente a sustentação falhar: proteção, buff ou preparação pode ser arrancada se for coerente.",
      "É uma técnica feita para encerrar defesas e finalizar uma troca.",
      "",
      "Dano:",
      "1d10 (corte/impacto).",
    ].join("\n")
  },
  {
    id:"circulo_consagrado",
    name:"Círculo Consagrado",
    kind:"Controle/Zona",
    req:["arts","arts","quick"],
    tags:"Vários alvos • zona • travar avanço",
    damageMode:"quick",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: zona escolhida à vista",
      "Alvos: múltiplas criaturas na área",
      "",
      "Efeito:",
      "Você estabelece uma zona onde o espaço “responde” ao seu comando. Entrar e sair vira trabalho, e manter foco fica mais difícil.",
      "Se fizer sentido, isso pode atrapalhar conjuração, forçar reposicionamento e quebrar ritmo de uma investida.",
      "",
      "Dano:",
      "1d6 em cada alvo atingido (se o mestre permitir dano junto ao controle; caso contrário, trate como efeito sem dano).",
    ].join("\n")
  },
  {
    id:"julgamento_em_arco",
    name:"Julgamento em Arco",
    kind:"Ataque",
    req:["quick","arts","buster"],
    tags:"Alvo único • preparação + finalização",
    damageMode:"buster",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: à vista",
      "Alvos: 1 criatura",
      "",
      "Efeito:",
      "A corrente abre espaço, a intenção trava a fuga, e o golpe final chega quando o alvo está fora de tempo.",
      "Se fizer sentido, isso pode impor uma condição leve antes do impacto (passos travados, visão atrapalhada ou guarda aberta).",
      "",
      "Dano:",
      "1d10 (corte/impacto).",
    ].join("\n")
  },
  {
    id:"laço_cruzado",
    name:"Laço Cruzado",
    kind:"Controle",
    req:["quick","buster","quick"],
    tags:"Vários alvos • deslocamento",
    damageMode:"quick",
    text: () => [
      "Conjuração: 1 ação",
      "Alcance: zona escolhida à vista",
      "Alvos: múltiplas criaturas na área",
      "",
      "Efeito:",
      "Você atravessa a zona em linhas curvas, como se desenhasse um símbolo no ar. A pressão obriga alvos a recuar, perder posição ou quebrar formação.",
      "",
      "Dano:",
      "1d6 em cada alvo atingido.",
    ].join("\n")
  },
];

// ============================
// Técnica genérica (fallback)
// Se nenhuma ação nomeada casar, gera uma descrição coerente pra qualquer sequência.
// Regra de dano: depende da ÚLTIMA carta.
// ============================

function genericTechnique(seqKeys){
  const last = seqKeys[seqKeys.length-1];
  const tags = [];

  if(last === "buster") tags.push("Alvo único • 1d10");
  if(last === "quick") tags.push("Vários alvos • 1d6/alvo");
  if(last === "arts") tags.push("Efeito • sem dano direto");

  const vibe = [];
  vibe.push("Você controla a corrente como uma extensão do corpo, alternando tração, arco e ângulo como se estivesse “escrevendo” no ar.");

  const hasArts = seqKeys.includes("arts");
  const hasQuick = seqKeys.includes("quick");
  const hasBuster = seqKeys.includes("buster");

  if(hasArts) vibe.push("O gesto impõe um julgamento breve: trava, purifica, silencia ou desmonta sustentação, conforme a cena permitir.");
  if(hasQuick) vibe.push("O movimento abre espaço e pressiona área, forçando inimigos a reagir e perder tempo.");
  if(hasBuster) vibe.push("No fim, você condensa a intenção em um impacto direto e sem desperdício.");

  let reach = "à vista";
  let targets = "conforme a execução";
  let dmg = "—";

  if(last === "buster"){
    reach = "à vista";
    targets = "1 criatura";
    dmg = "1d10 (corte/impacto).";
  } else if(last === "quick"){
    reach = "zona escolhida à vista";
    targets = "múltiplas criaturas na área";
    dmg = "1d6 em cada alvo atingido.";
  } else {
    reach = "à vista";
    targets = hasQuick ? "múltiplas criaturas na área (efeito)" : "1 criatura/objeto/efeito";
    dmg = "Sem dano direto (efeito).";
  }

  const title = `Técnica Encadeada — ${seqKeys.map(k=>cardByKey(k).label).join(" → ")}`;

  return {
    title,
    tags: tags.join(" • "),
    text: [
      "Conjuração: 1 ação",
      `Alcance: ${reach}`,
      `Alvos: ${targets}`,
      "",
      "Efeito:",
      ...vibe,
      "",
      "Dano:",
      dmg,
    ].join("\n"),
    damageMode: (last === "buster" ? "buster" : (last === "quick" ? "quick" : "none"))
  };
}

// ============================
// Estado
// ============================

const state = {
  hand: [],
  seq: [],                // cartas reservadas (objetos carta)
  selectedActionId: null,
  handLimit: 7,
};

// ============================
// DOM
// ============================

const deck = $("deck");
const flyingCard = $("flyingCard");

const fillHandBtn = $("fillHandBtn");
const drawOneBtn = $("drawOneBtn");
const resetBtn = $("resetBtn");
const soundToggle = $("soundToggle");
const handLimitInput = $("handLimit");

const handGrid = $("handGrid");
const handCount = $("handCount");
const seqSlots = $("seqSlots");

const actionsHint = $("actionsHint");
const actionsList = $("actionsList");

const resultTitle = $("resultTitle");
const resultTags = $("resultTags");
const resultText = $("resultText");

const targetsCount = $("targetsCount");
const rollDamageBtn = $("rollDamageBtn");
const executeBtn = $("executeBtn");
const damageOut = $("damageOut");

// ============================
// Som simples
// ============================

function playTone(freq=740, ms=80, type="triangle", gain=0.05){
  if(!soundToggle.checked) return;
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms/1000);
    setTimeout(()=>ctx.close(), ms+60);
  }catch(_){}
}
function playClick(){ playTone(740, 80, "triangle", 0.05); }
function playDraw(){ playTone(520, 120, "sine", 0.045); }

// ============================
// Util
// ============================

function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

function animateDraw(card){
  deck.classList.remove("isDrawing");
  void deck.offsetWidth;
  deck.classList.add("isDrawing");

  const typeEl = flyingCard.querySelector(".cardType");
  typeEl.textContent = card.label;

  flyingCard.classList.remove("quick","arts","buster");
  flyingCard.classList.add(card.css);

  setTimeout(()=>deck.classList.remove("isDrawing"), 900);
}

function drawCardRandom(){
  return CARDS[randInt(0, CARDS.length-1)];
}

function syncHandCount(){
  handCount.textContent = String(state.hand.length);
}

function setHandLimit(n){
  const x = Math.max(1, Math.min(12, n|0));
  state.handLimit = x;

  // se reduzir o limite e tiver cartas demais, descarta do fim
  while(state.hand.length > state.handLimit){
    state.hand.pop();
  }

  // se a sequência passou a ocupar cartas “além do limite”, isso não quebra: sequência é separada.
  handLimitInput.value = String(state.handLimit);
  renderHand();
  syncHandCount();
  refreshActionsAndResult();
}

function canDrawMore(){
  return state.hand.length < state.handLimit;
}

function fillHand(){
  while(canDrawMore()){
    const c = drawCardRandom();
    state.hand.push(c);
    animateDraw(c);
  }
  playClick();
  renderHand();
  syncHandCount();
  refreshActionsAndResult();
}

function drawOne(){
  if(!canDrawMore()) return;
  const c = drawCardRandom();
  state.hand.push(c);
  animateDraw(c);
  playDraw();
  renderHand();
  syncHandCount();
  refreshActionsAndResult();
}

// ============================
// Render: mão
// ============================

function renderHand(){
  handGrid.innerHTML = "";

  for(let i=0;i<state.handLimit;i++){
    const card = state.hand[i] || null;

    const div = document.createElement("div");
    div.className = "handCard";

    if(!card){
      div.classList.add("emptySlot");
      div.innerHTML = `
        <div class="handBadge"><span>Vazio</span></div>
        <div class="handSub">—</div>
      `;
      handGrid.appendChild(div);
      continue;
    }

    div.classList.add(card.css);

    div.innerHTML = `
      <div class="handGlow"></div>
      <div class="handBadge">
        <img class="handIcon" src="${card.icon}" alt="${card.label}"/>
        <span>${card.label}</span>
      </div>
      <div class="handSub">clique para usar na sequência</div>
    `;

    div.addEventListener("click", ()=>{
      playClick();
      addCardToSeq(i);
    });

    handGrid.appendChild(div);
  }
}

function renderSeq(){
  seqSlots.innerHTML = "";

  for(let i=0;i<3;i++){
    const c = state.seq[i] || null;

    const slot = document.createElement("div");
    slot.className = "seqSlot" + (c ? " filled" : "");
    slot.setAttribute("data-idx", String(i));

    if(!c){
      slot.innerHTML = `
        <div class="seqMini">
          <div class="seqName">Slot ${i+1}</div>
        </div>
        <div class="seqSub">clique aqui para devolver (se houver carta)</div>
      `;
    } else {
      slot.innerHTML = `
        <div class="seqMini">
          <img class="seqIcon" src="${c.icon}" alt="${c.label}"/>
          <div>
            <div class="seqName">${c.label}</div>
            <div class="seqSub">${c.desc}</div>
          </div>
        </div>
        <div class="seqSub" style="margin-top:10px">clique para devolver esta carta</div>
      `;
    }

    slot.addEventListener("click", ()=>{
      playClick();
      removeSeqCard(i);
    });

    seqSlots.appendChild(slot);
  }
}

function addCardToSeq(handIndex){
  if(state.seq.length >= 3) return;
  const card = state.hand[handIndex];
  if(!card) return;

  // remove da mão
  state.hand.splice(handIndex, 1);

  // coloca na sequência
  state.seq.push(card);

  // se ao remover sobrar “buraco”, render resolve
  renderHand();
  syncHandCount();
  renderSeq();
  refreshActionsAndResult();
}

function removeSeqCard(seqIndex){
  const c = state.seq[seqIndex];
  if(!c) return;

  // remove do slot
  state.seq.splice(seqIndex, 1);

  // devolve para a mão se houver espaço; se não houver, devolve mesmo e a mão “passa” do limite? não.
  // então, se a mão estiver cheia, a carta fica “perdida” (descartada) para respeitar limite.
  if(canDrawMore()){
    state.hand.push(c);
  }

  renderHand();
  syncHandCount();
  renderSeq();
  refreshActionsAndResult();
}

// ============================
// Ações: match
// ============================

function seqKeys(){
  return state.seq.map(c=>c.key);
}

function findMatchedActions(){
  const s = seqKeys();
  if(s.length === 0) return [];

  return ACTIONS.filter(a=>{
    if(a.req.length !== s.length) return false;
    for(let i=0;i<s.length;i++){
      if(a.req[i] !== s[i]) return false;
    }
    return true;
  });
}

function renderActions(){
  actionsList.innerHTML = "";
  state.selectedActionId = null;

  const s = seqKeys();
  if(s.length === 0){
    actionsHint.textContent = "Monte uma sequência para ver ações compatíveis.";
    return;
  }

  const matched = findMatchedActions();

  if(matched.length === 0){
    actionsHint.textContent = "Nenhuma ação nomeada bateu. Você ainda pode usar a técnica genérica (já aparece no Resultado).";
    return;
  }

  actionsHint.textContent = `Ações compatíveis com: ${s.map(k=>cardByKey(k).label).join(" → ")}`;

  for(const a of matched){
    const div = document.createElement("div");
    div.className = "actionCard";

    div.innerHTML = `
      <div class="actionTop">
        <div>
          <div class="actionName">${a.name}</div>
          <div class="actionMeta">${a.kind} • ${a.tags}</div>
        </div>
        <div class="muted">${a.req.map(k=>cardByKey(k).label).join(" → ")}</div>
      </div>

      <div class="reqRow">
        ${a.req.map(k=>{
          const c = cardByKey(k);
          return `<span class="reqPill"><img class="seqIcon" src="${c.icon}" alt="${c.label}"/>${c.label}</span>`;
        }).join("")}
      </div>
    `;

    div.addEventListener("click", ()=>{
      selectAction(a.id);
      for(const el of actionsList.querySelectorAll(".actionCard")){
        el.classList.remove("selected");
      }
      div.classList.add("selected");
    });

    actionsList.appendChild(div);
  }
}

function selectAction(actionId){
  state.selectedActionId = actionId;
  damageOut.textContent = "—";
  renderResult();
}

// ============================
// Resultado
// ============================

function renderResult(){
  const s = seqKeys();
  if(s.length === 0){
    resultTitle.textContent = "—";
    resultTags.textContent = "—";
    resultText.textContent = "Monte uma sequência e selecione uma ação.";
    rollDamageBtn.disabled = true;
    executeBtn.disabled = true;
    damageOut.textContent = "—";
    return;
  }

  const matched = findMatchedActions();
  const picked = matched.find(a => a.id === state.selectedActionId) || matched[0] || null;

  if(picked){
    resultTitle.textContent = picked.name;
    resultTags.textContent = `${picked.kind} • ${picked.tags} • Sequência: ${picked.req.map(k=>cardByKey(k).label).join(" → ")}`;
    resultText.textContent = picked.text();

    rollDamageBtn.disabled = (picked.damageMode === "none");
    executeBtn.disabled = false;

    rollDamageBtn.dataset.mode = picked.damageMode;
    return;
  }

  // fallback: técnica genérica
  const gen = genericTechnique(s);
  resultTitle.textContent = gen.title;
  resultTags.textContent = `${gen.tags} • Sequência: ${s.map(k=>cardByKey(k).label).join(" → ")}`;
  resultText.textContent = gen.text;

  rollDamageBtn.disabled = (gen.damageMode === "none");
  executeBtn.disabled = false;

  rollDamageBtn.dataset.mode = gen.damageMode;
}

function refreshActionsAndResult(){
  renderSeq();
  renderActions();
  renderResult();
}

// ============================
// Dano
// ============================

function rollDamage(){
  const mode = rollDamageBtn.dataset.mode || "none";
  if(mode === "none") return;

  if(mode === "buster"){
    const v = randInt(1,10);
    damageOut.textContent = `1d10 = ${v}`;
    return;
  }

  if(mode === "quick"){
    const n = Math.max(1, Math.min(12, parseInt(targetsCount.value,10) || 1));
    const rolls = [];
    let sum = 0;
    for(let i=0;i<n;i++){
      const r = randInt(1,6);
      rolls.push(r);
      sum += r;
    }
    damageOut.textContent = `${n}×1d6 = [${rolls.join(", ")}] (total ${sum})`;
    return;
  }
}

// ============================
// Executar (consome sequência)
// ============================

function executeAction(){
  if(state.seq.length === 0) return;

  // A sequência já “consome” porque as cartas foram removidas da mão quando selecionadas.
  // Aqui só limpamos e preparamos pro próximo.
  state.seq = [];
  state.selectedActionId = null;

  playClick();

  // limpa resultado
  damageOut.textContent = "—";
  resultTitle.textContent = "—";
  resultTags.textContent = "—";
  resultText.textContent = "Técnica executada. Monte uma nova sequência.";

  rollDamageBtn.disabled = true;
  executeBtn.disabled = true;

  renderHand();
  syncHandCount();
  refreshActionsAndResult();
}

// ============================
// Reset
// ============================

function resetAll(){
  state.hand = [];
  state.seq = [];
  state.selectedActionId = null;

  damageOut.textContent = "—";
  resultTitle.textContent = "—";
  resultTags.textContent = "—";
  resultText.textContent = "Monte uma sequência e selecione uma ação.";

  rollDamageBtn.disabled = true;
  executeBtn.disabled = true;

  renderHand();
  renderSeq();
  renderActions();
  syncHandCount();
}

// ============================
// Eventos
// ============================

fillHandBtn.addEventListener("click", ()=> fillHand());
drawOneBtn.addEventListener("click", ()=> drawOne());
resetBtn.addEventListener("click", ()=> { playClick(); resetAll(); });

handLimitInput.addEventListener("change", ()=>{
  const n = parseInt(handLimitInput.value,10);
  setHandLimit(n);
});

rollDamageBtn.addEventListener("click", ()=> { playClick(); rollDamage(); });
executeBtn.addEventListener("click", ()=> executeAction());

// ============================
// Init
// ============================

(function init(){
  setHandLimit(parseInt(handLimitInput.value,10) || 7);
  resetAll();
  fillHand();
})();
