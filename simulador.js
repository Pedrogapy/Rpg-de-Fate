// simulador.js
// Fluxo: comprar cartas (mão até LIMITE) -> escolher carta usada -> rolar d6/d8/d10 (+d6 elemento se d8=1)
// -> escolher opção do d6 no resultado -> gerar descrição.
// Efeito real implementado:
// - COMBO (d10): arma um bônus para o próximo turno. Se a próxima carta usada for DIFERENTE, a descrição/dano muda.
// - LIMITE DA MÃO: controlado por input #handLimit (padrão 7), ajustável.

function $(id){ return document.getElementById(id); }

// ============================
// Config
// ============================

const CARD_TYPES = [
  { key:"quick",  label:"Quick",  css:"quick",  icon:"assets/card_quick.svg",  desc:"Quick foca em vários alvos (magia em área)." },
  { key:"arts",   label:"Arts",   css:"arts",   icon:"assets/card_arts.svg",   desc:"Arts causa um efeito em um alvo." },
  { key:"buster", label:"Buster", css:"buster", icon:"assets/card_buster.svg", desc:"Buster foca em um inimigo (um alvo)." },
];

const D8_METHODS  = Magia.D8;
const D6_CHOICES  = Magia.D6;
const D10_MOMENTS = Magia.D10;
const ELEMENTS    = Magia.ELEMENTS;

// ============================
// Estado
// ============================

const state = {
  hand: [],
  selectedHandIndex: null,
  usedCard: null,

  // limite configurável
  handLimit: 7,

  d6: null,
  d8: null,
  d10: null,
  elem: null,

  d6Pick: null,           // "A" ou "B"
  d6ChoiceName: null,     // nome final

  methodOverride: null,   // usado apenas se d6=5 e opção A (Adaptação)

  // --- Combo (d10) real ---
  comboArmed: false,      // veio do turno anterior
  comboFromCardKey: null, // carta do turno anterior que gerou o Combo
  comboApplied: false,    // aplicado neste turno (carta diferente)
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

// novo: limite da mão
const handLimitInput = $("handLimit");

const handGrid = $("handGrid");
const handCount = $("handCount");
const selectedName = $("selectedName");
const selectedDesc = $("selectedDesc");
const useCardBtn = $("useCardBtn");

const rollBtn = $("rollBtn");
const die6 = $("die6");
const die8 = $("die8");
const die10 = $("die10");
const dieElemBox = $("dieElemBox");
const dieElem = $("dieElem");

const comboLine = $("comboLine");
const comboSub = $("comboSub");

const outCard = $("outCard");
const outD8 = $("outD8");
const outD6 = $("outD6");
const outD10 = $("outD10");
const outElem = $("outElem");

const d6ChoiceWrap = $("d6Choice");
const preLines = $("preLines");
const d6ChoiceHint = $("d6ChoiceHint");
const optA = $("optA");
const optB = $("optB");

const adaptWrap = $("adaptWrap");
const adaptMethod = $("adaptMethod");

const spellSummary = $("spellSummary");
const spellText = $("spellText");

const tableD8 = $("tableD8");
const tableD6 = $("tableD6");
const tableD10 = $("tableD10");

// ============================
// Som simples
// ============================

function playTone(freq=740, ms=80, type="triangle", gain=0.05){
  if(!soundToggle || !soundToggle.checked) return;
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
function playRoll(){
  if(!soundToggle || !soundToggle.checked) return;
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = 220;
    g.gain.value = 0.03;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.12);
    o.stop(ctx.currentTime + 0.14);
    setTimeout(()=>ctx.close(), 210);
  }catch(_){}
}

// ============================
// Util
// ============================

function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

function setDie(el, value){
  el.classList.add("shake");
  el.textContent = String(value);
  setTimeout(()=>el.classList.remove("shake"), 180);
}

function resetDiceUI(){
  die6.textContent = "—";
  die8.textContent = "—";
  die10.textContent = "—";
  dieElem.textContent = "—";
  dieElemBox.classList.add("hidden");
}

function chosenMethodIndex(){
  return state.methodOverride ?? state.d8;
}

function d8Text(idx){
  return D8_METHODS[idx-1] || "—";
}

