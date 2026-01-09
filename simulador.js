// simulador.js (Sebastian) — sistema estilo Adão, sem d6/d8/d10
(function(){
  function $(id){ return document.getElementById(id); }
  function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

  // ============================
  // Cartas
  // ============================

  const CARDS = [
    { key:"quick",  label:"Quick",  css:"quick",  icon:"assets/card_quick.svg",  desc:"Quick: vários alvos (zona/área)." },
    { key:"arts",   label:"Arts",   css:"arts",   icon:"assets/card_arts.svg",   desc:"Arts: efeito (ou ataque leve) e controle." },
    { key:"buster", label:"Buster", css:"buster", icon:"assets/card_buster.svg", desc:"Buster: foco em 1 alvo, impacto direto." },
  ];

  function cardByKey(k){ return CARDS.find(c=>c.key===k) || CARDS[0]; }

  // ============================
  // Ações — MODO VOLUMEN (primeiro)
  // ============================

  const VOLUMEN_ACTIONS = [
    // 1 carta
    {
      id:"estocada_mercurial",
      name:"Estocada Mercurial",
      kind:"Ataque",
      req:["buster"],
      tags:"Alvo único • perfuração",
      damageMode:"buster",
      text: (ctx) => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: à vista",
        "Alvos: 1 criatura",
        "",
        "Efeito:",
        "O Volumen afina em uma lança líquida e dispara num estalo prateado, buscando brecha na guarda.",
        "É um golpe direto, feito para terminar a troca sem enrolação.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (impacto perfurante).`,
      ].join("\n")
    },
    {
      id:"chuva_agulhas",
      name:"Chuva de Agulhas",
      kind:"Ataque",
      req:["quick"],
      tags:"Vários alvos • rajada",
      damageMode:"quick",
      text: (ctx) => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: zona escolhida à vista",
        "Alvos: múltiplas criaturas na área",
        "",
        "Efeito:",
        "O Volumen se divide em microagulhas e varre a zona como granizo metálico.",
        "Quem estiver exposto precisa recuar, se cobrir ou pagar o preço.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"sonda_prata",
      name:"Sonda de Prata",
      kind:"Detecção",
      req:["arts"],
      tags:"Efeito • rastreio/diagnóstico",
      damageMode:"none",
      text: () => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: à vista",
        "Alvos: 1 criatura, objeto ou área pequena",
        "",
        "Efeito:",
        "O Volumen vira fios finíssimos e “tateia” o ambiente: vibração, calor, pulsos e irregularidades.",
        "Isso revela presença, direção aproximada, pontos frágeis e sinais de armadilha/ocultação, se fizer sentido na cena.",
        "",
        "Observação:",
        "Não é dano. É informação e vantagem tática.",
      ].join("\n")
    },

    // 2 cartas (duplica/combina)
    {
      id:"martelo_liga",
      name:"Martelo de Liga",
      kind:"Ataque",
      req:["buster","buster"],
      tags:"Alvo único • pressão bruta",
      damageMode:"buster",
      text: (ctx) => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: à vista",
        "Alvos: 1 criatura",
        "",
        "Efeito:",
        "O Volumen engrossa e ganha massa no último instante, transformando a estocada em um impacto esmagador.",
        "Ideal para quebrar ritmo, empurrar e abrir espaço na força.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (impacto pesado).`,
      ].join("\n")
    },
    {
      id:"redemoinho_lascas",
      name:"Redemoinho de Lascas",
      kind:"Ataque",
      req:["quick","quick"],
      tags:"Vários alvos • zona perigosa",
      damageMode:"quick",
      text: (ctx) => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: zona escolhida à vista",
        "Alvos: múltiplas criaturas na área",
        "",
        "Efeito:",
        "O Volumen mantém a área ocupada em rotação contínua, como um moedor prateado.",
        "Mesmo quem tenta atravessar “com coragem” acaba sendo forçado a desistir ou tomar cortes.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"escudo_hidragirum",
      name:"Escudo de Hydrargyrum",
      kind:"Defesa",
      req:["arts","arts"],
      tags:"Defesa • barreira",
      damageMode:"shield",
      text: () => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: pessoal ou à vista (alvo próximo, se fizer sentido)",
        "Alvos: você (ou alguém que você esteja protegendo)",
        "",
        "Efeito:",
        "O Volumen abre em placas e camadas sobrepostas, formando um escudo maleável que acompanha o movimento.",
        "Ele absorve impacto e “desvia” a força, reduzindo dano de forma clara.",
        "",
        "Absorção:",
        "1d12 (escudo).",
      ].join("\n")
    },
    {
      id:"travamento_condutivo",
      name:"Travamento Condutivo",
      kind:"Ataque + Controle",
      req:["arts","buster"],
      tags:"Alvo único • trava/abertura",
      damageMode:"buster",
      text: (ctx) => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: à vista",
        "Alvos: 1 criatura",
        "",
        "Efeito:",
        "Fios prateados grudam como uma malha rápida e puxam microajustes na postura do alvo.",
        "No mesmo instante, o golpe entra no ponto que a guarda não cobre direito.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (impacto + brecha criada).`,
        "",
        "Extra:",
        "O alvo fica com a movimentação/conjuração atrapalhada por um momento, se for coerente com a cena.",
      ].join("\n")
    },
    {
      id:"campo_fragmentos",
      name:"Campo de Fragmentos",
      kind:"Ataque + Zona",
      req:["arts","quick"],
      tags:"Vários alvos • controle de área",
      damageMode:"quick",
      text: (ctx) => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: zona escolhida à vista",
        "Alvos: múltiplas criaturas na área",
        "",
        "Efeito:",
        "O Volumen espalha partículas que reagem ao movimento. Cada passo “puxa” lâminas pequenas para onde dói.",
        "Serve para negar avanço e punir agrupamentos.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"perfura_sela",
      name:"Perfurar e Selar",
      kind:"Ataque + Marca",
      req:["buster","arts"],
      tags:"Alvo único • marca",
      damageMode:"arts",
      text: (ctx) => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: à vista",
        "Alvos: 1 criatura",
        "",
        "Efeito:",
        "O primeiro impacto força a defesa a ‘ceder’. Em seguida, o Volumen grava um padrão prateado no alvo.",
        "A marca facilita acerto, rastreio ou aplicação de efeitos em sequência (se o mestre permitir).",
        "",
        "Dano:",
        `${ctx.artsCount}d8 (ataque leve + marca).`,
      ].join("\n")
    },
    {
      id:"neblina_rastreamento",
      name:"Neblina de Rastreamento",
      kind:"Detecção + Zona",
      req:["quick","arts"],
      tags:"Vários alvos • revelar/seguir",
      damageMode:"none",
      text: () => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: zona escolhida à vista",
        "Alvos: múltiplas criaturas na área (ou trilhas na área)",
        "",
        "Efeito:",
        "Partículas finas se espalham e reagem a calor, vibração e deslocamento, denunciando posições e rotas.",
        "Ótimo para caçar invisibilidade ‘barata’, achar cobertura falsa ou marcar quem tenta fugir.",
      ].join("\n")
    },

    // 3 cartas (pico)
    {
      id:"guillotine_hydrargyrum",
      name:"Guilhotina de Hydrargyrum",
      kind:"Ataque",
      req:["buster","buster","buster"],
      tags:"Alvo único • finalizador",
      damageMode:"buster",
      text: (ctx) => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: à vista",
        "Alvos: 1 criatura",
        "",
        "Efeito:",
        "O Volumen forma uma lâmina grande e precisa, como uma tesoura de execução: trava, fecha, corta.",
        "É o tipo de golpe que encerra discussão se o alvo não tiver uma resposta boa.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (finalizador).`,
      ].join("\n")
    },
    {
      id:"tempestade_estilhacos",
      name:"Tempestade de Estilhaços",
      kind:"Ataque",
      req:["quick","quick","quick"],
      tags:"Vários alvos • devastação em área",
      damageMode:"quick",
      text: (ctx) => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: zona escolhida à vista",
        "Alvos: múltiplas criaturas na área",
        "",
        "Efeito:",
        "O Volumen vira uma tempestade de fragmentos que persegue movimento dentro da zona.",
        "Ideal para limpar campo, separar grupo e forçar escolhas ruins.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"catedral_prata",
      name:"Catedral de Prata",
      kind:"Defesa + Controle",
      req:["arts","arts","arts"],
      tags:"Fortificação • proteção",
      damageMode:"shield",
      text: () => [
        "Conjuração: 1 ação",
        "Fonte: Volumen Hydrargyrum",
        "Alcance: pessoal / zona curta",
        "Alvos: você e área imediata",
        "",
        "Efeito:",
        "O Volumen se ergue em placas, arcos e travas, criando cobertura e rotas seguras por um instante.",
        "Serve para segurar pressão, proteger recuo ou garantir uma janela de ação.",
        "",
        "Absorção:",
        "1d12 (escudo).",
        "",
        "Extra:",
        "A área fica “difícil” de atravessar para quem quiser forçar passagem, se for coerente com a cena.",
      ].join("\n")
    },
  ];

  // ============================
  // Estado
  // ============================

  const state = {
    hand: [],
    seq: [],                // cartas reservadas (objetos carta)
    selectedActionId: null,
    handLimit: 7,
    mode: "volumen",
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
  const modeSelect = $("modeSelect");

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
  function playClick(){ playTone(740, 80, "triangle", 0.05); }
  function playDraw(){ playTone(520, 120, "sine", 0.045); }
  function playPlace(){ playTone(620, 90, "triangle", 0.05); }
  function playRoll(){
    if(!soundToggle.checked) return;
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

  // ============================
  // Util (deck/hand)
  // ============================

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

    while(state.hand.length > state.handLimit){
      state.hand.pop();
    }

    handLimitInput.value = String(state.handLimit);
    renderHand();
    syncHandCount();
  }

  function addToHand(card){
    if(state.hand.length >= state.handLimit) return false;
    state.hand.push(card);
    return true;
  }

  // ============================
  // Sequência
  // ============================

  function seqKeys(){
    return state.seq.map(c => c.key);
  }
  function countInSeq(key){
    return state.seq.reduce((acc,c)=>acc+(c.key===key?1:0), 0);
  }

  function renderSeq(){
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
          // devolver para mão (respeita limite)
          if(state.hand.length >= state.handLimit){
            // se a mão estiver cheia, não devolve (mantém simples)
            resultText.textContent = "A mão está no limite. Aumente o limite ou consuma cartas antes de devolver.";
            return;
          }
          const removed = state.seq.splice(i,1)[0];
          state.hand.push(removed);
          state.selectedActionId = null;
          damageOut.textContent = "—";
          renderHand();
          syncHandCount();
          refreshActionsAndResult();
        });

      } else {
        slot.innerHTML = `
          <div class="muted" style="font-weight:800">Slot ${i+1}</div>
          <div class="seqSub">vazio</div>
        `;
      }

      seqSlots.appendChild(slot);
    }
  }

  // ============================
  // Render mão
  // ============================

  function renderHand(){
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

        // move carta da mão para seq (mantém ordem de clique)
        const picked = state.hand.splice(idx,1)[0];
        state.seq.push(picked);

        state.selectedActionId = null;
        damageOut.textContent = "—";

        renderHand();
        syncHandCount();
        refreshActionsAndResult();
      });

      handGrid.appendChild(div);
    });
  }

  // ============================
  // Ações disponíveis
  // ============================

  function getModeActions(){
    if(state.mode === "volumen") return VOLUMEN_ACTIONS;
    return []; // Taumaturgia por enquanto fica genérica
  }

  function findMatchedActions(){
    const s = seqKeys();
    if(s.length === 0) return [];
    const actions = getModeActions();
    return actions.filter(a => a.req.length === s.length && a.req.every((k,i)=>k===s[i]));
  }

  function renderActions(){
    actionsList.innerHTML = "";
    const s = seqKeys();

    if(s.length === 0){
      actionsHint.textContent = "Monte uma sequência para ver ações compatíveis.";
      return;
    }

    if(state.mode === "taumaturgia"){
      actionsHint.textContent = `Modo Taumaturgia: técnica genérica para ${s.map(k=>cardByKey(k).label).join(" → ")}.`;
      return;
    }

    const matched = findMatchedActions();
    actionsHint.textContent =
      matched.length
        ? `Ações compatíveis com: ${s.map(k=>cardByKey(k).label).join(" → ")}`
        : "Nenhuma ação nomeada bateu. Você ainda ganha uma técnica genérica coerente.";

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
        playClick();
        state.selectedActionId = a.id;

        for(const el of actionsList.querySelectorAll(".actionCard")){
          el.classList.remove("selected");
        }
        div.classList.add("selected");

        damageOut.textContent = "—";
        renderResult();
      });

      actionsList.appendChild(div);
    }
  }

  // ============================
  // Técnica genérica
  // ============================

  function genericTechnique(s){
    const last = s[s.length-1];
    const hasArts = s.includes("arts");
    const hasQuick = s.includes("quick");
    const hasBuster = s.includes("buster");

    const modeName = (state.mode === "volumen") ? "Volumen Hydrargyrum" : "Taumaturgia";
    const vibe = [];

    if(state.mode === "volumen"){
      if(hasArts) vibe.push("O Volumen afina e ajusta forma e função: fios, placas, travas e microestruturas úteis.");
      if(hasQuick) vibe.push("A matéria se fragmenta e ocupa espaço, punindo movimento e forçando recuo.");
      if(hasBuster) vibe.push("No fim, tudo condensa em um golpe direto e sem desperdício.");
    }else{
      if(hasArts) vibe.push("Você estabiliza um efeito: regra simples, controle e intervenção.");
      if(hasQuick) vibe.push("Você abre uma zona de pressão, espalhando impacto e empurrando escolhas ruins.");
      if(hasBuster) vibe.push("Você conclui com um impacto firme, focado e curto.");
    }

    let reach = "à vista";
    let targets = "conforme a execução";
    let dmgLine = "Sem dano direto (efeito).";
    let dmgMode = "none";

    const bCount = countInSeq("buster");
    const qCount = countInSeq("quick");
    const aCount = countInSeq("arts");

    if(last === "buster"){
      targets = "1 criatura";
      dmgLine = `${bCount}d10 (impacto).`;
      dmgMode = "buster";
    }else if(last === "quick"){
      reach = "zona escolhida à vista";
      targets = "múltiplas criaturas na área";
      dmgLine = `${qCount}d6 em cada alvo atingido.`;
      dmgMode = "quick";
    }else{
      targets = hasQuick ? "múltiplas criaturas na área (efeito)" : "1 criatura/objeto/efeito";
      if(artsMode.value === "damage"){
        dmgLine = `${aCount}d8 (ataque leve).`;
        dmgMode = "arts";
      }else{
        dmgLine = "Sem dano direto (efeito).";
        dmgMode = "none";
      }
    }

    return {
      title: `Técnica Encadeada — ${s.map(k=>cardByKey(k).label).join(" → ")}`,
      tags: `${modeName} • Genérica`,
      text: [
        "Conjuração: 1 ação",
        `Fonte: ${modeName}`,
        `Alcance: ${reach}`,
        `Alvos: ${targets}`,
        "",
        "Efeito:",
        ...vibe,
        "",
        "Dano/Valor:",
        dmgLine
      ].join("\n"),
      damageMode: dmgMode
    };
  }

  // ============================
  // Resultado
  // ============================

  function ctxForText(){
    return {
      busterCount: Math.max(1, countInSeq("buster")),
      quickCount: Math.max(1, countInSeq("quick")),
      artsCount: Math.max(1, countInSeq("arts")),
    };
  }

  function renderResult(){
    const s = seqKeys();

    if(s.length === 0){
      resultTitle.textContent = "—";
      resultTags.textContent = "—";
      resultText.textContent = "Monte uma sequência e selecione uma ação.";
      rollDamageBtn.disabled = true;
      executeBtn.disabled = true;
      damageOut.textContent = "—";
      rollDamageBtn.textContent = "Rolar";
      rollDamageBtn.dataset.mode = "none";
      return;
    }

    const matched = findMatchedActions();
    const picked = matched.find(a => a.id === state.selectedActionId) || matched[0] || null;

    if(picked){
      const ctx = ctxForText();
      resultTitle.textContent = picked.name;
      resultTags.textContent =
        `${state.mode === "volumen" ? "Volumen" : "Taumaturgia"} • ${picked.kind} • ${picked.tags} • Sequência: ${picked.req.map(k=>cardByKey(k).label).join(" → ")}`;

      resultText.textContent = picked.text(ctx);

      rollDamageBtn.dataset.mode = picked.damageMode;
      rollDamageBtn.disabled = (picked.damageMode === "none");
      executeBtn.disabled = false;

      rollDamageBtn.textContent =
        (picked.damageMode === "shield") ? "Rolar escudo" :
        (picked.damageMode === "none") ? "Rolar" : "Rolar dano";

      return;
    }

    const gen = genericTechnique(s);
    resultTitle.textContent = gen.title;
    resultTags.textContent = `${gen.tags} • Sequência: ${s.map(k=>cardByKey(k).label).join(" → ")}`;
    resultText.textContent = gen.text;

    rollDamageBtn.dataset.mode = gen.damageMode;
    rollDamageBtn.disabled = (gen.damageMode === "none");
    executeBtn.disabled = false;

    rollDamageBtn.textContent =
      (gen.damageMode === "none") ? "Rolar" : "Rolar dano";
  }

  function refreshActionsAndResult(){
    renderSeq();
    renderActions();
    renderResult();
  }

  // ============================
  // Rolagem (dano/escudo)
  // ============================

  function rollDamage(){
    const mode = rollDamageBtn.dataset.mode || "none";
    if(mode === "none") return;

    playRoll();

    const bCount = Math.max(1, countInSeq("buster"));
    const qCount = Math.max(1, countInSeq("quick"));
    const aCount = Math.max(1, countInSeq("arts"));

    if(mode === "shield"){
      const v = randInt(1,12);
      damageOut.textContent = `1d12 (escudo) = ${v}`;
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
      damageOut.textContent = `${bCount}d10 = [${rolls.join(", ")}] (total ${sum})`;
      return;
    }

    if(mode === "arts"){
      const rolls = [];
      let sum = 0;
      for(let i=0;i<aCount;i++){
        const r = randInt(1,8);
        rolls.push(r);
        sum += r;
      }
      damageOut.textContent = `${aCount}d8 = [${rolls.join(", ")}] (total ${sum})`;
      return;
    }

    if(mode === "quick"){
      const n = Math.max(1, Math.min(12, parseInt(targetsCount.value,10) || 1));

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

      damageOut.textContent = `${n} alvo(s) × ${qCount}d6 = [${perTarget.join(" | ")}] (total ${grand})`;
      return;
    }
  }

  // ============================
  // Executar (consome sequência)
  // ============================

  function executeAction(){
    if(state.seq.length === 0) return;

    playClick();

    state.seq = [];
    state.selectedActionId = null;

    damageOut.textContent = "—";
    resultTitle.textContent = "—";
    resultTags.textContent = "—";
    resultText.textContent = "Técnica executada. Monte uma nova sequência.";

    rollDamageBtn.disabled = true;
    executeBtn.disabled = true;
    rollDamageBtn.dataset.mode = "none";
    rollDamageBtn.textContent = "Rolar";

    renderHand();
    syncHandCount();
    refreshActionsAndResult();
  }

  // ============================
  // Comprar / Reset
  // ============================

  function fillHand(){
    const need = state.handLimit - state.hand.length;
    if(need <= 0) return;

    // compra com ritmo (fica mais divertido)
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
    rollDamageBtn.dataset.mode = "none";
    rollDamageBtn.textContent = "Rolar";

    renderHand();
    renderSeq();
    renderActions();
    syncHandCount();
  }

  // ============================
  // Eventos
  // ============================

  fillHandBtn.addEventListener("click", ()=>{ playClick(); fillHand(); });
  drawOneBtn.addEventListener("click", ()=>{ playClick(); drawOne(); });
  resetBtn.addEventListener("click", ()=>{ playClick(); resetAll(); });

  handLimitInput.addEventListener("change", ()=> setHandLimit(parseInt(handLimitInput.value,10) || 7));

  modeSelect.addEventListener("change", ()=>{
    playClick();
    state.mode = modeSelect.value || "volumen";
    state.selectedActionId = null;
    damageOut.textContent = "—";
    refreshActionsAndResult();
  });

  artsMode.addEventListener("change", ()=>{
    // afeta só a técnica genérica quando termina em Arts
    damageOut.textContent = "—";
    renderResult();
  });

  rollDamageBtn.addEventListener("click", ()=> rollDamage());
  executeBtn.addEventListener("click", ()=> executeAction());

  // ============================
  // Init
  // ============================

  (function init(){
    state.mode = modeSelect.value || "volumen";
    setHandLimit(parseInt(handLimitInput.value,10) || 7);

    resetAll();
    fillHand();
    refreshActionsAndResult();
  })();

})();
