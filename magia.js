// magia.js — descrições estilo D&D para TODAS as combinações
// Não menciona dados. Não cita Volumen/lobos/fluxo.
// Retorna um texto único para cada variação possível.

(function () {
  const CARD = {
    quick: {
      label: "Quick",
      baseDesc: "Magia em área, pode atingir vários alvos.",
      castLine: "Tempo de conjuração: 1 ação (consome 1 carta Quick)",
      reachLine: "Alcance: área na zona escolhida à vista",
      targetLine: "Alvos: múltiplas criaturas na área",
    },
    arts: {
      label: "Arts",
      baseDesc: "Causa um efeito em um alvo.",
      castLine: "Tempo de conjuração: 1 ação (consome 1 carta Arts)",
      reachLine: "Alcance: à vista",
      targetLine: "Alvos: 1 criatura ou objeto",
    },
    buster: {
      label: "Buster",
      baseDesc: "Ataque focado em um alvo, direto e forte.",
      castLine: "Tempo de conjuração: 1 ação (consome 1 carta Buster)",
      reachLine: "Alcance: à vista",
      targetLine: "Alvos: 1 criatura",
    },
  };

  const ELEMENTS = ["Fogo", "Terra", "Água", "Ar", "Raio", "Luz"];

  // Mantido pras tabelas no site
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

  // Mantido pras tabelas no site (6 faces, 2 escolhas)
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

  // Mantido pras tabelas no site
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

  // ====== EFEITOS (sem mencionar dados) ======

  // Tática (12 possibilidades). Chave = nome escolhido
  const TACTIC = new Map([
    ["Segurança", "Você executa a magia por um ângulo seguro. Durante esta execução, uma reação inimiga contra essa magia é ignorada."],
    ["Alcance", "Você estende o alcance prático do efeito. A magia alcança mais longe ou cobre uma zona maior do que o normal para esse tipo de conjuração."],
    ["Precisão", "Você refina o encaixe da fórmula. Seus testes de acerto relacionados a esta magia recebem +1."],
    ["Velocidade", "Você acelera a conjuração. Você pode se antecipar a alguém que agiria antes, ou reagir em uma janela que normalmente não existiria."],
    ["Pressão", "Você impõe pressão arcana sobre o alvo. A próxima ação dele ocorre com desvantagem, quando fizer sentido na cena."],
    ["Controle", "Você cria uma condição leve e prática: visão turva, deslocamento travado, conjuração atrapalhada ou movimento dificultado."],
    ["Continuidade", "O efeito principal deixa um rastro estável. Quando fizer sentido, ele persiste por 1 turno adicional."],
    ["Explosão", "Você descarrega tudo de uma vez. O efeito acontece de forma imediata e concentrada, sem sobras ou duração estendida."],
    ["Adaptação", "Você ajusta o princípio no meio da execução. A magia muda de lógica de forma coerente com o que está acontecendo."],
    ["Sinergia", "Você deixa a conjuração ‘aberta’ para uma sequência. O próximo aliado que agir ganha um bônus contextual, a critério do mestre."],
    ["Marca", "Você deixa uma marca discreta no alvo. Em interações imediatas, aplicar efeitos nesse alvo se torna mais fácil."],
    ["Recuperação", "Ao finalizar a conjuração, você recupera o ritmo e puxa uma carta adicional, respeitando o limite de 7 na mão."],
  ]);

  // Momento (10 possibilidades)
  const MOMENT = new Map([
    ["Eco", "Se esta magia acertar, você pode repetir o mesmo efeito contra outro alvo válido dentro da área/alcance."],
    ["Janela", "Você abre uma falha por um instante. Se o alvo errar a próxima ação, ele sofre dano extra (1d6)."],
    ["Quebra", "A magia mira a sustentação do alvo. Uma proteção, buff ou preparação ativa pode ser removida."],
    ["Reação", "Você prepara uma segunda resposta. Se você for atacado e sua primeira reação falhar, você pode tentar reagir novamente."],
    ["Presságio", "Ao fim, você lê a próxima possibilidade: olhe a próxima carta do seu deck e decida manter ou trocar."],
    ["Ancoragem", "Você ancora o princípio usado. Até o próximo turno, esse mesmo estilo de magia pode ser escolhido em vez de rolado."],
    ["Deslocamento", "A execução força reposicionamento. Você ou o alvo é deslocado de forma relevante e instantânea, coerente com a cena."],
    ["Amplificação Narrativa", "O efeito reverbera no ambiente: luz, ruído, impacto, distração ou colapso leve. Isso concede vantagem situacional quando fizer sentido."],
    ["Combo", "Você deixa a conjuração em cadeia. Se no próximo turno usar uma carta diferente, ganha bônus de dano ou de efeito, a critério do mestre."],
    ["Clímax", "Você força a execução perfeita. Você ignora desvantagens atuais na realização desta magia, desde que ainda seja possível conjurá-la."],
  ]);

  // Método (8) — varia por carta. Elemental usa elemento.
  function methodEffect(cardKey, methodIndex, elementLabel) {
    const c = cardKey;

    if (methodIndex === 1) {
      const elName = elementLabel || "Elemento";
      const elLower = elName.toLowerCase();

      if (c === "quick") {
        return `Você transforma a zona em um fenômeno de ${elLower}. Uma onda elemental varre a área, atingindo todos os alvos dentro dela com o mesmo tipo de energia.`;
      }
      if (c === "arts") {
        return `Você injeta um fenômeno de ${elLower} diretamente no alvo, impondo uma condição coerente com a natureza desse elemento.`;
      }
      return `Você concentra ${elLower} em um único impacto. O golpe atinge um alvo com força direta e um efeito elemental curto e brutal.`;
    }

    if (methodIndex === 2) {
      if (c === "quick") return "Você altera densidade, atrito e pressão em uma zona, tornando o espaço instável. Movimentação e postura ficam mais difíceis para quem estiver dentro.";
      if (c === "arts")  return "Você altera uma propriedade física no alvo (densidade, atrito, dureza ou pressão), impondo uma limitação prática e coerente com a cena.";
      return "Você distorce as propriedades no instante do impacto. O ataque atravessa resistência como se a matéria mudasse de regra por um segundo.";
    }

    if (methodIndex === 3) {
      if (c === "quick") return "Você libera pulsos de energia pela área. Eles podem empurrar, queimar, eletrificar ou causar impacto cinético de forma distribuída.";
      if (c === "arts")  return "Você aplica um pulso de energia controlada no alvo, com foco em efeito: paralisar, empurrar, queimar ou desorganizar o corpo.";
      return "Você condensa energia pura e libera em um disparo curto e direto, feito para derrubar um único alvo com impacto imediato.";
    }

    if (methodIndex === 4) {
      if (c === "quick") return "Você espalha ruído arcano na área. Conjurações, selos e preparações dentro da zona sofrem distorção e ficam mais difíceis de sustentar.";
      if (c === "arts")  return "Você injeta distorção na fórmula do alvo. Efeitos ativos ficam instáveis e tentativas de manter magia podem falhar.";
      return "Você atinge o ponto de sustentação do alvo e rompe a fórmula no impacto, como um golpe que ‘desliga’ uma proteção no exato momento.";
    }

    if (methodIndex === 5) {
      if (c === "quick") return "Você cria estruturas efêmeras em pontos-chave (grades, estacas, paredes finas). Elas moldam a área e limitam rotas por um instante.";
      if (c === "arts")  return "Você materializa um objeto breve e preciso (grilhão, obstáculo, trava). Ele se forma junto ao alvo para restringir ou forçar uma resposta.";
      return "Você materializa um projétil ou lâmina efêmera no instante do ataque, ampliando o impacto como se a magia virasse metal por um segundo.";
    }

    if (methodIndex === 6) {
      if (c === "quick") return "Você dispara uma vibração instável pela área. Postura, foco e sustentação de efeitos tremem, como se tudo estivesse fora de sintonia.";
      if (c === "arts")  return "Você sintoniza uma frequência no alvo. Corpo e magia entram em desalinho por um momento, reduzindo controle e estabilidade.";
      return "Você cria ressonância no ponto de impacto. O dano aparece como choque interno, curto e difícil de amortecer.";
    }

    if (methodIndex === 7) {
      if (c === "quick") return "Você altera vetores no campo: empurrões, desvios e redirecionamentos. A área vira um lugar onde força e direção mudam de forma traiçoeira.";
      if (c === "arts")  return "Você altera o vetor do alvo e provoca reposicionamento, quebra de postura ou abertura de guarda.";
      return "Você converte o impacto em impulso bruto. O golpe arremessa, derruba ou desloca o alvo de forma agressiva.";
    }

    if (methodIndex === 8) {
      if (c === "quick") return "Você espalha marcas técnicas no terreno. Por um curto período, a área passa a reagir diferente a movimento e magia, criando armadilhas de regra.";
      if (c === "arts")  return "Você grava um selo técnico no alvo. Isso cria uma regra temporária que muda como ele reage a magia, deslocamento ou defesa.";
      return "Você crava um selo no impacto. O golpe deixa uma marca que altera o próximo momento do alvo, abrindo vantagem para a sequência.";
    }

    return "Você realiza um efeito mágico coerente com a cena.";
  }

  // ====== PRÉ-GERAÇÃO: “um texto para cada variação possível” ======

  const SPELLBOOK = new Map();

  function keyOf(cardKey, methodIndex, elementLabel, tacticName, momentName) {
    const el = (methodIndex === 1) ? (elementLabel || "—") : "—";
    return `${cardKey}|${methodIndex}|${el}|${tacticName}|${momentName}`;
  }

  function shortMethodName(methodIndex, elementLabel) {
    if (methodIndex === 1) return `${elementLabel} (Elemental)`;
    return D8[methodIndex - 1].split(" (")[0]; // só o começo
  }

  function buildSpell(cardKey, methodIndex, elementLabel, tacticName, momentName) {
    const card = CARD[cardKey];

    const title = `${shortMethodName(methodIndex, elementLabel)} — ${card.label} — ${tacticName} — ${momentName}`;

    const effectMain = methodEffect(cardKey, methodIndex, elementLabel);
    const effectTac  = TACTIC.get(tacticName) || "Você obtém um ajuste tático coerente com a cena.";
    const effectMom  = MOMENT.get(momentName) || "O efeito ganha um detalhe especial coerente com a cena.";

    const text = [
      card.castLine,
      card.reachLine,
      card.targetLine,
      "",
      "Descrição:",
      effectMain,
      "",
      effectTac,
      "",
      effectMom,
    ].join("\n");

    return { summary: title, text };
  }

  const ALL_TACTICS = [
    "Segurança", "Alcance",
    "Precisão", "Velocidade",
    "Pressão", "Controle",
    "Continuidade", "Explosão",
    "Adaptação", "Sinergia",
    "Marca", "Recuperação",
  ];

  const ALL_MOMENTS = D10.map(x => x.name);

  (function precomputeAll() {
    const cardKeys = Object.keys(CARD);

    for (const ck of cardKeys) {
      for (let m = 1; m <= 8; m++) {
        if (m === 1) {
          for (const elName of ELEMENTS) {
            for (const tac of ALL_TACTICS) {
              for (const mom of ALL_MOMENTS) {
                const k = keyOf(ck, m, elName, tac, mom);
                SPELLBOOK.set(k, buildSpell(ck, m, elName, tac, mom));
              }
            }
          }
        } else {
          for (const tac of ALL_TACTICS) {
            for (const mom of ALL_MOMENTS) {
              const k = keyOf(ck, m, "—", tac, mom);
              SPELLBOOK.set(k, buildSpell(ck, m, null, tac, mom));
            }
          }
        }
      }
    }
  })();

  // API usada pelo simulador
  window.Magia = {
    CARD,
    D8,
    D6,
    D10,
    ELEMENTS,

    generate({ cardKey, methodIndex, elementLabel, d6ChoiceName, d10Index }) {
      const momentName = D10[d10Index - 1]?.name || "—";
      const tac = d6ChoiceName || "—";
      const el = (methodIndex === 1) ? (elementLabel || "—") : "—";

      const k = keyOf(cardKey, methodIndex, el, tac, momentName);
      const found = SPELLBOOK.get(k);

      // fallback (não deveria acontecer)
      if (!found) {
        return {
          summary: `${CARD[cardKey]?.label || "Carta"} — magia`,
          text: [
            "Tempo de conjuração: 1 ação",
            "Alcance: à vista",
            "Alvos: conforme a carta",
            "",
            "Descrição:",
            methodEffect(cardKey, methodIndex, elementLabel),
          ].join("\n"),
        };
      }

      return found;
    },
  };
})();
