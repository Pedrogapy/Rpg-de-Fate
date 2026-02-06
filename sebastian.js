// sebastian.js — sistema de cartas (Taumaturgia + Volumen), sem d6/d8/d10/d12 para "decidir" coisas
// Regras de rolagem (somente para dano/escudo):
// - Cada carta Buster usada: 1d10 (alvo principal)
// - Cada carta Quick usada: 1d6 por alvo (use o campo "Alvos" abaixo)
// - Cada carta Arts usada: efeito (ou 1d8 se você trocar Arts para "Dano")
// - Técnicas de defesa: 1d12 (escudo)
//
// Observação: a "técnica" descreve a sequência; a rolagem junta as partes que fazem sentido.

(function () {
  function $(id) { return document.getElementById(id); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  // ============================
  // Cartas
  // ============================

  const CARDS = [
    { key: "quick", label: "Quick", css: "quick", icon: "assets/card_quick.svg", desc: "Quick: vários alvos (zona/área)." },
    { key: "arts", label: "Arts", css: "arts", icon: "assets/card_arts.svg", desc: "Arts: efeito (ou dano leve) e controle." },
    { key: "buster", label: "Buster", css: "buster", icon: "assets/card_buster.svg", desc: "Buster: foco em 1 alvo, impacto direto." },
  ];

  const CARD_BY_KEY = Object.fromEntries(CARDS.map(c => [c.key, c]));
  function cardByKey(k) { return CARD_BY_KEY[k] || CARDS[0]; }

  // ============================
  // Estado
  // ============================

  const state = {
    hand: [],
    seq: [], // cartas reservadas (objeto carta)
    selectedActionId: null,
    handLimit: 7,
    mode: "taumaturgia",
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

  // ============================
  // Som
  // ============================

  function playTone(freq = 740, ms = 80, type = "triangle", gain = 0.05) {
    if (!soundToggle || !soundToggle.checked) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + ms / 1000);
      setTimeout(() => ctx.close(), ms + 60);
    } catch (_) { /* ignore */ }
  }
  function playClick() { playTone(740, 80, "triangle", 0.05); }
  function playDraw() { playTone(520, 120, "sine", 0.045); }
  function playPlace() { playTone(620, 90, "triangle", 0.05); }
  function playRoll() {
    if (!soundToggle || !soundToggle.checked) return;
    try {
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
      setTimeout(() => ctx.close(), 210);
    } catch (_) { /* ignore */ }
  }

  // ============================
  // Deck / mão
  // ============================

  function animateDraw(card) {
    if (!deck || !flyingCard) return;
    deck.classList.remove("isDrawing");
    void deck.offsetWidth;
    deck.classList.add("isDrawing");

    const typeEl = flyingCard.querySelector(".cardType");
    if (typeEl) typeEl.textContent = card.label;

    flyingCard.classList.remove("quick", "arts", "buster");
    flyingCard.classList.add(card.css);

    setTimeout(() => deck.classList.remove("isDrawing"), 900);
  }

  function drawCardRandom() {
    return CARDS[randInt(0, CARDS.length - 1)];
  }

  function syncHandCount() {
    if (handCount) handCount.textContent = String(state.hand.length);
  }

  function setHandLimit(n) {
    const x = clamp((n | 0) || 7, 1, 12);
    state.handLimit = x;

    while (state.hand.length > state.handLimit) state.hand.pop();

    if (handLimitInput) handLimitInput.value = String(state.handLimit);
    renderHand();
    syncHandCount();
  }

  function addToHand(card) {
    if (state.hand.length >= state.handLimit) return false;
    state.hand.push(card);
    return true;
  }

  // ============================
  // Sequência
  // ============================

  function seqKeys() { return state.seq.map(c => c.key); }
  function countInSeq(key) { return state.seq.reduce((acc, c) => acc + (c.key === key ? 1 : 0), 0); }

  function renderSeq() {
    if (!seqSlots) return;
    seqSlots.innerHTML = "";

    for (let i = 0; i < 3; i++) {
      const slot = document.createElement("div");
      slot.className = "seqSlot";
      const card = state.seq[i] || null;

      if (card) {
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

        slot.addEventListener("click", () => {
          playClick();
          // devolver para mão (respeita limite)
          if (state.hand.length >= state.handLimit) {
            resultText.textContent = "A mão está no limite. Aumente o limite ou execute a sequência antes de devolver.";
            return;
          }
          const removed = state.seq.splice(i, 1)[0];
          state.hand.push(removed);

          state.selectedActionId = null;
          damageOut.textContent = "—";

          renderHand();
          syncHandCount();
          refreshActionsAndResult();
        });
      } else {
        slot.innerHTML = `
          <div class="muted" style="font-weight:800">Slot ${i + 1}</div>
          <div class="seqSub">vazio</div>
        `;
      }

      seqSlots.appendChild(slot);
    }
  }

  // ============================
  // Render mão
  // ============================

  function renderHand() {
    if (!handGrid) return;
    handGrid.innerHTML = "";

    state.hand.forEach((card, idx) => {
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

      div.addEventListener("click", () => {
        playPlace();
        if (state.seq.length >= 3) return;

        // move carta da mão para seq (mantém ordem de clique)
        const picked = state.hand.splice(idx, 1)[0];
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
  // Ações (geradas pra TODAS as combinações)
  // ============================

  const ALL_ACTIONS = {
    volumen: buildAllActions("volumen"),
    taumaturgia: buildAllActions("taumaturgia"),
  };

  function getModeLabel() {
    return state.mode === "volumen" ? "Volumen Hydrargyrum" : "Taumaturgia (Pressão + Runas)";
  }

  function updateModeHint() {
    if (!modeHint) return;
    modeHint.textContent =
      state.mode === "volumen"
        ? "Volumen: mercúrio vivo (fios, placas, lâminas, névoa)"
        : "Taumaturgia: runas + pressão (compressão, onda, selo)";
  }

  function getModeActions() {
    return ALL_ACTIONS[state.mode] || [];
  }

  function findMatchedActions() {
    const s = seqKeys();
    if (s.length === 0) return [];
    const actions = getModeActions();
    return actions.filter(a => a.req.length === s.length && a.req.every((k, i) => k === s[i]));
  }

  // ---------- geração ----------
  function buildAllActions(mode) {
    const keys = ["buster", "arts", "quick"];
    const out = [];
    for (let len = 1; len <= 3; len++) {
      genSeq([], len);
    }
    return out;

    function genSeq(prefix, len) {
      if (prefix.length === len) {
        out.push(buildAction(mode, prefix));
        return;
      }
      for (const k of keys) genSeq(prefix.concat(k), len);
    }
  }

  function stableHash(str) {
    // hash simples e determinístico (sem crypto)
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pick(list, seed) {
    return list[seed % list.length];
  }

  function seqKeyStr(seq) {
    return seq.map(k => (k === "quick" ? "Q" : k === "arts" ? "A" : "B")).join("");
  }

  function buildAction(mode, seq) {
    const s = seqKeyStr(seq);
    const id = `${mode}_${s}`;
    const seed = stableHash(`${mode}:${s}`);

    const b = seq.filter(k => k === "buster").length;
    const q = seq.filter(k => k === "quick").length;
    const a = seq.filter(k => k === "arts").length;

    const last = seq[seq.length - 1];

    // Decide “cara” da técnica
    const isDefensive = (last === "arts" && a >= 2); // 2+ Arts terminando em Arts vira defesa/fortificação
    const kind =
      isDefensive ? "Defesa + Controle" :
      (last === "arts" ? (b || q ? "Ataque + Efeito" : "Efeito") :
      (last === "quick" ? "Ataque (Área)" : "Ataque (Alvo único)"));

    const tags = buildTags(mode, seq, isDefensive);

    const name = buildName(mode, seq, seed, isDefensive);

    return {
      id,
      name,
      kind,
      tags,
      req: seq.slice(),
      rollShield: isDefensive,
      text: () => buildText(mode, seq, kind, tags, isDefensive),
    };
  }

  function buildTags(mode, seq, isDefensive) {
    const b = seq.includes("buster");
    const q = seq.includes("quick");
    const a = seq.includes("arts");
    const last = seq[seq.length - 1];

    const parts = [];
    parts.push(mode === "volumen" ? "Mercúrio" : "Runas/Pressão");

    if (isDefensive) parts.push("escudo");
    if (last === "buster") parts.push("alvo único");
    if (last === "quick") parts.push("vários alvos");
    if (last === "arts") parts.push("controle");

    if (a && (b || q)) parts.push("marca/abertura");
    if (q && b) parts.push("pressão em avanço");

    return parts.join(" • ");
  }

  function buildName(mode, seq, seed, isDefensive) {
    const last = seq[seq.length - 1];
    const s = seqKeyStr(seq);

    const vol = {
      buster: ["Estocada", "Martelo", "Cravação", "Execução", "Guilhotina"],
      quick: ["Chuva", "Varredura", "Ciclone", "Tempestade", "Redemoinho"],
      arts: ["Trama", "Selo", "Névoa", "Malha", "Oráculo"],
      suf: ["de Hydrargyrum", "Mercurial", "de Prata", "de Mercúrio", "do Volumen"],
    };
    const tau = {
      buster: ["Tiro de Compressão", "Punho Barométrico", "Disparo Rúnico", "Impacto de Câmara", "Ruptura de Pressão"],
      quick: ["Onda de Pressão", "Leque Barométrico", "Rebote de Ar", "Varredura Compressiva", "Explosão em Zona"],
      arts: ["Selo Rúnico", "Círculo de Pressão", "Marca de Câmara", "Trava Barométrica", "Runa de Estase"],
      suf: ["", "— Encadeado", "— Selado", "— de Posição", "— de Execução"],
    };

    if (mode === "volumen") {
      const base = pick(vol[last], seed);
      const suf = pick(vol.suf, seed >>> 3);
      if (isDefensive) return `${base} ${suf} (Guarda)`;
      return `${base} ${suf}`;
    }

    const base = pick(tau[last], seed);
    const suf = pick(tau.suf, seed >>> 3);
    if (isDefensive) return `${base}${suf} (Guarda)`;
    return `${base}${suf}`;
  }

  function buildText(mode, seq, kind, tags, isDefensive) {
    const modeName = (mode === "volumen") ? "Volumen Hydrargyrum" : "Taumaturgia (Pressão + Runas)";
    const sLabels = seq.map(k => cardByKey(k).label).join(" → ");

    const reach =
      seq[seq.length - 1] === "quick" ? "zona escolhida à vista" :
      seq[seq.length - 1] === "buster" ? "à vista (linha direta)" :
      "à vista / curto (dependendo do efeito)";

    const targets =
      seq[seq.length - 1] === "quick" ? "múltiplas criaturas na área" :
      seq[seq.length - 1] === "buster" ? "1 criatura" :
      (isDefensive ? "você (e área imediata, se fizer sentido)" : "1 criatura/objeto/área pequena");

    const steps = buildSteps(mode, seq);

    const bCount = seq.filter(k => k === "buster").length;
    const qCount = seq.filter(k => k === "quick").length;
    const aCount = seq.filter(k => k === "arts").length;

    const rollLines = [];
    if (isDefensive) rollLines.push("Escudo: 1d12 (absorção).");
    if (!isDefensive && bCount) rollLines.push(`Buster: ${bCount}d10 (impactos no alvo principal).`);
    if (!isDefensive && qCount) rollLines.push(`Quick: ${qCount}d6 por alvo na área (use o campo \"Alvos\").`);
    if (!isDefensive && aCount) rollLines.push(`Arts: ${aCount}d8 **somente** se Arts estiver em \"Dano\" (senão é efeito).`);

    return [
      `Conjuração: 1 ação (${seq.length} carta${seq.length > 1 ? "s" : ""})`,
      `Fonte: ${modeName}`,
      `Sequência: ${sLabels}`,
      `Tipo: ${kind}`,
      `Alcance: ${reach}`,
      `Alvos: ${targets}`,
      "",
      "Como acontece:",
      ...steps.map((x, i) => `${i + 1}) ${x}`),
      "",
      "Rolagem sugerida:",
      ...(rollLines.length ? rollLines : ["Sem rolagem de dano (efeito)."]),
      "",
      "Observação:",
      "Se alguma parte não fizer sentido na cena, trate como narrativa e mantenha só o que encaixa.",
    ].join("\n");
  }

  function buildSteps(mode, seq) {
    const counts = { buster: 0, quick: 0, arts: 0 };
    return seq.map((k, idx) => {
      counts[k]++;
      return stepLine(mode, k, idx, seq.length, counts[k], counts);
    });
  }

  function stepLine(mode, key, idx, len, occ, counts) {
    const pos =
      idx === 0 ? "Abertura" :
      idx === len - 1 ? "Final" :
      "Meio";

    if (mode === "volumen") {
      if (key === "buster") {
        const m = [
          `Buster (${pos}): o Volumen condensa em arma curta e acerta o alvo com um impacto seco (${occ}º impacto).`,
          `Buster (${pos}): mercúrio pesado vira um “martelo” e desloca a guarda do alvo (${occ}º impacto).`,
          `Buster (${pos}): a lâmina prateada entra onde a defesa não cobre (${occ}º impacto).`,
        ];
        return pick(m, stableHash(`v:b:${idx}:${occ}:${counts.arts}:${counts.quick}`));
      }
      if (key === "quick") {
        const m = [
          `Quick (${pos}): o Volumen se fragmenta em lascas e varre a zona, punindo quem estiver exposto (${occ}ª onda).`,
          `Quick (${pos}): uma rajada de microagulhas atravessa a área em leque (${occ}ª onda).`,
          `Quick (${pos}): a nuvem metálica persegue movimento dentro da zona (${occ}ª onda).`,
        ];
        return pick(m, stableHash(`v:q:${idx}:${occ}:${counts.arts}:${counts.buster}`));
      }
      // arts
      const mA = [
        `Arts (${pos}): fios finos “escrevem” um padrão no ar/solo, travando, marcando ou revelando o que importa (${occ}º selo).`,
        `Arts (${pos}): o mercúrio ajusta densidade e direção, criando controle fino (cola, trava, dobra, diagnóstico) (${occ}º selo).`,
        `Arts (${pos}): uma malha prateada corta ruído e expõe brechas/presença (informação ou vantagem tática) (${occ}º selo).`,
      ];
      return pick(mA, stableHash(`v:a:${idx}:${occ}:${counts.quick}:${counts.buster}`));
    }

    // taumaturgia
    if (key === "buster") {
      const m = [
        `Buster (${pos}): gesto de “tiro” + runa na mão — pressão concentrada estoura como projétil invisível (${occ}º impacto).`,
        `Buster (${pos}): compressão curta em linha reta, como um soco de ar que quebra ritmo (${occ}º impacto).`,
        `Buster (${pos}): câmara de pressão fecha e libera no ponto certo (impacto limpo) (${occ}º impacto).`,
      ];
      return pick(m, stableHash(`t:b:${idx}:${occ}:${counts.arts}:${counts.quick}`));
    }
    if (key === "quick") {
      const m = [
        `Quick (${pos}): runas “abrem” uma onda de pressão na zona, empurrando e ferindo múltiplos alvos (${occ}ª onda).`,
        `Quick (${pos}): varredura compressiva em leque; quem estiver na área sente o golpe de ar (${occ}ª onda).`,
        `Quick (${pos}): rebote de pressão que caça movimento dentro da zona (${occ}ª onda).`,
      ];
      return pick(m, stableHash(`t:q:${idx}:${occ}:${counts.arts}:${counts.buster}`));
    }
    // arts
    const mA = [
      `Arts (${pos}): você traça uma runa rápida para estabilizar um efeito (marca, trava, ajuste de pressão) (${occ}º selo).`,
      `Arts (${pos}): círculo rúnico controla o “como” da pressão: puxa, segura, comprime ou protege (${occ}º selo).`,
      `Arts (${pos}): selo fino que altera a cena por um instante (controle, utilidade, abertura) (${occ}º selo).`,
    ];
    return pick(mA, stableHash(`t:a:${idx}:${occ}:${counts.quick}:${counts.buster}`));
  }

  // ============================
  // Render ações
  // ============================

  function renderActions() {
    if (!actionsList || !actionsHint) return;
    actionsList.innerHTML = "";

    const s = seqKeys();
    if (s.length === 0) {
      actionsHint.textContent = "Monte uma sequência para ver a técnica correspondente.";
      return;
    }

    const matched = findMatchedActions();
    actionsHint.textContent = `Técnica para: ${s.map(k => cardByKey(k).label).join(" → ")} • Modo: ${getModeLabel()}`;

    for (const a of matched) {
      const div = document.createElement("div");
      div.className = "actionCard";
      div.innerHTML = `
        <div class="actionTop">
          <div>
            <div class="actionName">${a.name}</div>
            <div class="actionMeta">${a.kind} • ${a.tags}</div>
          </div>
          <div class="muted">${a.req.map(k => cardByKey(k).label).join(" → ")}</div>
        </div>
        <div class="reqRow">
          ${a.req.map(k => {
            const c = cardByKey(k);
            return `<span class="reqPill"><img class="seqIcon" src="${c.icon}" alt="${c.label}"/>${c.label}</span>`;
          }).join("")}
        </div>
      `;

      div.addEventListener("click", () => {
        playClick();
        state.selectedActionId = a.id;

        for (const el of actionsList.querySelectorAll(".actionCard")) el.classList.remove("selected");
        div.classList.add("selected");

        damageOut.textContent = "—";
        renderResult();
      });

      actionsList.appendChild(div);
    }
  }

  // ============================
  // Resultado
  // ============================

  function renderResult() {
    const s = seqKeys();

    if (s.length === 0) {
      resultTitle.textContent = "—";
      resultTags.textContent = "—";
      resultText.textContent = "Monte uma sequência e selecione a técnica.";
      rollDamageBtn.disabled = true;
      executeBtn.disabled = true;
      damageOut.textContent = "—";
      rollDamageBtn.textContent = "Rolar";
      rollDamageBtn.dataset.mode = "none";
      return;
    }

    const matched = findMatchedActions();
    const picked = matched.find(a => a.id === state.selectedActionId) || matched[0] || null;

    if (!picked) {
      resultTitle.textContent = "—";
      resultTags.textContent = "—";
      resultText.textContent = "Sem técnica (isso não deveria acontecer).";
      rollDamageBtn.disabled = true;
      executeBtn.disabled = true;
      return;
    }

    resultTitle.textContent = picked.name;
    resultTags.textContent =
      `${getModeLabel()} • ${picked.kind} • ${picked.tags} • Sequência: ${picked.req.map(k => cardByKey(k).label).join(" → ")}`;

    resultText.textContent = picked.text();

    // rolagem: se for defesa, sempre habilita (escudo)
    // se não for defesa, habilita se houver ao menos uma carta que role algo (B/ Q / Arts em dano)
    const bCount = countInSeq("buster");
    const qCount = countInSeq("quick");
    const aCount = countInSeq("arts");

    const artsIsDamage = (artsMode && artsMode.value === "damage");
    const hasRoll = picked.rollShield || bCount > 0 || qCount > 0 || (artsIsDamage && aCount > 0);

    rollDamageBtn.disabled = !hasRoll;
    executeBtn.disabled = false;

    rollDamageBtn.dataset.mode = picked.rollShield ? "shield" : "combo";
    rollDamageBtn.textContent = picked.rollShield ? "Rolar escudo" : "Rolar";

    // dica visual
    if (picked.rollShield) {
      damageOut.textContent = "—";
    }
  }

  function refreshActionsAndResult() {
    renderSeq();
    renderActions();
    renderResult();
  }

  // ============================
  // Rolagem (dano/escudo)
  // ============================

  function rollDice(count, sides) {
    const rolls = [];
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const r = randInt(1, sides);
      rolls.push(r);
      sum += r;
    }
    return { rolls, sum };
  }

  function rollQuickPerTarget(qCount, nTargets) {
    const perTarget = [];
    let grand = 0;

    for (let t = 0; t < nTargets; t++) {
      const { rolls, sum } = rollDice(qCount, 6);
      grand += sum;
      perTarget.push(qCount === 1 ? `${sum}` : `(${rolls.join("+")})=${sum}`);
    }
    return { perTarget, grand };
  }

  function rollDamage() {
    const mode = rollDamageBtn.dataset.mode || "none";
    if (mode === "none") return;

    playRoll();

    const s = seqKeys();
    const matched = findMatchedActions();
    const picked = matched.find(a => a.id === state.selectedActionId) || matched[0] || null;
    if (!picked) return;

    const bCount = Math.max(0, countInSeq("buster"));
    const qCount = Math.max(0, countInSeq("quick"));
    const aCount = Math.max(0, countInSeq("arts"));

    const lines = [];

    if (picked.rollShield) {
      const v = randInt(1, 12);
      damageOut.textContent = `1d12 (escudo) = ${v}`;
      return;
    }

    // Buster (alvo único)
    if (bCount > 0) {
      const { rolls, sum } = rollDice(bCount, 10);
      lines.push(`Buster: ${bCount}d10 = [${rolls.join(", ")}] (total ${sum})`);
    }

    // Arts (se estiver em dano)
    const artsIsDamage = (artsMode && artsMode.value === "damage");
    if (artsIsDamage && aCount > 0) {
      const { rolls, sum } = rollDice(aCount, 8);
      lines.push(`Arts: ${aCount}d8 = [${rolls.join(", ")}] (total ${sum})`);
    } else if (aCount > 0) {
      lines.push(`Arts: efeito (sem rolagem de dano)`);
    }

    // Quick (por alvo)
    if (qCount > 0) {
      const n = clamp(parseInt(targetsCount.value, 10) || 1, 1, 12);
      const { perTarget, grand } = rollQuickPerTarget(qCount, n);
      lines.push(`Quick: ${n} alvo(s) × ${qCount}d6 = [${perTarget.join(" | ")}] (total ${grand})`);
    }

    damageOut.textContent = lines.length ? lines.join("\n") : "Sem rolagem.";
  }

  // ============================
  // Executar (consome sequência)
  // ============================

  function executeAction() {
    if (state.seq.length === 0) return;

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

  function fillHand() {
    const need = state.handLimit - state.hand.length;
    if (need <= 0) return;

    for (let i = 0; i < need; i++) {
      setTimeout(() => {
        const c = drawCardRandom();
        if (addToHand(c)) {
          animateDraw(c);
          playDraw();
          renderHand();
          syncHandCount();
        }
      }, i * 140);
    }
  }

  function drawOne() {
    const c = drawCardRandom();
    if (addToHand(c)) {
      animateDraw(c);
      playDraw();
      renderHand();
      syncHandCount();
    }
  }

  function resetAll() {
    state.hand = [];
    state.seq = [];
    state.selectedActionId = null;

    damageOut.textContent = "—";
    resultTitle.textContent = "—";
    resultTags.textContent = "—";
    resultText.textContent = "Monte uma sequência e selecione uma técnica.";

    rollDamageBtn.disabled = true;
    executeBtn.disabled = true;
    rollDamageBtn.dataset.mode = "none";
    rollDamageBtn.textContent = "Rolar";

    renderHand();
    renderSeq();
    renderActions();
    syncHandCount();
    updateModeHint();
  }

  // ============================
  // Eventos
  // ============================

  if (fillHandBtn) fillHandBtn.addEventListener("click", () => { playClick(); fillHand(); });
  if (drawOneBtn) drawOneBtn.addEventListener("click", () => { playClick(); drawOne(); });
  if (resetBtn) resetBtn.addEventListener("click", () => { playClick(); resetAll(); });

  if (handLimitInput) handLimitInput.addEventListener("change", () => setHandLimit(parseInt(handLimitInput.value, 10) || 7));

  if (modeSelect) {
    modeSelect.addEventListener("change", () => {
      playClick();
      state.mode = modeSelect.value || "taumaturgia";
      state.selectedActionId = null;
      damageOut.textContent = "—";
      updateModeHint();
      refreshActionsAndResult();
    });
  }

  if (artsMode) {
    artsMode.addEventListener("change", () => {
      damageOut.textContent = "—";
      renderResult();
    });
  }

  if (rollDamageBtn) rollDamageBtn.addEventListener("click", () => rollDamage());
  if (executeBtn) executeBtn.addEventListener("click", () => executeAction());

  // ============================
  // Init
  // ============================

  (function init() {
    state.mode = (modeSelect && modeSelect.value) ? modeSelect.value : "taumaturgia";
    setHandLimit(parseInt(handLimitInput && handLimitInput.value, 10) || 7);

    resetAll();
    fillHand();
    refreshActionsAndResult();
  })();

})();
