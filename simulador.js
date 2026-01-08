// simulador.js
// - Suporta combo de 1 a 3 cartas
// - Permite rolar d6/d8/d10 separadamente (ou todos de uma vez)
// - Limite de cartas na mão é configurável
// - Permite escolher modo: Taumaturgia (magia) ou Volumen (familiar)

function $(id){ return document.getElementById(id); }

// ============================
// Config (cartas e tabelas)
// ============================

const CARD_TYPES = [
  { key:"quick",  label:"Quick",  css:"quick",  icon:"assets/card_quick.svg",  desc:"Quick foca em vários alvos (magia em área)." },
  { key:"arts",   label:"Arts",   css:"arts",   icon:"assets/card_arts.svg",   desc:"Arts causa um efeito em um alvo." },
  { key:"buster", label:"Buster", css:"buster", icon:"assets/card_buster.svg", desc:"Buster foca em um inimigo (um alvo)." },
];

const D8_METHODS = Magia.D8;
const D6_CHOICES = Magia.D6;
const D10_MOMENTS = Magia.D10;
const ELEMENTS = Magia.ELEMENTS;

// ============================
// Estado
// ============================

const state = {
  nextCardId: 1,

  hand: [],                 // {id,key,label,css,icon,desc}
  selectedCardId: null,

  combo: [],                // lista de ids (ordem importa)
  usedCombo: null,          // { cards: [cardObj], mode: 'magia'|'volumen' }

  d6: null,
  d8: null,
  d10: null,
  elem: null,

  rolled: { d6:false, d8:false, d10:false, elem:false },

  d6Pick: null,             // "A" ou "B"
  d6ChoiceName: null,       // nome da escolha

  methodOverride: null,     // usado apenas se d6=5 e opção A (Adaptação)
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

const handLimitInput = $("handLimitInput");
const modeSelect = $("modeSelect");

const handGrid = $("handGrid");
const handCount = $("handCount");
const selectedName = $("selectedName");
const selectedDesc = $("selectedDesc");

const addToComboBtn = $("addToComboBtn");
const removeFromComboBtn = $("removeFromComboBtn");

const comboSlots = $("comboSlots");
const confirmComboBtn = $("confirmComboBtn");
const clearComboBtn = $("clearComboBtn");

const rollAllBtn = $("rollAllBtn");
const rollD6Btn = $("rollD6Btn");
const rollD8Btn = $("rollD8Btn");
const rollD10Btn = $("rollD10Btn");

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
  }catch(_){ }
}

function playClick(){ playTone(740, 80, "triangle", 0.05); }
function playRoll(){
  if(!soundToggle.checked) return;
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
  }catch(_){ }
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

function getHandLimit(){
  const v = parseInt(handLimitInput.value, 10);
  return Number.isFinite(v) ? Math.max(1, Math.min(99, v)) : 7;
}

function saveHandLimit(){
  try{ localStorage.setItem("handLimit", String(getHandLimit())); }catch(_){ }
}

function loadHandLimit(){
  try{
    const v = parseInt(localStorage.getItem("handLimit") || "7", 10);
    if(Number.isFinite(v)) handLimitInput.value = String(Math.max(1, Math.min(99, v)));
  }catch(_){ }
}

function chosenMethodIndex(){
  return state.methodOverride ?? state.d8;
}

function d8Text(idx){ return D8_METHODS[idx-1] || "—"; }
function d10Name(idx){ return D10_MOMENTS[idx-1]?.name || "—"; }
function d10Text(idx){
  const o = D10_MOMENTS[idx-1];
  return o ? `${o.name}: ${o.desc}` : "—";
}
function elemText(idx){ return idx ? (ELEMENTS[idx-1] || "—") : "—"; }

function getD6Obj(d6){ return D6_CHOICES[d6-1] || null; }
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

function cardsLabel(cards){
  return cards.map(c => c.label).join(" + ") || "—";
}

function resetDiceState(){
  state.d6 = null; state.d8 = null; state.d10 = null; state.elem = null;
  state.rolled = { d6:false, d8:false, d10:false, elem:false };
  state.d6Pick = null;
  state.d6ChoiceName = null;
  state.methodOverride = null;

  die6.textContent = "—";
  die8.textContent = "—";
  die10.textContent = "—";
  dieElem.textContent = "—";
  dieElemBox.classList.add("hidden");

  hideD6Choice();
}