function d10Name(idx){
  return D10_MOMENTS[idx-1]?.name || "—";
}

function d10Text(idx){
  const o = D10_MOMENTS[idx-1];
  return o ? `${o.name}: ${o.desc}` : "—";
}

function elemText(idx){
  return idx ? (ELEMENTS[idx-1] || "—") : "—";
}

function getD6Obj(d6){
  return D6_CHOICES[d6-1] || null;
}

function getD6ChoiceName(d6, pick){
  const o = getD6Obj(d6);
  if(!o) return "—";
  return pick === "A" ? o.pair[0] : o.pair[1];
}

function getD6ChoiceDesc(d6, pick){
  const o = getD6Obj(d6);
  if(!o) return "—";
  return pick === "A" ? o.a : o.b;
}

function clampHandLimit(n){
  if(!Number.isFinite(n)) return 7;
  n = Math.floor(n);
  if(n < 1) n = 1;
  if(n > 12) n = 12;
  return n;
}

// ============================
// Cartas
// ============================

function animateDraw(card){
  if(!deck || !flyingCard) return;

  deck.classList.remove("isDrawing");
  void deck.offsetWidth;
  deck.classList.add("isDrawing");

  const typeEl = flyingCard.querySelector(".cardType");
  if(typeEl) typeEl.textContent = card.label;

  const face = flyingCard.querySelector(".cardFace");
  if(face){
    face.style.borderColor = `rgba(255,255,255,.10)`;
    face.style.background =
      `radial-gradient(520px 280px at 12% 18%, rgba(255,255,255,.12), rgba(255,255,255,.03)),` +
      `linear-gradient(160deg, rgba(255,255,255,.10), rgba(255,255,255,.02))`;
  }

  flyingCard.classList.remove("quick","arts","buster");
  flyingCard.classList.add(card.css);

  setTimeout(()=>deck.classList.remove("isDrawing"), 900);
}

function drawCardRandom(){
  return CARD_TYPES[randInt(0, CARD_TYPES.length-1)];
}

function addToHand(card){
  if(state.hand.length >= state.handLimit) return false;
  state.hand.push(card);
  return true;
}

function updateHandCount(){
  if(!handCount) return;
  handCount.textContent = `${state.hand.length}/${state.handLimit}`;
}

function renderHand(){
  if(!handGrid) return;

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
  if(!selectedName || !selectedDesc || !useCardBtn) return;

  if(state.selectedHandIndex == null || !state.hand[state.selectedHandIndex]){
    selectedName.textContent = "—";
    selectedDesc.textContent = "Selecione uma carta na mão para ver a descrição.";
    useCardBtn.disabled = true;
    return;
  }

  const card = state.hand[state.selectedHandIndex];
  selectedName.textContent = card.label;
  selectedDesc.textContent = card.desc;
  useCardBtn.disabled = false;
}

function newTurnFill(){
  while(state.hand.length < state.handLimit){
    const c = drawCardRandom();
    addToHand(c);
    animateDraw(c);
  }
  playClick();
  renderHand();
  renderSelectedPanel();
}

function drawOne(){
  if(state.hand.length >= state.handLimit) return;
  const c = drawCardRandom();
  addToHand(c);
  animateDraw(c);
  playClick();
  renderHand();
  renderSelectedPanel();
}

// ============================
// Usar carta -> habilita rolagem
// ============================

function useSelectedCard(){
  if(state.selectedHandIndex == null || !state.hand[state.selectedHandIndex]) return;

  playClick();

  const chosen = state.hand[state.selectedHandIndex];

  // --- aplica Combo armado do turno anterior (se a carta for diferente) ---
  state.comboApplied = false;
  if(state.comboArmed && state.comboFromCardKey){
    if(chosen.key !== state.comboFromCardKey){
      state.comboApplied = true;
    }
    // efeito vale só para o “próximo turno”, então desarma aqui de qualquer jeito
    state.comboArmed = false;
    state.comboFromCardKey = null;
  }

  state.usedCard = chosen;
  state.hand.splice(state.selectedHandIndex, 1);
  state.selectedHandIndex = null;

  // reseta dados e escolhas
  state.d6 = null; state.d8 = null; state.d10 = null; state.elem = null;
  state.d6Pick = null; state.d6ChoiceName = null;
  state.methodOverride = null;

  resetDiceUI();
  hideD6Choice();

  if(rollBtn) rollBtn.disabled = false;

  renderHand();
  renderSelectedPanel();
  updateOutputsBeforeRoll();
}

