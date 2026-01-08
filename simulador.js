// ============================================================
// Config (fiel ao texto final do usuário) + regra extra do elemento
// ============================================================

const CARD_TYPES = [
  { key: "Quick",  css: "quick",  label: "Quick",  color: "#31d17d" },
  { key: "Arts",   css: "arts",   label: "Arts",   color: "#58a6ff" },
  { key: "Buster", css: "buster", label: "Buster", color: "#ff4d4d" },
];

const D8_METHODS = [
  "Elemental clássico",
  "Alteração de propriedades físicas (densidade, atrito, dureza, pressão)",
  "Energia (calor, cinética, elétrica como energia pura)",
  "Interferência mágica (ruído, distorção, quebra de fórmulas)",
  "Materialização temporária (criação breve de objetos ou estruturas)",
  "Ressonância (vibração, frequência, desestabilização interna)",
  "Vetor (direcionamento, impulso, redirecionamento de força)",
  "Selo técnico (marca arcana que altera interações futuras)",
];

// Elementos quando d8 = Elemental clássico (1)
const ELEMENTS_D6 = [
  "Fogo",
  "Terra",
  "Água",
  "Ar",
  "Raio",
  "Luz",
];

// d6: cada número -> duas opções (nome + descrição), exatamente como no texto
const D6_CHOICES = {
  1: {
    title: "Segurança ou Alcance",
    A: { name: "Segurança", desc: "você ignora uma reação inimiga" },
    B: { name: "Alcance",   desc: "você pode estender o efeito/ quantidade de alvos atingidos alem do permitido pela carta" },
  },
  2: {
    title: "Precisão ou Velocidade",
    A: { name: "Precisão",  desc: "bônus no teste de acerto (+1 alem do atual)" },
    B: { name: "Velocidade",desc: "você pode agir antes de alguém que normalmente agiria antes (serve pra reação (vantagem nesse caso))" },
  },
  3: {
    title: "Pressão ou Controle",
    A: { name: "Pressão",  desc: "impõe desvantagem na próxima ação do alvo" },
    B: { name: "Controle", desc: "cria uma condição leve (dificulta movimento, visão, conjuração)" },
  },
  4: {
    title: "Continuidade ou Explosão",
    A: { name: "Continuidade", desc: "efeito persiste um turno extra" },
    B: { name: "Explosão",     desc: "efeito acontece todo de uma vez" },
  },
  5: {
    title: "Adaptação ou Sinergia",
    A: { name: "Adaptação", desc: "você pode reinterpretar o resultado do d8 de forma coerente" },
    B: { name: "Sinergia",  desc: "concede bônus para o próximo aliado que agir" },
  },
  6: {
    title: "Marca ou Recuperação",
    A: { name: "Marca",       desc: "alvo fica marcado para aplicar efeitos sem ter que acertar o alvo em si" },
    B: { name: "Recuperação", desc: "você compra 1 carta adicional (respeitando o limite de 7)" },
  },
};

// d10: lista de 1..10, exatamente como no texto
const D10_MOMENTS = [
  { name: "Eco", desc: "Se a magia acertar, o ataque se repete em outro alvo válido" },
  { name: "Janela", desc: "Se o alvo errar a próxima ação, sofre 1d6 de dano" },
  { name: "Quebra", desc: "Remove uma proteção, buff ou preparação ativa do alvo" },
  { name: "Reação", desc: "Você pode realizar uma reação novamente caso sofra um ataque e sua primeira tentativa de reação tenha falhado" },
  { name: "Presságio", desc: "Olhe a próxima carta do seu deck e decida manter ou trocar" },
  { name: "Ancoragem", desc: "Até o próximo turno, efeitos do mesmo método (d8)  serão escolhidos" },
  { name: "Deslocamento", desc: "Você ou o alvo muda de posição de forma relevante e instantanea" },
  { name: "Amplificação Narrativa", desc: "O efeito causa impacto ambiental ou narrativo útil (concede vantagem)" },
  { name: "Combo", desc: "Se usar uma carta diferente no próximo turno, ganha bônus de dano ou efeito" },
  { name: "Clímax", desc: "Ignora todas as desvantagens atuais pra realização de uma magia eficaz" },
];

