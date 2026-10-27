
const $ = id => document.getElementById(id);

const DIAS = [
  "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"
];

const CHAVE_TAREFAS = "studyflow_tarefas_v1";
const CHAVE_MATERIAS = "studyflow_materias_v1";

function ler(chave, padrao) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : padrao;
  } catch {
    return padrao;
  }
}

let tarefas = ler(CHAVE_TAREFAS, []);
let materias = ler(CHAVE_MATERIAS, [
  "Matemática", "Português", "História",
  "Geografia", "Biologia"
]);

function salvarDados() {
  localStorage.setItem(CHAVE_TAREFAS, JSON.stringify(tarefas));
  localStorage.setItem(CHAVE_MATERIAS, JSON.stringify(materias));
}

function escapar(valor = "") {
  return String(valor).replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}

function classe(valor) {
  return {
    "Baixa": "baixa",
    "Média": "media",
    "Alta": "alta"
  }[valor] || "status";
}

function dataHoje() {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 10);
}

function numeroSemana(data) {
  const d = new Date(data + "T12:00:00");
  const inicioAno = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - inicioAno) / 86400000) +
    inicioAno.getDay() + 1) / 7);
}

function atualizarDia() {
  if (!$("data").value) return;
  const data = new Date($("data").value + "T12:00:00");
  const indice = (data.getDay() + 6) % 7;
  $("dia").value = DIAS[indice];
  $("semana").value = numeroSemana($("data").value);
}

function renderMaterias() {
  const atual = $("materia").value;
  const filtro = $("filtroMateria").value;

  $("materia").innerHTML =
    '<option value="">Selecione uma matéria</option>' +
    materias.map(m =>
      `<option value="${escapar(m)}">${escapar(m)}</option>`
    ).join("");

  $("filtroMateria").innerHTML =
    '<option value="">Todas as matérias</option>' +
    materias.map(m =>
      `<option value="${escapar(m)}">${escapar(m)}</option>`
    ).join("");

  if (materias.includes(atual)) $("materia").value = atual;
  if (materias.includes(filtro)) $("filtroMateria").value = filtro;

  $("listaMaterias").innerHTML = materias.map(m => `
    <span class="chip">
      ${escapar(m)}
      <button type="button" data-remover-materia="${escapar(m)}"
        aria-label="Remover ${escapar(m)}">×</button>
    </span>
  `).join("") || '<p class="muted">Nenhuma matéria cadastrada.</p>';
}

function renderResumo() {
  const total = tarefas.length;
  const concluidas = tarefas.filter(t => t.status === "Concluída").length;
  const pendentes = tarefas.filter(t => t.status !== "Concluída").length;
  const progresso = total ? Math.round(concluidas / total * 100) : 0;

  $("total").textContent = total;
  $("concluidas").textContent = concluidas;
  $("pendentes").textContent = pendentes;
  $("percentual").textContent = progresso + "%";
  $("barra").style.width = progresso + "%";
}

function renderTabela() {
  const busca = $("busca").value.trim().toLowerCase();
  const materia = $("filtroMateria").value;
  const dia = $("filtroDia").value;
  const prioridade = $("filtroPrioridade").value;
  const status = $("filtroStatus").value;
  const semana = $("filtroSemana").value;

  const filtradas = tarefas
    .filter(t =>
      (!busca || (t.titulo + " " + t.observacoes)
        .toLowerCase().includes(busca)) &&
      (!materia || t.materia === materia) &&
      (!dia || t.dia === dia) &&
      (!prioridade || t.prioridade === prioridade) &&
      (!status || t.status === status) &&
      (!semana || String(t.semana) === semana)
    )
    .sort((a, b) =>
      (a.data || "").localeCompare(b.data || "") ||
      ({Alta: 0, Média: 1, Baixa: 2}[a.prioridade] -
       {Alta: 0, Média: 1, Baixa: 2}[b.prioridade])
    );

  $("tabelaTarefas").innerHTML = filtradas.length
    ? filtradas.map(t => `
      <tr>
        <td><strong>${escapar(t.titulo)}</strong></td>
        <td>${escapar(t.materia)}</td>
        <td>${escapar(t.dia)}<br>
          <span class="muted">${escapar(t.data)}</span></td>
        <td>${escapar(t.semana)}</td>
        <td><span class="tag ${classe(t.prioridade)}">
          ${escapar(t.prioridade)}</span></td>
        <td><span class="tag ${classe(t.nota)}">
          ${escapar(t.nota)}</span></td>
        <td><span class="tag status">${escapar(t.status)}</span></td>
        <td>${escapar(t.observacoes || "—")}</td>
        <td><div class="row-actions">
          <button type="button" data-editar="${t.id}">Editar</button>
          <button type="button" class="delete"
            data-excluir="${t.id}">Excluir</button>
        </div></td>
      </tr>
    `).join("")
    : '<tr><td colspan="9" class="empty">Nenhuma tarefa encontrada.</td></tr>';

  $("contador").textContent =
    `${filtradas.length} de ${tarefas.length} tarefa(s) exibida(s).`;

  renderResumo();
}