// ============================
// Rolagem
// ============================

function rollDice(){
  if(!state.usedCard) return;

  playRoll();

  const endAt = performance.now() + 900;
  const tick = () => {
    die6.textContent  = String(randInt(1,6));
    die8.textContent  = String(randInt(1,8));
    die10.textContent = String(randInt(1,10));

    if(performance.now() < endAt){
      requestAnimationFrame(tick);
    } else {
      state.d6  = randInt(1,6);
      state.d8  = randInt(1,8);
      state.d10 = randInt(1,10);

      setDie(die6,  state.d6);
      setDie(die8,  state.d8);
      setDie(die10, state.d10);

      // elemento se d8=1
      state.elem = null;
      if(state.d8 === 1){
        state.elem = randInt(1,6);
        dieElemBox.classList.remove("hidden");
        setDie(dieElem, state.elem);
      } else {
        dieElemBox.classList.add("hidden");
      }

      showD6Choice();
      updatePreChoiceInfo();
      updateOutputsAfterRollBeforeChoice();
    }
  };
  tick();
}

// ============================
// d6 choice (no resultado)
// ============================

function showD6Choice(){
  d6ChoiceWrap.classList.remove("hidden");
  adaptWrap.classList.add("hidden");

  const o = getD6Obj(state.d6);
  if(!o){
    d6ChoiceHint.textContent = "d6 inválido.";
    optA.innerHTML = "—";
    optB.innerHTML = "—";
    optA.disabled = true; optB.disabled = true;
    return;
  }

  d6ChoiceHint.textContent = `d6(${state.d6}) — escolha uma opção:`;

  const aDesc = (o.a || "").replace(/^.*?:\s*/, "");
  const bDesc = (o.b || "").replace(/^.*?:\s*/, "");

  optA.innerHTML = `<div class="choiceTitle">${o.pair[0]}</div><div class="choiceDesc">${aDesc}</div>`;
  optB.innerHTML = `<div class="choiceTitle">${o.pair[1]}</div><div class="choiceDesc">${bDesc}</div>`;

  optA.classList.remove("selected");
  optB.classList.remove("selected");
  optA.disabled = false;
  optB.disabled = false;
}

function hideD6Choice(){
  d6ChoiceWrap.classList.add("hidden");
  adaptWrap.classList.add("hidden");
}

function updatePreChoiceInfo(){
  const methodIdx = chosenMethodIndex();
  preLines.innerHTML = `
    <div><strong>Carta:</strong> ${state.usedCard ? state.usedCard.label : "—"}</div>
    <div><strong>d8:</strong> ${d8Text(methodIdx)}${state.methodOverride ? " (reinterpretado)" : ""}</div>
    <div><strong>d10:</strong> ${d10Name(state.d10)}</div>
    <div><strong>Elemento:</strong> ${methodIdx === 1 ? elemText(state.elem) : "—"}</div>
  `;
}

