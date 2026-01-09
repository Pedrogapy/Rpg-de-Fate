// sebastian.js
// Página jogável no estilo do Adão: cartas (até 3), lista de técnicas por sequência e modo.
// Modo: Volumen Hydrargyrum ou Taumaturgia (Pressão + Runas).
// Regras de dano (do mestre):
// - Buster: 1d10 em 1 alvo
// - Quick: 1d6 por alvo (múltiplos)
/// - Arts: 1d8 em 1 alvo OU efeito (dependendo da técnica)

function $(id){ return document.getElementById(id); }

// ============================
// Cartas
// ============================

const CARD_TYPES = [
  { key:"quick",  label:"Quick",  css:"quick",  icon:"assets/card_quick.svg",  desc:"Quick — atinge vários alvos (1d6 por alvo) e costuma reposicionar, empurrar ou abrir espaço." },
  { key:"arts",   label:"Arts",   css:"arts",   icon:"assets/card_arts.svg",   desc:"Arts — aplica efeito ou dano moderado (1d8) em um alvo; é a carta de controle, selo e utilidade." },
  { key:"buster", label:"Buster", css:"buster", icon:"assets/card_buster.svg", desc:"Buster — ataque focado (1d10) em um alvo; é a carta de execução e impacto direto." },
];

const CARD_LET = { quick:"Q", arts:"A", buster:"B" };
const LET_CARD = { Q:"quick", A:"arts", B:"buster" };

// ============================
// Estado
// ============================

const state = {
  hand: [],
  selectedHandIndex: null,
  sequence: [],           // array de cards
  selectedActionId: null,
  mode: "tauma",          // "volumen" | "tauma"
};

// ============================
// DOM
// ============================

const deck = $("deck");
const flyingCard = $("flyingCard");

const newTurnBtn = $("newTurnBtn");
const drawOneBtn = $("drawOneBtn");
const resetBtn = $("resetBtn");
const soundToggle = $("soundToggle");
const handLimitEl = $("handLimit");

const handGrid = $("handGrid");
const handCount = $("handCount");
const selectedName = $("selectedName");
const selectedDesc = $("selectedDesc");
const addToSeqBtn = $("addToSeqBtn");

const seqSlots = [$("seqSlot1"), $("seqSlot2"), $("seqSlot3")];
const clearSeqBtn = $("clearSeqBtn");

const modeVol = $("modeVol");
const modeTau = $("modeTau");

const actionsList = $("actionsList");
const actionHint = $("actionHint");

const resultTitle = $("resultTitle");
const resultMeta = $("resultMeta");
const resultDesc = $("resultDesc");

const targetsWrap = $("targetsWrap");
const targetsCount = $("targetsCount");
const rollBtn = $("rollBtn");
const damageOut = $("damageOut");

// ============================
// Som
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
function playClick(){ playTone(740, 70, "triangle", 0.05); }
function playDraw(){ playTone(520, 110, "sine", 0.055); }
function playShuffle(){ playTone(220, 120, "square", 0.03); setTimeout(()=>playTone(440, 80, "square", 0.02), 120); }
function playRoll(){ playTone(240, 120, "square", 0.03); setTimeout(()=>playTone(520, 90, "square", 0.025), 120); }

// ============================
// Util
// ============================

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

function handLimit(){
  const n = parseInt(handLimitEl.value, 10);
  return clamp(Number.isFinite(n) ? n : 7, 1, 12);
}

function seqKey(seqArr){
  return seqArr.map(c => CARD_LET[c.key]).join("");
}

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
  return CARD_TYPES[randInt(0, CARD_TYPES.length-1)];
}

function addToHand(card){
  if(state.hand.length >= handLimit()) return false;
  state.hand.push(card);
  return true;
}

// ============================
// Render: mão
// ============================

function updateHandCount(){
  handCount.textContent = String(state.hand.length);
}