function render() {
  renderMaterias();
  renderTabela();
}

function limparFormulario() {
  $("formTarefa").reset();
  $("editId").value = "";
  $("data").value = dataHoje();
  atualizarDia();
  $("salvarBtn").textContent = "Salvar tarefa";
}

$("data").addEventListener("change", atualizarDia);

$("formTarefa").addEventListener("submit", evento => {
  evento.preventDefault();

  if (!materias.includes($("materia").value)) {
    alert("Cadastre ou selecione uma matéria válida.");
    return;
  }

  const idExistente = $("editId").value;
  const anterior = tarefas.find(t => t.id === idExistente);

  const tarefa = {
    id: idExistente || (crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random()),
    titulo: $("titulo").value.trim(),
    materia: $("materia").value,
    dia: $("dia").value,
    data: $("data").value,
    semana: $("semana").value || numeroSemana($("data").value),
    prioridade: $("prioridade").value,
    nota: $("nota").value,
    status: $("status").value,
    observacoes: $("observacoes").value.trim(),
    criadaEm: anterior?.criadaEm || new Date().toISOString()
  };

  if (!tarefa.titulo || !tarefa.data) {
    alert("Preencha o nome e a data da tarefa.");
    return;
  }

  if (anterior) {
    tarefas = tarefas.map(t => t.id === idExistente ? tarefa : t);
  } else {
    tarefas.push(tarefa);
  }

  salvarDados();
  limparFormulario();
  render();
});

$("novoBtn").addEventListener("click", () => {
  limparFormulario();
  $("cadastro").scrollIntoView({behavior: "smooth"});
  $("titulo").focus();
});

$("cancelarBtn").addEventListener("click", limparFormulario);

$("formMateria").addEventListener("submit", evento => {
  evento.preventDefault();
  const nome = $("novaMateria").value.trim();

  if (!nome) return;

  if (materias.some(m => m.toLowerCase() === nome.toLowerCase())) {
    alert("Essa matéria já está cadastrada.");
    return;
  }

  materias.push(nome);
  materias.sort((a, b) => a.localeCompare(b, "pt-BR"));
  $("novaMateria").value = "";
  salvarDados();
  render();
});

$("listaMaterias").addEventListener("click", evento => {
  const botao = evento.target.closest("[data-remover-materia]");
  if (!botao) return;

  const nome = botao.dataset.removerMateria;
  if (tarefas.some(t => t.materia === nome)) {
    alert("Essa matéria está sendo usada em tarefas. Exclua ou altere essas tarefas primeiro.");
    return;
  }

  if (!confirm(`Deseja excluir a matéria "${nome}"?`)) return;
  materias = materias.filter(m => m !== nome);
  salvarDados();
  render();
});

$("tabelaTarefas").addEventListener("click", evento => {
  const editar = evento.target.closest("[data-editar]");
  const excluir = evento.target.closest("[data-excluir]");

  if (editar) {
    const t = tarefas.find(item => item.id === editar.dataset.editar);
    if (!t) return;

    $("editId").value = t.id;
    $("titulo").value = t.titulo;
    $("materia").value = t.materia;
    $("dia").value = t.dia;
    $("data").value = t.data;
    $("semana").value = t.semana;
    $("prioridade").value = t.prioridade;
    $("nota").value = t.nota;
    $("status").value = t.status;
    $("observacoes").value = t.observacoes;
    $("salvarBtn").textContent = "Atualizar tarefa";
    $("cadastro").scrollIntoView({behavior: "smooth"});
  }

  if (excluir) {
    const id = excluir.dataset.excluir;
    if (!confirm("Deseja realmente excluir esta tarefa?")) return;
    tarefas = tarefas.filter(t => t.id !== id);
    salvarDados();
    render();
  }
});

[
  "busca", "filtroMateria", "filtroDia",
  "filtroPrioridade", "filtroStatus", "filtroSemana"
].forEach(id => {
  $(id).addEventListener("input", renderTabela);
  $(id).addEventListener("change", renderTabela);
});

$("limparFiltros").addEventListener("click", () => {
  $("busca").value = "";
  $("filtroMateria").value = "";
  $("filtroDia").value = "";
  $("filtroPrioridade").value = "";
  $("filtroStatus").value = "";
  $("filtroSemana").value = "";
  renderTabela();
});

limparFormulario();
render();
