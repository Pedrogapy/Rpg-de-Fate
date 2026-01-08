// magia.js — descrições estilo D&D
// - spell.text NÃO menciona quais dados foram rolados.
// - Pode mencionar dano (1d10 / 1d6) e condições, pois isso é parte do RPG.
// - Suporta combo (1 a 3 cartas) e modo de execução (Taumaturgia ou Volumen).

(function () {
  // ============================
  // Cartas
  // ============================
  const CARD = {
    quick: {
      label: "Quick",
      baseDesc: "Magia em área, pode atingir vários alvos.",
      role: "varredura",
    },
    arts: {
      label: "Arts",
      baseDesc: "Causa um efeito em um alvo.",
      role: "efeito",
    },
    buster: {
      label: "Buster",
      baseDesc: "Ataque focado em um alvo.",
      role: "impacto",
    },
  };

  // ============================
  // Tabelas (mantidas para exibição no site)
  // ============================
  const ELEMENTS = ["Fogo", "Terra", "Água", "Ar", "Raio", "Luz"];

  const D8 = [
    "Elemental clássico",
    "Alteração de propriedades físicas (densidade, atrito, dureza, pressão)",
    "Energia (calor, cinética, elétrica como energia pura)",
    "Interferência mágica (ruído, distorção, quebra de fórmulas)",
    "Materialização temporária (criação breve de objetos ou estruturas)",
    "Ressonância (vibração, frequência, desestabilização interna)",
    "Vetor (direcionamento, impulso, redirecionamento de força)",
    "Selo técnico (marca arcana que altera interações futuras)",
  ];

  // D6 (6 faces, 2 escolhas) — do texto final
  const D6 = [
    {
      pair: ["Segurança", "Alcance"],
      a: "Segurança: você ignora uma reação inimiga",
      b: "Alcance: você pode estender o efeito/ quantidade de alvos atingidos alem do permitido pela carta",
    },
    {
      pair: ["Precisão", "Velocidade"],
      a: "Precisão: bônus no teste de acerto (+1 alem do atual)",
      b: "Velocidade: você pode agir antes de alguém que normalmente agiria antes (serve pra reação (vantagem nesse caso))",
    },
    {
      pair: ["Pressão", "Controle"],
      a: "Pressão: impõe desvantagem na próxima ação do alvo",
      b: "Controle: cria uma condição leve (dificulta movimento, visão, conjuração)",
    },
    {
      pair: ["Continuidade", "Explosão"],
      a: "Continuidade: efeito persiste um turno extra",
      b: "Explosão: efeito acontece todo de uma vez",
    },
    {
      pair: ["Adaptação", "Sinergia"],
      a: "Adaptação: você pode reinterpretar o resultado do d8 de forma coerente",
      b: "Sinergia: concede bônus para o próximo aliado que agir",
    },
    {
      pair: ["Marca", "Recuperação"],
      a: "Marca: alvo fica marcado para aplicar efeitos sem ter que acertar o alvo em si",
      b: "Recuperação: você compra 1 carta adicional (respeitando o limite de 7)",
    },
  ];

  const D10 = [
    { name: "Eco", desc: "Se a magia acertar, o ataque se repete em outro alvo válido" },
    { name: "Janela", desc: "Se o alvo errar a próxima ação, sofre 1d6 de dano" },
    { name: "Quebra", desc: "Remove uma proteção, buff ou preparação ativa do alvo" },
    { name: "Reação", desc: "Você pode realizar uma reação novamente caso sofra um ataque e sua primeira tentativa de reação tenha falhado" },
    { name: "Presságio", desc: "Olhe a próxima carta do seu deck e decida manter ou trocar" },
    { name: "Ancoragem", desc: "Até o próximo turno, efeitos do mesmo método (d8) serão escolhidos" },
    { name: "Deslocamento", desc: "Você ou o alvo muda de posição de forma relevante e instantanea" },
    { name: "Amplificação Narrativa", desc: "O efeito causa impacto ambiental ou narrativo útil (concede vantagem)" },
    { name: "Combo", desc: "Se usar uma carta diferente no próximo turno, ganha bônus de dano ou efeito" },
    { name: "Clímax", desc: "Ignora todas as desvantagens atuais pra realização de uma magia eficaz" },
  ];

  // ============================
  // Helpers
  // ============================
  function cap(s) {
    return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
  }

  function joinLabels(cards) {
    return cards.map(k => CARD[k]?.label || k).join(" + ");
  }

  function countOf(cards, key) {
    return cards.reduce((acc, c) => acc + (c === key ? 1 : 0), 0);
  }

  function has(cards, key) {
    return cards.includes(key);
  }

  function anyQuick(cards) {
    return has(cards, "quick");
  }

  function anyBuster(cards) {
    return has(cards, "buster");
  }

  function anyArts(cards) {
    return has(cards, "arts");
  }

  function methodShort(methodIndex) {
    const full = D8[methodIndex - 1] || "—";
    return full.split(" (")[0];
  }

  function elementLower(elementLabel) {
    return String(elementLabel || "").toLowerCase();
  }

  // ============================
  // Núcleo do efeito (sem falar de dados)
  // ============================
  function phaseText({ mode, cardKey, methodIndex, elementLabel }) {
    const isVol = mode === "volumen";
    const el = elementLower(elementLabel);

    // Frases base por carta
    const base = {
      quick: isVol
        ? "o mercúrio se espalha em uma varredura ampla, atacando todos na zona"
        : "uma onda se expande pela área, atingindo todos na zona",
      arts: isVol
        ? "o mercúrio assume uma forma precisa e aplica um efeito no alvo"
        : "a fórmula se encaixa no alvo e aplica um efeito direcionado",
      buster: isVol
        ? "o mercúrio se condensa em um golpe brutal contra um único alvo"
        : "a energia se concentra em um impacto direto contra um único alvo",
    }[cardKey] || (isVol ? "o mercúrio reage" : "a magia reage");

    // Ajustes por método
    switch (methodIndex) {
      case 1: // Elemental
        if (!el) return base;
        if (cardKey === "quick") {
          return isVol
            ? `o mercúrio se torna um fenômeno ${el} em forma de varredura, cobrindo a área com ${el}`
            : `uma onda ${el} varre a área e atinge múltiplos alvos`;
        }
        if (cardKey === "arts") {
          return isVol
            ? `o mercúrio carrega ${el} e injeta o fenômeno no alvo, criando um efeito coerente com ${el}`
            : `você injeta um fenômeno ${el} no alvo, impondo um efeito coerente com ${el}`;
        }
        return isVol
          ? `o mercúrio concentra ${el} em um único golpe, curto e devastador`
          : `você concentra ${el} em um único impacto, curto e devastador`;

      case 2: // Propriedades físicas
        if (cardKey === "quick") return isVol
          ? "o mercúrio altera atrito e pressão na zona, tornando o chão e o ar difíceis de atravessar"
          : "você altera atrito e pressão na zona, tornando a movimentação instável";
        if (cardKey === "arts") return isVol
          ? "o mercúrio gruda no alvo por um instante e altera densidade/atrito/dureza, impondo uma limitação prática"
          : "você altera densidade/atrito/dureza no alvo, impondo uma limitação prática";
        return isVol
          ? "o mercúrio endurece no instante do golpe e atravessa resistência como se a matéria mudasse de regra"
          : "o impacto endurece no instante certo e atravessa resistência como se a matéria mudasse de regra";

      case 3: // Energia
        if (cardKey === "quick") return isVol
          ? "o mercúrio solta pulsos de energia em sequência pela área, empurrando e queimando de forma distribuída"
          : "pulsos de energia percorrem a área, empurrando e queimando de forma distribuída";
        if (cardKey === "arts") return isVol
          ? "o mercúrio descarrega um pulso controlado no alvo, buscando paralisar, empurrar ou desorganizar"
          : "você aplica um pulso controlado no alvo, buscando paralisar, empurrar ou desorganizar";
        return isVol
          ? "o mercúrio condensa energia e libera em um disparo curto, feito para derrubar"
          : "você condensa energia e libera em um disparo curto, feito para derrubar";

      case 4: // Interferência
        if (cardKey === "quick") return isVol
          ? "o mercúrio espalha ruído arcano na área, distorcendo conjurações e preparações"
          : "você espalha ruído arcano na área, distorcendo conjurações e preparações";
        if (cardKey === "arts") return isVol
          ? "o mercúrio encosta no alvo e injeta distorção, tornando efeitos ativos instáveis"
          : "você injeta distorção na fórmula do alvo, tornando efeitos ativos instáveis";
        return isVol
          ? "o golpe corta a sustentação do alvo e rompe uma proteção no momento certo"
          : "o golpe mira a sustentação e rompe uma proteção no momento certo";

      case 5: // Materialização
        if (cardKey === "quick") return isVol
          ? "o mercúrio ergue obstáculos efêmeros na área, fechando rotas e criando cobertura"
          : "estruturas efêmeras surgem na área, fechando rotas e criando cobertura";
        if (cardKey === "arts") return isVol
          ? "o mercúrio forma um grilhão/trava breve junto ao alvo, restringindo movimento ou ação"
          : "você materializa um grilhão/trava breve junto ao alvo, restringindo movimento ou ação";
        return isVol
          ? "o mercúrio vira uma lâmina/projétil por um segundo e amplia o impacto"
          : "você materializa um projétil/arma efêmera no instante do ataque";

      case 6: // Ressonância
        if (cardKey === "quick") return isVol
          ? "o mercúrio vibra e espalha uma ressonância pela área, tirando o corpo e a magia de sintonia"
          : "uma ressonância percorre a área, tirando corpo e magia de sintonia";
        if (cardKey === "arts") return isVol
          ? "o mercúrio sintoniza uma frequência no alvo, reduzindo estabilidade e controle"
          : "você sintoniza uma frequência no alvo, reduzindo estabilidade e controle";
        return isVol
          ? "o golpe cria um choque interno curto e difícil de amortecer"
          : "o impacto vira um choque interno curto e difícil de amortecer";

      case 7: // Vetor
        if (cardKey === "quick") return isVol
          ? "o mercúrio cria empurrões e desvios na área, mudando direção e postura de quem atravessa"
          : "a área vira um campo de desvios: força e direção mudam de forma traiçoeira";
        if (cardKey === "arts") return isVol
          ? "o mercúrio puxa o vetor do alvo e quebra postura, abrindo espaço para a sequência"
          : "você altera o vetor do alvo e quebra postura, abrindo espaço para a sequência";
        return isVol
          ? "o golpe vira impulso bruto, arremessando ou derrubando"
          : "o golpe vira impulso bruto, arremessando ou derrubando";

      case 8: // Selo técnico
        if (cardKey === "quick") return isVol
          ? "o mercúrio risca marcas técnicas no terreno; a área reage diferente a movimento e magia"
          : "marcas técnicas ficam no terreno; a área reage diferente a movimento e magia";
        if (cardKey === "arts") return isVol
          ? "o mercúrio grava um selo técnico no alvo, criando uma regra temporária"
          : "você grava um selo técnico no alvo, criando uma regra temporária";
        return isVol
          ? "o golpe crava um selo no impacto, abrindo vantagem para a próxima ação"
          : "o golpe crava um selo no impacto, abrindo vantagem para a próxima ação";

      default:
        return base;
    }
  }

  function buildCoreEffect({ mode, cards, methodIndex, elementLabel }) {
    const parts = [];
    const steps = cards.slice(0, 3);

    // Texto em fases
    if (steps.length === 1) {
      parts.push(`Você executa a magia: ${phaseText({ mode, cardKey: steps[0], methodIndex, elementLabel })}.`);
    } else if (steps.length === 2) {
      parts.push(`Primeiro, ${phaseText({ mode, cardKey: steps[0], methodIndex, elementLabel })}.`);
      parts.push(`Em seguida, ${phaseText({ mode, cardKey: steps[1], methodIndex, elementLabel })}.`);
    } else {
      parts.push(`Primeiro, ${phaseText({ mode, cardKey: steps[0], methodIndex, elementLabel })}.`);
      parts.push(`Depois, ${phaseText({ mode, cardKey: steps[1], methodIndex, elementLabel })}.`);
      parts.push(`Por fim, ${phaseText({ mode, cardKey: steps[2], methodIndex, elementLabel })}.`);
    }

    // Amarração se tiver Quick + Buster
    if (anyQuick(cards) && anyBuster(cards)) {
      parts.push("Se houver uma abertura no caos da área, você escolhe um alvo dentro da zona para ser o foco do impacto final.");
    }

    // Amarração se tiver Arts junto
    if (anyArts(cards)) {
      parts.push("O efeito Arts se encaixa na janela criada pela sequência, reforçando controle, debuff, marca ou utilidade conforme a cena.");
    }

    return parts.join(" ");
  }

  // ============================
  // Ajuste tático (depende das cartas)
  // ============================
  function buildTacticText({ tacticName, cards }) {
    const q = countOf(cards, "quick");
    const b = countOf(cards, "buster");
    const a = countOf(cards, "arts");

    switch (tacticName) {
      case "Segurança":
        return "Você executa a conjuração em um ângulo seguro. Uma reação inimiga contra esta execução é ignorada.";

      case "Alcance":
        if (q > 0) return "Você estende a zona atingida. A área cobre mais espaço e pode alcançar mais alvos do que o normal.";
        if (b > 0 && a === 0) return "Você estende o alcance do impacto, alcançando um alvo que estaria fora do alcance normal.";
        return "Você estende o alcance prático do efeito: mais longe, mais amplo, ou com um alvo extra quando fizer sentido.";

      case "Precisão":
        return "Você refina o encaixe da fórmula. Testes de acerto relacionados a esta execução recebem +1.";

      case "Velocidade":
        return "Você acelera a conjuração. Você pode agir antes de alguém que normalmente agiria antes, ou reagir em uma janela que normalmente não existiria.";

      case "Pressão":
        if (q > 0) return "A pressão se espalha junto com a área. Os alvos atingidos ficam sob desvantagem na próxima ação, quando fizer sentido.";
        return "Você impõe pressão arcana no alvo. A próxima ação do alvo ocorre com desvantagem, quando fizer sentido.";

      case "Controle":
        if (q > 0) return "A área ganha um controle leve: visão turva, deslocamento travado ou conjuração atrapalhada, afetando quem estiver dentro.";
        return "Você cria uma condição leve e prática no alvo: visão turva, deslocamento travado, conjuração atrapalhada ou movimento dificultado.";

      case "Continuidade":
        if (a > 0) return "O efeito Arts deixa um rastro estável. Se fizer sentido, ele persiste por 1 turno adicional.";
        if (q > 0) return "A zona permanece instável por 1 turno: quem atravessar ou permanecer nela sente o resíduo do efeito.";
        return "O efeito deixa um rastro estável e persiste por 1 turno adicional quando fizer sentido.";

      case "Explosão":
        if (b > 0 && q === 0) return "Você descarrega tudo de uma vez: o impacto acontece de forma imediata e concentrada.";
        if (q > 0) return "A varredura acontece em um pico único e imediato, atingindo todos ao mesmo tempo.";
        return "Você descarrega tudo de uma vez: o efeito acontece de forma imediata e concentrada.";

      case "Adaptação":
        return "Você ajusta o princípio no meio da execução. O estilo do efeito pode ser reinterpretado de forma coerente com a cena.";

      case "Sinergia":
        return "Você deixa a fórmula aberta para outro agir em sequência. O próximo aliado que agir ganha um bônus contextual (a critério do mestre).";

      case "Marca":
        if (q > 0) return "Os alvos atingidos ficam com uma marca breve. Aplicar um efeito neles em seguida se torna mais fácil.";
        return "Você deixa uma marca discreta no alvo. Aplicar efeitos nesse alvo em seguida se torna mais fácil.";

      case "Recuperação":
        return "Ao finalizar a conjuração, você puxa uma carta adicional, respeitando o limite configurado da mão.";

      default:
        return "Você obtém um ajuste tático coerente com a cena.";
    }
  }

  // ============================
  // Momento (d10) — com consequências claras
  // ============================
  function buildMomentText({ momentName, cards }) {
    const q = countOf(cards, "quick");

    switch (momentName) {
      case "Eco":
        return q > 0
          ? "Se esta execução acertar, a varredura pode saltar para outro alvo válido na mesma zona."
          : "Se esta execução acertar, você pode repetir o mesmo efeito contra outro alvo válido.";

      case "Janela":
        return "Você abre uma falha por um instante. Se o alvo errar a próxima ação, ele sofre 1d6 de dano extra.";

      case "Quebra":
        return "A execução mira a sustentação do alvo. Uma proteção, buff ou preparação ativa pode ser removida.";

      case "Reação":
        return "Você prepara uma segunda resposta. Se você for atacado e sua primeira reação falhar, você pode tentar reagir novamente.";

      case "Presságio":
        return "No fim, você lê a próxima possibilidade: olhe a próxima carta do seu deck e decida manter ou trocar.";

      case "Ancoragem":
        return "Você ancora o princípio usado. Até o próximo turno, esse mesmo estilo de execução pode ser escolhido em vez de rolado.";

      case "Deslocamento":
        return "A execução força reposicionamento. Você ou o alvo é deslocado de forma relevante e instantânea (coerente com a cena).";

      case "Amplificação Narrativa":
        return "O efeito reverbera no ambiente: luz, ruído, impacto, colapso leve ou distração. Isso concede vantagem situacional quando fizer sentido.";

      case "Combo":
        return "Você deixa a conjuração em cadeia. Se no próximo turno você usar uma carta diferente da última carta usada neste combo, ganha um bônus de dano ou de efeito (a critério do mestre).";

      case "Clímax":
        return "Você força a execução perfeita. Você ignora desvantagens atuais na realização desta magia, desde que ainda seja possível conjurá-la.";

      default:
        return "O efeito ganha um detalhe especial coerente com a cena.";
    }
  }

  // ============================
  // Linhas de ficha (alcance/alvos/dano)
  // ============================
  function buildHeaderLines({ cards, mode }) {
    const labels = joinLabels(cards);

    const lines = [];
    lines.push(`Conjuração: ${cards.length} carta(s) — ${labels}`);

    // alcance/alvos pelo conjunto
    if (anyQuick(cards)) {
      lines.push("Alcance: área na zona escolhida à vista");
      lines.push("Alvos: múltiplos alvos na área");
    } else {
      lines.push("Alcance: à vista");
      lines.push("Alvos: 1 criatura ou objeto");
    }

    // dano por cartas
    const b = countOf(cards, "buster");
    const q = countOf(cards, "quick");

    if (b === 0 && q === 0) {
      lines.push("Dano: — (efeito puro)");
    } else {
      if (b > 0) {
        lines.push(`Dano (Buster): ${b}d10 em 1 alvo (pode ser o mesmo alvo em sequência)`);
      }
      if (q > 0) {
        lines.push(`Dano (Quick): ${q}d6 por alvo atingido na área`);
      }
    }

    if (mode === "volumen") {
      lines.push("Fonte: Volumen Hydrargyrum (mercúrio líquido em forma tática)");
    } else {
      lines.push("Fonte: Taumaturgia (fórmula arcana improvisada)");
    }

    return lines;
  }

  function maybeShieldLine({ methodIndex, tacticName, cards, mode }) {
    // Regras simples: se a cena/pessoas quiserem transformar isso em escudo,
    // qualquer escudo absorve 1d12. A gente só menciona quando faz sentido.
    const wantsDefense = (tacticName === "Segurança") || (tacticName === "Controle") || (tacticName === "Continuidade");
    const isBuilder = methodIndex === 5 || methodIndex === 8; // materialização ou selo técnico
    if (!wantsDefense && !isBuilder) return null;

    // Se for combo só de Buster e quiser ofensivo, não menciona escudo.
    if (countOf(cards, "buster") > 0 && !anyArts(cards) && !anyQuick(cards) && tacticName === "Explosão") return null;

    return "Se esta execução criar um escudo/barreira, ele absorve até 1d12 de dano antes de se romper.";
  }

  // ============================
  // API
  // ============================
  function generate({
    cards,
    methodIndex,
    elementLabel,
    d6ChoiceName,
    d10Index,
    mode,
  }) {
    const safeCards = Array.isArray(cards) ? cards.slice(0, 3) : [];
    const usedMode = (mode === "volumen") ? "volumen" : "magia";

    const momentName = D10[d10Index - 1]?.name || "—";
    const tacticName = d6ChoiceName || "—";

    const methodName = methodShort(methodIndex);
    const methodTitle = (methodIndex === 1 && elementLabel)
      ? `${elementLabel} — ${methodName}`
      : methodName;

    const title = `${methodTitle} — ${joinLabels(safeCards)} — ${tacticName} — ${momentName}`;

    const lines = [];
    lines.push(...buildHeaderLines({ cards: safeCards, mode: usedMode }));
    lines.push("");

    lines.push("Efeito:");
    lines.push(buildCoreEffect({ mode: usedMode, cards: safeCards, methodIndex, elementLabel }));

    const shield = maybeShieldLine({ methodIndex, tacticName, cards: safeCards, mode: usedMode });
    if (shield) lines.push(shield);

    lines.push("");

    lines.push("Ajuste tático:");
    lines.push(buildTacticText({ tacticName, cards: safeCards }));

    lines.push("");

    lines.push("Momento:");
    lines.push(buildMomentText({ momentName, cards: safeCards }));

    return { summary: title, text: lines.join("\n") };
  }

  window.Magia = {
    CARD,
    D8,
    D6,
    D10,
    ELEMENTS,
    generate,
  };
})();