function canChooseD6(){
  const methodIdx = chosenMethodIndex();
  const needsElem = (methodIdx === 1);
  if(needsElem && !state.rolled.elem) return false;
  return state.rolled.d6 && state.rolled.d8 && state.rolled.d10;
}

// ============================
// Cartas: comprar + mão
// ============================

function animateDraw(card){
  deck.classList.remove("isDrawing");
  void deck.offsetWidth;
  deck.classList.add("isDrawing");

  const typeEl = flyingCard.querySelector(".cardType");
  typeEl.textContent = card.label;

  const face = flyingCard.querySelector(".cardFace");
  face.style.borderColor = `rgba(255,255,255,.10)`;
  face.style.background =
    `radial-gradient(520px 280px at 12% 18%, rgba(255,255,255,.12), rgba(255,255,255,.03)),` +
    `linear-gradient(160deg, rgba(255,255,255,.10), rgba(255,255,255,.02))`;

  flyingCard.classList.remove("quick","arts","buster");
  flyingCard.classList.add(card.css);

  setTimeout(()=>deck.classList.remove("isDrawing"), 900);
}

function drawCardRandom(){
  const picked = CARD_TYPES[randInt(0, CARD_TYPES.length-1)];
  return {
    id: state.nextCardId++,
    key: picked.key,
    label: picked.label,
    css: picked.css,
    icon: picked.icon,
    desc: picked.desc,
  };
}

function addToHand(card){
  if(state.hand.length >= getHandLimit()) return false;
  state.hand.push(card);
  return true;
}

function updateHandCount(){ handCount.textContent = String(state.hand.length); }

function isCardInCombo(cardId){
  return state.combo.includes(cardId);
}

function getSelectedCard(){
  return state.hand.find(c => c.id === state.selectedCardId) || null;
}

function renderHand(){
  handGrid.innerHTML = "";

  const maxSlots = Math.max(getHandLimit(), 7); // mantém grid com 7 por estética
  for(let i=0;i<maxSlots;i++){
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
    if(state.selectedCardId === card.id) div.classList.add("selected");
    if(isCardInCombo(card.id)) div.classList.add("inCombo");

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
      state.selectedCardId = card.id;
      renderHand();
      renderSelectedPanel();
    });

    handGrid.appendChild(div);
  }

  updateHandCount();
}

function renderSelectedPanel(){
  const card = getSelectedCard();
  if(!card){
    selectedName.textContent = "—";
    selectedDesc.textContent = "Selecione uma carta na mão para ver a descrição.";
    addToComboBtn.disabled = true;
    removeFromComboBtn.disabled = true;
    return;
  }

  selectedName.textContent = card.label;
  selectedDesc.textContent = card.desc;

  const inCombo = isCardInCombo(card.id);
  addToComboBtn.disabled = inCombo || state.combo.length >= 3;
  removeFromComboBtn.disabled = !inCombo;
}

function newTurnFill(){
  while(state.hand.length < getHandLimit()){
    const c = drawCardRandom();
    addToHand(c);
    animateDraw(c);
  }
  playClick();
  renderHand();
  renderSelectedPanel();
  updateComboUI();
}

function drawOne(){
  if(state.hand.length >= getHandLimit()) return;
  const c = drawCardRandom();
  addToHand(c);
  animateDraw(c);
  playClick();
  renderHand();
  renderSelectedPanel();
  updateComboUI();
}

// ============================
// Combo
// ============================

function addSelectedToCombo(){
  const card = getSelectedCard();
  if(!card) return;
  if(state.combo.length >= 3) return;
  if(isCardInCombo(card.id)) return;

  playClick();
  state.combo.push(card.id);
  renderHand();
  renderSelectedPanel();
  updateComboUI();
}

function removeSelectedFromCombo(){
  const card = getSelectedCard();
  if(!card) return;
  if(!isCardInCombo(card.id)) return;

  playClick();
  state.combo = state.combo.filter(id => id !== card.id);
  renderHand();
  renderSelectedPanel();
  updateComboUI();
}

function moveComboCard(cardId, dir){
  const idx = state.combo.indexOf(cardId);
  if(idx < 0) return;
  const next = idx + dir;
  if(next < 0 || next >= state.combo.length) return;

  const arr = state.combo.slice();
  const tmp = arr[idx];
  arr[idx] = arr[next];
  arr[next] = tmp;
  state.combo = arr;
  updateComboUI();
}

function removeComboCard(cardId){
  state.combo = state.combo.filter(id => id !== cardId);
  updateComboUI();
  renderHand();
  renderSelectedPanel();
}

