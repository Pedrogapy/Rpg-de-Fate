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
  function cardByKey(k){ return CARDS.find(c=>c.key===k) || CARDS[0]; }
  function prettySeq(seq){ return seq.map(k=>cardByKey(k).label).join(" → "); }

  // =========================
  // Estado
  // =========================
  const state = {
    hand: [],
    seq: [],
    selectedActionId: null,
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
  const rollDamageBtn = $("rollDamageBtn");
  const executeBtn = $("executeBtn");
  const damageOut = $("damageOut");
  const damageBox = $("damageBox");
  const targetsLabel = $("targetsLabel");

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

  // ------ Cura & Suporte: combinações especiais (Taumaturgia) ------
  // Regras-alvo do Sebastian:
  // - Arts (sozinho) → cura em alvo único
  // - Arts + Quick (em qualquer ordem) → cura em área
  // - Arts + Arts → proteção/escudo (ver TAU_SPECIALS)
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

    // Arts + Quick (área) — ordem importa na narrativa, mas o efeito é o mesmo (área).
    "arts|quick": {
      name: "Pulso de Socorro",
      kind: "Cura",
      tags: "cura • área",
      damageMode: "healArea",
      resultLine: "Uma runa dispara um pulso e se espalha pelo chão/vento como uma onda suave, alcançando aliados na zona.",
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
    },

    // Triplas focadas em cura de área (mais consistente)
    "arts|arts|quick": {
      name: "Círculo de Recuperação",
      kind: "Cura",
      tags: "cura • área • sustentação curta",
      damageMode: "healArea",
      resultLine: "Você fecha um círculo de runas e libera um pulso amplo. A área fica marcada por um instante, facilitando a recuperação de quem estiver dentro.",
      reach: "zona escolhida à vista",
      targets: "múltiplos aliados na área"
    },
    "arts|quick|arts": {
      name: "Círculo de Recuperação",
      kind: "Cura",
      tags: "cura • área • sustentação curta",
      damageMode: "healArea",
      resultLine: "Você abre o pulso (Arts+Quick) e sela com uma segunda runa, tornando a cura de área mais estável e previsível.",
      reach: "zona escolhida à vista",
      targets: "múltiplos aliados na área"
    },
    "quick|arts|arts": {
      name: "Círculo de Recuperação",
      kind: "Cura",
      tags: "cura • área • sustentação curta",
      damageMode: "healArea",
      resultLine: "Você prepara a zona com pressão (Quick) e encadeia duas runas para selar a recuperação em quem estiver dentro.",
      reach: "zona escolhida à vista",
      targets: "múltiplos aliados na área"
    }
  };

  // ------ Técnicas especiais (Taumaturgia) ------
  const TAU_SPECIALS = {
    // Arts + Arts → escudo (single)
    "arts|arts": {
      name: "Sutura de Contenção",
      kind: "Defesa",
      tags: "escudo • alvo único",
      damageMode: "shield",
      resultLine: "Duas runas se fecham como um ponto cirúrgico no ar/na armadura. Por alguns instantes, o impacto recebido é absorvido por uma ‘costura’ de pressão.",
      reach: "curta a média (à vista)",
      targets: "1 aliado (ou você)"
    },

    // Triple Arts → escudo em área pequena (usa contador de alvos)
    "arts|arts|arts": {
      name: "Circuito de Contenção",
      kind: "Defesa",
      tags: "escudo • área pequena",
      damageMode: "shieldArea",
      resultLine: "Você fecha um circuito completo de runas. Uma película de pressão percorre a área e vira um escudo coletivo por um instante.",
      reach: "zona escolhida à vista",
      targets: "múltiplos aliados na área"
    },

    // Selos / interferência mais claros (sem rolagem, por padrão)
    "arts|buster": {
      name: "Selo de Ruptura",
      kind: "Ataque",
      tags: "alvo único • marca",
      damageMode: "buster",
      resultLine: "Você marca o alvo com uma runa curta e termina com um golpe de pressão. A marca ‘puxa’ a guarda para o lado errado, abrindo brecha para o impacto.",
      reach: "curta a média (à vista)",
      targets: "1 alvo"
    },
    "buster|arts": {
      name: "Travamento Barométrico",
      kind: "Efeito/Controle",
      tags: "selo • contenção",
      damageMode: "artsMaybe",
      resultLine: "Após o impacto inicial, você grava uma runa que ‘trava’ o ritmo do alvo por um instante (reduz deslocamento, impede uma ação específica ou força reposicionamento).",
      reach: "curta a média (à vista)",
      targets: "1 alvo"
    },
    "quick|arts|quick": {
      name: "Interferência em Campo",
      kind: "Efeito/Controle",
      tags: "interferência • área",
      damageMode: "none",
      resultLine: "Você ocupa a zona com pressão (Quick), instala uma runa de ruído (Arts) e finaliza varrendo a área. A interferência atrapalha conjurações, mira ou coordenação por um momento.",
      reach: "zona escolhida à vista",
      targets: "múltiplos alvos na área"
    },
    "arts|quick|quick": {
      name: "Vórtice de Salvamento",
      kind: "Cura",
      tags: "cura • área • reposicionamento",
      damageMode: "healArea",
      resultLine: "Uma runa puxa aliados para ‘o lado certo’ enquanto a pressão varre a zona. Cura em área e, narrativamente, ajuda a tirar gente de linha de tiro.",
      reach: "zona escolhida à vista",
      targets: "múltiplos aliados na área"
    }
  };

  // ------ Técnicas especiais (Volumen) ------
  const VOL_SPECIALS = {
    "arts|arts|arts": {
      name: "Catedral de Prata",
      kind: "Defesa/Controle",
      tags: "zona • cobertura",
      damageMode: "none",
      resultLine: "Você ergue uma estrutura de mercúrio em placas e arcos, criando cobertura, bloqueio de linha e controle de espaço por um curto período.",
      reach: "zona escolhida à vista",
      targets: "zona/terreno"
    },
    "arts|arts": {
      name: "Lâmina-Guarda",
      kind: "Defesa",
      tags: "escudo • alvo único",
      damageMode: "shield",
      resultLine: "O mercúrio forma placas e fios que absorvem impacto e redirecionam estilhaços por um instante.",
      reach: "curta a média (à vista)",
      targets: "1 aliado (ou você)"
    }
  };


  
  function specialFor(mode, seq){
    const sk = seqKey(seq);
    if(mode === "taumaturgia") return HEALING[sk] || TAU_SPECIALS[sk] || null;
    if(mode === "volumen") return VOL_SPECIALS[sk] || null;
    return null;
  }

