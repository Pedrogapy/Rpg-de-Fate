/* magia.js
 * Gera uma descrição temática a partir de:
 * - Carta (Quick/Arts/Buster)
 * - d8 (método) (+ elemento opcional)
 * - escolha do d6 (uma das duas opções do número)
 * - d10 (momento de destaque)
 *
 * Não resolve acerto/falha e não substitui o mestre.
 */

(function () {
  const CARD = {
    quick: {
      label: "Quick",
      icon: "assets/card_quick.svg",
      desc: "Quick foca em vários alvos (magia em área)."
    },
    arts: {
      label: "Arts",
      icon: "assets/card_arts.svg",
      desc: "Arts causa um efeito em um alvo."
    },
    buster: {
      label: "Buster",
      icon: "assets/card_buster.svg",
      desc: "Buster foca em um inimigo (um alvo)."
    }
  };

  const ELEMENTS = ["Fogo", "Terra", "Água", "Ar", "Raio", "Luz"];

  const D8 = [
    "Elemental clássico",
    "Alteração de propriedades físicas (densidade, atrito, dureza, pressão)",
    "Energia (calor, cinética, elétrica como energia pura)",
    "Interferência mágica (ruído, distorção, quebra de fórmulas)",
    "Materialização temporária (criação breve de objetos ou estruturas)",
    "Ressonância (vibração, frequência, desestabilização interna)",
    "Vetor (direcionamento, impulso, redirecionamento de força)",
    "Selo técnico (marca arcana que altera interações futuras)"
  ];

  const D10 = [
    { name: "Eco", desc: "Se a magia acertar, o ataque se repete em outro alvo válido" },
    { name: "Janela", desc: "Se o alvo errar a próxima ação, sofre 1d6 de dano" },
    { name: "Quebra", desc: "Remove uma proteção, buff ou preparação ativa do alvo" },
    { name: "Reação", desc: "Você pode realizar uma reação novamente caso sofra um ataque e sua primeira tentativa de reação tenha falhado" },
    { name: "Presságio", desc: "Olhe a próxima carta do seu deck e decida manter ou trocar" },
    { name: "Ancoragem", desc: "Até o próximo turno, efeitos do mesmo método (d8)  serão escolhidos" },
    { name: "Deslocamento", desc: "Você ou o alvo muda de posição de forma relevante e instantanea" },
    { name: "Amplificação Narrativa", desc: "O efeito causa impacto ambiental ou narrativo útil (concede vantagem)" },
    { name: "Combo", desc: "Se usar uma carta diferente no próximo turno, ganha bônus de dano ou efeito" },
    { name: "Clímax", desc: "Ignora todas as desvantagens atuais pra realização de uma magia eficaz" }
  ];

  const D6 = [
    { pair: ["Segurança", "Alcance"], A: "Segurança: você ignora uma reação inimiga", B: "Alcance: você pode estender o efeito/ quantidade de alvos atingidos alem do permitido pela carta" },
    { pair: ["Precisão", "Velocidade"], A: "Precisão: bônus no teste de acerto (+1 alem do atual)", B: "Velocidade: você pode agir antes de alguém que normalmente agiria antes (serve pra reação (vantagem nesse caso))" },
    { pair: ["Pressão", "Controle"], A: "Pressão: impõe desvantagem na próxima ação do alvo", B: "Controle: cria uma condição leve (dificulta movimento, visão, conjuração)" },
    { pair: ["Continuidade", "Explosão"], A: "Continuidade: efeito persiste um turno extra", B: "Explosão: efeito acontece todo de uma vez" },
    { pair: ["Adaptação", "Sinergia"], A: "Adaptação: você pode reinterpretar o resultado do d8 de forma coerente", B: "Sinergia: concede bônus para o próximo aliado que agir" },
    { pair: ["Marca", "Recuperação"], A: "Marca: alvo fica marcado para aplicar efeitos sem ter que acertar o alvo em si", B: "Recuperação: você compra 1 carta adicional (respeitando o limite de 7)" }
  ];

  function baseTargets(cardKey) {
    if (cardKey === "quick") return "vários alvos (área)";
    if (cardKey === "arts") return "1 alvo (efeito)";
    return "1 alvo (ataque)";
  }

  function methodBlurb(cardKey, methodIndex, elementLabel) {
    const m = D8[methodIndex - 1] || "—";
    const e = elementLabel ? ` (${elementLabel})` : "";
    if (methodIndex === 1) {
      if (cardKey === "quick") return `Elemental clássico${e} em área, espalhando o elemento pela zona do combate.`;
      if (cardKey === "arts") return `Elemental clássico${e} aplicado como efeito em um alvo, com assinatura bem clara.`;
      return `Elemental clássico${e} concentrado em um único impacto contra um alvo.`;
    }
    if (cardKey === "quick") return `${m} aplicado em área, priorizando pressão e controle do espaço.`;
    if (cardKey === "arts") return `${m} aplicado em um alvo para gerar condição, interrupção ou vantagem.`;
    return `${m} concentrado em um único ataque direto.`;
  }

  function d6Blurb(choiceName) {
    const map = {
      "Segurança": "Você ignora uma reação inimiga.",
      "Alcance": "Você estende o efeito/quantidade de alvos além do permitido pela carta.",
      "Precisão": "Bônus no teste de acerto (+1 além do atual).",
      "Velocidade": "Você pode agir antes de alguém que normalmente agiria antes.",
      "Pressão": "Impõe desvantagem na próxima ação do alvo.",
      "Controle": "Cria uma condição leve (dificulta movimento, visão, conjuração).",
      "Continuidade": "Efeito persiste um turno extra.",
      "Explosão": "Efeito acontece todo de uma vez.",
      "Adaptação": "Você pode reinterpretar o resultado do d8 de forma coerente.",
      "Sinergia": "Concede bônus para o próximo aliado que agir.",
      "Marca": "Alvo fica marcado para aplicar efeitos sem ter que acertar o alvo em si.",
      "Recuperação": "Você compra 1 carta adicional (respeitando o limite de 7)."
    };
    return map[choiceName] || "—";
  }

  function d10Blurb(d10Index) {
    const o = D10[d10Index - 1];
    if (!o) return "—";
    return `${o.name}: ${o.desc}`;
  }

  function generate({ cardKey, methodIndex, elementLabel, d6ChoiceName, d10Index }) {
    const card = CARD[cardKey];
    const methodText = D8[methodIndex - 1] || "—";
    const d10 = D10[d10Index - 1] || { name: "—", desc: "—" };

    const summary =
      `Carta: ${card.label} | Alvo base: ${baseTargets(cardKey)} | Método: ${methodText}` +
      (methodIndex === 1 && elementLabel ? ` | Elemento: ${elementLabel}` : "") +
      ` | d6: ${d6ChoiceName} | d10: ${d10.name}`;

    const text =
      `Sebastian usa ${card.label}. ${card.desc} ` +
      `Método (d8): ${methodBlurb(cardKey, methodIndex, elementLabel)} ` +
      `Escolha tática (d6): ${d6ChoiceName} — ${d6Blurb(d6ChoiceName)} ` +
      `Momento (d10): ${d10Blurb(d10Index)} ` +
      `O Volumen em forma de dois lobos mantém a presença ao lado dele, e o fluxo circular nos braços permite o ajuste fino do efeito sem contato direto.`;

    return { summary, text };
  }

  window.Magia = { CARD, D8, D6, D10, ELEMENTS, generate };
})();