function updateComboUI(){
  comboSlots.innerHTML = "";

  const cards = state.combo
    .map(id => state.hand.find(c => c.id === id))
    .filter(Boolean);

  for(let i=0;i<3;i++){
    const c = cards[i] || null;
    const slot = document.createElement("div");
    slot.className = "comboSlot";

    if(!c){
      slot.classList.add("empty");
      slot.innerHTML = `<div class="slotTitle">Slot ${i+1}</div><div class="slotSub">—</div>`;
      comboSlots.appendChild(slot);
      continue;
    }

    slot.classList.add(c.css);
    slot.innerHTML = `
      <div class="slotTitle">Slot ${i+1}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:6px;">
        <img class="handIcon" src="${c.icon}" alt="${c.label}" />
        <div>
          <div style="font-weight:700;">${c.label}</div>
          <div class="slotSub">clique para remover • use ◀ ▶ para reordenar</div>
        </div>
      </div>
      <div class="slotBtns">
        <button class="btn small" data-act="left">◀</button>
        <button class="btn small" data-act="right">▶</button>
        <button class="btn small" data-act="remove">Remover</button>
      </div>
    `;

    slot.addEventListener("click", (ev)=>{
      const t = ev.target;
      if(t && t.dataset && t.dataset.act){
        ev.stopPropagation();
        playClick();
        const act = t.dataset.act;
        if(act === "left") moveComboCard(c.id, -1);
        if(act === "right") moveComboCard(c.id, +1);
        if(act === "remove") removeComboCard(c.id);
        return;
      }
      // clique no slot remove
      playClick();
      removeComboCard(c.id);
    });

    comboSlots.appendChild(slot);
  }

  confirmComboBtn.disabled = (cards.length === 0);
  clearComboBtn.disabled = (cards.length === 0);

  // se existir um combo ainda não confirmado, não atrapalha, mas impede confirmar novamente sem reset
  if(state.usedCombo){
    confirmComboBtn.disabled = true;
    clearComboBtn.disabled = true;
  }
}

function clearCombo(){
  playClick();
  state.combo = [];
  updateComboUI();
  renderHand();
  renderSelectedPanel();
}

function confirmCombo(){
  if(state.usedCombo) return;

  const cards = state.combo
    .map(id => state.hand.find(c => c.id === id))
    .filter(Boolean);

  if(cards.length === 0) return;

  playClick();

  // Remove cartas do combo da mão
  const usedIds = new Set(cards.map(c => c.id));
  state.hand = state.hand.filter(c => !usedIds.has(c.id));

  state.usedCombo = {
    cards,
    mode: modeSelect.value === "volumen" ? "volumen" : "magia",
  };

  // limpa seleção e combo
  state.selectedCardId = null;
  state.combo = [];

  resetDiceState();
  clearOutputs();
  hideD6Choice();

  rollAllBtn.disabled = false;
  rollD6Btn.disabled = false;
  rollD8Btn.disabled = false;
  rollD10Btn.disabled = false;

  renderHand();
  renderSelectedPanel();
  updateComboUI();
  updateOutputsBeforeRoll();
}

// ============================
// Rolagem (individual)
// ============================

function animateRoll(sides, onDone){
  playRoll();
  const endAt = performance.now() + 700;
  const tick = () => {
    onDone(randInt(1, sides), true);
    if(performance.now() < endAt){
      requestAnimationFrame(tick);
    } else {
      onDone(randInt(1, sides), false);
    }
  };
  tick();
}

function ensureElementIfNeeded(){
  const methodIdx = chosenMethodIndex();
  if(methodIdx !== 1) {
    state.elem = null;
    state.rolled.elem = false;
    dieElemBox.classList.add("hidden");
    dieElem.textContent = "—";
    return;
  }

  if(state.rolled.elem && state.elem) return;
  state.elem = randInt(1, 6);
  state.rolled.elem = true;
  dieElemBox.classList.remove("hidden");
  setDie(dieElem, state.elem);
}

function maybeShowD6Choice(){
  if(!canChooseD6()) return;
  if(state.d6Pick) return;
  showD6Choice();
  updatePreChoiceInfo();
  updateOutputsAfterRollBeforeChoice();
}

function rollD8(){
  if(!state.usedCombo || state.rolled.d8) return;
  animateRoll(8, (v, spinning)=>{
    die8.textContent = String(v);
    if(!spinning){
      state.d8 = v;
      state.rolled.d8 = true;
      setDie(die8, v);

      // elemento se método=1
      state.methodOverride = null; // rolar d8 de novo reseta override
      ensureElementIfNeeded();

      updateOutputsAfterAnyRoll();
      maybeShowD6Choice();
    }
  });
}