function renderHand(){
  handGrid.innerHTML = "";
  for(let i=0;i<handLimit();i++){
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
    if(state.selectedHandIndex === i) div.classList.add("selected");

    div.innerHTML = `
      <div class="handGlow"></div>
      <div class="handBadge">
        <img class="handIcon" src="${card.icon}" alt="${card.label}"/>
        <span>${card.label}</span>
      </div>
      <div class="handSub">clique para selecionar</div>
    `;

    div.addEventListener("click", ()=>{
      playClick();
      state.selectedHandIndex = i;
      renderHand();
      renderSelectedPanel();
    });

    handGrid.appendChild(div);
  }

  updateHandCount();
}

function renderSelectedPanel(){
  if(state.selectedHandIndex == null || !state.hand[state.selectedHandIndex]){
    selectedName.textContent = "—";
    selectedDesc.textContent = "Selecione uma carta na mão para ver a descrição e adicionar à sequência.";
    addToSeqBtn.disabled = true;
    return;
  }

  const card = state.hand[state.selectedHandIndex];
  selectedName.textContent = card.label;
  selectedDesc.textContent = card.desc;

  addToSeqBtn.disabled = (state.sequence.length >= 3);
}

// ============================
// Render: sequência
// ============================

function renderSequence(){
  for(let i=0;i<3;i++){
    const slot = seqSlots[i];
    const c = state.sequence[i];
    slot.classList.remove("quick","arts","buster");
    slot.innerHTML = "";
    if(!c){
      slot.classList.add("empty");
      slot.innerHTML = `
        <div class="seqHint">Slot ${i+1}</div>
        <div class="seqName">vazio</div>
      `;
      slot.onclick = null;
      continue;
    }
    slot.classList.remove("empty");
    slot.classList.add(c.css);
    slot.innerHTML = `
      <div class="seqHint">Carta ${i+1}</div>
      <div class="seqName">${c.label}</div>
      <div class="seqSub">clique para remover</div>
    `;
    slot.onclick = () => {
      playClick();
      // devolve pra mão (se tiver espaço)
      if(state.hand.length < handLimit()){
        state.hand.push(c);
      }
      state.sequence.splice(i, 1);
      state.selectedActionId = null;
      renderAll();
    };
  }
}

// ============================
// Técnicas: geração (cobre TODAS as sequências de 1–3 cartas)
// ============================

function allSeqStrings(){
  const lets = ["Q","A","B"];
  const out = [];
  for(const a of lets) out.push(a);
  for(const a of lets) for(const b of lets) out.push(a+b);
  for(const a of lets) for(const b of lets) for(const c of lets) out.push(a+b+c);
  return out;
}

function modeLabel(mode){
  return mode === "volumen" ? "Volumen" : "Taumaturgia";
}

function finalDamageByLast(lastLet, variant){
  if(lastLet === "B") return { type:"buster", dice:"1d10", multi:false, hint:"Dano focado" };
  if(lastLet === "Q") return { type:"quick", dice:"1d6", multi:true,  hint:"Dano em área" };
  // Arts
  if(variant === "damage") return { type:"arts", dice:"1d8", multi:false, hint:"Dano/Efeito" };
  return { type:"none", dice:null, multi:false, hint:"Efeito" };
}

function taumaName(seq){
  const bank = {
    "Q":"Varredura Barométrica",
    "A":"Selo de Pressão",
    "B":"Tiro de Compressão",
    "QQ":"Arco de Supressão",
    "QA":"Campo Barométrico",
    "QB":"Linha de Abate",
    "AQ":"Ruptura de Postura",
    "AA":"Lacre de Trava",
    "AB":"Execução Marcada",
    "BQ":"Onda de Recuo",
    "BA":"Grampo de Pressão",
    "BB":"Perfuração Dupla",

    "QQQ":"Tempestade de Pressão",
    "AAA":"Círculo de Lacres",
    "BBB":"Execução Tríplice",
    "QBB":"Linha de Abate (Curta)",
    "ABB":"Sentença Marcada",
    "QQB":"Corte Barométrico",
    "QAB":"Julgamento de Pressão",
    "BAA":"Prisão de Lacre",
    "BQA":"Recuo Selado",
    "AQQ":"Varrida de Ruptura",
  };
  if(bank[seq]) return bank[seq];

  const op = {Q:"Rajada",A:"Runa",B:"Golpe"};
  const mid = {Q:"em Leque",A:"de Trava",B:"de Execução"};
  const fin = {Q:"— Onda",A:"— Fecho",B:"— Sentença"};
  const s = seq.split("");
  const a = op[s[0]];
  const b = s[1] ? mid[s[1]] : "";
  const c = fin[s[s.length-1]];
  return [a, b, c].filter(Boolean).join(" ");
}

