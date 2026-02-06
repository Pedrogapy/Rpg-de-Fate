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
  const magicSelect = $("magicSelect");
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
    taumaturgia: buildAllSpellsTaumaturgia(),
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


  // ============================
  // Biblioteca de Magias — Taumaturgia (opções por sequência)
  // - Primeira carta define o comportamento principal
  // - Segunda e terceira cartas complementam (área, força, efeito)
  // - CDs entre 12 e 16
  // - Sem “anular servo / realidade”; contra-magia no máximo média
  // ============================

  function buildAllSpellsTaumaturgia() {
    const keys = ["buster", "arts", "quick"];
    const out = [];

    for (let len = 1; len <= 3; len++) genSeq([], len);
    return out;

    function genSeq(prefix, len) {
      if (prefix.length === len) {
        const seq = prefix.slice();
        const opts = genTaumSpellsForSeq(seq);

        for (let i = 0; i < opts.length; i++) {
          out.push(buildSpellAction(seq, opts[i], i));
        }

        // fallback: se por algum motivo não gerou nada, mantém a ação genérica antiga
        if (!opts.length) out.push(buildAction("taumaturgia", seq));
        return;
      }
      for (const k of keys) genSeq(prefix.concat(k), len);
    }
  }

  function genTaumSpellsForSeq(seq) {
    const s = seqKeyStr(seq);
    const seed = stableHash(`taum:${s}`);

    const main = seq[0];
    const mods = seq.slice(1);

    const hasB = mods.includes("buster");
    const hasQ = mods.includes("quick");
    const hasA = mods.includes("arts");

    const element = pick(["Fogo", "Gelo", "Raio", "Vento", "Terra", "Água", "Luz", "Sombra", "Éter"], seed + 7);
    const runeTheme = pick(["Pressão", "Vínculo", "Âncora", "Pulso", "Traço", "Círculo", "Chave", "Limiar"], seed + 19);

    const cd = 12 + ((seed % 5)); // 12..16

    // “escala” narrativa do efeito (não muda dado base)
    const strengthWord =
      (mods.filter(x => x === "buster").length >= 2) ? "mais forte" :
      (hasB ? "mais forte" : (hasQ ? "mais amplo" : "estável"));

    // helper: tags
    function mkTags({ type, elemental, runic, support, rarity }) {
      const tags = [];
      tags.push(`CD ${cd}`);
      tags.push(type);
      if (elemental) tags.push(element);
      if (runic) tags.push(`Runa: ${runeTheme}`);
      if (support) tags.push("Suporte");
      if (rarity) tags.push(rarity);
      return tags;
    }

    // define comportamento da rolagem baseado na primeira carta
    function rollModelFor(kind) {
      // kind: damage | heal | shield | none
      const isArea = (main === "quick") || (main === "arts" && hasQ);
      const bAfterMain = (main === "buster" && seq.slice(1).includes("buster"));
      const bCountMods = mods.filter(x => x === "buster").length;

      if (kind === "damage") {
        if (main === "buster") {
          return { kind: "damage", main: "buster", area: false, busterSides: bAfterMain ? 12 : 10 };
        }
        if (main === "quick") {
          // Quick base 1d6 por alvo; cada Buster na sequência adiciona +1d6 por alvo
          return { kind: "damage", main: "quick", area: true, quickDice: 1 + bCountMods };
        }
        // Arts dano (quando uma magia específica “vira dano”)
        return { kind: "damage", main: "arts", area: !!hasQ, artsDice: 1 };
      }

      if (kind === "heal") {
        return { kind: "heal", main: "arts", area: !!hasQ, healDice: 1 };
      }

      if (kind === "shield") {
        return { kind: "shield", main: "arts", area: !!hasQ, shieldSides: 12, shieldDice: 1 };
      }

      return { kind: "none", main, area: false };
    }

    const list = [];

    // ---------- opções por tipo principal ----------
    if (main === "buster") {
      // 1) elemental simples
      list.push({
        name: `Disparo de ${element}`,
        kind: "Dano (Alvo único)",
        tags: mkTags({ type: "Dano", elemental: true, runic: false, support: false, rarity: "Comum" }),
        roll: rollModelFor("damage"),
        text: buildSpellTextTemplate({
          seq, main, cd, title: `Você dispara um projétil de ${element.toLowerCase()} condensado.`,
          how: `A primeira carta (Buster) define impacto único. ${hasA ? "Arts encaixa um selo/controle no impacto. " : ""}${hasQ ? "Quick ajusta o timing e a trajetória (mais difícil de reagir). " : ""}`,
          result: `Dano direto no alvo. ${hasA ? "Aplica um efeito leve (marca, empurrão ou desequilíbrio). " : ""}${hasQ ? "Atinge em ângulo, dificultando cobertura. " : ""}`,
          value: (seq.slice(1).includes("buster") ? "Dano: 1d12 (Buster encadeado)." : "Dano: 1d10 (Buster)."),
          extra: `CD: ${cd}.`,
        }),
      });

      // 2) runa de impacto (pressão)
      list.push({
        name: `Runa de Impacto (${runeTheme})`,
        kind: "Dano (Alvo único) • Corpo a corpo",
        tags: mkTags({ type: "Dano", elemental: false, runic: true, support: false, rarity: "Comum" }),
        roll: rollModelFor("damage"),
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: "Você grava uma runa no punho/arma e libera pressão no contato.",
          how: `Buster dá o “golpe principal”. ${hasA ? "Arts define o padrão do selo (travamento, abertura ou marca). " : ""}${hasQ ? "Quick faz o golpe encaixar em janela curta (difícil de aparar). " : ""}`,
          result: `Dano de impacto com potencial de empurrão/queda (narrativo).`,
          value: (seq.slice(1).includes("buster") ? "Dano: 1d12 (Buster encadeado)." : "Dano: 1d10 (Buster)."),
          extra: `Tag rúnica: ${runeTheme}. CD: ${cd}.`,
        }),
      });

      // 3) disparo com “selo leve” (se tiver Arts, reforça; se não, vira debuff leve)
      list.push({
        name: hasA ? "Selo de Travamento (Impacto)" : "Marca de Rastreamento",
        kind: hasA ? "Dano + Controle" : "Dano + Utilidade",
        tags: mkTags({ type: hasA ? "Controle" : "Utilidade", elemental: false, runic: true, support: true, rarity: "Avançada" }),
        roll: rollModelFor("damage"),
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: hasA ? "O golpe carrega um selo curto que “agarra” a energia do alvo." : "O impacto deixa uma marca rúnica discreta.",
          how: `Buster define o dano. ${hasA ? "Arts injeta o selo. " : ""}${hasQ ? "Quick torna o acerto mais oportuno. " : ""}`,
          result: hasA
            ? "Se acertar, o alvo sofre um efeito leve: dificuldade de recuar, ou perde uma reação narrativa (a critério do mestre)."
            : "Você consegue rastrear o alvo por alguns minutos pela assinatura marcada (sem revelar posição perfeita).",
          value: (seq.slice(1).includes("buster") ? "Dano: 1d12." : "Dano: 1d10."),
          extra: `Contra-magia: baixa/média (não anula servos). CD: ${cd}.`,
        }),
      });

      // 4) “ruptura” (controle defensivo contra feitiço leve)
      list.push({
        name: "Ruptura de Fluxo",
        kind: "Dano + Contra-magia (média)",
        tags: mkTags({ type: "Controle", elemental: false, runic: false, support: true, rarity: "Avançada" }),
        roll: rollModelFor("damage"),
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: "Você comprime mana e atinge o “fio” do feitiço enquanto fere o alvo.",
          how: `Buster entrega o impacto. ${hasA ? "Arts guia a ruptura para o circuito mágico. " : ""}${hasQ ? "Quick muda o ângulo pra pegar a sustentação do feitiço. " : ""}`,
          result: "Se houver um feitiço simples ativo no alvo (ou sustentado por ele), você pode enfraquecê-lo ou reduzir sua duração (não remove uma Autoridade/Selo de Servo).",
          value: (seq.slice(1).includes("buster") ? "Dano: 1d12." : "Dano: 1d10."),
          extra: `CD: ${cd}.`,
        }),
      });
    }

    if (main === "quick") {
      // Quick sempre área; buster aumenta dados; arts adiciona efeito
      const bMods = mods.filter(x => x === "buster").length;
      const diceEach = 1 + bMods; // 1d6 base + buster(s)

      // 1) rajada elemental
      list.push({
        name: `Rajada de ${element} (Varredura)`,
        kind: "Dano (Área)",
        tags: mkTags({ type: "Dano", elemental: true, runic: false, support: false, rarity: "Comum" }),
        roll: { kind: "damage", main: "quick", area: true, quickDice: diceEach },
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: `Você varre a área com lâminas curtas de ${element.toLowerCase()}.`,
          how: `Quick define varredura e múltiplos alvos. ${hasA ? "Arts injeta um efeito (lento, cegueira leve, desarme narrativo). " : ""}${hasB ? "Buster adensa o dano (mais dados por alvo). " : ""}`,
          result: hasA ? "Causa dano e deixa um efeito leve nos afetados." : "Causa dano em todos os alvos escolhidos.",
          value: `Dano: ${diceEach}d6 por alvo.`,
          extra: `CD: ${cd}.`,
        }),
      });

      // 2) campo de pressão (controle)
      list.push({
        name: `Campo de Pressão (${runeTheme})`,
        kind: hasA ? "Dano + Controle (Área)" : "Controle (Área)",
        tags: mkTags({ type: "Controle", elemental: false, runic: true, support: true, rarity: "Avançada" }),
        roll: { kind: hasB ? "damage" : "none", main: "quick", area: true, quickDice: diceEach },
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: "Você espalha runas rápidas no chão e “puxa” o espaço por um instante.",
          how: `Quick define a área e o “alcançar muitos”. ${hasB ? "Buster transforma o pulso em impacto (dano). " : ""}${hasA ? "Arts determina o controle (segurar, empurrar, atrasar). " : ""}`,
          result: hasB
            ? "Dano em área e controle leve: empurrão, tropeço ou redução de mobilidade narrativa."
            : "Controle em área: empurra/segura por um instante, abre caminho ou protege aliados (sem dano).",
          value: hasB ? `Dano: ${diceEach}d6 por alvo.` : "Sem rolagem de dano (efeito).",
          extra: `CD: ${cd}.`,
        }),
      });

      // 3) névoa rúnica (debuff)
      list.push({
        name: "Névoa Rúnica (Supressão Leve)",
        kind: "Debuff (Área)",
        tags: mkTags({ type: "Debuff", elemental: false, runic: true, support: true, rarity: "Avançada" }),
        roll: { kind: hasB ? "damage" : "none", main: "quick", area: true, quickDice: diceEach },
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: "Você solta uma névoa fina marcada por símbolos que “arranham” o foco.",
          how: "Quick espalha a névoa; Arts define o debuff; Buster (se houver) transforma em dano junto.",
          result: "Os afetados têm dificuldade leve de concentração (bom contra conjurações simples). Não impede ações, só atrapalha.",
          value: hasB ? `Dano: ${diceEach}d6 por alvo.` : "Sem rolagem de dano (efeito).",
          extra: `CD: ${cd}. Contra-magia: baixa/média.`,
        }),
      });

      // 4) avanço + corte (mobilidade)
      list.push({
        name: "Passo de Fio (Atravessar)",
        kind: "Mobilidade + Dano (Área curta)",
        tags: mkTags({ type: "Utilidade", elemental: false, runic: false, support: true, rarity: "Comum" }),
        roll: { kind: "damage", main: "quick", area: true, quickDice: diceEach },
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: "Você desloca curto e varre o caminho com cortes rápidos.",
          how: "Quick é o passo e a varredura. Buster aumenta o dano por alvo. Arts adiciona um efeito de controle simples.",
          result: "Você reposiciona e causa dano nos alvos escolhidos. Ótimo pra abrir rota em singularidade.",
          value: `Dano: ${diceEach}d6 por alvo.`,
          extra: `CD: ${cd}.`,
        }),
      });
    }

    if (main === "arts") {
      // Arts: efeito / suporte; se tiver Quick -> área; se tiver Buster -> efeito mais forte.
      const area = hasQ;
      const strong = hasB;

      // 1) cura
      list.push({
        name: area ? "Runa de Restauração (Área)" : "Runa de Restauração",
        kind: "Cura",
        tags: mkTags({ type: "Cura", elemental: false, runic: true, support: true, rarity: "Comum" }),
        roll: { kind: "heal", main: "arts", area: area, healDice: 1 },
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: "Você traça uma runa curta que estabiliza feridas e reequilibra o pulso.",
          how: `Arts define o efeito. ${area ? "Quick expande para área. " : ""}${strong ? "Buster torna a cura mais firme (narrativamente). " : ""}`,
          result: area
            ? "Cura leve em todos os aliados escolhidos (sem remover condições graves automaticamente)."
            : "Cura leve em 1 aliado.",
          value: "Cura: 1d8 (por alvo).",
          extra: `CD: ${cd}.`,
        }),
      });

      // 2) escudo
      list.push({
        name: area ? "Barreira Rúnica (Cúpula)" : "Barreira Rúnica",
        kind: "Defesa",
        tags: mkTags({ type: "Defesa", elemental: false, runic: true, support: true, rarity: "Avançada" }),
        roll: { kind: "shield", main: "arts", area: area, shieldSides: 12, shieldDice: 1 },
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: "Um círculo rúnico vira um escudo de pressão que intercepta ataques.",
          how: `Arts define o escudo. ${area ? "Quick amplia a cobertura. " : ""}${strong ? "Buster “ancora” o escudo para aguentar mais (narrativo). " : ""}`,
          result: area
            ? "Escudo em área curta cobrindo 2–3 pessoas próximas (ou a zona escolhida)."
            : "Escudo em 1 aliado ou em você.",
          value: "Escudo: 1d12 (absorção).",
          extra: `CD: ${cd}.`,
        }),
      });

      // 3) selo/controle
      list.push({
        name: strong ? "Selo de Contenção (Médio)" : "Selo de Contenção (Leve)",
        kind: "Controle",
        tags: mkTags({ type: "Controle", elemental: false, runic: true, support: true, rarity: "Comum" }),
        roll: { kind: "none", main: "arts", area: area },
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: "Você impõe uma regra local por alguns instantes (travamento, atraso, limite).",
          how: `Arts grava o selo. ${area ? "Quick faz o selo pegar numa área. " : ""}${strong ? "Buster aumenta a firmeza do selo (sem paralisar servo). " : ""}`,
          result: area
            ? "Afeta uma pequena área: cria dificuldade de movimento, impede uma manobra simples ou força recuo."
            : "Afeta 1 alvo: trava um gesto, dificulta concentração, ou impede um passo curto.",
          value: "Sem rolagem de dano (efeito).",
          extra: `CD: ${cd}. Contra-magia: média.`,
        }),
      });

      // 4) contra-magia média (não pesada)
      list.push({
        name: "Corte de Conjuração",
        kind: "Contra-magia (média)",
        tags: mkTags({ type: "Controle", elemental: false, runic: false, support: true, rarity: "Avançada" }),
        roll: { kind: "none", main: "arts", area: false },
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: "Você lê o fluxo e corta a sustentação de um feitiço comum.",
          how: `Arts guia a leitura. ${strong ? "Buster ajuda a quebrar o ponto de ancoragem (médio). " : ""}${area ? "Quick permite cortar em uma zona, mas com menos precisão. " : ""}`,
          result: "Você pode enfraquecer/anular uma magia simples (barreira fraca, ilusão leve, encantamento curto). Não cancela Autoridades/NPs.",
          value: "Sem rolagem de dano (efeito).",
          extra: `CD: ${cd}.`,
        }),
      });
    }

    // garantia: sempre no mínimo 4
    while (list.length < 4) {
      list.push({
        name: `Runa Improvisada (${runeTheme})`,
        kind: "Utilidade",
        tags: mkTags({ type: "Utilidade", elemental: false, runic: true, support: true, rarity: "Comum" }),
        roll: { kind: "none", main, area: false },
        text: buildSpellTextTemplate({
          seq, main, cd,
          title: "Você improvisa uma pequena regra local para atravessar a cena.",
          how: "A primeira carta define o foco; as outras ajustam o alcance/força.",
          result: "Use para abrir portas, criar cobertura, puxar um objeto, iluminar, marcar ou estabilizar um aliado.",
          value: "Sem rolagem de dano (efeito).",
          extra: `CD: ${cd}.`,
        }),
      });
    }

    return list.slice(0, 5); // 5 opções por sequência
  }

  function buildSpellAction(seq, def, idx) {
    const s = seqKeyStr(seq);
    const id = `taum_${s}_${idx}`;
    const tags = Array.isArray(def.tags) ? def.tags.join(" • ") : (def.tags || "—");

    return {
      id,
      name: def.name,
      kind: def.kind,
      tags,
      req: seq.slice(),
      rollShield: def.roll && def.roll.kind === "shield",
      roll: def.roll || { kind: "none", main: seq[0], area: false },
      forceArtsDamage: !!def.forceArtsDamage,
      text: () => def.text,
    };
  }

  function buildSpellTextTemplate({ seq, main, cd, title, how, result, value, extra }) {
    const seqLabel = seq.map(k => cardByKey(k).label).join(" → ");
    const mainLabel = main === "buster" ? "Buster" : main === "quick" ? "Quick" : "Arts";
    const range =
      main === "buster" ? "curto a médio (linha de visão)" :
      main === "quick" ? "curto (área próxima)" :
      "curto a médio (à vista)";

    const targets =
      (main === "buster") ? "1 inimigo" :
      (main === "quick") ? "2–3 alvos (ajuste no campo)" :
      (seq.includes("quick") ? "2–3 alvos (área)" : "1 alvo");

    return [
      `Conjuração: 1 ação`,
      `Modo: Taumaturgia (Pressão + Runas)`,
      `Sequência: ${seqLabel}`,
      `Alcance: ${range}`,
      `Alvos: ${targets}`,
      ``,
      `Como a magia acontece:`,
      `${title}`,
      ``,
      `Como ela funciona (carta principal = ${mainLabel}):`,
      `${how}`,
      ``,
      `Resultado (na cena):`,
      `${result}`,
      ``,
      `Valor:`,
      `${value}`,
      extra ? `\n${extra}` : "",
    ].join("\n");
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
    if (!actionsHint) return;

    const s = seqKeys();
    const modeLabel = getModeLabel();

    if (actionsList) actionsList.innerHTML = "";

    if (s.length === 0) {
      actionsHint.textContent = "Monte uma sequência para ver as magias possíveis.";
      if (magicSelect) {
        magicSelect.innerHTML = "";
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "—";
        magicSelect.appendChild(opt);
        magicSelect.disabled = true;
      }
      return;
    }

    const matched = findMatchedActions();
    actionsHint.textContent = `Sequência: ${s.map(k => cardByKey(k).label).join(" → ")} • Modo: ${modeLabel}`;

    // Modo B: seletor de magias
    if (magicSelect) {
      magicSelect.disabled = false;
      magicSelect.innerHTML = "";

      for (const a of matched) {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = `${a.name} — ${a.kind}`;
        magicSelect.appendChild(opt);
      }

      // mantém seleção se possível
      const stillValid = matched.some(a => a.id === state.selectedActionId);
      state.selectedActionId = stillValid ? state.selectedActionId : (matched[0] ? matched[0].id : null);

      magicSelect.value = state.selectedActionId || "";
    }

    // Lista lateral vira só “preview” (opcional)
    if (actionsList) {
      const picked = matched.find(a => a.id === state.selectedActionId) || matched[0] || null;
      if (!picked) return;

      const div = document.createElement("div");
      div.className = "actionCard selected";
      div.innerHTML = `
        <div class="actionTop">
          <div>
            <div class="actionName">${picked.name}</div>
            <div class="actionMeta">${picked.kind} • ${picked.tags}</div>
          </div>
          <div class="muted">${picked.req.map(k => cardByKey(k).label).join(" → ")}</div>
        </div>
        <div class="reqRow">
          ${picked.req.map(k => {
            const c = cardByKey(k);
            return `<span class="reqPill"><img class="seqIcon" src="${c.icon}" alt="${c.label}"/>${c.label}</span>`;
          }).join("")}
        </div>
      `;
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
      resultText.textContent = "Monte uma sequência e escolha uma magia.";
      rollDamageBtn.disabled = true;
      executeBtn.disabled = true;
      damageOut.textContent = "—";
      rollDamageBtn.textContent = "Rolar";
      rollDamageBtn.dataset.mode = "none";
      return;
    }

    const matched = findMatchedActions();

    // garante que o select reflita a seleção
    if (magicSelect && matched.length) {
      const stillValid = matched.some(a => a.id === state.selectedActionId);
      if (!stillValid) state.selectedActionId = matched[0].id;
      magicSelect.value = state.selectedActionId || matched[0].id;
    }

    const picked = matched.find(a => a.id === state.selectedActionId) || matched[0] || null;

    if (!picked) {
      resultTitle.textContent = "—";
      resultTags.textContent = "—";
      resultText.textContent = "Sem magia (isso não deveria acontecer).";
      rollDamageBtn.disabled = true;
      executeBtn.disabled = true;
      return;
    }

    resultTitle.textContent = picked.name;
    resultTags.textContent =
      `${getModeLabel()} • ${picked.kind} • ${picked.tags} • Sequência: ${picked.req.map(k => cardByKey(k).label).join(" → ")}`;

    resultText.textContent = picked.text();

    const rollKind = (picked.roll && picked.roll.kind) ? picked.roll.kind : (picked.rollShield ? "shield" : "none");

    const hasRoll = rollKind !== "none";

    rollDamageBtn.disabled = !hasRoll;
    executeBtn.disabled = false;

    rollDamageBtn.dataset.mode = rollKind;

    if (rollKind === "damage") rollDamageBtn.textContent = "Rolar dano";
    else if (rollKind === "heal") rollDamageBtn.textContent = "Rolar cura";
    else if (rollKind === "shield") rollDamageBtn.textContent = "Rolar escudo";
    else rollDamageBtn.textContent = "Rolar";

    if (!hasRoll) damageOut.textContent = "—";
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

    const matched = findMatchedActions();
    const picked = matched.find(a => a.id === state.selectedActionId) || matched[0] || null;
    if (!picked) return;

    const roll = picked.roll || { kind: picked.rollShield ? "shield" : "none" };

    const lines = [];

    // helpers
    function getTargets() {
      return clamp(parseInt(targetsCount.value, 10) || 1, 1, 12);
    }

    // ---- SHIELD ----
    if (roll.kind === "shield") {
      const dice = Math.max(1, roll.shieldDice || 1);
      const sides = Math.max(2, roll.shieldSides || 12);
      const { rolls, sum } = rollDice(dice, sides);

      if (roll.area) {
        const n = getTargets();
        lines.push(`Escudo (área): ${n} alvo(s) × ${dice}d${sides}`);
        lines.push(`Rolagem: [${rolls.join(", ")}] (total ${sum})`);
        damageOut.textContent = lines.join("
");
      } else {
        damageOut.textContent = `${dice}d${sides} (escudo) = [${rolls.join(", ")}] (total ${sum})`;
      }
      return;
    }

    // ---- HEAL ----
    if (roll.kind === "heal") {
      const dice = Math.max(1, roll.healDice || 1);
      const { rolls, sum } = rollDice(dice, 8);

      if (roll.area) {
        const n = getTargets();
        const perTarget = [];
        for (let t = 0; t < n; t++) {
          const { sum: s2 } = rollDice(dice, 8);
          perTarget.push(`${s2}`);
        }
        lines.push(`Cura (área): ${n} alvo(s) × ${dice}d8 = [${perTarget.join(" | ")}]`);
        damageOut.textContent = lines.join("
");
      } else {
        damageOut.textContent = `${dice}d8 (cura) = [${rolls.join(", ")}] (total ${sum})`;
      }
      return;
    }

    // ---- DAMAGE ----
    if (roll.kind === "damage") {
      // principal define comportamento
      const main = roll.main || picked.req[0];

      if (main === "buster") {
        const sides = roll.busterSides || 10;
        const v = randInt(1, sides);
        damageOut.textContent = `1d${sides} (Buster) = ${v}`;
        return;
      }

      if (main === "quick") {
        const n = getTargets();
        const diceEach = Math.max(1, roll.quickDice || 1);

        const perTarget = [];
        let grand = 0;
        for (let t = 0; t < n; t++) {
          const { rolls, sum } = rollDice(diceEach, 6);
          grand += sum;
          perTarget.push(diceEach === 1 ? `${sum}` : `(${rolls.join("+")})=${sum}`);
        }

        lines.push(`Quick: ${n} alvo(s) × ${diceEach}d6 = [${perTarget.join(" | ")}] (total ${grand})`);
        damageOut.textContent = lines.join("
");
        return;
      }

      // Arts dano (quando a magia especifica isso)
      const dice = Math.max(1, roll.artsDice || 1);
      const { rolls, sum } = rollDice(dice, 8);
      if (roll.area) {
        const n = getTargets();
        const perTarget = [];
        let grand = 0;
        for (let t = 0; t < n; t++) {
          const { rolls: r2, sum: s2 } = rollDice(dice, 8);
          grand += s2;
          perTarget.push(dice === 1 ? `${s2}` : `(${r2.join("+")})=${s2}`);
        }
        lines.push(`Arts (dano): ${n} alvo(s) × ${dice}d8 = [${perTarget.join(" | ")}] (total ${grand})`);
        damageOut.textContent = lines.join("
");
      } else {
        damageOut.textContent = `${dice}d8 (Arts dano) = [${rolls.join(", ")}] (total ${sum})`;
      }
      return;
    }

    damageOut.textContent = "Sem rolagem.";
  }

  // ============================
  // Executar (consome sequência) (consome sequência)
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

  if (magicSelect) {
    magicSelect.addEventListener("change", () => {
      playClick();
      state.selectedActionId = magicSelect.value || null;
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