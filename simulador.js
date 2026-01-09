const maoEl = document.getElementById("mao");
const slotsEl = document.getElementById("slots");
const listaTecnicasEl = document.getElementById("listaTecnicas");
const cartas = ["Buster", "Quick", "Arts"];
let mao = [];
let sequencia = [];

function novaMao() {
  mao = [];
  for (let i = 0; i < parseInt(document.getElementById("limite").value); i++) {
    mao.push(cartas[Math.floor(Math.random() * cartas.length)]);
  }
  renderMao();
}
function renderMao() {
  maoEl.innerHTML = "";
  mao.forEach((tipo, i) => {
    const div = document.createElement("div");
    div.className = `carta ${tipo.toLowerCase()}`;
    div.textContent = tipo;
    div.onclick = () => addCarta(i);
    maoEl.appendChild(div);
  });
}
function addCarta(index) {
  if (sequencia.length >= 3) return;
  sequencia.push(mao[index]);
  mao.splice(index, 1);
  renderMao();
  renderSeq();
  mostrarTecnica();
}
function renderSeq() {
  slotsEl.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const slot = document.createElement("div");
    slot.className = "carta";
    slot.textContent = sequencia[i] || "—";
    slot.onclick = () => removerCarta(i);
    slotsEl.appendChild(slot);
  }
}
function removerCarta(i) {
  if (!sequencia[i]) return;
  mao.push(sequencia[i]);
  sequencia.splice(i, 1);
  renderMao();
  renderSeq();
  mostrarTecnica();
}
document.getElementById("novoTurno").onclick = novaMao;
document.getElementById("reset").onclick = () => {
  mao = [];
  sequencia = [];
  renderMao();
  renderSeq();
  listaTecnicasEl.innerHTML = "";
};
document.getElementById("limparSeq").onclick = () => {
  sequencia = [];
  renderSeq();
  mostrarTecnica();
};

// banco de técnicas
const tecnicas = {
  "Buster": {
    nome: "Tiro de Compressão",
    desc: "Disparo concentrado de pressão rúnica. Curto alcance, dano direto (1d10)."
  },
  "Quick": {
    nome: "Pulso Dispersivo",
    desc: "Onda curta de pressão rúnica. Empurra múltiplos inimigos (1d6 por alvo)."
  },
  "Arts": {
    nome: "Marca de Pressão",
    desc: "Cria um selo mágico que altera o comportamento da pressão em um ponto da cena."
  },
  "Quick-Buster": {
    nome: "Quebra de Postura",
    desc: "A varredura empurra inimigos, abrindo espaço para um tiro rúnico preciso."
  },
  "Arts-Buster": {
    nome: "Disparo Guiado",
    desc: "O selo define o ponto de impacto, tornando o disparo mais preciso e inevitável."
  },
  "Quick-Arts": {
    nome: "Campo de Compressão",
    desc: "A pressão é canalizada em uma área instável, restringindo movimentação e conjuração."
  },
  "Buster-Buster": {
    nome: "Linha de Execução",
    desc: "Dois disparos sequenciais; o segundo explora a defesa rompida do primeiro."
  },
  "Quick-Buster-Buster": {
    nome: "Execução de Pressão",
    desc: "Uma varredura desorganiza o alvo e Sebastian o finaliza com dois disparos em sequência."
  }
};

function mostrarTecnica() {
  listaTecnicasEl.innerHTML = "";
  const chave = sequencia.join("-");
  const t = tecnicas[chave] || tecnicas[sequencia[0]];
  if (!t) return;
  const div = document.createElement("div");
  div.className = "tecnica";
  div.innerHTML = `<h3>${t.nome}</h3><p>${t.desc}</p>`;
  listaTecnicasEl.appendChild(div);
}