function volumenName(seq){
  const bank = {
    "Q":"Corte de Mercúrio",
    "A":"Manto de Mercúrio",
    "B":"Lança de Prata",
    "QQ":"Chuva de Agulhas",
    "QA":"Névoa Rastreadora",
    "QB":"Mordida Guiada",
    "AQ":"Rede Líquida",
    "AA":"Escudo de 1 Pulso",
    "AB":"Trava Metálica",
    "BQ":"Arremesso em Leque",
    "BA":"Couraça Rápida",
    "BB":"Perfuração Prateada",

    "QQQ":"Tempestade de Lâminas",
    "AAA":"Fortaleza Fluida",
    "BBB":"Execução Prateada",
  };
  if(bank[seq]) return bank[seq];

  const op = {Q:"Lâmina",A:"Selo",B:"Pique"};
  const mid = {Q:"de Dispersão",A:"de Contenção",B:"de Perfuração"};
  const fin = {Q:"— Enxurrada",A:"— Lacre",B:"— Mordida"};
  const s = seq.split("");
  return [op[s[0]], s[1] ? mid[s[1]] : "", fin[s[s.length-1]]].filter(Boolean).join(" ");
}

function line(txt){ return `<div class="line">${txt}</div>`; }

function buildTaumaText(seq, dmg){
  const s = seq.split("");
  const steps = [];

  const stepQuickOpen   = "Você abre a sequência com uma varredura de pressão, forçando postura ruim e criando espaço para avançar.";
  const stepQuickMid    = "Você reabre a zona com uma segunda varredura curta, empurrando o fluxo na direção desejada e limitando fuga.";
  const stepQuickFin    = "Você solta uma onda barométrica que atravessa a área. Quem estiver na zona sofre impacto e perde o equilíbrio.";

  const stepArtsOpen    = "Você traça uma runa no ar/solo com um gesto curto, definindo a 'regra' da conjuração (marca, trava ou ajuste de terreno).";
  const stepArtsMid     = "Você reforça o selo com um segundo traço, apertando a pressão no ponto certo (mais controle, mais trava, ou mais estabilidade).";
  const stepArtsFin     = "Você fecha o lacre: o alvo (ou a zona) sente a pressão 'encaixar', como se o espaço obedecesse uma regra nova por um instante.";

  const stepBusterOpen  = "Você avança e faz um gesto de tiro com a mão marcada por runa, disparando um impacto comprimido para abrir guarda.";
  const stepBusterMid   = "Você encaixa um segundo impacto de pressão no mesmo ritmo, quebrando a postura e alinhando o alvo para a finalização.";
  const stepBusterFin   = "Você descarrega a compressão em um único ponto: um golpe curto e pesado, como um tiro invisível a queima-roupa.";

  for(let i=0;i<s.length;i++){
    const ch = s[i];
    const isFirst = i===0;
    const isLast = i===s.length-1;
    const isMid = !isFirst && !isLast;

    if(ch==="Q" && isFirst) steps.push("**Quick (início):** " + stepQuickOpen);
    if(ch==="Q" && isMid)   steps.push("**Quick (meio):** "  + stepQuickMid);
    if(ch==="Q" && isLast)  steps.push("**Quick (fim):** "   + stepQuickFin);

    if(ch==="A" && isFirst) steps.push("**Arts (início):** " + stepArtsOpen);
    if(ch==="A" && isMid)   steps.push("**Arts (meio):** "   + stepArtsMid);
    if(ch==="A" && isLast)  steps.push("**Arts (fim):** "    + stepArtsFin);

    if(ch==="B" && isFirst) steps.push("**Buster (início):** " + stepBusterOpen);
    if(ch==="B" && isMid)   steps.push("**Buster (meio):** "   + stepBusterMid);
    if(ch==="B" && isLast)  steps.push("**Buster (fim):** "    + stepBusterFin);
  }

  // Ajustes por padrão da sequência
  const hasQ = s.includes("Q");
  const hasA = s.includes("A");
  const hasB = s.includes("B");
  const qCount = s.filter(x=>x==="Q").length;
  const aCount = s.filter(x=>x==="A").length;
  const bCount = s.filter(x=>x==="B").length;

  const extras = [];

  // Defesa (escudo)
  if(s === "AAA"){
    extras.push("**Extra:** você cria um lacre defensivo. Isso conta como *escudo* e absorve **1d12** de dano antes de se desfazer.");
  }
  if(aCount>=2 && dmg.type==="none"){
    extras.push("**Extra:** o selo fica estável por um instante. Se o mestre permitir, o efeito pode durar até o começo do seu próximo turno.");
  }
  if(hasA && dmg.type==="buster"){
    extras.push("**Extra:** se acertar, o alvo fica com uma *marca de pressão* (vantagem contextual para prender, empurrar ou impedir reação, a critério do mestre).");
  }
  if(hasQ && dmg.type==="buster"){
    extras.push("**Extra:** você chega no alvo usando a abertura da varredura, então a finalização tende a acontecer em **curto alcance**.");
  }
  if(qCount>=2 && dmg.type==="quick"){
    extras.push("**Extra:** a onda cobre uma zona maior e tende a empurrar alvos para fora de posição (recuo curto ou queda, se fizer sentido).");
  }
  if(bCount>=2 && dmg.type==="buster"){
    extras.push("**Extra:** a sequência de impactos deixa o alvo “alinhado”. Se o mestre permitir, você ganha vantagem contextual no acerto desta técnica.");
  }
  if(dmg.type==="arts"){
    if(hasB) extras.push("**Extra:** o fecho de Arts vira uma compressão ofensiva: além do dano, o alvo fica com movimento ou conjuração atrapalhados por um instante (leve).");
    else     extras.push("**Extra:** o fecho é principalmente controle: reduzir mobilidade, travar visão ou dificultar conjuração (leve), conforme a cena.");
  }

  const lines = [];
  lines.push(line(`<strong>Como a técnica acontece</strong>`));
  steps.forEach(t => lines.push(line(t)));
  if(extras.length){
    lines.push(line("<strong>Detalhes</strong>"));
    extras.forEach(e => lines.push(line(e)));
  }

  return lines.join("");
}