function setAdaptSelect(){
  adaptMethod.innerHTML = "";
  for(let i=1;i<=8;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${i}) ${D8_METHODS[i-1]}`;
    adaptMethod.appendChild(opt);
  }
  adaptMethod.value = String(chosenMethodIndex());
}

function applyD6Pick(pick){
  if(!state.d6) return;

  playClick();

  state.d6Pick = pick;
  state.d6ChoiceName = getD6ChoiceName(state.d6, pick);

  optA.classList.toggle("selected", pick === "A");
  optB.classList.toggle("selected", pick === "B");

  // Adaptação (d6=5, opção A)
  if(state.d6 === 5 && pick === "A"){
    adaptWrap.classList.remove("hidden");
    setAdaptSelect();
  } else {
    state.methodOverride = null;
    adaptWrap.classList.add("hidden");
  }

  updatePreChoiceInfo();
  updateFinalResult();
}

function onAdaptChange(){
  if(!(state.d6 === 5 && state.d6Pick === "A")) return;

  const newIdx = parseInt(adaptMethod.value, 10);
  if(!Number.isFinite(newIdx) || newIdx < 1 || newIdx > 8) return;

  state.methodOverride = newIdx;

  // se reinterpretar para elemental, define elemento
  if(state.methodOverride === 1){
    if(!state.elem){
      state.elem = randInt(1,6);
      dieElemBox.classList.remove("hidden");
      setDie(dieElem, state.elem);
    }
  } else {
    state.elem = null;
    dieElemBox.classList.add("hidden");
  }

  updatePreChoiceInfo();
  updateFinalResult();
}

// ============================
// Output
// ============================

function clearOutputs(){
  comboLine.textContent = "Escolha uma carta e role os dados.";
  comboSub.textContent = "";

  outCard.textContent = "—";
  outD8.textContent = "—";
  outD6.textContent = "—";
  outD10.textContent = "—";
  outElem.textContent = "—";

  spellSummary.textContent = "—";
  spellText.textContent = "A descrição aparece depois que você escolher a opção do d6.";
}

function updateOutputsBeforeRoll(){
  clearOutputs();
  outCard.textContent = state.usedCard ? `${state.usedCard.label} — ${state.usedCard.desc}` : "—";

  let extra = "";
  if(state.comboApplied){
    extra = " (Combo ativado: carta diferente do turno anterior)";
  }

  comboLine.textContent = state.usedCard
    ? `Carta usada: ${state.usedCard.label}${extra} (agora role os dados)`
    : "Escolha uma carta e role os dados.";

  comboSub.textContent = state.usedCard ? "Clique em “Girar dados”." : "";
}

function updateOutputsAfterRollBeforeChoice(){
  const methodIdx = chosenMethodIndex();

  outCard.textContent = `${state.usedCard.label} — ${state.usedCard.desc}`;
  outD8.textContent = `d8(${state.d8}) — ${d8Text(methodIdx)}`;
  outD10.textContent = `d10(${state.d10}) — ${d10Text(state.d10)}`;
  outD6.textContent = `d6(${state.d6}) — escolha pendente`;
  outElem.textContent = (methodIdx === 1) ? elemText(state.elem) : "—";

  comboLine.textContent = `${state.usedCard.label} + d8(${state.d8}) + d6(${state.d6}) + d10(${state.d10})`;
  comboSub.textContent = "Escolha a opção do d6 para fechar a magia.";

  spellSummary.textContent = "—";
  spellText.textContent = "Escolha a opção do d6 para gerar a descrição temática.";
}

function updateFinalResult(){
  if(!state.d6Pick) return;

  const methodIdx = chosenMethodIndex();
  const methodLabel = d8Text(methodIdx);
  const elemLabel = (methodIdx === 1) ? elemText(state.elem) : null;

  const d6Desc = getD6ChoiceDesc(state.d6, state.d6Pick);
  const d10N = d10Name(state.d10);

  outD8.textContent = `d8(${state.d8}) — ${methodLabel}${state.methodOverride ? " (reinterpretado)" : ""}`;
  outD10.textContent = `d10(${state.d10}) — ${d10Text(state.d10)}`;
  outD6.textContent = `d6(${state.d6}) — ${state.d6ChoiceName} — ${d6Desc}`;
  outElem.textContent = elemLabel ? elemLabel : "—";

  let combo = `${state.usedCard.label} + d8(${methodIdx}${state.methodOverride ? "*" : ""}) + d6(${state.d6}:${state.d6ChoiceName}) + d10(${state.d10}:${d10N})`;
  if(elemLabel) combo += ` + elemento(${elemLabel})`;

  comboLine.textContent = combo;

  const comboTag = state.comboApplied ? " | Combo ativado (carta diferente)" : "";
  comboSub.textContent = `Método: ${methodLabel}${elemLabel ? ` (${elemLabel})` : ""} | Escolha: ${d6Desc} | Momento: ${D10_MOMENTS[state.d10-1].desc}${comboTag}`;

  // Gera texto da magia (comboApplied altera a descrição/dano)
  const spell = Magia.generate({
    cardKey: state.usedCard.key,
    methodIndex: methodIdx,
    elementLabel: elemLabel,
    d6ChoiceName: state.d6ChoiceName,
    d10Index: state.d10,
    comboApplied: state.comboApplied,
  });

  spellSummary.textContent = spell.summary;
  spellText.textContent = spell.text;

  // Recuperação compra 1 carta (respeitando limite)
  if(state.d6 === 6 && state.d6Pick === "B"){
    if(state.hand.length < state.handLimit){
      const c = drawCardRandom();
      addToHand(c);
      animateDraw(c);
      renderHand();
      renderSelectedPanel();
    }
  }

  // Se o Momento foi COMBO, arma para o próximo turno
  if(d10N === "Combo"){
    state.comboArmed = true;
    state.comboFromCardKey = state.usedCard.key;
  }
}

// ============================
// Tabelas
// ============================

function renderTables(){
  if(tableD8){
    tableD8.innerHTML = "";
    D8_METHODS.forEach((t)=>{
      const li = document.createElement("li");
      li.textContent = t;
      tableD8.appendChild(li);
    });
  }

  if(tableD10){
    tableD10.innerHTML = "";
    D10_MOMENTS.forEach((o)=>{
      const li = document.createElement("li");
      li.textContent = `${o.name} — ${o.desc}`;
      tableD10.appendChild(li);
    });
  }

  if(tableD6){
    tableD6.innerHTML = "";
    D6_CHOICES.forEach((o, i)=>{
      const box = document.createElement("div");
      box.className = "ruleBox";
      box.innerHTML = `
        <div class="ruleHead">
          <div class="ruleName">${i+1}) ${o.pair[0]} ou ${o.pair[1]}</div>
        </div>
        <div class="ruleDesc">${o.a}</div>
        <div class="ruleDesc" style="margin-top:6px">${o.b}</div>
      `;
      tableD6.appendChild(box);
    });
  }
}

// ============================
// Limite da mão (input)
// ============================

function applyHandLimitFromUI(){
  if(!handLimitInput) return;
  const v = clampHandLimit(parseInt(handLimitInput.value, 10));
  handLimitInput.value = String(v);
  state.handLimit = v;

  // se reduzir e a mão ficou maior que o limite, corta o excesso do fim
  if(state.hand.length > state.handLimit){
    state.hand = state.hand.slice(0, state.handLimit);
    if(state.selectedHandIndex != null && state.selectedHandIndex >= state.handLimit){
      state.selectedHandIndex = null;
    }
  }

  renderHand();
  renderSelectedPanel();
}

// ============================
// Reset
// ============================

function resetAll(){
  state.hand = [];
  state.selectedHandIndex = null;
  state.usedCard = null;

  state.d6 = null; state.d8 = null; state.d10 = null; state.elem = null;
  state.d6Pick = null; state.d6ChoiceName = null;
  state.methodOverride = null;

  state.comboArmed = false;
  state.comboFromCardKey = null;
  state.comboApplied = false;

  resetDiceUI();
  hideD6Choice();
  clearOutputs();

  if(rollBtn) rollBtn.disabled = true;

  renderHand();
  renderSelectedPanel();
}

// ============================
// Eventos
// ============================

if(newTurnBtn) newTurnBtn.addEventListener("click", ()=>{ newTurnFill(); });
if(drawOneBtn) drawOneBtn.addEventListener("click", ()=>{ drawOne(); });

if(resetBtn) resetBtn.addEventListener("click", ()=>{ playClick(); resetAll(); });

if(useCardBtn) useCardBtn.addEventListener("click", ()=>{ useSelectedCard(); });

if(rollBtn) rollBtn.addEventListener("click", ()=>{ rollDice(); });

if(optA) optA.addEventListener("click", ()=>{ applyD6Pick("A"); });
if(optB) optB.addEventListener("click", ()=>{ applyD6Pick("B"); });

if(adaptMethod) adaptMethod.addEventListener("change", ()=>{ onAdaptChange(); });

if(handLimitInput){
  handLimitInput.addEventListener("change", ()=>{ playClick(); applyHandLimitFromUI(); });
  handLimitInput.addEventListener("input", ()=>{ applyHandLimitFromUI(); });
}

// ============================
// Init
// ============================

(function init(){
  renderTables();
  if(handLimitInput) applyHandLimitFromUI();
  resetAll();
  newTurnFill(); // começa com mão cheia por padrão
})();
