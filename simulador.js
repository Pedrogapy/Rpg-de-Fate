/* =========================
   simulador.js — Sebastian
   - Modo: Taumaturgia (Pressão + Runas) / Volumen Hydrargyrum
   - Compra cartas, monta sequência (1–3), libera técnica e rola valor
   ========================= */
(function(){
  function $(id){ return document.getElementById(id); }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

  // =========================
  // Cartas
  // =========================
  const CARDS = [
    { key:"quick",  label:"Quick",  css:"quick",  icon:"assets/card_quick.svg",  desc:"Quick: varre e ocupa espaço (área / vários alvos)." },
    { key:"arts",   label:"Arts",   css:"arts",   icon:"assets/card_arts.svg",   desc:"Arts: controle / utilidade / defesa (ou ataque leve)." },
    { key:"buster", label:"Buster", css:"buster", icon:"assets/card_buster.svg", desc:"Buster: foco em 1 alvo (impacto concentrado)." },
  ];
  const ORDER = ["quick","arts","buster"];

  const ELEMENTS = ["Fogo","Água","Gelo","Vento","Raio","Terra","Luz","Sombra","Neutro"];
  function cardByKey(k){ return CARDS.find(c=>c.key===k) || CARDS[0]; }
  function prettySeq(seq){ return seq.map(k=>cardByKey(k).label).join(" → "); }

  // =========================
  // Estado
  // =========================
  const state = {
    hand: [],
    seq: [],
    selectedActionId: null,
    selectedSpellBySeq: {},
    selectedElementBySeq: {},
    // Taumaturgia: magia escolhida por sequência (key = "quick|arts|buster")
    selectedSpellBySeq: Object.create(null),
    handLimit: 7,
    mode: "taumaturgia",
  };

  // =========================
  // DOM
  // =========================
  const deck = $("deck");
  const flyingCard = $("flyingCard");

  const fillHandBtn = $("fillHandBtn");
  const drawOneBtn = $("drawOneBtn");
  const resetBtn = $("resetBtn");
  const clearSeqBtn = $("clearSeqBtn");

  const soundToggle = $("soundToggle");
  const handLimitInput = $("handLimit");
  const handLimitEcho = $("handLimitEcho");
  const modeSelect = $("modeSelect");
  const modeHint = $("modeHint");

  const handGrid = $("handGrid");
  const handCount = $("handCount");
  const seqSlots = $("seqSlots");

  const actionsHint = $("actionsHint");
  const actionsList = $("actionsList");

  const resultTitle = $("resultTitle");
  const resultTags = $("resultTags");
  const resultText = $("resultText");

  const targetsCount = $("targetsCount");
  const artsMode = $("artsMode");
  const magicSelect = $("magicSelect");
  const elementSelect = $("elementSelect");
  const elementPill = $("elementPill");
  const rollDamageBtn = $("rollDamageBtn");
  const executeBtn = $("executeBtn");
  const damageOut = $("damageOut");

  // =========================
  // Som (WebAudio simples)
  // =========================
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
  function playDraw(){ playTone(520, 120, "sine", 0.045); }
  function playPlace(){ playTone(620, 90, "triangle", 0.05); }
  function playRoll(){
    if(!soundToggle || !soundToggle.checked) return;
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = 240;
      g.gain.value = 0.03;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.frequency.linearRampToValueAtTime(720, ctx.currentTime + 0.12);
      o.stop(ctx.currentTime + 0.14);
      setTimeout(()=>ctx.close(), 210);
    }catch(_){}
  }

  // =========================
  // Deck / compra
  // =========================
  function animateDraw(card){
    if(!deck || !flyingCard) return;
    deck.classList.remove("isDrawing");
    void deck.offsetWidth;
    deck.classList.add("isDrawing");

    const typeEl = flyingCard.querySelector(".cardType");
    if(typeEl) typeEl.textContent = card.label;

    flyingCard.classList.remove("quick","arts","buster");
    flyingCard.classList.add(card.css);

    setTimeout(()=>deck.classList.remove("isDrawing"), 900);
  }

  function drawCardRandom(){
    return CARDS[randInt(0, CARDS.length-1)];
  }

  function syncHandCount(){
    if(handCount) handCount.textContent = String(state.hand.length);
    if(handLimitEcho) handLimitEcho.textContent = String(state.handLimit);
  }

  function setHandLimit(n){
    const x = clamp(n|0, 1, 12);
    state.handLimit = x;
    if(handLimitInput) handLimitInput.value = String(x);
    if(handLimitEcho) handLimitEcho.textContent = String(x);

    while(state.hand.length > state.handLimit) state.hand.pop();
    renderHand();
    syncHandCount();
  }

  function addToHand(card){
    if(state.hand.length >= state.handLimit) return false;
    state.hand.push(card);
    return true;
  }

  function fillHand(){
    const need = state.handLimit - state.hand.length;
    if(need <= 0) return;

    for(let i=0;i<need;i++){
      setTimeout(()=>{
        const c = drawCardRandom();
        if(addToHand(c)){
          animateDraw(c);
          playDraw();
          renderHand();
          syncHandCount();
        }
      }, i * 140);
    }
  }

  function drawOne(){
    const c = drawCardRandom();
    if(addToHand(c)){
      animateDraw(c);
      playDraw();
      renderHand();
      syncHandCount();
    }
  }

  // =========================
  // Sequência
  // =========================
  function seqKeys(){ return state.seq.map(c=>c.key); }
  function countInSeq(key){ return state.seq.reduce((acc,c)=>acc+(c.key===key?1:0), 0); }

  function renderSeq(){
    if(!seqSlots) return;
    seqSlots.innerHTML = "";
    for(let i=0;i<3;i++){
      const slot = document.createElement("div");
      slot.className = "seqSlot";
      const card = state.seq[i] || null;

      if(card){
        slot.classList.add("filled");
        slot.innerHTML = `
          <div class="seqMini">
            <img class="seqIcon" src="${card.icon}" alt="${card.label}" />
            <div>
              <div class="seqName">${card.label}</div>
              <div class="seqSub">clique para devolver</div>
            </div>
          </div>
        `;
        slot.addEventListener("click", ()=>{
          playClick();
          if(state.hand.length >= state.handLimit){
            if(resultText) resultText.textContent = "A mão está no limite. Aumente o limite ou execute/consuma cartas antes de devolver.";
            return;
          }
          const removed = state.seq.splice(i,1)[0];
          state.hand.push(removed);
          state.selectedActionId = null;
          if(damageOut) damageOut.textContent = "—";
          renderHand();
          syncHandCount();
          refreshAll();
        });
      } else {
        slot.innerHTML = `
          <div>
            <div class="seqName muted">Slot ${i+1}</div>
            <div class="seqSub">vazio</div>
          </div>
        `;
      }

      seqSlots.appendChild(slot);
    }
  }

  function clearSeq(){
    if(state.seq.length === 0) return;
    playClick();
    while(state.seq.length && state.hand.length < state.handLimit){
      state.hand.push(state.seq.pop());
    }
    state.selectedActionId = null;
    if(damageOut) damageOut.textContent = "—";
    renderHand();
    syncHandCount();
    refreshAll();
  }

  // =========================
  // Render Mão
  // =========================
  function renderHand(){
    if(!handGrid) return;
    handGrid.innerHTML = "";

    state.hand.forEach((card, idx)=>{
      const div = document.createElement("div");
      div.className = `handCard ${card.css}`;
      div.innerHTML = `
        <div class="handGlow"></div>
        <div class="handBadge">
          <img class="handIcon" src="${card.icon}" alt="${card.label}"/>
          <span>${card.label}</span>
        </div>
        <div class="handSub">${card.desc}</div>
      `;

      div.addEventListener("click", ()=>{
        playPlace();
        if(state.seq.length >= 3) return;
        const picked = state.hand.splice(idx,1)[0];
        state.seq.push(picked);

        state.selectedActionId = null;
        if(damageOut) damageOut.textContent = "—";

        renderHand();
        syncHandCount();
        refreshAll();
      });

      handGrid.appendChild(div);
    });
  }

  // =========================
  // Ações (geradas para TODAS as sequências)
  // =========================
  function seqKey(seq){ return seq.join("|"); }

  // =========================
  // Taumaturgia — Biblioteca de Magias (seletor por sequência)
  // - A primeira carta define a "natureza".
  // - A segunda e a terceira modificam / especializam.
  // - Sem raridades que "anulam servos". Contra-magia até média.
  // - CD sempre 12–16.
  // =========================
  // (ELEMENTS definido acima)

  function hashStr(s){
    let h = 2166136261;
    for(let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function pick(arr, seed){ return arr[seed % arr.length]; }
  function cdFrom(seed){ return 12 + (seed % 5); } // 12–16

  function makeSpell(id, cfg){
    return Object.assign({
      id,
      // name, kind, type, tags, element, rune, support, cd, rollMode, reach, targets, how, result
    }, cfg);
  }

  function defaultReachTargetsByMain(main){
    if(main === "quick") return { reach: "zona escolhida à vista", targets: "múltiplos alvos na área" };
    if(main === "buster") return { reach: "curta a média (à vista)", targets: "1 alvo" };
    return { reach: "curta a média (à vista)", targets: "1 alvo, objeto ou zona pequena" };
  }

  function tagsLine(spell, chosenElement){
    const parts = [];
    const el = chosenElement || spell.element;
    if(spell.type) parts.push(spell.type);
    if(el && el !== "Neutro") parts.push(`elemento: ${el}`);
    if(spell.rune) parts.push("runa");
    if(spell.support) parts.push("suporte");
    if(spell.cd) parts.push(`CD ${spell.cd}`);
    return parts.join(" • ");
  }


  function isElementSelectable(spell){
    if(!spell) return false;
    if(spell.elementChoice) return true;
    if(!spell.element) return false;
    if(spell.element === "Qualquer" || spell.element === "Elemental") return true;
    return ELEMENTS.includes(spell.element);
  }

  function getChosenElement(seq, spell){
    if(!spell) return null;
    if(!isElementSelectable(spell)) return spell.element || null;
    const k = seqKey(seq);
    const fallback = (spell.element && ELEMENTS.includes(spell.element)) ? spell.element : "Fogo";
    const chosen = state.selectedElementBySeq[k] || fallback;
    return ELEMENTS.includes(chosen) ? chosen : fallback;
  }

  function elementizeText(text, chosenEl, baseEl){
    if(!text) return text;
    let t = String(text);
    if(t.includes("{E}")) t = t.replaceAll("{E}", chosenEl);
    if(baseEl && ELEMENTS.includes(baseEl) && chosenEl && chosenEl !== baseEl){
      t = t.split(baseEl).join(chosenEl);
    }
    return t;
  }

  function syncElementSelect(seq, spell){
    if(!elementSelect || !elementPill) return;
    const show = (state.mode === "taumaturgia") && seq.length>0 && isElementSelectable(spell);
    elementPill.style.display = show ? "" : "none";
    elementSelect.disabled = !show;
    if(!show){
      elementSelect.innerHTML = "";
      return;
    }
    elementSelect.innerHTML = "";
    ELEMENTS.forEach((el)=>{
      const o = document.createElement("option");
      o.value = el;
      o.textContent = el;
      elementSelect.appendChild(o);
    });
    const chosen = getChosenElement(seq, spell);
    const k = seqKey(seq);
    state.selectedElementBySeq[k] = chosen;
    elementSelect.value = chosen;
  }
  function buildSpellText(spell, seq, chosenElement){
    const main = seq[0];
    const rt = { ...(defaultReachTargetsByMain(main)), ...(spell.reach?{reach:spell.reach}:{}), ...(spell.targets?{targets:spell.targets}:{}) };

    const lines = [];
    lines.push(`Conjuração: 1 ação`);
    lines.push(`Modo: Taumaturgia (Pressão + Runas)`);
    lines.push(`Sequência: ${prettySeq(seq)}`);
    lines.push(`Alcance: ${rt.reach}`);
    lines.push(`Alvos: ${rt.targets}`);
    lines.push(`Cooldown: ${spell.cd}`);
    lines.push("");
    lines.push("Como a magia acontece:");
    (spell.how || []).forEach(x=>lines.push(elementizeText(x, chosenElement, spell.element)));
    lines.push("");
    lines.push("Resultado (o que isso faz na cena):");
    lines.push(elementizeText(spell.result || "—", chosenElement, spell.element));
    lines.push("");
    lines.push("Valor:");
    lines.push(valueLine(spell.rollMode, seq));
    return lines.join("\n");
  }

  // Gera 8–12 magias por sequência (modelo C)
  function buildTaumaturgySpellsForSeq(seq){
    const sk = seqKey(seq);
    const seed0 = hashStr(sk);
    const main = seq[0];
    const hasArts = seq.includes("arts");
    const hasQuick = seq.includes("quick");
    const hasBuster = seq.includes("buster");

    // Elemento base determinístico por sequência
    const elemA = pick(ELEMENTS, seed0);
    const elemB = pick(ELEMENTS, seed0 + 7);
    const elemC = pick(ELEMENTS, seed0 + 13);

    const cdA = cdFrom(seed0);
    const cdB = cdFrom(seed0 + 3);
    const cdC = cdFrom(seed0 + 9);

    const list = [];

    // Helpers de narrativa
    const runeLine = (txt)=>`Você traça uma runa curta (${txt}) e a ancora com pressão controlada.`;
    const pressLine = (txt)=>`Você comprime o ar/éter ao redor (${txt}) e libera num pulso preciso.`;
    const weaveLine = (txt)=>`Você encadeia a pressão em passos curtos e sincroniza a runa no final (${txt}).`;

    if(main === "buster"){
      // BUSTER = dano single (com possíveis efeitos se houver Arts/Quick no combo)
      list.push(makeSpell(`${sk}:bolt`, {
        name: `Disparo ${elemA}`, type:"Dano", kind:"Ataque", element: elemA, rune:false, support:false, cd: cdA,
        rollMode:"buster",
        how:[pressLine("como um projétil concentrado"), hasArts?"Você sela o impacto com uma marca rúnica de curto prazo." : "Você mantém o foco para perfurar a defesa.", hasQuick?"O fluxo é rápido: você reposiciona após o disparo." : null].filter(Boolean),
        result: hasArts ? "Causa dano e deixa uma marca leve (rastreio/pressão residual) por instantes." : "Causa dano concentrado em um alvo." 
      }));
      list.push(makeSpell(`${sk}:rune_punch`, {
        name: "Punho Selado", type:"Dano", kind:"Ataque", element:"Neutro", rune:true, support:false, cd: cdB,
        rollMode:"buster",
        how:[runeLine("impacto"),"Você fecha o punho e descarrega a pressão no contato."],
        result:"Causa dano de impacto. A runa " + (hasArts?"atrapalha a postura do alvo por instantes." : "se apaga ao contato.")
      }));
      list.push(makeSpell(`${sk}:lance`, {
        name:"Lança de Éter", type:"Dano", kind:"Ataque", element: elemB, rune:false, support:false, cd: cdC,
        rollMode:"buster",
        how:[pressLine("em forma de lâmina/lâmina de mana"),"Você ajusta o ângulo para atingir um ponto fraco."],
        result: hasArts?"Causa dano e empurra a energia do alvo para fora do eixo (efeito médio, narrativo).":"Causa dano e abre espaço para a equipe." 
      }));
      list.push(makeSpell(`${sk}:pin`, {
        name:"Compressão: Pino de Pressão", type:"Dano", kind:"Ataque", element:"Neutro", rune:true, support:false, cd: cdFrom(seed0+1),
        rollMode:"buster",
        how:[runeLine("travamento"),"Você crava a runa no chão/parede e " + (hasArts?"puxa" : "força") + " o alvo para a linha do golpe."],
        result: hasArts?"Causa dano e aplica um travamento leve (não impede servo, só dificulta movimento por instantes).":"Causa dano e força recuo/posição ruim." 
      }));
      list.push(makeSpell(`${sk}:sigil_shot`, {
        name:"Tiro com Glifo", type:"Dano", kind:"Ataque", element: elemC, rune:true, support:false, cd: cdFrom(seed0+2),
        rollMode:"buster",
        how:["Você desenha um glifo no ar com a ponta dos dedos.","A pressão atravessa o glifo e sai mais estável."],
        result:"Causa dano e deixa um brilho residual que facilita leitura mágica (informação) por instantes." 
      }));
      // Se houver Arts, adicionar contra-magia média
      list.push(makeSpell(`${sk}:counter`, {
        name:"Corte de Interferência", type:"Controle", kind:"Interferência", element:"Neutro", rune:true, support:true, cd: cdFrom(seed0+4),
        rollMode: hasBuster ? "buster" : "none",
        how:["Você desenha uma runa de ruído sobre o trajeto do feitiço inimigo.","Você corta o fluxo com um impacto curto (não anula tudo — só enfraquece/desvia)."],
        result:"Se houver magia inimiga na cena, você pode reduzir, desviar ou atrasar um efeito (até médio). Se usar como ataque, ainda causa dano." 
      }));
      // Dois utilitários de pressão
      list.push(makeSpell(`${sk}:rupture`, {
        name:"Ruptura Direcional", type:"Debuff", kind:"Ataque", element:"Neutro", rune:false, support:false, cd: cdFrom(seed0+5),
        rollMode:"buster",
        how:[pressLine("num estalo direcional"),"Você força a abertura de guarda num ângulo específico."],
        result:"Causa dano e aplica uma abertura de guarda momentânea (vantagem narrativa para o próximo aliado)." 
      }));
      list.push(makeSpell(`${sk}:mark`, {
        name:"Marca de Pressão", type:"Utilidade", kind:"Marcação", element:"Neutro", rune:true, support:true, cd: cdFrom(seed0+6),
        rollMode:"buster",
        how:[runeLine("rastreio"),"Você prende a marca no alvo com um golpe curto."],
        result:"Causa dano e marca o alvo (rastreio/identificação por energia) por um curto período." 
      }));
    }

    if(main === "quick"){
      // QUICK = área e ocupação
      list.push(makeSpell(`${sk}:sweep`, {
        name:`Varredura ${elemA}`, type:"Dano", kind:"Ataque", element: elemA, rune:false, support:false, cd: cdA,
        rollMode:"quick",
        how:[pressLine("em onda larga"), hasArts?"No fim, você ancora um efeito leve nos atingidos." : "Você mantém a onda contínua para cobrir a área."],
        result: hasArts?"Causa dano em área e aplica um efeito leve (desorientação/atraso narrativo).":"Causa dano em área." 
      }));
      list.push(makeSpell(`${sk}:shards`, {
        name:"Chuva de Estilhaços Rúnicos", type:"Dano", kind:"Ataque", element: elemB, rune:true, support:false, cd: cdB,
        rollMode:"quick",
        how:[weaveLine("para fragmentar"),"Pequenos selos explodem em estilhaços de pressão."],
        result:"Causa dano em área. A área fica " + (hasArts?"marcada com ruído mágico (interferência leve).":"difícil de atravessar sem se expor.")
      }));
      list.push(makeSpell(`${sk}:zone`, {
        name:"Zona de Compressão", type:"Controle", kind:"Controle", element:"Neutro", rune:true, support:true, cd: cdC,
        rollMode: hasArts?"quick":"quick",
        how:["Você desenha um retângulo/círculo de runas no chão.","Você varre a zona com pressão constante."],
        result:"Causa dano em área. A zona fica sob controle (dificulta avanço e empurra alvos)." 
      }));
      list.push(makeSpell(`${sk}:veil`, {
        name:`Cortina ${elemC}`, type:"Utilidade", kind:"Utilidade", element: elemC, rune:false, support:true, cd: cdFrom(seed0+1),
        rollMode: hasArts?"quick":"none",
        how:["Você dispersa partículas/éter no ar e em seguida varre com pressão.","O ambiente fica turvo por um instante."],
        result: hasArts?"Causa dano leve e cria cobertura/ocultação momentânea.":"Cria cobertura/ocultação momentânea (sem dano)." 
      }));
      list.push(makeSpell(`${sk}:tether`, {
        name:"Laço de Vento", type:"Controle", kind:"Controle", element:"Vento", rune:true, support:true, cd: cdFrom(seed0+2),
        rollMode:"quick",
        how:[runeLine("puxão"),"Você cria correntes de pressão que arrastam a borda da área."],
        result:"Causa dano e puxa/empurra alvos na borda (controle leve)." 
      }));
      list.push(makeSpell(`${sk}:heal_mist`, {
        name:"Brisa de Reajuste", type:"Cura", kind:"Cura", element:"Neutro", rune:true, support:true, cd: cdFrom(seed0+3),
        rollMode: hasArts ? "healArea" : "none",
        reach:"zona escolhida à vista",
        targets:"múltiplos aliados na área",
        how:["Você espalha pressão em brisa controlada.","Você ativa runas de alinhamento corporal no fim do pulso."],
        result: hasArts?"Cura leve em área (sem travar inimigos).":"Efeito de suporte leve (sem rolagem)." 
      }));
      // mais três variações de dano
      list.push(makeSpell(`${sk}:chain`, {
        name:"Impactos em Cadeia", type:"Dano", kind:"Ataque", element:"Neutro", rune:false, support:false, cd: cdFrom(seed0+4),
        rollMode:"quick",
        how:[pressLine("em múltiplos estalos"),"Você “quica” a pressão entre alvos próximos."],
        result:"Causa dano em área. Narrativamente, prioriza alvos agrupados." 
      }));
      list.push(makeSpell(`${sk}:pulse`, {
        name:`Pulso ${elemB}`, type:"Dano", kind:"Ataque", element: elemB, rune:true, support:false, cd: cdFrom(seed0+5),
        rollMode:"quick",
        how:[runeLine("pulso"),"A runa explode em uma onda curta que se espalha."],
        result:"Causa dano em área e afeta objetos leves/estruturas frágeis (narrativo)." 
      }));
      list.push(makeSpell(`${sk}:breaker`, {
        name:"Quebra de Formação", type:"Debuff", kind:"Ataque", element:"Neutro", rune:true, support:true, cd: cdFrom(seed0+6),
        rollMode:"quick",
        how:[weaveLine("para ‘marcar’ passos"),"Quem é atingido sente a cadência do próprio movimento falhar por um instante."],
        result:"Causa dano em área e aplica debuff leve (reduz reações/posicionamento por instantes, sem paralisar)." 
      }));
    }

    if(main === "arts"){
      // ARTS = efeito/suporte; algumas opções viram dano sem efeito
      list.push(makeSpell(`${sk}:seal`, {
        name:"Selo de Contenção", type:"Controle", kind:"Selo", element:"Neutro", rune:true, support:true, cd: cdA,
        rollMode:"none",
        how:[runeLine("contenção"),"Você impõe uma regra local: ‘não avance por este traço’ (curto)."],
        result:"Cria um selo/linha de contenção em uma zona pequena. Não impede servo, mas cria obstáculo e força escolha." 
      }));
      list.push(makeSpell(`${sk}:interf`, {
        name:"Interferência de Circuito", type:"Controle", kind:"Interferência", element:"Neutro", rune:true, support:true, cd: cdB,
        rollMode:"none",
        how:[runeLine("ruído"),"Você bate a pressão como ‘chave’ para bagunçar o fluxo mágico."],
        result:"Reduz a estabilidade de uma magia inimiga (até média). Pode atrasar, desviar ou enfraquecer." 
      }));
      list.push(makeSpell(`${sk}:heal`, {
        name:"Runa de Remendo", type:"Cura", kind:"Cura", element:"Neutro", rune:true, support:true, cd: cdC,
        rollMode: hasQuick ? "healArea" : "heal",
        reach: hasQuick ? "zona escolhida à vista" : "curta a média (à vista)",
        targets: hasQuick ? "múltiplos aliados na área" : "1 aliado",
        how:[runeLine("reparo"), hasQuick?"Você espalha o pulso pela área." : "Você ancora no alvo."],
        result: hasQuick?"Cura em área (leve a moderada).":"Cura um alvo." 
      }));
      list.push(makeSpell(`${sk}:shield`, {
        name:"Barreira de Pressão", type:"Defesa", kind:"Escudo", element:"Neutro", rune:true, support:true, cd: cdFrom(seed0+1),
        rollMode:"shield",
        how:[runeLine("barreira"),"Você fecha um circuito e ergue uma parede curta de força."],
        result:"Cria um escudo que absorve dano por um instante." 
      }));
      list.push(makeSpell(`${sk}:scan`, {
        name:"Leitura de Assinatura", type:"Utilidade", kind:"Detecção", element:"Neutro", rune:false, support:true, cd: cdFrom(seed0+2),
        rollMode:"none",
        how:["Você ‘escuta’ o éter com pressão mínima.","Você identifica padrões: ilusões, armadilhas simples, fluxo de mana."],
        result:"Detecção/diagnóstico: revela pistas mágicas e dá vantagem narrativa contra ocultação e truques simples." 
      }));
      list.push(makeSpell(`${sk}:terrain`, {
        name:`Ajuste de Terreno (${elemA})`, type:"Controle", kind:"Terreno", element: elemA, rune:true, support:true, cd: cdFrom(seed0+3),
        rollMode:"none",
        how:[runeLine("terreno"),"Você altera um detalhe: atrito, poeira, gelo fino, vento direcional, etc."],
        result:"Altera o terreno em uma zona pequena (controle leve a médio)." 
      }));
      // Arts como dano (sem efeito)
      list.push(makeSpell(`${sk}:dart`, {
        name:`Dardo ${elemB}`, type:"Dano", kind:"Ataque", element: elemB, rune:false, support:false, cd: cdFrom(seed0+4),
        rollMode:"arts",
        how:[pressLine("em um dardo simples"),"Sem runas: só força bruta do éter."],
        result:"Causa dano leve (sem efeito adicional)." 
      }));
      list.push(makeSpell(`${sk}:blade`, {
        name:"Lâmina Curta de Mana", type:"Dano", kind:"Ataque", element:"Neutro", rune:false, support:false, cd: cdFrom(seed0+5),
        rollMode:"arts",
        how:[pressLine("em um corte rápido"),"Você mantém a magia ‘seca’: nada de efeito extra."],
        result:"Causa dano leve (sem efeito adicional)." 
      }));
      list.push(makeSpell(`${sk}:buff`, {
        name:"Runa de Ritmo", type:"Buff", kind:"Suporte", element:"Neutro", rune:true, support:true, cd: cdFrom(seed0+6),
        rollMode:"none",
        reach:"curta a média (à vista)",
        targets:"1 aliado",
        how:[runeLine("ritmo"),"Você estabiliza respiração e timing do aliado."],
        result:"Buff leve: melhora timing/controle (vantagem narrativa ou pequeno bônus conforme o mestre)." 
      }));
    }

    // Garante tamanho 8–12
    // Se por algum motivo sobrou fora, reduz.
    while(list.length > 12) list.pop();
    while(list.length < 8){
      const e = pick(ELEMENTS, seed0 + list.length*11);
      list.push(makeSpell(`${sk}:extra${list.length}`, {
        name:`Pressão Direta (${e})`, type: main==="arts"?"Utilidade":"Dano", kind: main==="arts"?"Utilidade":"Ataque", element:e, rune:false, support:(main==="arts"), cd: cdFrom(seed0 + list.length),
        rollMode: main==="arts"?"none":(main==="quick"?"quick":"buster"),
        how:["Você usa uma aplicação simples e segura de pressão mágica."],
        result:"Efeito genérico coerente com a cena (sem quebrar regras)."
      }));
    }

    return list;
  }

  // Cache por sequência
  const TAU_SPELL_CACHE = new Map();
  function taumaturgySpellsForSeq(seq){
    const k = seqKey(seq);
    if(TAU_SPELL_CACHE.has(k)) return TAU_SPELL_CACHE.get(k);
    const v = buildTaumaturgySpellsForSeq(seq);
    TAU_SPELL_CACHE.set(k, v);
    return v;
  }

  function currentSpellForSeq(seq){
    if(state.mode !== "taumaturgia") return null;
    if(seq.length===0) return null;
    const k = seqKey(seq);
    const options = taumaturgySpellsForSeq(seq);
    const chosenId = state.selectedSpellBySeq[k];
    return options.find(s=>s.id===chosenId) || options[0] || null;
  }

  function syncMagicSelect(){
    if(!magicSelect) return;
    const seq = seqKeys();
    const show = (state.mode === "taumaturgia") && seq.length>0;
    magicSelect.disabled = !show;
    magicSelect.style.display = show ? "" : "none";
    // Oculta label inteira se não usar
    if(magicSelect.parentElement) magicSelect.parentElement.style.display = show ? "" : "none";

    if(!show){
      magicSelect.innerHTML = "";
      return;
    }

    const opts = taumaturgySpellsForSeq(seq);
    const k = seqKey(seq);
    const chosenId = state.selectedSpellBySeq[k] || (opts[0] && opts[0].id);
    if(chosenId) state.selectedSpellBySeq[k] = chosenId;

    magicSelect.innerHTML = "";
    opts.forEach((sp)=>{
      const o = document.createElement("option");
      o.value = sp.id;
      o.textContent = sp.name;
      magicSelect.appendChild(o);
    });
    magicSelect.value = state.selectedSpellBySeq[k];
    syncElementSelect(seq, currentSpellForSeq(seq));
  }

  // ------ Cura: combinações especiais (Taumaturgia) ------
  const HEALING = {
    "arts": {
      name: "Runa de Remendo",
      kind: "Cura",
      tags: "cura • alvo único",
      damageMode: "heal",
      resultLine: "Você grava uma runa curta na pele/armadura do aliado; ela fecha feridas e estabiliza o ritmo do corpo por um instante.",
      reach: "curta a média (à vista)",
      targets: "1 aliado"
    },
    "arts|arts": {
      name: "Sutura Rúnica",
      kind: "Cura",
      tags: "cura • reforço",
      damageMode: "heal",
      resultLine: "Você encadeia duas runas: a primeira limpa a instabilidade, a segunda sela e fortalece. Cura maior e mais consistente.",
      reach: "curta a média (à vista)",
      targets: "1 aliado"
    },
    "arts|quick": {
      name: "Pulso de Socorro",
      kind: "Cura",
      tags: "cura • área",
      damageMode: "healArea",
      resultLine: "Uma runa dispara um pulso e se espalha pelo chão/vento como uma onda suave, alcançando aliados na zona.",
      reach: "zona escolhida à vista",
      targets: "múltiplos aliados na área"
    },
    "arts|arts|quick": {
      name: "Círculo de Recuperação",
      kind: "Cura",
      tags: "cura • área • sustentação curta",
      damageMode: "healArea",
      resultLine: "Você fecha um círculo de runas e libera um pulso amplo. A área fica marcada por um instante, facilitando a recuperação de quem estiver dentro.",
      reach: "zona escolhida à vista",
      targets: "múltiplos aliados na área"
    },
    "quick|arts": {
      name: "Neblina Revigorante",
      kind: "Cura",
      tags: "cura • área leve",
      damageMode: "healArea",
      resultLine: "Você espalha pressão controlada e, no fim, fixa uma runa que ‘puxa’ o corpo de volta ao eixo. Cura leve para quem estiver na área.",
      reach: "zona escolhida à vista",
      targets: "múltiplos aliados na área"
    }
  };

  function titleFromSeq(mode, seq){
    const sk = seqKey(seq);

    if(mode==="taumaturgia" && HEALING[sk]) return HEALING[sk].name;

    // nomes especiais já existentes
    if(mode==="volumen" && sk==="buster|buster|buster") return "Guilhotina de Hydrargyrum";
    if(mode==="volumen" && sk==="quick|quick|quick") return "Tempestade de Estilhaços";
    if(mode==="volumen" && sk==="arts|arts|arts") return "Catedral de Prata";

    if(mode==="taumaturgia" && sk==="buster|buster|buster") return "Execução Barométrica";
    if(mode==="taumaturgia" && sk==="quick|quick|quick") return "Maré de Choque";
    if(mode==="taumaturgia" && sk==="arts|arts|arts") return "Circuito de Contenção";

    const first = seq[0];
    const last = seq[seq.length-1];
    const h = (seq.join("") + mode).split("").reduce((acc,ch)=>acc+ch.charCodeAt(0),0);

    const endBuster = ["Linha de Abate","Pressão Focada","Estocada Direta","Golpe de Ponto","Quebra-Guarda","Fecho Rápido"];
    const endQuick  = ["Varredura","Cinturão de Impacto","Cascata","Redemoinho","Arco de Dispersão","Campo de Pressão"];
    const endArts   = ["Selo","Âncora","Muralha","Rastro","Prisma","Interferência"];

    const prefixVol = {quick:"Fragmentação", arts:"Moldagem", buster:"Condensação"};
    const prefixTau = {quick:"Onda", arts:"Runa", buster:"Compressão"};

    const prefix = (mode==="volumen") ? (prefixVol[first] || "Volumen") : (prefixTau[first] || "Taumaturgia");
    const pool = (last==="buster") ? endBuster : (last==="quick") ? endQuick : endArts;
    const core = pool[h % pool.length];

    let suf = "";
    if(seq.length===1) suf = " (Simples)";
    else if(seq.length===2) suf = " (Dupla)";
    else suf = " (Tríplice)";

    return `${prefix}: ${core}${suf}`;
  }

  function stepText(mode, key, idx){
    const n = idx+1;
    if(mode==="volumen"){
      if(key==="quick")  return `Passo ${n} (Quick): você fragmenta o Volumen em partículas/agulhas e ocupa a área, forçando recuo e punindo movimento.`;
      if(key==="arts")   return `Passo ${n} (Arts): você molda o Volumen em forma estável (fios/placas/âncora), adicionando controle, defesa ou utilidade.`;
      return             `Passo ${n} (Buster): você condensa o Volumen em um golpe único (lança/martelo), buscando um ponto fraco em curto alcance.`;
    }else{
      if(key==="quick")  return `Passo ${n} (Quick): você libera uma onda de pressão para varrer, deslocar e “quebrar” postura em área.`;
      if(key==="arts")   return `Passo ${n} (Arts): você grava/ativa uma runa simples, impondo uma regra local (trava, selo, interferência, cura ou ajuste de terreno).`;
      return             `Passo ${n} (Buster): você descarrega pressão concentrada (gesto de tiro/pancada curta), mirando um único alvo.`;
    }
  }

  function reachAndTargets(last){
    if(last==="quick")  return { reach:"zona escolhida à vista", targets:"múltiplos alvos na área" };
    if(last==="buster") return { reach:"curta a média (à vista)", targets:"1 alvo" };
    return { reach:"curta a média (à vista)", targets:"1 alvo, objeto ou zona pequena (efeito)" };
  }

  function kindAndDamageMode(mode, seq, last){
    const sk = seqKey(seq);

    if(mode==="taumaturgia" && HEALING[sk]){
      const h = HEALING[sk];
      return { kind: h.kind, dmgMode: h.damageMode, tags: h.tags, forced: h };
    }

    const a = seq.filter(x=>x==="arts").length;
    const b = seq.filter(x=>x==="buster").length;

    if(last==="arts" && a>=2 && b===0) return { kind:"Defesa", dmgMode:"shield", tags:"proteção • controle" };
    if(last==="arts") return { kind:"Efeito/Controle", dmgMode:"artsMaybe", tags:"controle • utilidade" };
    if(last==="quick") return { kind:"Ataque", dmgMode:"quick", tags:`área • ${seq.filter(x=>x==="quick").length} passo(s) Quick` };
    return { kind:"Ataque", dmgMode:"buster", tags:`alvo único • ${seq.filter(x=>x==="buster").length} passo(s) Buster` };
  }

  function valueLine(dmgMode, seq){
    const q = seq.filter(x=>x==="quick").length || 1;
    const a = seq.filter(x=>x==="arts").length || 1;
    const b = seq.filter(x=>x==="buster").length || 1;

    if(dmgMode==="shield" || dmgMode==="shieldArea") return "Absorção: 1d12 (2 Arts) ou 1d12+1d8 (3 Arts).";
    if(dmgMode==="buster") return `Dano: ${b}d10 (vira d12 se houver 2+ Busters no combo).`;
    if(dmgMode==="quick")  return `Dano: (${q}+${b})d6 em cada alvo atingido (Quick + Buster aumenta dados).`;
    if(dmgMode==="heal")   return `Cura: ${a}d8 (em 1 aliado).`;
    if(dmgMode==="healArea") return `Cura: ${a}d8 para cada aliado na área (configure a quantidade de alvos).`;
    return `Arts: ${a}d8 se você escolher “Dano”; se escolher “Efeito”, não rola valor.`;
  }

  function resultTextFromAction(action){
    const seq = action.req.slice();
    const last = seq[seq.length-1];

    const special = (action.mode==="taumaturgia") ? HEALING[seqKey(seq)] : null;

    const rt = special
      ? { reach: special.reach, targets: special.targets }
      : reachAndTargets(last);

    const lines = [];
    lines.push(`Conjuração: 1 ação`);
    lines.push(`Modo: ${action.modeLabel}`);
    lines.push(`Sequência: ${prettySeq(seq)}`);
    lines.push(`Alcance: ${rt.reach}`);
    lines.push(`Alvos: ${rt.targets}`);
    lines.push("");
    lines.push("Como a técnica acontece:");
    seq.forEach((k,i)=> lines.push(stepText(action.mode, k, i)));
    lines.push("");
    lines.push("Resultado (o que isso faz na cena):");
    lines.push(action.resultLine);
    lines.push("");
    lines.push("Valor:");
    lines.push(valueLine(action.damageMode, seq));

    if(action.damageMode==="shield"){
      lines.push("");
      lines.push("Obs.: este escudo absorve dano recebido; descreva como placas/fios prateados (Volumen) ou uma runa de contenção (Taumaturgia).");
    }

    return lines.join("\n");
  }

  function buildActionsForMode(mode){
    const actions = new Map();
    const modeLabel = (mode==="volumen") ? "Volumen Hydrargyrum" : "Taumaturgia (Pressão + Runas)";

    const seqs = [];
    function gen(prefix, depth, target){
      if(depth===target){ seqs.push(prefix.slice()); return; }
      for(const k of ORDER){
        prefix.push(k); gen(prefix, depth+1, target); prefix.pop();
      }
    }
    for(let len=1; len<=3; len++) gen([],0,len);

    for(const seq of seqs){
      const last = seq[seq.length-1];
      const km = kindAndDamageMode(mode, seq, last);

      const id = `${mode}:${seqKey(seq)}`;
      const name = titleFromSeq(mode, seq);

      let resultLine = "";
      if(km.forced){
        resultLine = km.forced.resultLine;
      } else if(mode==="volumen"){
        if(km.dmgMode==="buster"){
          resultLine = "Você usa os passos anteriores para abrir brecha e termina condensando o mercúrio num golpe curto e pesado no alvo.";
        }else if(km.dmgMode==="quick"){
          resultLine = "Você espalha o mercúrio na área e transforma movimento em risco: varre, corta e empurra o grupo para fora de posição.";
        }else if(km.dmgMode==="shield"){
          resultLine = "Você ergue placas e fios prateados ao redor de você, criando uma cobertura móvel que absorve impacto por um momento.";
        }else{
          resultLine = "Você cria um efeito com mercúrio: marca, travamento, detecção, armadilha curta ou alteração de terreno imediato (coerente com a cena).";
        }
      }else{
        if(km.dmgMode==="buster"){
          resultLine = "Você desorganiza a defesa e termina com uma descarga de pressão concentrada no alvo (gesto de tiro/pancada).";
        }else if(km.dmgMode==="quick"){
          resultLine = "Você espalha pressão em área para varrer, deslocar e limitar escolhas do inimigo, atingindo vários alvos na zona.";
        }else if(km.dmgMode==="shield"){
          resultLine = "Você fecha um circuito de runas que cria uma parede de força curta, absorvendo o impacto e segurando avanço por um instante.";
        }else{
          resultLine = "Você aplica uma runa/pressão como efeito: interferência, selo, empurrão controlado, marca de rastreio ou micro-alteração de terreno.";
        }
      }

      actions.set(id, {
        id, mode, modeLabel,
        req: seq,
        name,
        kind: km.kind,
        tags: km.tags,
        damageMode: km.dmgMode,
        resultLine,
        text: ()=> resultTextFromAction({mode, modeLabel, req: seq, damageMode: km.dmgMode, resultLine})
      });
    }
    return actions;
  }

  const ACTIONS = {
    volumen: buildActionsForMode("volumen"),
    taumaturgia: buildActionsForMode("taumaturgia"),
  };

  function currentActionForSeq(seq){
    if(seq.length===0) return null;
    const id = `${state.mode}:${seqKey(seq)}`;
    return ACTIONS[state.mode].get(id) || null;
  }

  // =========================
  // Render técnicas
  // =========================
  function renderActions(){
    if(!actionsList || !actionsHint) return;
    actionsList.innerHTML = "";
    const s = seqKeys();

    if(s.length === 0){
      actionsHint.textContent = "Monte uma sequência (1–3 cartas) para ver a técnica.";
      return;
    }

    // Taumaturgia: exibe a magia escolhida (via select) em vez de uma técnica única.
    if(state.mode === "taumaturgia"){
      syncMagicSelect();
      const spell = currentSpellForSeq(s);
      syncElementSelect(s, spell);
      if(!spell){
        actionsHint.textContent = "Nenhuma magia encontrada (isso não deveria acontecer).";
        return;
      }

      actionsHint.textContent = `Magias para: ${prettySeq(s)}`;

      const div = document.createElement("div");
      div.className = "actionCard selected";
      div.innerHTML = `
        <div class="actionTop">
          <div>
            <div class="actionName">${spell.name}</div>
            <div class="actionMeta">${tagsLine(spell)}</div>
          </div>
          <div class="muted">${prettySeq(s)}</div>
        </div>
        <div class="reqRow">
          ${s.map(k=>{
            const c = cardByKey(k);
            return `<span class="reqPill"><img class="seqIcon" src="${c.icon}" alt="${c.label}"/>${c.label}</span>`;
          }).join("")}
        </div>
      `;
      div.addEventListener("click", ()=>{
        playClick();
        if(damageOut) damageOut.textContent = "—";
        renderResult();
      });

      actionsList.appendChild(div);
      return;
    }

    // Volumen: mantém o sistema de técnicas automático.
    const action = currentActionForSeq(s);
    if(!action){
      actionsHint.textContent = "Nenhuma técnica encontrada (isso não deveria acontecer).";
      return;
    }

    actionsHint.textContent = `Técnica para: ${prettySeq(s)}`;

    const div = document.createElement("div");
    div.className = "actionCard selected";
    div.innerHTML = `
      <div class="actionTop">
        <div>
          <div class="actionName">${action.name}</div>
          <div class="actionMeta">${action.kind} • ${action.tags}</div>
        </div>
        <div class="muted">${prettySeq(s)}</div>
      </div>
      <div class="reqRow">
        ${action.req.map(k=>{
          const c = cardByKey(k);
          return `<span class="reqPill"><img class="seqIcon" src="${c.icon}" alt="${c.label}"/>${c.label}</span>`;
        }).join("")}
      </div>
    `;
    div.addEventListener("click", ()=>{
      playClick();
      state.selectedActionId = action.id;
      if(damageOut) damageOut.textContent = "—";
      renderResult();
    });

    actionsList.appendChild(div);
    state.selectedActionId = action.id;
  }

  // =========================
  // Resultado
  // =========================
  function resolveDamageMode(action){
    if(!action) return "none";
    if(action.damageMode === "artsMaybe"){
      return (artsMode && artsMode.value === "damage") ? "arts" : "none";
    }
    return action.damageMode;
  }

  function renderResult(){
    const s = seqKeys();

    if(s.length === 0){
      if(resultTitle) resultTitle.textContent = "—";
      if(resultTags) resultTags.textContent = "—";
      if(resultText) resultText.textContent = "Monte uma sequência e selecione a técnica.";
      if(rollDamageBtn) rollDamageBtn.disabled = true;
      if(executeBtn) executeBtn.disabled = true;
      if(damageOut) damageOut.textContent = "—";
      if(rollDamageBtn){
        rollDamageBtn.textContent = "Rolar";
        rollDamageBtn.dataset.mode = "none";
      }
      return;
    }

    // Taumaturgia: usa o seletor de magias (várias opções por sequência)
    if(state.mode === "taumaturgia"){
      syncMagicSelect();
      const spell = currentSpellForSeq(s);
      if(!spell){
        if(resultTitle) resultTitle.textContent = "—";
        if(resultTags) resultTags.textContent = "—";
        if(resultText) resultText.textContent = "Magia não encontrada.";
        if(rollDamageBtn) rollDamageBtn.disabled = true;
        if(executeBtn) executeBtn.disabled = true;
        return;
      }

      // ArtsMode não é necessário aqui (cada magia define se rola ou não)
      if(artsMode && artsMode.parentElement) artsMode.parentElement.style.display = "none";

      const chosenEl = getChosenElement(s, spell);
      syncElementSelect(s, spell);
      const shownName = elementizeText(spell.name, chosenEl, spell.element);
      if(resultTitle) resultTitle.textContent = shownName;
      if(resultTags) resultTags.textContent = `Taumaturgia • ${tagsLine(spell, chosenEl)} • Sequência: ${prettySeq(s)}`;
      if(resultText) resultText.textContent = buildSpellText(spell, s, chosenEl);


      const rm = spell.rollMode || "none";
      if(rollDamageBtn){
        rollDamageBtn.dataset.mode = rm;
        rollDamageBtn.disabled = (rm === "none");
        rollDamageBtn.textContent =
          (rm === "shield" || rm === "shieldArea") ? "Rolar escudo" :
          (rm === "heal" || rm === "healArea") ? "Rolar cura" :
          (rm === "none") ? "Rolar" : "Rolar valor";
      }
      if(executeBtn) executeBtn.disabled = false;
      return;
    }

    // Volumen: mantém o sistema de técnicas automático
    if(artsMode && artsMode.parentElement) artsMode.parentElement.style.display = "";

    const action = currentActionForSeq(s);
    if(!action){
      if(resultTitle) resultTitle.textContent = "—";
      if(resultTags) resultTags.textContent = "—";
      if(resultText) resultText.textContent = "Técnica não encontrada.";
      if(rollDamageBtn) rollDamageBtn.disabled = true;
      if(executeBtn) executeBtn.disabled = true;
      return;
    }

    if(resultTitle) resultTitle.textContent = action.name;
    if(resultTags) resultTags.textContent =
      `Volumen • ${action.kind} • ${action.tags} • Sequência: ${prettySeq(action.req)}`;

    if(resultText) resultText.textContent = action.text();

    const dmgMode = resolveDamageMode(action);
    if(rollDamageBtn){
      rollDamageBtn.dataset.mode = dmgMode;
      rollDamageBtn.disabled = (dmgMode === "none");
      rollDamageBtn.textContent =
        (dmgMode === "shield") ? "Rolar escudo" :
        (dmgMode === "heal" || dmgMode === "healArea") ? "Rolar cura" :
        (dmgMode === "none") ? "Rolar" : "Rolar valor";
    }
    if(executeBtn) executeBtn.disabled = false;
  }

  function refreshAll(){
    renderSeq();
    renderActions();
    renderResult();
    if(modeHint){
      modeHint.textContent =
        (state.mode === "volumen")
          ? "Volumen: mercúrio versátil (ataque, defesa, detecção, controle)."
          : "Taumaturgia: pressão + runas (golpes curtos, selos, cura, interferência, terreno).";
    }
  }

  // =========================
  // Rolagem
  // =========================
  function rollValue(){
    const mode = (rollDamageBtn && rollDamageBtn.dataset.mode) ? rollDamageBtn.dataset.mode : "none";
    if(mode === "none") return;

    playRoll();

    const bCount = countInSeq("buster");
    const qCount = countInSeq("quick");
    const aCount = countInSeq("arts");

    if(mode === "shield" || mode === "shieldArea"){
      // Escudo baseado em Arts: 2 Arts = 1d12; 3 Arts = 1d12+1d8
      const bonus = (aCount >= 3) ? randInt(1,8) : 0;
      const base = randInt(1,12);
      const total = base + bonus;
      const label = (aCount >= 3) ? `1d12+1d8` : `1d12`;
      if(damageOut) damageOut.textContent = `${label} (escudo) = ${total}`;
      return;
    }

    if(mode === "buster"){
      // Buster: 1d10; se houver outro Buster no combo (2º/3º), vira d12
      const die = (bCount >= 2) ? 12 : 10;
      const n = Math.max(1, bCount);
      const rolls = [];
      let sum = 0;
      for(let i=0;i<n;i++){
        const r = randInt(1,die);
        rolls.push(r);
        sum += r;
      }
      if(damageOut) damageOut.textContent = `${n}d${die} = [${rolls.join(", ")}] (total ${sum})`;
      return;
    }

    if(mode === "arts" || mode === "heal" || mode === "healArea"){
      const rolls = [];
      let sum = 0;
      const nA = Math.max(1, aCount);
      for(let i=0;i<nA;i++){
        const r = randInt(1,8);
        rolls.push(r);
        sum += r;
      }

      if(mode === "healArea"){
        const n = clamp(parseInt(targetsCount && targetsCount.value,10) || 1, 1, 12);
        const per = [];
        let grand = 0;
        for(let t=0;t<n;t++){
          grand += sum;
          per.push(nA === 1 ? `${sum}` : `(${rolls.join("+")})=${sum}`);
        }
        if(damageOut) damageOut.textContent = `${n} aliado(s) × ${nA}d8 = [${per.join(" | ")}] (total ${grand})`;
      } else if(mode === "heal"){
        if(damageOut) damageOut.textContent = `${nA}d8 (cura) = [${rolls.join(", ")}] (total ${sum})`;
      } else {
        if(damageOut) damageOut.textContent = `${nA}d8 = [${rolls.join(", ")}] (total ${sum})`;
      }
      return;
    }

    if(mode === "quick"){
      const n = clamp(parseInt(targetsCount && targetsCount.value,10) || 1, 1, 12);
      const perTarget = [];
      let grand = 0;

      // Quick: base = qCount d6 por alvo; cada Buster no combo adiciona +1d6 por alvo
      const dicePerTarget = Math.max(1, qCount) + Math.max(0, bCount);

      for(let t=0;t<n;t++){
        const rolls = [];
        let sum = 0;
        for(let i=0;i<dicePerTarget;i++){
          const r = randInt(1,6);
          rolls.push(r);
          sum += r;
        }
        grand += sum;
        perTarget.push(dicePerTarget === 1 ? `${sum}` : `(${rolls.join("+")})=${sum}`);
      }

      if(damageOut) damageOut.textContent = `${n} alvo(s) × ${dicePerTarget}d6 = [${perTarget.join(" | ")}] (total ${grand})`;
      return;
    }
  }

  // =========================
  // Executar (consome sequência)
  // =========================
  function executeAction(){
    if(state.seq.length === 0) return;
    playClick();

    state.seq = [];
    state.selectedActionId = null;

    if(damageOut) damageOut.textContent = "—";
    if(resultTitle) resultTitle.textContent = "—";
    if(resultTags) resultTags.textContent = "—";
    if(resultText) resultText.textContent = (state.mode === "taumaturgia")
      ? "Magia executada. Monte uma nova sequência."
      : "Técnica executada. Monte uma nova sequência.";

    if(rollDamageBtn){
      rollDamageBtn.disabled = true;
      rollDamageBtn.dataset.mode = "none";
      rollDamageBtn.textContent = "Rolar";
    }
    if(executeBtn) executeBtn.disabled = true;

    renderHand();
    syncHandCount();
    refreshAll();
  }

  // =========================
  // Reset geral
  // =========================
  function resetAll(){
    state.hand = [];
    state.seq = [];
    state.selectedActionId = null;

    if(damageOut) damageOut.textContent = "—";
    if(resultTitle) resultTitle.textContent = "—";
    if(resultTags) resultTags.textContent = "—";
    if(resultText) resultText.textContent = "Monte uma sequência e selecione a magia/técnica.";

    if(rollDamageBtn){
      rollDamageBtn.disabled = true;
      rollDamageBtn.dataset.mode = "none";
      rollDamageBtn.textContent = "Rolar";
    }
    if(executeBtn) executeBtn.disabled = true;

    renderHand();
    renderSeq();
    renderActions();
    syncHandCount();
  }

  // =========================
  // Eventos
  // =========================
  if(fillHandBtn) fillHandBtn.addEventListener("click", ()=>{ playClick(); fillHand(); });
  if(drawOneBtn) drawOneBtn.addEventListener("click", ()=>{ playClick(); drawOne(); });
  if(resetBtn) resetBtn.addEventListener("click", ()=>{ playClick(); resetAll(); });
  if(clearSeqBtn) clearSeqBtn.addEventListener("click", ()=> clearSeq());

  if(handLimitInput) handLimitInput.addEventListener("change", ()=> setHandLimit(parseInt(handLimitInput.value,10) || 7));

  if(modeSelect) modeSelect.addEventListener("change", ()=>{
    playClick();
    state.mode = modeSelect.value || "taumaturgia";
    state.selectedActionId = null;
    if(damageOut) damageOut.textContent = "—";
    refreshAll();
  });

  if(artsMode) artsMode.addEventListener("change", ()=>{
    if(damageOut) damageOut.textContent = "—";
    renderResult();
  });

  if(magicSelect) magicSelect.addEventListener("change", ()=>{
    if(damageOut) damageOut.textContent = "—";
    const s = seqKeys();
    if(state.mode !== "taumaturgia" || s.length === 0) return;
    const k = seqKey(s);
    state.selectedSpellBySeq[k] = magicSelect.value;
    renderActions();
    renderResult();


  if(elementSelect) elementSelect.addEventListener("change", ()=>{
    if(damageOut) damageOut.textContent = "—";
    const s = seqKeys();
    if(state.mode !== "taumaturgia" || s.length === 0) return;
    const k = seqKey(s);
    state.selectedElementBySeq[k] = elementSelect.value;
    renderActions();
    renderResult();
  });
  });

  if(rollDamageBtn) rollDamageBtn.addEventListener("click", ()=> rollValue());
  if(executeBtn) executeBtn.addEventListener("click", ()=> executeAction());

  // =========================
  // Init
  // =========================
  (function init(){
    state.mode = (modeSelect && modeSelect.value) ? modeSelect.value : "taumaturgia";
    setHandLimit(parseInt(handLimitInput && handLimitInput.value,10) || 7);
    resetAll();
    fillHand();
    refreshAll();
  })();

})();