function buildVolumenText(seq, dmg){
  const s = seq.split("");
  const steps = [];

  const qOpen = "Um dos lobos avança e espalha lâminas finas de mercúrio no caminho, forçando recuo e abrindo um corredor.";
  const qMid  = "O segundo lobo corta em ângulo complementar, fechando rotas e ‘varrendo’ a zona com pressão líquida.";
  const qFin  = "Ambos os lobos soltam uma enxurrada de estilhaços líquidos que varre a área, atingindo tudo na zona escolhida.";

  const aOpen = "O mercúrio se estica como fio e desenha um selo curto, marcando terreno ou alvo para controle imediato.";
  const aMid  = "O selo é reforçado com uma segunda camada de metal líquido, ficando mais firme para conter ou proteger.";
  const aFin  = "O selo se fecha e “morde”: o metal líquido prende, amarra ou forma uma barreira no instante certo.";

  const bOpen = "Um lobo comprime mercúrio em uma ponta e golpeia como uma lança curta, buscando abrir guarda.";
  const bMid  = "O impacto é repetido no mesmo ritmo, forçando a defesa a ceder.";
  const bFin  = "A massa se condensa em uma perfuração prateada e atinge um único alvo com força total.";

  for(let i=0;i<s.length;i++){
    const ch = s[i];
    const isFirst = i===0;
    const isLast = i===s.length-1;
    const isMid = !isFirst && !isLast;

    if(ch==="Q" && isFirst) steps.push("**Quick (início):** " + qOpen);
    if(ch==="Q" && isMid)   steps.push("**Quick (meio):** "  + qMid);
    if(ch==="Q" && isLast)  steps.push("**Quick (fim):** "   + qFin);

    if(ch==="A" && isFirst) steps.push("**Arts (início):** " + aOpen);
    if(ch==="A" && isMid)   steps.push("**Arts (meio):** "   + aMid);
    if(ch==="A" && isLast)  steps.push("**Arts (fim):** "    + aFin);

    if(ch==="B" && isFirst) steps.push("**Buster (início):** " + bOpen);
    if(ch==="B" && isMid)   steps.push("**Buster (meio):** "   + bMid);
    if(ch==="B" && isLast)  steps.push("**Buster (fim):** "    + bFin);
  }

  const hasA = s.includes("A");
  const aCount = s.filter(x=>x==="A").length;
  const extras = [];

  // Defesa (escudo)
  if(aCount>=2 && (dmg.type==="none" || dmg.type==="arts")){
    extras.push("**Extra:** o mercúrio pode formar um *escudo* rápido. Isso absorve **1d12** de dano e se desfaz em seguida.");
  }
  if(hasA && dmg.type==="buster"){
    extras.push("**Extra:** se acertar, o alvo fica com metal líquido marcado (facilita prender ou atingir novamente em seguida, a critério do mestre).");
  }

  const lines = [];
  lines.push(line(`<strong>Como a técnica acontece</strong>`));
  steps.forEach(t => lines.push(line(t)));
  if(extras.length){
    lines.push(line("<strong>Detalhes</strong>"));
    extras.forEach(e => lines.push(line(e)));
  }
  return lines.join("");
}