function titleFromSeq(mode, seq){
    const sk = seqKey(seq);

    const sp = specialFor(mode, seq);
    if(sp && sp.name) return sp.name;

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

    const sp = specialFor(mode, seq);
    if(sp){
      return { kind: sp.kind || "Técnica", dmgMode: sp.damageMode || "none", tags: sp.tags || "—", forced: sp };
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

    if(dmgMode==="shield") return `Absorção: ${a}d8 (escudo).`;
    if(dmgMode==="shieldArea") return `Absorção: ${a}d6 para cada aliado na área (use o contador).`;
    if(dmgMode==="buster") return `Dano: ${b}d10 (impacto em 1 alvo).`;
    if(dmgMode==="quick")  return `Dano: ${q}d6 em cada alvo atingido.`;
    if(dmgMode==="heal")   return `Cura: ${a}d8 (em 1 aliado).`;
    if(dmgMode==="healArea") return `Cura: ${a}d8 para cada aliado na área (configure a quantidade de alvos).`;
    return `Arts: ${a}d8 se você escolher “Dano”; se escolher “Efeito”, não rola valor.`;
  }

  function resultTextFromAction(action){
    const seq = action.req.slice();
    const last = seq[seq.length-1];

    const special = specialFor(action.mode, seq);

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
  function setOutcomeMode(dmgMode){
    if(!damageBox) return;
    damageBox.classList.remove("mode-quick","mode-buster","mode-arts","mode-heal","mode-shield");
    if(dmgMode==="quick") damageBox.classList.add("mode-quick");
    else if(dmgMode==="buster") damageBox.classList.add("mode-buster");
    else if(dmgMode==="arts") damageBox.classList.add("mode-arts");
    else if(dmgMode==="heal" || dmgMode==="healArea") damageBox.classList.add("mode-heal");
    else if(dmgMode==="shield" || dmgMode==="shieldArea") damageBox.classList.add("mode-shield");
  }

  function setTargetsLabelFor(dmgMode){
    if(!targetsLabel) return;
    if(dmgMode==="quick") targetsLabel.textContent = "Quick alvos";
    else if(dmgMode==="healArea") targetsLabel.textContent = "Cura alvos";
    else if(dmgMode==="shieldArea") targetsLabel.textContent = "Escudo alvos";
    else targetsLabel.textContent = "Alvos na área";
  }

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
      setOutcomeMode("none");
      setTargetsLabelFor("none");
      return;
    }

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
      `${state.mode === "volumen" ? "Volumen" : "Taumaturgia"} • ${action.kind} • ${action.tags} • Sequência: ${prettySeq(action.req)}`;

    if(resultText) resultText.textContent = action.text();

    const dmgMode = resolveDamageMode(action);
    setOutcomeMode(dmgMode);
    setTargetsLabelFor(dmgMode);
    if(rollDamageBtn){
      rollDamageBtn.dataset.mode = dmgMode;
      rollDamageBtn.disabled = (dmgMode === "none");
      rollDamageBtn.textContent =
        (dmgMode === "shield" || dmgMode === "shieldArea") ? "Rolar escudo" :
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

    const bCount = Math.max(1, countInSeq("buster"));
    const qCount = Math.max(1, countInSeq("quick"));
    const aCount = Math.max(1, countInSeq("arts"));

    if(mode === "shield"){
      const rolls = [];
      let sum = 0;
      for(let i=0;i<aCount;i++){
        const r = randInt(1,8);
        rolls.push(r);
        sum += r;
      }
      if(damageOut) damageOut.textContent = `${aCount}d8 (escudo) = [${rolls.join(", ")}] (total ${sum})`;
      return;
    }

    if(mode === "shieldArea"){
      const rolls = [];
      let sum = 0;
      for(let i=0;i<aCount;i++){
        const r = randInt(1,6);
        rolls.push(r);
        sum += r;
      }
      const n = clamp(parseInt(targetsCount && targetsCount.value,10) || 1, 1, 12);
      const per = [];
      let grand = 0;
      for(let t=0;t<n;t++){
        grand += sum;
        per.push(aCount === 1 ? `${sum}` : `(${rolls.join("+")})=${sum}`);
      }
      if(damageOut) damageOut.textContent = `${n} aliado(s) × ${aCount}d6 (escudo) = [${per.join(" | ")}] (total ${grand})`;
      return;
    }

    if(mode === "buster"){
      const rolls = [];
      let sum = 0;
      for(let i=0;i<bCount;i++){
        const r = randInt(1,10);
        rolls.push(r);
        sum += r;
      }
      if(damageOut) damageOut.textContent = `${bCount}d10 = [${rolls.join(", ")}] (total ${sum})`;
      return;
    }

    if(mode === "arts" || mode === "heal" || mode === "healArea"){
      const rolls = [];
      let sum = 0;
      for(let i=0;i<aCount;i++){
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
          per.push(aCount === 1 ? `${sum}` : `(${rolls.join("+")})=${sum}`);
        }
        if(damageOut) damageOut.textContent = `${n} aliado(s) × ${aCount}d8 = [${per.join(" | ")}] (total ${grand})`;
      } else if(mode === "heal"){
        if(damageOut) damageOut.textContent = `${aCount}d8 (cura) = [${rolls.join(", ")}] (total ${sum})`;
      } else {
        if(damageOut) damageOut.textContent = `${aCount}d8 = [${rolls.join(", ")}] (total ${sum})`;
      }
      return;
    }

    if(mode === "quick"){
      const n = clamp(parseInt(targetsCount && targetsCount.value,10) || 1, 1, 12);
      const perTarget = [];
      let grand = 0;

      for(let t=0;t<n;t++){
        const rolls = [];
        let sum = 0;
        for(let i=0;i<qCount;i++){
          const r = randInt(1,6);
          rolls.push(r);
          sum += r;
        }
        grand += sum;
        perTarget.push(qCount === 1 ? `${sum}` : `(${rolls.join("+")})=${sum}`);
      }

      if(damageOut) damageOut.textContent = `${n} alvo(s) × ${qCount}d6 = [${perTarget.join(" | ")}] (total ${grand})`;
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
    setOutcomeMode("none");
    setTargetsLabelFor("none");
    if(resultTitle) resultTitle.textContent = "—";
    if(resultTags) resultTags.textContent = "—";
    if(resultText) resultText.textContent = "Técnica executada. Monte uma nova sequência.";

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
    setOutcomeMode("none");
    setTargetsLabelFor("none");
    if(resultTitle) resultTitle.textContent = "—";
    if(resultTags) resultTags.textContent = "—";
    if(resultText) resultText.textContent = "Monte uma sequência e selecione a técnica.";

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
