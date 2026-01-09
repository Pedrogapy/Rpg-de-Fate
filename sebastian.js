// sebastian.js
// Página do Sebastian — cartas + sequência (até 3) + ações (modo Volumen / Taumaturgia)
// Sistema estilo Adão (UI + som + dano), mas com técnicas do Volumen Hydrargyrum.
// Regras de dano (rolagem):
// - Se a técnica termina em Buster: rola 1d10 por carta Buster na sequência (máx. 3) em 1 alvo
// - Se a técnica termina em Quick: rola 1d6 por carta Quick em CADA alvo atingido (n alvos configurável)
// - Se a técnica termina em Arts: pode ser efeito OU ataque leve; se ofensivo, rola 1d8 por carta Arts
// - Escudo: absorve 1d12 (quando a ação for de defesa)

(function(){
  function $(id){ return document.getElementById(id); }
  function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }

  // ============================
  // Cartas
  // ============================

  const CARDS = [
    { key:"quick",  label:"Quick",  css:"quick",  icon:"assets/card_quick.svg",  desc:"Quick: vários alvos (zona/área). Se terminar em Quick: 1d6 por alvo (por carta Quick)." },
    { key:"arts",   label:"Arts",   css:"arts",   icon:"assets/card_arts.svg",   desc:"Arts: efeito (controle/utilidade) ou ataque leve. Se ofensivo: 1d8 (por carta Arts)." },
    { key:"buster", label:"Buster", css:"buster", icon:"assets/card_buster.svg", desc:"Buster: 1 alvo (foco). Se terminar em Buster: 1d10 (por carta Buster)." },
  ];

  function cardByKey(k){ return CARDS.find(c=>c.key===k) || CARDS[0]; }

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
  // DOM (IDs compatíveis com o modelo do Adão)
  // ============================

  const deck = $("deck");
  const flyingCard = $("flyingCard");

  const fillHandBtn = $("fillHandBtn");
  const drawOneBtn = $("drawOneBtn");
  const resetBtn = $("resetBtn");

  const soundToggle = $("soundToggle");
  const handLimitInput = $("handLimit");

  const modeSel = $("modeSel") || $("modeSelect") || $("mode");
  const artsMode = $("artsMode"); // opcional (select ou checkbox/slider)

  const handGrid = $("handGrid");
  const handCount = $("handCount");
  const seqSlots = $("seqSlots");

  const actionsHint = $("actionsHint");
  const actionsList = $("actionsList");

  const resultTitle = $("resultTitle");
  const resultTags  = $("resultTags");
  const resultText  = $("resultText");

  const targetsCount = $("targetsCount");
  const rollDamageBtn = $("rollDamageBtn");
  const executeBtn = $("executeBtn");
  const damageOut = $("damageOut");

  // ============================
  // Som
  // ============================

  function playTone(freq=740, ms=80, type="triangle", gain=0.05){
    if(soundToggle && !soundToggle.checked) return;
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
    if(soundToggle && !soundToggle.checked) return;
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = 220;
      g.gain.value = 0.03;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.frequency.linearRampToValueAtTime(760, ctx.currentTime + 0.14);
      o.stop(ctx.currentTime + 0.16);
      setTimeout(()=>ctx.close(), 240);
    }catch(_){}
  }

  // ============================
  // Animação do deck (se existir)
  // ============================

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

  // ============================
  // Deck / mão
  // ============================

  function drawCardRandom(){
    return CARDS[randInt(0, CARDS.length-1)];
  }

  function syncHandCount(){
    if(handCount) handCount.textContent = String(state.hand.length);
  }

  function setHandLimit(n){
    const x = Math.max(1, Math.min(12, n|0));
    state.handLimit = x;

    while(state.hand.length > state.handLimit){
      state.hand.pop();
    }
    if(handLimitInput) handLimitInput.value = String(state.handLimit);

    renderHand();
    syncHandCount();
  }

  function addToHand(card){
    if(state.hand.length >= state.handLimit) return false;
    state.hand.push(card);
    return true;
  }

  function fillHand(){
    playDraw();
    while(state.hand.length < state.handLimit){
      addToHand(drawCardRandom());
    }
    renderHand();
    syncHandCount();
  }

  function drawOne(){
    playDraw();
    if(state.hand.length >= state.handLimit) return;
    const c = drawCardRandom();
    addToHand(c);
    animateDraw(c);
    renderHand();
    syncHandCount();
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
            if(resultText) resultText.textContent = "A mão está no limite. Aumente o limite ou consuma cartas antes de devolver.";
            return;
          }

          const removed = state.seq.splice(i,1)[0];
          state.hand.push(removed);

          state.selectedActionId = null;
          if(damageOut) damageOut.textContent = "—";

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
    if(!handGrid) return;
    handGrid.innerHTML = "";

    state.hand.forEach((card, idx)=>{
      const el = document.createElement("button");
      el.className = `handCard ${card.css}`;
      el.type = "button";
      el.innerHTML = `
        <div class="handTop">
          <img class="handIcon" src="${card.icon}" alt="${card.label}" />
          <div class="handLabel">${card.label}</div>
        </div>
        <div class="muted handDesc">${card.desc}</div>
      `;

      el.addEventListener("click", ()=>{
        playPlace();

        if(state.seq.length >= 3) return;

        // tira da mão e coloca na sequência
        const picked = state.hand.splice(idx, 1)[0];
        state.seq.push(picked);

        state.selectedActionId = null;
        if(damageOut) damageOut.textContent = "—";

        renderHand();
        syncHandCount();
        renderSeq();
        refreshActionsAndResult();
      });

      handGrid.appendChild(el);
    });

    renderSeq();
  }

  // ============================
  // Ações (Volumen) — TODAS as sequências 1–3 cartas (ordem importa)
  // ============================

  function ctxFromSeq(){
    const keys = seqKeys();
    const last = keys[keys.length-1] || null;

    const busterCount = countInSeq("buster");
    const quickCount  = countInSeq("quick");
    const artsCount   = countInSeq("arts");

    const nTargets = targetsCount ? Math.max(1, Math.min(12, parseInt(targetsCount.value,10) || 1)) : 3;

    // artsMode: "attack" ou "effect"
    let artsIntent = "effect";
    if(artsMode){
      if(artsMode.type === "checkbox") artsIntent = artsMode.checked ? "attack" : "effect";
      else artsIntent = (String(artsMode.value||"effect").toLowerCase().includes("atk") ? "attack" : String(artsMode.value||"effect"));
    }

    return { keys, last, busterCount, quickCount, artsCount, nTargets, artsIntent };
  }

  // Helper: texto padrão de cabeçalho
  function headerLines(source, reach, targets){
    return [
      "Conjuração: 1 ação",
      `Fonte: ${source}`,
      `Alcance: ${reach}`,
      `Alvos: ${targets}`,
      "",
    ];
  }

  // Nome bonitinho da sequência
  function seqLabel(req){
    return req.map(k=>cardByKey(k).label).join(" → ");
  }

  // ====== 39 ações, uma por sequência ======

  const VOLUMEN_ACTIONS = [
    // 1 carta
    {
      id:"v_b",
      name:"Estocada Mercurial",
      kind:"Ataque",
      req:["buster"],
      tags:"Alvo único • perfuração",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "O Volumen afina em uma lança prateada e dispara num estalo, buscando a abertura mais curta na guarda.",
        "É simples, rápido e direto: um golpe que existe para encerrar a troca.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (impacto perfurante).`,
      ].join("\n")
    },
    {
      id:"v_q",
      name:"Chuva de Agulhas",
      kind:"Ataque",
      req:["quick"],
      tags:"Vários alvos • rajada",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "O Volumen se divide em microagulhas e varre a zona como granizo metálico.",
        "A área fica ‘cara’ de atravessar: quem hesita vira alvo fácil.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_a",
      name:"Leitura de Prata",
      kind:"Detecção",
      req:["arts"],
      tags:"Rastreio • análise",
      damageMode:"arts",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura/objeto/área pequena"),
        "Efeito:",
        "O Volumen se espalha em fios finíssimos e ‘lê’ vibração, calor e pequenas mudanças de ar ao redor do alvo.",
        "Isso ajuda a descobrir onde está o ponto fraco, o truque escondido ou o movimento antes do movimento.",
        "",
        "Se for ofensivo:",
        `${ctx.artsCount}d8 (ataque leve).`,
      ].join("\n")
    },

    // 2 cartas (9)
    {
      id:"v_qq",
      name:"Redemoinho de Lascas",
      kind:"Ataque",
      req:["quick","quick"],
      tags:"Vários alvos • zona perigosa",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: partículas prateadas ocupam a zona.",
        "Reforço: elas entram em rotação e perseguem movimento, punindo avanço apressado.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_qa",
      name:"Neblina de Rastreamento",
      kind:"Detecção + Zona",
      req:["quick","arts"],
      tags:"Vários alvos • revelar/seguir",
      damageMode:"arts",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área (ou trilhas na área)"),
        "Efeito:",
        "Início: o Volumen vira névoa fina e cobre a zona.",
        "Fecho: a névoa reage a deslocamento, calor e vibração — destacando posições e rotas.",
        "",
        "Se for ofensivo:",
        `${ctx.artsCount}d8 (ataque leve).`,
      ].join("\n")
    },
    {
      id:"v_qb",
      name:"Finta de Estilhaços",
      kind:"Ataque",
      req:["quick","buster"],
      tags:"Alvo único • abertura + perfuração",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: estilhaços pressionam o espaço e forçam o alvo a cobrir ângulos ruins.",
        "Fecho: o Volumen condensa e atravessa o centro da guarda com um ataque limpo.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (golpe focado).`,
      ].join("\n")
    },
    {
      id:"v_aq",
      name:"Rede de Contenção",
      kind:"Controle",
      req:["arts","quick"],
      tags:"Vários alvos • prender/atrasar",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: fios prateados aparecem como linhas de teia entre pontos do terreno.",
        "Fecho: ao menor movimento brusco, a rede ‘puxa’ e trava passos, atrasando fuga e avanço.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido (se a contenção virar agressão).`,
      ].join("\n")
    },
    {
      id:"v_aa",
      name:"Escudo de Hydrargyrum",
      kind:"Defesa",
      req:["arts","arts"],
      tags:"Defesa • barreira",
      damageMode:"shield",
      text:()=>[
        ...headerLines("Volumen Hydrargyrum", "pessoal (ou à vista, se fizer sentido)", "você (ou alguém próximo)"),
        "Efeito:",
        "Placas maleáveis se sobrepõem e acompanham o corpo, desviando força e ‘comendo’ impacto.",
        "O escudo não é só parede: ele se ajusta como um músculo.",
        "",
        "Absorção:",
        "1d12 (escudo).",
      ].join("\n")
    },
    {
      id:"v_ab",
      name:"Marca de Prata — Execução",
      kind:"Ataque + Controle",
      req:["arts","buster"],
      tags:"Alvo único • marca + golpe",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: o Volumen encosta em microfios e deixa uma marca prateada ‘presa’ na postura do alvo.",
        "Fecho: o golpe segue a marca como se ela puxasse a lâmina até a abertura certa.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (golpe guiado).`,
      ].join("\n")
    },
    {
      id:"v_bq",
      name:"Corte em Leque",
      kind:"Ataque",
      req:["buster","quick"],
      tags:"Vários alvos • corte + varredura",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: um corte focal abre espaço e força recuo.",
        "Fecho: o Volumen se espalha num leque de lâminas finas que varre quem ficou na zona.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_ba",
      name:"Trava Condutiva",
      kind:"Ataque + Controle",
      req:["buster","arts"],
      tags:"Alvo único • impacto + travar",
      damageMode:"arts",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: impacto curto força o alvo a ‘consertar’ a guarda.",
        "Fecho: fios prateados entram em contato e puxam microajustes na postura, criando uma janela de vantagem.",
        "",
        "Se for ofensivo:",
        `${ctx.artsCount}d8 (ataque leve) + efeito de trava (se fizer sentido).`,
      ].join("\n")
    },
    {
      id:"v_bb",
      name:"Martelo de Liga",
      kind:"Ataque",
      req:["buster","buster"],
      tags:"Alvo único • pressão bruta",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: o Volumen engrossa e ganha massa.",
        "Fecho: o golpe vira um impacto esmagador, bom para quebrar ritmo e empurrar na força.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (impacto pesado).`,
      ].join("\n")
    },

    // 3 cartas (27) — cada sequência tem uma técnica do Volumen
    {
      id:"v_qqq",
      name:"Tempestade de Estilhaços",
      kind:"Ataque",
      req:["quick","quick","quick"],
      tags:"Vários alvos • devastação em área",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: a zona é tomada por poeira metálica.",
        "Reforço: a poeira vira lâminas, cortando linhas de avanço.",
        "Fecho: a tempestade ‘morde’ quem ainda estiver se mexendo.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_qqa",
      name:"Campo de Sensores",
      kind:"Detecção + Controle",
      req:["quick","quick","arts"],
      tags:"Zona • revelar movimento",
      damageMode:"arts",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: a área recebe partículas prateadas em suspensão.",
        "Reforço: elas criam ‘linhas’ de leitura de movimento.",
        "Fecho: qualquer deslocamento denuncia posição e direção, facilitando perseguição e corte de fuga.",
        "",
        "Se for ofensivo:",
        `${ctx.artsCount}d8 (ataque leve).`,
      ].join("\n")
    },
    {
      id:"v_qqb",
      name:"Moinho de Execução",
      kind:"Ataque",
      req:["quick","quick","buster"],
      tags:"Alvo único • fechar cerco",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: a zona fica cheia de cortes pequenos que limitam passo.",
        "Reforço: o alvo é forçado a escolher um ângulo ruim.",
        "Fecho: o Volumen condensa num golpe certeiro no momento em que a guarda quebra.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (execução focada).`,
      ].join("\n")
    },
    {
      id:"v_qaq",
      name:"Corredor de Contenção",
      kind:"Controle",
      req:["quick","arts","quick"],
      tags:"Vários alvos • empurrar/fechar",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: pressão em área força deslocamento.",
        "Reforço: fios prateados ‘desenham’ um corredor e reduzem rotas seguras.",
        "Fecho: a varredura final pune quem tentar atravessar na marra.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_qaa",
      name:"Cúpula Reativa",
      kind:"Defesa + Zona",
      req:["quick","arts","arts"],
      tags:"Defesa • proteger saída",
      damageMode:"shield",
      text:()=>[
        ...headerLines("Volumen Hydrargyrum", "pessoal ou ponto à vista", "você e área imediata"),
        "Efeito:",
        "Início: a névoa prateada ocupa o espaço ao redor.",
        "Reforço: placas se formam nos vetores de ataque prováveis.",
        "Fecho: a cúpula acompanha movimento, fechando ‘buracos’ conforme a pressão chega.",
        "",
        "Absorção:",
        "1d12 (escudo).",
      ].join("\n")
    },
    {
      id:"v_qab",
      name:"Fecho de Caça",
      kind:"Ataque",
      req:["quick","arts","buster"],
      tags:"Alvo único • rastrear + punir",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: pressão em área obriga o alvo a se revelar em movimento.",
        "Reforço: a leitura prateada identifica a rota e a abertura.",
        "Fecho: golpe direto no instante em que a fuga vira previsível.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (golpe de caça).`,
      ].join("\n")
    },
    {
      id:"v_qbq",
      name:"Fatiar & Varredura",
      kind:"Ataque",
      req:["quick","buster","quick"],
      tags:"Vários alvos • abrir e limpar",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: estilhaços desorganizam o grupo.",
        "Reforço: um golpe focal corta o centro da formação.",
        "Fecho: a área vira lâminas dispersas para impedir reagrupamento.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_qba",
      name:"Travar a Garganta",
      kind:"Controle + Ataque",
      req:["quick","buster","arts"],
      tags:"Alvo único • puxar postura",
      damageMode:"arts",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: cortes pequenos forçam defesa alta/baixa (a escolha fica ruim).",
        "Reforço: golpe curto prende atenção e fixa o alvo no lugar.",
        "Fecho: fios prateados ‘puxam’ postura, criando uma condição leve (travado/atordoado/guarda aberta).",
        "",
        "Se for ofensivo:",
        `${ctx.artsCount}d8 (ataque leve).`,
      ].join("\n")
    },
    {
      id:"v_qbb",
      name:"Estocada em Três Tempos",
      kind:"Ataque",
      req:["quick","buster","buster"],
      tags:"Alvo único • pressão crescente",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: pressão lateral abre a guarda.",
        "Reforço: um golpe fixa o alvo na defensiva.",
        "Fecho: o Volumen engrossa e entra com força para quebrar o ritmo de vez.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (pressão pesada).`,
      ].join("\n")
    },

    {
      id:"v_aqq",
      name:"Teia de Roteamento",
      kind:"Controle",
      req:["arts","quick","quick"],
      tags:"Vários alvos • empurrar rotas",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: fios prateados marcam espaço e rotas.",
        "Reforço: uma varredura empurra alvos para onde você quer.",
        "Fecho: a segunda varredura fecha a saída e pune tentativa de escapar.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_aqa",
      name:"Pulso de Diagnóstico",
      kind:"Detecção + Controle",
      req:["arts","quick","arts"],
      tags:"Zona • revelar truques",
      damageMode:"arts",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área (efeito)"),
        "Efeito:",
        "Início: leitura prateada identifica irregularidades (truque, isca, ilusão simples, invisibilidade fraca).",
        "Reforço: pressão em área obriga reação e expõe mais sinais.",
        "Fecho: a leitura final fixa o que foi revelado para você acompanhar melhor na cena.",
        "",
        "Se for ofensivo:",
        `${ctx.artsCount}d8 (ataque leve).`,
      ].join("\n")
    },
    {
      id:"v_aqb",
      name:"Vara de Caça",
      kind:"Ataque",
      req:["arts","quick","buster"],
      tags:"Alvo único • leitura + golpe",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: a leitura prateada escolhe o ponto fraco.",
        "Reforço: a pressão em área empurra o alvo para a linha do golpe.",
        "Fecho: estocada limpa seguindo a abertura certa.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (golpe guiado).`,
      ].join("\n")
    },
    {
      id:"v_aaq",
      name:"Cerca Maleável",
      kind:"Defesa + Controle",
      req:["arts","arts","quick"],
      tags:"Vários alvos • proteger e empurrar",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: placas se levantam como barreiras baixas.",
        "Reforço: elas se movem e ‘guiam’ rotas, protegendo um lado do campo.",
        "Fecho: o espalhamento final pune quem tenta atravessar o corredor protegido.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido (se virar agressivo).`,
      ].join("\n")
    },
    {
      id:"v_aaa",
      name:"Armadura de Espelhos",
      kind:"Defesa",
      req:["arts","arts","arts"],
      tags:"Defesa • camadas",
      damageMode:"shield",
      text:()=>[
        ...headerLines("Volumen Hydrargyrum", "pessoal", "você"),
        "Efeito:",
        "O Volumen vira camadas finas como placas de espelho, cobrindo ângulos e mudando o ponto de impacto.",
        "É o tipo de defesa que ‘não parece’ escudo até o golpe bater e perder força.",
        "",
        "Absorção:",
        "1d12 (escudo).",
      ].join("\n")
    },
    {
      id:"v_aab",
      name:"Punho de Liga",
      kind:"Ataque",
      req:["arts","arts","buster"],
      tags:"Alvo único • travar + esmagar",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: fios e placas encostam e travam micro-movimentos.",
        "Reforço: a contenção cria uma abertura clara.",
        "Fecho: impacto pesado no instante em que a guarda ‘não acompanha’.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (golpe pesado).`,
      ].join("\n")
    },
    {
      id:"v_abq",
      name:"Marca & Varredura",
      kind:"Ataque",
      req:["arts","buster","quick"],
      tags:"Vários alvos • foco vira área",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: uma marca prateada fixa o alvo principal como referência.",
        "Reforço: o golpe focal força reposicionamento.",
        "Fecho: a varredura final pune quem ficou na zona (inclusive quem tentou cobrir o alvo marcado).",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_aba",
      name:"Assinatura de Prata",
      kind:"Controle + Detecção",
      req:["arts","buster","arts"],
      tags:"Alvo único • rastrear e pressionar",
      damageMode:"arts",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: marca prateada se fixa no alvo.",
        "Reforço: impacto curto reforça a marca e obriga reação.",
        "Fecho: a marca vira ‘assinatura’, ajudando a seguir o alvo e aplicar condições leves em sequência.",
        "",
        "Se for ofensivo:",
        `${ctx.artsCount}d8 (ataque leve).`,
      ].join("\n")
    },
    {
      id:"v_abb",
      name:"Execução Guiada",
      kind:"Ataque",
      req:["arts","buster","buster"],
      tags:"Alvo único • finalizador",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: a marca escolhe o ângulo bom.",
        "Reforço: o primeiro impacto quebra o ritmo.",
        "Fecho: o segundo impacto entra onde a defesa não fecha mais.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (finalizador).`,
      ].join("\n")
    },

    {
      id:"v_bqq",
      name:"Corte que Abre Campo",
      kind:"Ataque",
      req:["buster","quick","quick"],
      tags:"Vários alvos • abrir e manter",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: golpe focal abre espaço imediato.",
        "Reforço: a primeira varredura impede aproximação.",
        "Fecho: a segunda varredura transforma o espaço em território hostil por um instante.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_bqa",
      name:"Linha de Aço — Leitura",
      kind:"Controle + Detecção",
      req:["buster","quick","arts"],
      tags:"Zona • dominar ângulo",
      damageMode:"arts",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área (efeito)"),
        "Efeito:",
        "Início: impacto curto define seu ‘centro’ e obriga respeito.",
        "Reforço: varredura em área força reposicionamento.",
        "Fecho: leitura prateada identifica quem ficou sem cobertura e onde está a melhor rota para avançar/retirar.",
        "",
        "Se for ofensivo:",
        `${ctx.artsCount}d8 (ataque leve).`,
      ].join("\n")
    },
    {
      id:"v_bqb",
      name:"Serra de Duas Passadas",
      kind:"Ataque",
      req:["buster","quick","buster"],
      tags:"Alvo único • cortar e fechar",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: golpe focal prende atenção.",
        "Reforço: estilhaços fazem o alvo ‘errado’ se mover.",
        "Fecho: o Volumen fecha em um corte/estocada final no reposicionamento forçado.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (fecho duro).`,
      ].join("\n")
    },
    {
      id:"v_baq",
      name:"Puxar Fio, Abrir Campo",
      kind:"Ataque",
      req:["buster","arts","quick"],
      tags:"Vários alvos • travar e varrer",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: impacto curto estabelece ameaça.",
        "Reforço: fios prateados travam passos e criam aberturas.",
        "Fecho: a varredura final pune quem ficou preso no lugar errado.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_baa",
      name:"Escudo com Contrapeso",
      kind:"Defesa",
      req:["buster","arts","arts"],
      tags:"Defesa • proteger após avançar",
      damageMode:"shield",
      text:()=>[
        ...headerLines("Volumen Hydrargyrum", "pessoal", "você"),
        "Efeito:",
        "Início: você avança com impacto curto para ganhar espaço.",
        "Reforço: o Volumen abre placas para cobrir retaliação.",
        "Fecho: camadas extra fecham os ângulos mais prováveis do contra-ataque.",
        "",
        "Absorção:",
        "1d12 (escudo).",
      ].join("\n")
    },
    {
      id:"v_bab",
      name:"Âncora de Execução",
      kind:"Ataque",
      req:["buster","arts","buster"],
      tags:"Alvo único • travar e finalizar",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: impacto curto fixa o alvo.",
        "Reforço: fios prateados funcionam como âncora (puxam postura/limitam passo).",
        "Fecho: estocada final no ponto em que a defesa não fecha.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (finalizador).`,
      ].join("\n")
    },
    {
      id:"v_bbq",
      name:"Trinca de Impactos — Varredura",
      kind:"Ataque",
      req:["buster","buster","quick"],
      tags:"Vários alvos • foco vira área",
      damageMode:"quick",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "zona escolhida à vista", "múltiplas criaturas na área"),
        "Efeito:",
        "Início: dois impactos curtos quebram guarda e ritmo do alvo principal.",
        "Fecho: o Volumen se espalha e varre quem tentou cobrir ou se aproximar no meio da troca.",
        "",
        "Dano:",
        `${ctx.quickCount}d6 em cada alvo atingido.`,
      ].join("\n")
    },
    {
      id:"v_bba",
      name:"Esmagar & Travar",
      kind:"Controle + Ataque",
      req:["buster","buster","arts"],
      tags:"Alvo único • pressão total",
      damageMode:"arts",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: impacto pesado força recuo.",
        "Reforço: segundo impacto fecha o espaço e impede fuga limpa.",
        "Fecho: fios prateados travam postura e criam uma condição leve (se fizer sentido).",
        "",
        "Se for ofensivo:",
        `${ctx.artsCount}d8 (ataque leve).`,
      ].join("\n")
    },
    {
      id:"v_bbb",
      name:"Guilhotina de Hydrargyrum",
      kind:"Ataque",
      req:["buster","buster","buster"],
      tags:"Alvo único • finalizador",
      damageMode:"buster",
      text:(ctx)=>[
        ...headerLines("Volumen Hydrargyrum", "à vista", "1 criatura"),
        "Efeito:",
        "Início: o Volumen forma uma lâmina larga e precisa.",
        "Reforço: ele trava o alvo no ângulo ruim.",
        "Fecho: fecha como uma tesoura de execução — rápido, pesado e decisivo.",
        "",
        "Dano:",
        `${ctx.busterCount}d10 (finalizador).`,
      ].join("\n")
    },
  ];

  // ============================
  // Taumaturgia (por enquanto: técnica genérica divertida)
  // ============================

  function genericTaumaturgy(seqKeys){
    const last = seqKeys[seqKeys.length-1] || "arts";
    const hasA = seqKeys.includes("arts");
    const hasQ = seqKeys.includes("quick");
    const hasB = seqKeys.includes("buster");

    const vibe = [];
    vibe.push("Você compõe uma fórmula rápida e flexível, como um truque arcano feito para caber no segundo certo.");
    if(hasA) vibe.push("A execução busca controle: impor regra curta, quebrar sustentação ou criar utilidade imediata.");
    if(hasQ) vibe.push("A magia se abre em área e pressiona espaço, forçando o inimigo a reagir.");
    if(hasB) vibe.push("No fim, a intenção vira impacto direto, sem desperdício.");

    let reach = "à vista";
    let targets = "conforme a execução";
    let dmgMode = "none";
    let dmgText = "—";

    if(last === "buster"){
      targets = "1 criatura";
      dmgMode = "buster";
      dmgText = "1d10 (por carta Buster no combo).";
    } else if(last === "quick"){
      reach = "zona escolhida à vista";
      targets = "múltiplas criaturas na área";
      dmgMode = "quick";
      dmgText = "1d6 em cada alvo (por carta Quick no combo).";
    } else {
      targets = hasQ ? "múltiplas criaturas na área (efeito)" : "1 criatura/objeto/efeito";
      dmgMode = "arts";
      dmgText = "1d8 (por carta Arts) se ofensivo; caso contrário, sem dano direto.";
    }

    return {
      title: `Taumaturgia — ${seqLabel(seqKeys)}`,
      tags: "Genérico • flexível",
      text: [
        "Conjuração: 1 ação",
        `Alcance: ${reach}`,
        `Alvos: ${targets}`,
        "",
        "Efeito:",
        ...vibe,
        "",
        "Dano:",
        dmgText,
      ].join("\n"),
      damageMode: dmgMode
    };
  }

  // ============================
  // Match de ações por sequência
  // ============================

  function actionsForCurrent(){
    const keys = seqKeys();
    if(keys.length === 0) return [];

    if(state.mode === "volumen"){
      return VOLUMEN_ACTIONS.filter(a => exactReq(a.req, keys));
    }

    // Taumaturgia: nenhuma nomeada por enquanto
    return [];
  }

  function exactReq(req, keys){
    if(req.length !== keys.length) return false;
    for(let i=0;i<req.length;i++){
      if(req[i] !== keys[i]) return false;
    }
    return true;
  }

  // ============================
  // Render ações / resultado
  // ============================

  function renderActions(){
    if(!actionsList || !actionsHint) return;

    const keys = seqKeys();
    const list = actionsForCurrent();

    actionsList.innerHTML = "";

    if(keys.length === 0){
      actionsHint.textContent = "Monte uma sequência para ver ações compatíveis.";
      return;
    }

    if(list.length === 0){
      actionsHint.textContent = "Nenhuma ação nomeada bateu. Você ainda pode usar a técnica genérica.";
      return;
    }

    actionsHint.textContent = "Ações disponíveis (clique para selecionar):";

    list.forEach(a=>{
      const el = document.createElement("div");
      el.className = "actionCard";
      if(state.selectedActionId === a.id) el.classList.add("selected");

      el.innerHTML = `
        <div class="actionTop">
          <div class="actionName">${a.name}</div>
          <div class="actionKind muted">${a.kind}</div>
        </div>
        <div class="muted" style="margin-top:6px">${a.tags}</div>
      `;

      el.addEventListener("click", ()=>{
        playClick();
        state.selectedActionId = a.id;
        renderActions();
        renderResult();
      });

      actionsList.appendChild(el);
    });
  }

  function selectedActionObject(){
    const keys = seqKeys();

    if(keys.length === 0) return null;

    if(state.mode === "volumen"){
      const list = actionsForCurrent();
      if(list.length === 0) return null;
      return list.find(x=>x.id===state.selectedActionId) || list[0];
    }

    // Taumaturgia: sempre genérico
    return null;
  }

  function renderResult(){
    const keys = seqKeys();
    const ctx = ctxFromSeq();

    if(!resultTitle || !resultTags || !resultText) return;

    if(keys.length === 0){
      resultTitle.textContent = "—";
      resultTags.textContent  = "—";
      resultText.textContent  = "Monte uma sequência e selecione uma ação.";
      if(rollDamageBtn) rollDamageBtn.disabled = true;
      if(executeBtn) executeBtn.disabled = true;
      return;
    }

    let title = "—";
    let tags  = "—";
    let text  = "—";
    let damageMode = "none";

    const action = selectedActionObject();

    if(state.mode === "volumen"){
      if(action){
        title = action.name;
        tags  = `${action.kind} • ${action.tags}`;
        text  = action.text(ctx);
        damageMode = action.damageMode || "none";
      } else {
        // fallback genérico do Volumen
        title = `Volumen — Técnica Encadeada (${seqLabel(keys)})`;
        tags  = "Genérico • coerente";
        text  = [
          "Conjuração: 1 ação",
          "Fonte: Volumen Hydrargyrum",
          `Alcance: ${ctx.last==="quick" ? "zona escolhida à vista" : "à vista"}`,
          `Alvos: ${ctx.last==="quick" ? "múltiplas criaturas na área" : (ctx.last==="buster" ? "1 criatura" : "1 criatura/objeto/efeito")}`,
          "",
          "Efeito:",
          "O Volumen muda de forma em etapas, seguindo sua sequência: começa criando espaço/controle, reforça com leitura ou pressão, e termina com o tipo de fecho da última carta.",
          "",
          "Dano:",
          (ctx.last==="buster"
            ? `${ctx.busterCount}d10`
            : (ctx.last==="quick"
              ? `${ctx.quickCount}d6 em cada alvo`
              : `Se ofensivo: ${ctx.artsCount}d8 (senão, sem dano)`)),
        ].join("\n");
        damageMode = (ctx.last==="buster" ? "buster" : (ctx.last==="quick" ? "quick" : "arts"));
      }
    } else {
      const g = genericTaumaturgy(keys);
      title = g.title;
      tags  = g.tags;
      text  = g.text;
      damageMode = g.damageMode;
    }

    resultTitle.textContent = title;
    resultTags.textContent  = tags;
    resultText.textContent  = text;

    if(damageOut) damageOut.textContent = "—";
    if(rollDamageBtn) rollDamageBtn.disabled = false;
    if(executeBtn) executeBtn.disabled = false;

    // guarda damageMode no botão (para rolagem)
    if(rollDamageBtn) rollDamageBtn.dataset.mode = damageMode;
  }

  function refreshActionsAndResult(){
    renderActions();
    renderResult();
  }

  // ============================
  // Rolar dano (usa o damageMode selecionado)
  // ============================

  function rollDamage(){
    const ctx = ctxFromSeq();
    const mode = (rollDamageBtn && rollDamageBtn.dataset.mode) ? rollDamageBtn.dataset.mode : "none";

    playRoll();

    if(!damageOut) return;

    if(mode === "shield"){
      const r = randInt(1,12);
      damageOut.textContent = `1d12 = ${r} (absorção)`;
      return;
    }

    if(mode === "buster"){
      const n = Math.max(1, Math.min(3, ctx.busterCount || 1));
      const rolls = [];
      let sum = 0;
      for(let i=0;i<n;i++){
        const r = randInt(1,10);
        rolls.push(r);
        sum += r;
      }
      damageOut.textContent = `${n}×1d10 = [${rolls.join(", ")}] (total ${sum})`;
      return;
    }

    if(mode === "quick"){
      const nTargets = ctx.nTargets;
      const per = Math.max(1, Math.min(3, ctx.quickCount || 1));

      const lines = [];
      let grand = 0;

      for(let t=1;t<=nTargets;t++){
        const rolls = [];
        let sum = 0;
        for(let i=0;i<per;i++){
          const r = randInt(1,6);
          rolls.push(r);
          sum += r;
        }
        grand += sum;
        lines.push(`Alvo ${t}: ${per}×1d6 = [${rolls.join(", ")}] = ${sum}`);
      }

      damageOut.textContent = `${lines.join(" | ")} (total geral ${grand})`;
      return;
    }

    if(mode === "arts"){
      if(ctx.artsIntent !== "attack"){
        damageOut.textContent = "Sem dano (Arts em modo efeito).";
        return;
      }
      const n = Math.max(1, Math.min(3, ctx.artsCount || 1));
      const rolls = [];
      let sum = 0;
      for(let i=0;i<n;i++){
        const r = randInt(1,8);
        rolls.push(r);
        sum += r;
      }
      damageOut.textContent = `${n}×1d8 = [${rolls.join(", ")}] (total ${sum})`;
      return;
    }

    damageOut.textContent = "—";
  }

  // ============================
  // Executar (consome sequência)
  // ============================

  function executeAction(){
    if(state.seq.length === 0) return;

    state.seq = [];
    state.selectedActionId = null;

    playClick();

    if(damageOut) damageOut.textContent = "—";
    if(resultTitle) resultTitle.textContent = "—";
    if(resultTags)  resultTags.textContent  = "—";
    if(resultText)  resultText.textContent  = "Técnica executada. Monte uma nova sequência.";

    if(rollDamageBtn) rollDamageBtn.disabled = true;
    if(executeBtn) executeBtn.disabled = true;

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

    if(damageOut) damageOut.textContent = "—";
    if(resultTitle) resultTitle.textContent = "—";
    if(resultTags)  resultTags.textContent  = "—";
    if(resultText)  resultText.textContent  = "Monte uma sequência e selecione uma ação.";

    if(rollDamageBtn) rollDamageBtn.disabled = true;
    if(executeBtn) executeBtn.disabled = true;

    renderHand();
    renderSeq();
    renderActions();
    syncHandCount();
  }

  // ============================
  // Eventos
  // ============================

  if(fillHandBtn) fillHandBtn.addEventListener("click", ()=> fillHand());
  if(drawOneBtn)  drawOneBtn.addEventListener("click", ()=> drawOne());
  if(resetBtn)    resetBtn.addEventListener("click", ()=> { playClick(); resetAll(); });

  if(handLimitInput){
    handLimitInput.addEventListener("change", ()=>{
      const n = parseInt(handLimitInput.value,10);
      setHandLimit(n);
    });
  }

  if(modeSel){
    modeSel.addEventListener("change", ()=>{
      playClick();
      state.mode = String(modeSel.value || "volumen").toLowerCase();
      state.selectedActionId = null;
      if(damageOut) damageOut.textContent = "—";
      refreshActionsAndResult();
    });
  }

  if(artsMode){
    artsMode.addEventListener("change", ()=>{
      playClick();
      if(damageOut) damageOut.textContent = "—";
      renderResult();
    });
  }

  if(targetsCount){
    targetsCount.addEventListener("change", ()=>{
      if(damageOut) damageOut.textContent = "—";
    });
  }

  if(rollDamageBtn) rollDamageBtn.addEventListener("click", ()=> rollDamage());
  if(executeBtn)    executeBtn.addEventListener("click", ()=> executeAction());

  // ============================
  // Init
  // ============================

  (function init(){
    if(modeSel) state.mode = String(modeSel.value || "volumen").toLowerCase();
    setHandLimit(handLimitInput ? (parseInt(handLimitInput.value,10) || 7) : 7);

    resetAll();
    fillHand();
    refreshActionsAndResult();
  })();

})();