function buildAction(mode, seq){
  const last = seq[seq.length-1];
  const s = seq;
  const hasB = s.includes("B");
  const aCount = s.split("").filter(x=>x==="A").length;

  // Arts no fim: decide se é dano ou efeito
  let artsVariant = "effect";
  if(last === "A"){
    if(hasB) artsVariant = "damage";          // fecho ofensivo quando houve impacto antes
    else if(aCount >= 2) artsVariant = "effect";
    else artsVariant = "effect";
  }

  const dmg = finalDamageByLast(last, artsVariant);
  const name = (mode === "volumen") ? volumenName(seq) : taumaName(seq);

  // tags
  const tags = [];
  tags.push(modeLabel(mode));
  if(dmg.type === "buster") tags.push("Dano 1d10");
  if(dmg.type === "quick")  tags.push("Dano 1d6 por alvo");
  if(dmg.type === "arts")   tags.push("Dano 1d8");
  if(dmg.type === "none")   tags.push("Efeito");
  if(seq.length === 1) tags.push("1 carta");
  if(seq.length === 2) tags.push("2 cartas");
  if(seq.length === 3) tags.push("3 cartas");

  const meta = {
    cast: s.split("").map(x => x==="Q"?"Quick":x==="A"?"Arts":"Buster").join(" → "),
    range: (s.includes("Q") || s.includes("B")) ? "curto a médio (à vista)" : "à vista",
    targets: (dmg.type==="quick") ? "múltiplos alvos na zona" : "1 alvo (ou 1 ponto na cena)",
    damage: dmg.dice ? (dmg.type==="quick" ? "1d6 por alvo" : dmg.dice) : "—",
  };

  const textHtml = (mode === "volumen")
    ? buildVolumenText(seq, dmg)
    : buildTaumaText(seq, dmg);

  return {
    id: `${mode}_${seq}`,
    mode,
    seq,
    name,
    tags: tags.join(" • "),
    dmg,
    meta,
    textHtml,
  };
}

const ACTIONS_BY_MODE = {
  volumen: new Map(),
  tauma: new Map(),
};

(function precomputeActions(){
  for(const seq of allSeqStrings()){
    ACTIONS_BY_MODE.volumen.set(seq, [buildAction("volumen", seq)]);
    ACTIONS_BY_MODE.tauma.set(seq, [buildAction("tauma", seq)]);
  }
})();

function matchedActions(){
  const k = seqKey(state.sequence);
  if(!k) return [];
  const m = ACTIONS_BY_MODE[state.mode];
  return (m && m.get(k)) ? m.get(k) : [];
}

