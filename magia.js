// magia.js — descrições estilo D&D para TODAS as combinações
// - Não menciona dados nem “qual dado faz o quê”
// - Não cita Volumen/lobos/fluxo
// - Considera: Buster = 1d10 (1 alvo), Quick = 1d6 por alvo (área), Arts = aplica efeito
// - Gera texto único para cada combinação (Carta x Método x (Elemento se houver) x Escolha x Momento)

(function () {
  const CARD = {
    quick: {
      label: "Quick",
      castLine: "Tempo de conjuração: 1 ação (consome 1 carta Quick)",
      reachLine: "Alcance: área na zona escolhida à vista",
      targetLine: "Alvos: múltiplas criaturas na área",
      damageLine: "Dano: 1d6 por alvo",
      roleLine: "Função: magia em área, acerta vários alvos.",
    },
    arts: {
      label: "Arts",
      castLine: "Tempo de conjuração: 1 ação (consome 1 carta Arts)",
      reachLine: "Alcance: à vista",
      targetLine: "Alvos: 1 criatura ou objeto",
      damageLine: "Dano: —",
      roleLine: "Função: aplica um efeito em um alvo.",
    },
    buster: {
      label: "Buster",
      castLine: "Tempo de conjuração: 1 ação (consome 1 carta Buster)",
      reachLine: "Alcance: à vista",
      targetLine: "Alvos: 1 criatura",
      damageLine: "Dano: 1d10",
      roleLine: "Função: ataque focado em um alvo.",
    },
  };

  const ELEMENTS = ["Fogo", "Terra", "Água", "Ar", "Raio", "Luz"];

  // Mantido para tabelas no site
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

  // Mantido para tabelas no site (6 faces, 2 escolhas cada)
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

  // Mantido para tabelas no site
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

  // ===== Texto “tático” (12 escolhas)
  const TACTIC = new Map([
    ["Segurança", "A execução é feita em um ângulo seguro. Durante esta conjuração, uma reação inimiga contra essa magia é ignorada."],
    ["Alcance", "Você estende o alcance prático do efeito. A magia alcança mais longe ou cobre mais espaço do que o normal para esse tipo de conjuração."],
    ["Precisão", "Você refina o encaixe da fórmula. Seus testes de acerto relacionados a esta magia recebem +1."],
    ["Velocidade", "Você acelera a conjuração. Você pode se antecipar a alguém que agiria antes, ou reagir em uma janela que normalmente não existiria."],
    ["Pressão", "Você impõe pressão arcana. A próxima ação do alvo acontece com desvantagem, quando fizer sentido na cena."],
    ["Controle", "Você cria uma condição leve: movimento dificultado, visão atrapalhada ou conjuração comprometida (coerente com a cena)."],
    ["Continuidade", "O efeito deixa um rastro estável. Quando fizer sentido, ele persiste por 1 turno adicional."],
    ["Explosão", "Você descarrega tudo de uma vez. O efeito acontece imediatamente e de forma concentrada, sem duração estendida."],
    ["Adaptação", "Você ajusta a lógica da magia no meio da execução, mudando o princípio de forma coerente com a cena."],
    ["Sinergia", "Você deixa a conjuração aberta para sequência. O próximo aliado que agir recebe um bônus contextual (a critério do mestre)."],
    ["Marca", "Você deixa uma marca no alvo. Em interações imediatas, aplicar efeitos nesse alvo se torna mais fácil."],
    ["Recuperação", "Ao finalizar a conjuração, você compra 1 carta adicional, respeitando o limite de 7 na mão."],
  ]);

  // ===== Texto “momento” (10 variações)
  const MOMENT = new Map([
    ["Eco", "Se esta magia acertar, você pode repetir o mesmo efeito contra outro alvo válido dentro da área/alcance."],
    ["Janela", "Você abre uma falha por um instante. Se o alvo errar a próxima ação, ele sofre 1d6 de dano adicional."],
    ["Quebra", "A magia mira o suporte do efeito. Uma proteção, buff ou preparação ativa do alvo pode ser removida."],
    ["Reação", "Você prepara uma segunda resposta. Se sua primeira reação falhar ao sofrer um ataque, você pode tentar reagir novamente."],
    ["Presságio", "Ao fim, você lê a próxima possibilidade: olhe a próxima carta do seu deck e decida manter ou trocar."],
    ["Ancoragem", "Você ancora o estilo usado. Até o próximo turno, esse mesmo estilo pode ser escolhido em vez de rolado."],
    ["Deslocamento", "A execução força reposicionamento. Você ou o alvo é deslocado de forma relevante e instantânea, coerente com a cena."],
    ["Amplificação Narrativa", "O efeito reverbera no ambiente (luz, ruído, impacto, distração). Isso concede vantagem situacional quando fizer sentido."],
    ["Combo", "Você deixa a magia em cadeia. Se no próximo turno usar uma carta diferente, ganha bônus de dano ou de efeito (a critério do mestre)."],
    ["Clímax", "Você força uma execução limpa. Você ignora desvantagens atuais na realização desta magia, desde que ainda seja possível conjurá-la."],
  ]);

  function shortMethodName(methodIndex, elementLabel) {
    if (methodIndex === 1) return `${elementLabel} (Elemental)`;
    return D8[methodIndex - 1].split(" (")[0];
  }

  // “Como a magia se comporta”, separado por carta e método, sem citar dados.
  function methodEffect(cardKey, methodIndex, elementLabel) {
    const c = cardKey;

    // 1) Elemental clássico
    if (methodIndex === 1) {
      const el = elementLabel || "Elemento";
      const elLower = el.toLowerCase();

      if (c === "quick") {
        return `Você cobre a zona com um fenômeno de ${elLower}. A área é varrida por um mesmo tipo de energia, causando o dano padrão da carta em cada alvo atingido.`;
      }
      if (c === "arts") {
        return `Você injeta ${elLower} no alvo para impor uma condição coerente com o elemento (queimadura, congelamento, choque, cegueira por clarão, etc.).`;
      }
      return `Você concentra ${elLower} em um único impacto direto, causando o dano padrão da carta em um alvo e deixando um efeito curto coerente com o elemento.`;
    }

    // 2) Alteração de propriedades físicas
    if (methodIndex === 2) {
      if (c === "quick") return "Você altera densidade, atrito e pressão na área. O terreno e o ar se tornam hostis ao movimento, e os alvos sofrem o dano padrão da carta ao serem atingidos pelo colapso físico local.";
      if (c === "arts")  return "Você altera uma propriedade física do alvo (densidade, atrito, dureza ou pressão), impondo uma limitação prática e coerente com a cena.";
      return "Você distorce as propriedades no instante do impacto. O ataque ignora parte da resistência no contato e causa o dano padrão da carta em um único alvo.";
    }

    // 3) Energia
    if (methodIndex === 3) {
      if (c === "quick") return "Você libera pulsos de energia pela área. Cada alvo atingido sofre o dano padrão da carta, com impacto que pode empurrar, queimar ou eletrificar de forma coerente com a cena.";
      if (c === "arts")  return "Você aplica um pulso de energia controlada para impor um efeito: paralisar, empurrar, atordoar leve ou desorganizar o corpo por um instante.";
      return "Você condensa energia pura e libera em um disparo curto e direto, causando o dano padrão da carta em um único alvo com impacto imediato.";
    }

    // 4) Interferência mágica
    if (methodIndex === 4) {
      if (c === "quick") return "Você espalha ruído arcano na área. Conjurações e preparações dentro da zona ficam instáveis, e os alvos atingidos sofrem o dano padrão da carta como retorno da distorção.";
      if (c === "arts")  return "Você injeta distorção na fórmula do alvo. Efeitos ativos ficam instáveis e manter magia pode se tornar mais difícil.";
      return "Você rompe o ponto de sustentação no impacto, causando o dano padrão da carta e abrindo espaço para quebrar uma proteção no momento certo.";
    }

    // 5) Materialização temporária
    if (methodIndex === 5) {
      if (c === "quick") return "Você cria estruturas efêmeras em pontos-chave (grades, estacas, paredes finas). Quem for atingido sofre o dano padrão da carta e pode ter rotas cortadas por um instante.";
      if (c === "arts")  return "Você materializa um objeto breve e preciso (grilhão, obstáculo, trava) junto ao alvo para restringir ou forçar uma resposta.";
      return "Você materializa um projétil ou lâmina efêmera no instante do ataque, causando o dano padrão da carta em um alvo com impacto concentrado.";
    }

    // 6) Ressonância
    if (methodIndex === 6) {
      if (c === "quick") return "Você dispara vibrações pela área. A estabilidade de postura e foco é abalada, e os alvos atingidos sofrem o dano padrão da carta como choque interno e tremor.";
      if (c === "arts")  return "Você sintoniza uma frequência no alvo, causando desalinho momentâneo: controle pior, foco quebrado ou sustentação enfraquecida.";
      return "Você cria ressonância no ponto de impacto, causando o dano padrão da carta como um choque interno curto e difícil de amortecer.";
    }

    // 7) Vetor
    if (methodIndex === 7) {
      if (c === "quick") return "Você altera vetores no campo. A área vira um lugar onde força e direção mudam de forma traiçoeira; os alvos atingidos sofrem o dano padrão da carta e podem ser empurrados ou desviados.";
      if (c === "arts")  return "Você muda o vetor do alvo, provocando reposicionamento, quebra de postura ou abertura de guarda.";
      return "Você converte o impacto em impulso bruto, causando o dano padrão da carta e deslocando o alvo de forma agressiva.";
    }

    // 8) Selo técnico
    if (methodIndex === 8) {
      if (c === "quick") return "Você espalha marcas técnicas no terreno. A área reage diferente a movimento e magia por um curto período; quem for atingido sofre o dano padrão da carta e pode acionar uma dessas ‘regras’ locais.";
      if (c === "arts")  return "Você grava um selo técnico no alvo, criando uma regra temporária que muda como ele reage a magia, deslocamento ou defesa.";
      return "Você crava um selo no impacto, causando o dano padrão da carta e deixando uma marca que altera a próxima interação do alvo.";
    }

    return "Você realiza um efeito coerente com a cena.";
  }

  // ====== Pré-geração de TODAS as combinações ======

  const SPELLBOOK = new Map();

  function keyOf(cardKey, methodIndex, elementLabel, tacticName, momentName) {
    const el = (methodIndex === 1) ? (elementLabel || "—") : "—";
    return `${cardKey}|${methodIndex}|${el}|${tacticName}|${momentName}`;
  }

  function buildSpell(cardKey, methodIndex, elementLabel, tacticName, momentName) {
    const card = CARD[cardKey];

    const title = `${card.label} — ${shortMethodName(methodIndex, elementLabel)} — ${tacticName} — ${momentName}`;

    const body = [
      card.roleLine,
      card.castLine,
      card.reachLine,
      card.targetLine,
      card.damageLine,
      "",
      "Efeito:",
      methodEffect(cardKey, methodIndex, elementLabel),
      "",
      "Ajuste:",
      (TACTIC.get(tacticName) || "Você obtém um ajuste coerente com a cena."),
      "",
      "Detalhe:",
      (MOMENT.get(momentName) || "O efeito ganha um detalhe especial coerente com a cena."),
    ].join("\n");

    return { summary: title, text: body };
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
      const tacticName = d6ChoiceName || "—";
      const el = (methodIndex === 1) ? (elementLabel || "—") : "—";

      const k = keyOf(cardKey, methodIndex, el, tacticName, momentName);
      const found = SPELLBOOK.get(k);

      if (!found) {
        const card = CARD[cardKey] || {
          label: "Carta",
          castLine: "Tempo de conjuração: 1 ação",
          reachLine: "Alcance: à vista",
          targetLine: "Alvos: conforme a carta",
          damageLine: "Dano: —",
          roleLine: "",
        };

        return {
          summary: `${card.label} — magia`,
          text: [
            card.roleLine,
            card.castLine,
            card.reachLine,
            card.targetLine,
            card.damageLine,
            "",
            "Efeito:",
            methodEffect(cardKey, methodIndex, elementLabel),
          ].filter(Boolean).join("\n"),
        };
      }

      return found;
    },
  };
})();