// ============================================================
// Estado
// ============================================================

let state = {
  card: null,       // {key, css, label, color}
  d6: null,         // number 1..6
  d6Pick: null,     // "A" or "B"
  d8: null,         // number 1..8
  d10: null,        // number 1..10
  elem: null,       // number 1..6 (apenas quando d8==1)
};

// ============================================================
// Helpers
// ============================================================

const $ = (id) => document.getElementById(id);

function randInt(min, maxInclusive){
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

function setText(el, text){
  if (!el) return;
  el.textContent = text;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ============================================================
// Som (Web Audio simples, sem arquivos)
// ============================================================

let audioCtx = null;

function canSound(){
  const t = $("soundToggle");
  return !!t && t.checked;
}

function ensureAudio(){
  if (!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended"){
    audioCtx.resume().catch(()=>{});
  }
}

function playClick(){
  if (!canSound()) return;
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(440, audioCtx.currentTime);
  g.gain.setValueAtTime(0.001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  o.connect(g).connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.09);
}

function playWhoosh(){
  if (!canSound()) return;
  ensureAudio();
  const bufferSize = audioCtx.sampleRate * 0.12;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0;i<bufferSize;i++){
    data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 900;

  const g = audioCtx.createGain();
  g.gain.value = 0.14;

  src.connect(filter).connect(g).connect(audioCtx.destination);
  src.start();
}

function playDice(){
  if (!canSound()) return;
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(220, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);
  g.gain.setValueAtTime(0.001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  o.connect(g).connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.13);
}

// ============================================================
// UI refs
// ============================================================

const deck = $("deck");
const flyingCard = $("flyingCard");
const drawBtn = $("drawBtn");
const resetBtn = $("resetBtn");

const cardDisplay = $("cardDisplay");

const rollBtn = $("rollBtn");
const die6 = $("die6");
const die8 = $("die8");
const die10 = $("die10");

const dieElemBox = $("dieElemBox");
const dieElem = $("dieElem");

const d6Choice = $("d6Choice");
const d6ChoiceHint = $("d6ChoiceHint");
const preLines = $("preLines");
const optA = $("optA");
const optB = $("optB");

const comboLine = $("comboLine");
const comboSub = $("comboSub");
const outCard = $("outCard");
const outD8 = $("outD8");
const outD6 = $("outD6");
const outD10 = $("outD10");
const outElem = $("outElem");

// tables
const tableD8 = $("tableD8");
const tableD6 = $("tableD6");
const tableD10 = $("tableD10");

// ============================================================
// Render tables
// ============================================================

function renderTables(){
  if (tableD8){
    tableD8.innerHTML = "";
    D8_METHODS.forEach((t)=> {
      const li = document.createElement("li");
      li.textContent = t;
      tableD8.appendChild(li);
    });
  }

  if (tableD10){
    tableD10.innerHTML = "";
    D10_MOMENTS.forEach((m)=> {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHtml(m.name)}</strong> — ${escapeHtml(m.desc)}`;
      tableD10.appendChild(li);
    });
  }

  if (tableD6){
    tableD6.innerHTML = "";
    for (let i=1;i<=6;i++){
      const row = D6_CHOICES[i];
      const wrap = document.createElement("div");
      wrap.style.marginBottom = "10px";
      wrap.innerHTML = `
        <div style="font-weight:900;margin-bottom:6px;">${i}) ${escapeHtml(row.title)}</div>
        <div style="color:#b8b8c5;font-size:13px;">
          <strong>${escapeHtml(row.A.name)}</strong>: ${escapeHtml(row.A.desc)}<br/>
          <strong>${escapeHtml(row.B.name)}</strong>: ${escapeHtml(row.B.desc)}
        </div>
      `;
      tableD6.appendChild(wrap);
    }
  }
}

// ============================================================
// Card draw
// ============================================================

function drawCard(){
  playWhoosh();

  deck.classList.remove("isDrawing");
  void deck.offsetWidth;
  deck.classList.add("isDrawing");

  const picked = CARD_TYPES[randInt(0, CARD_TYPES.length - 1)];
  state.card = picked;

  const typeEl = flyingCard.querySelector(".cardType");
  typeEl.textContent = picked.label;

  const face = flyingCard.querySelector(".cardFace");
  face.style.background = `radial-gradient(500px 260px at 15% 20%, ${picked.color}55, transparent 55%), linear-gradient(160deg, rgba(255,255,255,.12), rgba(255,255,255,.03))`;

  setTimeout(()=>{
    updateCardDisplay();
    rollBtn.disabled = false;
    playClick();
  }, 950);
}

function updateCardDisplay(){
  if (!state.card) return;
  cardDisplay.classList.remove("empty","quick","arts","buster");
  cardDisplay.classList.add(state.card.css);

  cardDisplay.querySelector(".bigCardBadge").textContent = "Carta puxada";
  cardDisplay.querySelector(".bigCardSubtitle").textContent = "Agora você pode girar os dados.";
  cardDisplay.querySelector(".bigCardType").textContent = state.card.label;
  cardDisplay.querySelector(".bigCardFooter").textContent = "Quick / Arts / Buster";
}

// ============================================================
// Dice roll
// ============================================================

function startRollingVisual(){
  die6.classList.add("rolling");
  die8.classList.add("rolling");
  die10.classList.add("rolling");
  if (dieElemBox && !dieElemBox.classList.contains("hidden")){
    dieElem.classList.add("rolling");
  }
}
function stopRollingVisual(){
  die6.classList.remove("rolling");
  die8.classList.remove("rolling");
  die10.classList.remove("rolling");
  if (dieElem) dieElem.classList.remove("rolling");
}

function setElementDieVisible(isVisible){
  if (!dieElemBox) return;
  if (isVisible) dieElemBox.classList.remove("hidden");
  else dieElemBox.classList.add("hidden");
}

function rollDice(){
  if (!state.card) return;

  playDice();

  // reset escolha do d6 e elemento
  state.d6Pick = null;
  state.elem = null;
  setElementDieVisible(false);
  dieElem.textContent = "—";

  d6Choice.classList.add("hidden");
  setText(d6ChoiceHint, "Role o d6 para aparecerem as opções.");
  setText(preLines, "Role os dados para ver.");

  // animar números
  die6.textContent = "—";
  die8.textContent = "—";
  die10.textContent = "—";

  startRollingVisual();

  const endAt = performance.now() + 1000;
  const tick = () => {
    die6.textContent = String(randInt(1,6));
    die8.textContent = String(randInt(1,8));
    die10.textContent = String(randInt(1,10));

    if (performance.now() < endAt){
      requestAnimationFrame(tick);
    } else {
      stopRollingVisual();

      state.d6 = randInt(1,6);
      state.d8 = randInt(1,8);
      state.d10 = randInt(1,10);

      die6.textContent = String(state.d6);
      die8.textContent = String(state.d8);
      die10.textContent = String(state.d10);

      // Se d8 for Elemental clássico (1), rola d6 extra para elemento
      if (state.d8 === 1){
        state.elem = randInt(1,6);
        setElementDieVisible(true);
        dieElem.textContent = String(state.elem);
      }

      showD6Choice();
      updateOutputPartial();
      playClick();
    }
  };
  requestAnimationFrame(tick);
}

function showD6Choice(){
  const row = D6_CHOICES[state.d6];
  d6Choice.classList.remove("hidden");
  d6ChoiceHint.textContent = `${state.d6}) ${row.title}`;

  // Mostra os outros dados ANTES da escolha do d6
  const d8Text = D8_METHODS[state.d8 - 1];
  const d10Obj = D10_MOMENTS[state.d10 - 1];

  let lines = `Carta: ${state.card.label}\n`;
  lines += `d8 (${state.d8}): ${d8Text}\n`;
  if (state.d8 === 1 && state.elem){
    const elName = ELEMENTS_D6[state.elem - 1];
    lines += `Elemento (d6 extra = ${state.elem}): ${elName}\n`;
  }
  lines += `d10 (${state.d10}): ${d10Obj.name} — ${d10Obj.desc}`;

  setText(preLines, lines);

  optA.innerHTML = `<strong>${row.A.name}</strong><span>${row.A.desc}</span>`;
  optB.innerHTML = `<strong>${row.B.name}</strong><span>${row.B.desc}</span>`;

  optA.onclick = () => pickD6("A");
  optB.onclick = () => pickD6("B");
}

function pickD6(letter){
  state.d6Pick = letter;
  playClick();
  updateOutputFinal();
}

// ============================================================
// Output
// ============================================================

function formatElement(){
  if (state.d8 !== 1 || !state.elem) return "—";
  return `${state.elem} — ${ELEMENTS_D6[state.elem - 1]}`;
}

function updateOutputPartial(){
  if (!state.card || !state.d6 || !state.d8 || !state.d10) return;

  const d8Text = D8_METHODS[state.d8 - 1];
  const d10Obj = D10_MOMENTS[state.d10 - 1];

  setText(comboLine, `Carta: ${state.card.label} | d6: ${state.d6} | d8: ${state.d8} | d10: ${state.d10}`);
  setText(comboSub, `Escolha a opção do d6 para fechar a combinação.`);

  setText(outCard, state.card.label);
  setText(outD8, `${state.d8} — ${d8Text}`);
  setText(outD10, `${state.d10} — ${d10Obj.name}: ${d10Obj.desc}`);
  setText(outD6, `${state.d6} — (escolha pendente)`);
  setText(outElem, formatElement());
}

function updateOutputFinal(){
  const d8Text = D8_METHODS[state.d8 - 1];
  const d6Row = D6_CHOICES[state.d6];
  const picked = state.d6Pick === "A" ? d6Row.A : d6Row.B;
  const d10Obj = D10_MOMENTS[state.d10 - 1];

  const elemText = (state.d8 === 1 && state.elem) ? ` | Elemento: ${ELEMENTS_D6[state.elem - 1]}` : "";

  setText(
    comboLine,
    `${state.card.label} + d8(${state.d8}) + d6(${state.d6}:${picked.name}) + d10(${state.d10}:${d10Obj.name})${elemText}`
  );

  const sub =
    `Método: ${d8Text}${elemText ? ` (${ELEMENTS_D6[state.elem - 1]})` : ""} | ` +
    `Escolha tática: ${picked.desc} | ` +
    `Momento: ${d10Obj.desc}`;

  setText(comboSub, sub);

  setText(outCard, state.card.label);
  setText(outD8, `${state.d8} — ${d8Text}`);
  setText(outD6, `${state.d6} — ${picked.name}: ${picked.desc}`);
  setText(outD10, `${state.d10} — ${d10Obj.name}: ${d10Obj.desc}`);
  setText(outElem, formatElement());
}

function resetAll(){
  state = { card:null, d6:null, d6Pick:null, d8:null, d10:null, elem:null };

  cardDisplay.classList.remove("quick","arts","buster");
  cardDisplay.classList.add("empty");
  cardDisplay.querySelector(".bigCardBadge").textContent = "Aguardando";
  cardDisplay.querySelector(".bigCardSubtitle").textContent = "Puxe uma carta para começar";
  cardDisplay.querySelector(".bigCardType").textContent = "—";
  cardDisplay.querySelector(".bigCardFooter").textContent = "Quick / Arts / Buster";

  die6.textContent = "—";
  die8.textContent = "—";
  die10.textContent = "—";
  if (dieElem) dieElem.textContent = "—";
  setElementDieVisible(false);

  rollBtn.disabled = true;
  d6Choice.classList.add("hidden");
  d6ChoiceHint.textContent = "Role o d6 para aparecerem as opções.";
  setText(preLines, "Role os dados para ver.");

  comboLine.textContent = "Puxe uma carta e role os dados.";
  comboSub.textContent = "";
  outCard.textContent = "—";
  outD8.textContent = "—";
  outD6.textContent = "—";
  outD10.textContent = "—";
  outElem.textContent = "—";

  playClick();
}

// ============================================================
// Hooks
// ============================================================

function init(){
  renderTables();

  drawBtn.addEventListener("click", drawCard);
  rollBtn.addEventListener("click", rollDice);
  resetBtn.addEventListener("click", resetAll);

  document.addEventListener("pointerdown", ()=>{
    if (!canSound()) return;
    ensureAudio();
  }, { once:true });
}

init();