function genericAction(){
  const k = seqKey(state.sequence);
  const last = k[k.length-1];
  if(!last) return null;

  const artsVariant = "effect";
  const dmg = finalDamageByLast(last, artsVariant);

  const name = (state.mode==="volumen")
    ? "Ação Livre (Volumen)"
    : "Ação Livre (Taumaturgia)";

  const tags = [modeLabel(state.mode)];
  if(dmg.type==="buster") tags.push("Dano 1d10");
  if(dmg.type==="quick") tags.push("Dano 1d6 por alvo");
  if(dmg.type==="arts") tags.push("Dano 1d8");
  if(dmg.type==="none") tags.push("Efeito");

  const meta = {
    cast: k.split("").map(x => x==="Q"?"Quick":x==="A"?"Arts":"Buster").join(" → "),
    range: "à vista",
    targets: (dmg.type==="quick") ? "múltiplos alvos na zona" : "1 alvo",
    damage: dmg.dice ? (dmg.type==="quick" ? "1d6 por alvo" : dmg.dice) : "—",
  };

  const text = (state.mode==="volumen")
    ? buildVolumenText(k, dmg)
    : buildTaumaText(k, dmg);

  return {
    id: "generic",
    mode: state.mode,
    seq: k,
    name,
    tags: tags.join(" • "),
    dmg,
    meta,
    textHtml: text,
  };
}

// ============================
// Render: ações e resultado
// ============================

function renderActions(){
  actionsList.innerHTML = "";

  const k = seqKey(state.sequence);
  if(!k){
    actionHint.textContent = "Monte uma sequência (1 a 3 cartas).";
    return;
  }

  const found = matchedActions();
  const list = (found && found.length) ? found : [genericAction()];

  actionHint.textContent = (found && found.length)
    ? `Técnica disponível para ${k} (${modeLabel(state.mode)})`
    : `Sem técnica nomeada para ${k}. Usando “Ação Livre”.`;

  list.forEach((a) => {
    const div = document.createElement("div");
    div.className = "actionCard";
    if(state.selectedActionId === a.id) div.classList.add("selected");

    div.innerHTML = `
      <div class="actionTop">
        <div class="actionName">${a.name}</div>
        <div class="actionTags">${a.tags}</div>
      </div>
      <div class="actionText">
        <div><strong>Conjuração:</strong> ${a.meta.cast}</div>
        <div><strong>Alcance:</strong> ${a.meta.range}</div>
        <div><strong>Alvos:</strong> ${a.meta.targets}</div>
      </div>
    `;

    div.addEventListener("click", ()=>{
      playClick();
      state.selectedActionId = a.id;
      renderActions();
      renderResult(a);
    });

    actionsList.appendChild(div);
  });

  // auto-select
  if(!state.selectedActionId && list[0]){
    state.selectedActionId = list[0].id;
    renderResult(list[0]);
  }
}

function renderResult(action){
  if(!action){
    resultTitle.textContent = "Resultado";
    resultMeta.textContent = "Selecione uma técnica.";
    resultDesc.innerHTML = "";
    targetsWrap.classList.add("hidden");
    rollBtn.disabled = true;
    damageOut.textContent = "—";
    return;
  }

  resultTitle.textContent = action.name;
  resultMeta.textContent = `${modeLabel(action.mode)} • Conjuração: ${action.meta.cast} • Dano: ${action.meta.damage}`;

  resultDesc.innerHTML = action.textHtml;

  // dano
  damageOut.textContent = "—";
  if(action.dmg.type === "quick"){
    targetsWrap.classList.remove("hidden");
    rollBtn.disabled = false;
    rollBtn.dataset.dmg = "quick";
  } else if(action.dmg.type === "buster"){
    targetsWrap.classList.add("hidden");
    rollBtn.disabled = false;
    rollBtn.dataset.dmg = "buster";
  } else if(action.dmg.type === "arts"){
    targetsWrap.classList.add("hidden");
    rollBtn.disabled = false;
    rollBtn.dataset.dmg = "arts";
  } else {
    targetsWrap.classList.add("hidden");
    rollBtn.disabled = true;
    rollBtn.dataset.dmg = "none";
  }
}

// ============================
// Ações: comprar/limpar/seq
// ============================

function fillHand(){
  const lim = handLimit();
  while(state.hand.length < lim){
    const c = drawCardRandom();
    addToHand(c);
    animateDraw(c);
    playDraw();
  }
}