function rollD10(){
  if(!state.usedCombo || state.rolled.d10) return;
  animateRoll(10, (v, spinning)=>{
    die10.textContent = String(v);
    if(!spinning){
      state.d10 = v;
      state.rolled.d10 = true;
      setDie(die10, v);
      updateOutputsAfterAnyRoll();
      maybeShowD6Choice();
    }
  });
}

function rollD6(){
  if(!state.usedCombo || state.rolled.d6) return;
  animateRoll(6, (v, spinning)=>{
    die6.textContent = String(v);
    if(!spinning){
      state.d6 = v;
      state.rolled.d6 = true;
      setDie(die6, v);
      updateOutputsAfterAnyRoll();
      maybeShowD6Choice();
    }
  });
}

function rollAll(){
  if(!state.usedCombo) return;
  if(state.rolled.d6 || state.rolled.d8 || state.rolled.d10) return;

  // rola os três em paralelo (animação simples)
  playRoll();
  const endAt = performance.now() + 900;
  const tick = () => {
    die6.textContent = String(randInt(1,6));
    die8.textContent = String(randInt(1,8));
    die10.textContent = String(randInt(1,10));
    if(performance.now() < endAt){
      requestAnimationFrame(tick);
    } else {
      state.d6 = randInt(1,6);
      state.d8 = randInt(1,8);
      state.d10 = randInt(1,10);

      state.rolled.d6 = true;
      state.rolled.d8 = true;
      state.rolled.d10 = true;

      setDie(die6, state.d6);
      setDie(die8, state.d8);
      setDie(die10, state.d10);

      state.methodOverride = null;
      ensureElementIfNeeded();

      updateOutputsAfterAnyRoll();
      maybeShowD6Choice();
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
    optA.disabled = true;
    optB.disabled = true;
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
  const combo = state.usedCombo ? cardsLabel(state.usedCombo.cards) : "—";
  const mode = state.usedCombo ? (state.usedCombo.mode === "volumen" ? "Volumen" : "Taumaturgia") : "—";

  preLines.innerHTML = `
    <div><strong>Combo:</strong> ${combo}</div>
    <div><strong>Modo:</strong> ${mode}</div>
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
  if(!canChooseD6()) return;

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

  // se virar elemental, precisa de elemento
  ensureElementIfNeeded();

  updatePreChoiceInfo();
  updateFinalResult();
}

// ============================
// Output
// ============================

function clearOutputs(){
  comboLine.textContent = "Monte um combo e role os dados.";
  comboSub.textContent = "";

  outCard.textContent = "—";
  outD8.textContent = "—";
  outD6.textContent = "—";
  outD10.textContent = "—";
  outElem.textContent = "—";

  spellSummary.textContent = "—";
  spellText.textContent = "A descrição aparece depois que você fechar a escolha do d6.";
}

function updateOutputsBeforeRoll(){
  clearOutputs();

  const combo = state.usedCombo ? cardsLabel(state.usedCombo.cards) : "—";
  const mode = state.usedCombo ? (state.usedCombo.mode === "volumen" ? "Volumen" : "Taumaturgia") : "—";

  outCard.textContent = state.usedCombo ? `${combo} — modo: ${mode}` : "—";

  comboLine.textContent = state.usedCombo ? `Combo confirmado: ${combo}` : "Monte um combo para começar.";
  comboSub.textContent = state.usedCombo ? "Role d6/d8/d10 (em qualquer ordem)." : "";
}

function updateOutputsAfterAnyRoll(){
  if(!state.usedCombo){
    clearOutputs();
    return;
  }

  const methodIdx = chosenMethodIndex();
  const combo = cardsLabel(state.usedCombo.cards);
  const mode = (state.usedCombo.mode === "volumen" ? "Volumen" : "Taumaturgia");

  outCard.textContent = `${combo} — modo: ${mode}`;

  outD8.textContent = state.rolled.d8 ? `d8(${state.d8}) — ${d8Text(methodIdx)}${state.methodOverride ? " (reinterpretado)" : ""}` : "d8 — pendente";
  outD10.textContent = state.rolled.d10 ? `d10(${state.d10}) — ${d10Text(state.d10)}` : "d10 — pendente";
  outD6.textContent = state.rolled.d6 ? (state.d6Pick ? `d6(${state.d6}) — ${state.d6ChoiceName}` : `d6(${state.d6}) — escolha pendente`) : "d6 — pendente";

  outElem.textContent = (methodIdx === 1 && state.rolled.elem) ? elemText(state.elem) : (methodIdx === 1 ? "pendente" : "—");

  const bits = [];
  if(state.rolled.d8) bits.push(`d8(${state.d8})`);
  if(state.rolled.d6) bits.push(`d6(${state.d6})`);
  if(state.rolled.d10) bits.push(`d10(${state.d10})`);
  comboLine.textContent = `${combo} + ${bits.join(" + ") || "role os dados"}`;
}

function updateOutputsAfterRollBeforeChoice(){
  // mantido por compatibilidade visual (chamado após abrir escolha)
  updateOutputsAfterAnyRoll();
  comboSub.textContent = "Escolha a opção do d6 para fechar o efeito.";
}

function updateFinalResult(){
  if(!state.usedCombo) return;
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

  const combo = cardsLabel(state.usedCombo.cards);
  const mode = (state.usedCombo.mode === "volumen" ? "Volumen" : "Taumaturgia");

  comboLine.textContent = `${combo} — ${mode}`;
  comboSub.textContent = `${methodLabel}${elemLabel ? ` (${elemLabel})` : ""} | ${state.d6ChoiceName} | ${d10N}`;

  const spell = Magia.generate({
    cards: state.usedCombo.cards.map(c => c.key),
    mode: state.usedCombo.mode,
    methodIndex: methodIdx,
    elementLabel: elemLabel,
    d6ChoiceName: state.d6ChoiceName,
    d10Index: state.d10,
  });

  spellSummary.textContent = spell.summary;
  spellText.textContent = spell.text;

  // Recuperação compra 1 carta (respeitando limite configurado)
  if(state.d6 === 6 && state.d6Pick === "B"){
    if(state.hand.length < getHandLimit()){
      const c = drawCardRandom();
      addToHand(c);
      animateDraw(c);
      renderHand();
      renderSelectedPanel();
      updateComboUI();
    }
  }
}

// ============================
// Tabelas
// ============================

function renderTables(){
  tableD8.innerHTML = "";
  D8_METHODS.forEach((t)=>{
    const li = document.createElement("li");
    li.textContent = t;
    tableD8.appendChild(li);
  });

  tableD10.innerHTML = "";
  D10_MOMENTS.forEach((o)=>{
    const li = document.createElement("li");
    li.textContent = `${o.name} — ${o.desc}`;
    tableD10.appendChild(li);
  });

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

// ============================
// Reset
// ============================

function resetAll(){
  state.hand = [];
  state.combo = [];
  state.usedCombo = null;
  state.selectedCardId = null;

  resetDiceState();
  clearOutputs();

  rollAllBtn.disabled = true;
  rollD6Btn.disabled = true;
  rollD8Btn.disabled = true;
  rollD10Btn.disabled = true;

  renderHand();
  renderSelectedPanel();
  updateComboUI();
}

// ============================
// Eventos
// ============================

newTurnBtn.addEventListener("click", ()=>{ newTurnFill(); });
drawOneBtn.addEventListener("click", ()=>{ drawOne(); });

resetBtn.addEventListener("click", ()=>{ playClick(); resetAll(); newTurnFill(); });

addToComboBtn.addEventListener("click", ()=>{ addSelectedToCombo(); });
removeFromComboBtn.addEventListener("click", ()=>{ removeSelectedFromCombo(); });

confirmComboBtn.addEventListener("click", ()=>{ confirmCombo(); });
clearComboBtn.addEventListener("click", ()=>{ clearCombo(); });

rollAllBtn.addEventListener("click", ()=>{ rollAll(); });
rollD6Btn.addEventListener("click", ()=>{ rollD6(); });
rollD8Btn.addEventListener("click", ()=>{ rollD8(); });
rollD10Btn.addEventListener("click", ()=>{ rollD10(); });

optA.addEventListener("click", ()=>{ applyD6Pick("A"); });
optB.addEventListener("click", ()=>{ applyD6Pick("B"); });

adaptMethod.addEventListener("change", ()=>{ onAdaptChange(); });

handLimitInput.addEventListener("change", ()=>{
  saveHandLimit();
  // atualiza render e impede draws se estiver acima
  renderHand();
  updateComboUI();
});

// ============================
// Init
// ============================

(function init(){
  loadHandLimit();
  renderTables();
  resetAll();
  newTurnFill();
})();