function newTurn(){
  playShuffle();
  // devolve sequência pra mão se tiver espaço
  while(state.sequence.length){
    const c = state.sequence.pop();
    if(state.hand.length < handLimit()) state.hand.push(c);
  }
  state.selectedHandIndex = null;
  state.selectedActionId = null;
  fillHand();
  renderAll();
}

function drawOne(){
  if(state.hand.length >= handLimit()) return;
  const c = drawCardRandom();
  addToHand(c);
  animateDraw(c);
  playDraw();
  renderAll();
}

function resetAll(){
  playShuffle();
  state.hand = [];
  state.selectedHandIndex = null;
  state.sequence = [];
  state.selectedActionId = null;

  fillHand();
  renderAll();
}

function addSelectedToSequence(){
  if(state.selectedHandIndex == null) return;
  if(state.sequence.length >= 3) return;

  const card = state.hand[state.selectedHandIndex];
  if(!card) return;

  playClick();

  state.sequence.push(card);
  state.hand.splice(state.selectedHandIndex, 1);
  state.selectedHandIndex = null;
  state.selectedActionId = null;

  renderAll();
}

function clearSequence(){
  playClick();
  // devolve pra mão
  while(state.sequence.length){
    const c = state.sequence.pop();
    if(state.hand.length < handLimit()) state.hand.push(c);
  }
  state.selectedActionId = null;
  renderAll();
}

// ============================
// Rolagem de dano
// ============================

function rollDie(sides){ return randInt(1, sides); }

function rollDamage(){
  const k = seqKey(state.sequence);
  if(!k) return;

  const found = matchedActions();
  const action = (found && found.length)
    ? found.find(a => a.id === state.selectedActionId) || found[0]
    : genericAction();

  if(!action || !action.dmg || action.dmg.type==="none") return;

  playRoll();

  if(action.dmg.type === "buster"){
    const v = rollDie(10);
    damageOut.textContent = `${v} (1d10)`;
    return;
  }

  if(action.dmg.type === "arts"){
    const v = rollDie(8);
    damageOut.textContent = `${v} (1d8)`;
    return;
  }

  if(action.dmg.type === "quick"){
    const n = clamp(parseInt(targetsCount.value, 10) || 1, 1, 10);
    const rolls = [];
    let total = 0;
    for(let i=0;i<n;i++){
      const v = rollDie(6);
      rolls.push(v);
      total += v;
    }
    damageOut.textContent = `${rolls.join(", ")} (1d6 por alvo) — total ${total}`;
    return;
  }
}

// ============================
// Modo
// ============================

function setMode(mode){
  state.mode = mode;
  state.selectedActionId = null;
  renderAll();
}

// ============================
// Render geral
// ============================

function renderAll(){
  renderHand();
  renderSelectedPanel();
  renderSequence();
  renderActions();

  // atualiza “resultado” caso nenhuma ação esteja selecionada
  const found = matchedActions();
  const list = (found && found.length) ? found : (seqKey(state.sequence) ? [genericAction()] : []);
  const sel = list.find(a => a.id === state.selectedActionId) || list[0] || null;
  renderResult(sel);
}

// ============================
// Eventos
// ============================

newTurnBtn.addEventListener("click", ()=> newTurn());
drawOneBtn.addEventListener("click", ()=> drawOne());
resetBtn.addEventListener("click", ()=> resetAll());

addToSeqBtn.addEventListener("click", ()=> addSelectedToSequence());
clearSeqBtn.addEventListener("click", ()=> clearSequence());

rollBtn.addEventListener("click", ()=> rollDamage());

handLimitEl.addEventListener("change", ()=>{
  // se reduziu e a mão ficou maior, corta o excedente (devolve pro “nada”)
  const lim = handLimit();
  if(state.hand.length > lim){
    state.hand = state.hand.slice(0, lim);
    state.selectedHandIndex = null;
  }
  renderAll();
});

modeVol.addEventListener("change", ()=>{ if(modeVol.checked) setMode("volumen"); });
modeTau.addEventListener("change", ()=>{ if(modeTau.checked) setMode("tauma"); });

// ============================
// Init
// ============================

(function init(){
  // modo padrão
  modeTau.checked = true;
  state.mode = "tauma";

  resetAll();
})();
