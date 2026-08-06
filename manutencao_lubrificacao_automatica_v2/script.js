const USUARIO_PADRAO = "ELISON";
const SENHA_PADRAO = "123456";
const STORAGE_KEY = "historico_manutencao_lubrificacao_v2";

const checklistConfig = [
  {
    id: "vazamentoMangueiras",
    titulo: "Verificar vazamentos em mangueiras",
    perguntaDetalhe: "Descreva onde foi encontrado o vazamento ou a ação realizada."
  },
  {
    id: "vazamentoInjetores",
    titulo: "Verificar vazamentos em injetores",
    perguntaDetalhe: "Informe o ponto, injetor afetado e ação realizada."
  },
  {
    id: "funcionamentoPropulsora",
    titulo: "Verificar funcionamento da propulsora",
    perguntaDetalhe: "Descreva a falha ou observação no funcionamento."
  },
  {
    id: "pressaoPropulsora",
    titulo: "Verificar pressão da propulsora",
    perguntaDetalhe: "Informe a pressão encontrada e observações."
  },
  {
    id: "trocaInjetor",
    titulo: "Foi necessário trocar injetor?",
    perguntaDetalhe: "Se sim, explique o motivo da troca.",
    perguntaQuantidade: "Quantos injetores foram trocados?"
  },
  {
    id: "manutencaoPropulsora",
    titulo: "Foi preciso fazer manutenção na propulsora?",
    perguntaDetalhe: "Se sim, explique o motivo e o serviço realizado."
  },
  {
    id: "reabastecerReservatorio",
    titulo: "Reabastecer reservatório de graxa",
    perguntaDetalhe: "Informe quantidade, tipo de graxa ou observação."
  },
  {
    id: "trocaPropulsora",
    titulo: "Houve necessidade de trocar a propulsora?",
    perguntaDetalhe: "Se sim, informe o motivo da troca."
  }
];

let relatorioAtual = null;

const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const checklistForm = document.getElementById("checklistForm");
const checklistItems = document.getElementById("checklistItems");
const historicoEl = document.getElementById("historico");
const filtroTag = document.getElementById("filtroTag");
const relatorioSection = document.getElementById("relatorioSection");
const relatorioEl = document.getElementById("relatorio");

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("data").valueAsDate = new Date();
  montarChecklist();
  renderizarHistorico();
  atualizarDashboard();

  if (sessionStorage.getItem("logadoLubrificacao") === "sim") {
    mostrarApp();
  }
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const login = document.getElementById("login").value.trim().toUpperCase();
  const senha = document.getElementById("senha").value.trim();

  if (login === USUARIO_PADRAO && senha === SENHA_PADRAO) {
    sessionStorage.setItem("logadoLubrificacao", "sim");
    loginError.textContent = "";
    mostrarApp();
  } else {
    loginError.textContent = "Login ou senha inválidos.";
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("logadoLubrificacao");
  app.classList.add("hidden");
  loginScreen.classList.remove("hidden");
});

document.getElementById("limparForm").addEventListener("click", () => {
  checklistForm.reset();
  document.getElementById("data").valueAsDate = new Date();
  atualizarCamposCondicionais();
});

document.getElementById("imprimirRelatorio").addEventListener("click", () => window.print());
document.getElementById("fecharRelatorio").addEventListener("click", () => relatorioSection.classList.add("hidden"));
document.getElementById("exportarCSV").addEventListener("click", exportarCSV);
document.getElementById("copiarRelatorio").addEventListener("click", copiarRelatorio);
document.getElementById("whatsappRelatorio").addEventListener("click", enviarWhatsApp);
filtroTag.addEventListener("input", renderizarHistorico);

checklistForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const dados = coletarDadosFormulario();
  const historico = carregarHistorico();
  historico.unshift(dados);
  salvarHistorico(historico);

  gerarRelatorio(dados);
  checklistForm.reset();
  document.getElementById("data").valueAsDate = new Date();
  atualizarCamposCondicionais();
  renderizarHistorico();
  atualizarDashboard();

  relatorioSection.classList.remove("hidden");
  relatorioSection.scrollIntoView({ behavior: "smooth" });
  toast("Manutenção finalizada e relatório gerado.");
});

function mostrarApp() {
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
}

function montarChecklist() {
  checklistItems.innerHTML = "";

  checklistConfig.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-title">${String(index + 1).padStart(2, "0")} · ${item.titulo}</div>

      <div class="options">
        <label>
          <input type="radio" name="${item.id}_status" value="OK" required>
          OK
        </label>
        <label>
          <input type="radio" name="${item.id}_status" value="SIM">
          SIM / Houve intervenção
        </label>
        <label>
          <input type="radio" name="${item.id}_status" value="NÃO">
          NÃO
        </label>
      </div>

      ${item.perguntaQuantidade ? `
        <input class="campo-condicional quantidade" type="number" min="0" id="${item.id}_quantidade" placeholder="${item.perguntaQuantidade}" disabled>
      ` : ""}

      <textarea class="campo-condicional detalhe" id="${item.id}_detalhe" rows="3" placeholder="${item.perguntaDetalhe}" disabled></textarea>
    `;
    checklistItems.appendChild(div);
  });

  document.querySelectorAll("input[type='radio']").forEach((radio) => {
    radio.addEventListener("change", atualizarCamposCondicionais);
  });
}

function atualizarCamposCondicionais() {
  checklistConfig.forEach((item) => {
    const status = document.querySelector(`input[name="${item.id}_status"]:checked`)?.value;
    const detalhe = document.getElementById(`${item.id}_detalhe`);
    const quantidade = document.getElementById(`${item.id}_quantidade`);

    const precisaDetalhe = status === "SIM";
    if (detalhe) {
      detalhe.disabled = !precisaDetalhe;
      detalhe.required = precisaDetalhe;
      if (!precisaDetalhe) detalhe.value = "";
    }

    if (quantidade) {
      quantidade.disabled = !precisaDetalhe;
      quantidade.required = precisaDetalhe;
      if (!precisaDetalhe) quantidade.value = "";
    }
  });
}

function coletarDadosFormulario() {
  const checklist = checklistConfig.map((item) => {
    const status = document.querySelector(`input[name="${item.id}_status"]:checked`).value;
    const detalhe = document.getElementById(`${item.id}_detalhe`)?.value.trim() || "";
    const quantidade = document.getElementById(`${item.id}_quantidade`)?.value || "";

    return {
      titulo: item.titulo,
      status,
      detalhe: detalhe || (status === "OK" || status === "NÃO" ? "OK" : ""),
      quantidade
    };
  });

  const tag = document.getElementById("tagEquipamento").value.trim().toUpperCase();
  const data = document.getElementById("data").value;
  const horaInicial = document.getElementById("horaInicial").value;
  const horaFim = document.getElementById("horaFim").value;

  return {
    id: Date.now(),
    codigoRelatorio: gerarCodigo(tag),
    tagEquipamento: tag,
    horimetro: document.getElementById("horimetro").value,
    data,
    horaInicial,
    horaFim,
    duracao: calcularDuracao(horaInicial, horaFim),
    nomeLubrificador: document.getElementById("nomeLubrificador").value.trim(),
    matricula: document.getElementById("matricula").value.trim(),
    checklist,
    criadoEm: new Date().toLocaleString("pt-BR")
  };
}

function carregarHistorico() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function salvarHistorico(historico) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(historico));
}

function renderizarHistorico() {
  const filtro = filtroTag.value.trim().toUpperCase();
  const historico = carregarHistorico().filter((item) => item.tagEquipamento.includes(filtro));

  if (historico.length === 0) {
    historicoEl.innerHTML = `<p class="empty">Nenhum histórico encontrado.</p>`;
    return;
  }

  historicoEl.innerHTML = historico.map((item) => {
    const ocorrencias = contarOcorrencias(item);
    return `
      <div class="history-card">
        <h4>${item.tagEquipamento}</h4>
        <p><strong>Relatório:</strong> ${item.codigoRelatorio || item.id}</p>
        <p><strong>Data:</strong> ${formatarData(item.data)} | <strong>Horímetro:</strong> ${item.horimetro}</p>
        <p><strong>Lubrificador:</strong> ${item.nomeLubrificador} | <strong>Matrícula:</strong> ${item.matricula}</p>
        <p><strong>Horário:</strong> ${item.horaInicial} às ${item.horaFim} ${item.duracao ? `| <strong>Duração:</strong> ${item.duracao}` : ""}</p>
        <p><strong>Ocorrências:</strong> ${ocorrencias}</p>
        <div class="history-actions">
          <button class="btn btn-soft" onclick="abrirRelatorio(${item.id})">Ver relatório</button>
          <button class="btn btn-whatsapp" onclick="abrirRelatorioWhatsApp(${item.id})">WhatsApp</button>
          <button class="btn btn-dark" onclick="excluirRegistro(${item.id})">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
}

function abrirRelatorio(id) {
  const item = carregarHistorico().find((registro) => registro.id === id);
  if (!item) return;
  gerarRelatorio(item);
  relatorioSection.classList.remove("hidden");
  relatorioSection.scrollIntoView({ behavior: "smooth" });
}

function abrirRelatorioWhatsApp(id) {
  abrirRelatorio(id);
  enviarWhatsApp();
}

function excluirRegistro(id) {
  const confirmar = confirm("Deseja realmente excluir este registro de manutenção?");
  if (!confirmar) return;

  const historico = carregarHistorico().filter((item) => item.id !== id);
  salvarHistorico(historico);
  renderizarHistorico();
  atualizarDashboard();
  toast("Registro excluído.");
}

function gerarRelatorio(dados) {
  relatorioAtual = dados;

  const linhasChecklist = dados.checklist.map((item, index) => {
    const classe = item.status === "OK" ? "ok" : item.status === "SIM" ? "alerta" : "nao";
    return `
      <tr>
        <td>${String(index + 1).padStart(2, "0")}</td>
        <td>${item.titulo}</td>
        <td><span class="badge ${classe}">${item.status}</span></td>
        <td>${item.quantidade || "-"}</td>
        <td>${item.detalhe || "OK"}</td>
      </tr>
    `;
  }).join("");

  relatorioEl.innerHTML = `
    <div class="report-header">
      <div>
        <span class="system-label">Relatório Técnico</span>
        <h2>Manutenção Corretiva de Lubrificação Automática</h2>
        <p>Documento de registro operacional e rastreabilidade por equipamento.</p>
      </div>
      <div class="report-code">
        <strong>Código:</strong><br>
        ${dados.codigoRelatorio || dados.id}<br><br>
        <strong>Gerado em:</strong><br>
        ${dados.criadoEm}
      </div>
    </div>

    <div class="report-grid">
      <div class="report-info"><span>TAG do Equipamento</span><strong>${dados.tagEquipamento}</strong></div>
      <div class="report-info"><span>Horímetro</span><strong>${dados.horimetro}</strong></div>
      <div class="report-info"><span>Data</span><strong>${formatarData(dados.data)}</strong></div>
      <div class="report-info"><span>Duração</span><strong>${dados.duracao || "-"}</strong></div>
      <div class="report-info"><span>Hora Inicial</span><strong>${dados.horaInicial}</strong></div>
      <div class="report-info"><span>Hora Final</span><strong>${dados.horaFim}</strong></div>
      <div class="report-info"><span>Lubrificador</span><strong>${dados.nomeLubrificador}</strong></div>
      <div class="report-info"><span>Matrícula</span><strong>${dados.matricula}</strong></div>
    </div>

    <h3>Checklist realizado</h3>
    <table>
      <thead>
        <tr>
          <th>Nº</th>
          <th>Item verificado</th>
          <th>Status</th>
          <th>Quantidade</th>
          <th>Observação / Motivo</th>
        </tr>
      </thead>
      <tbody>${linhasChecklist}</tbody>
    </table>

    <br><br>
    <p><strong>Assinatura do Lubrificador:</strong> ________________________________________________</p>
    <p><strong>Assinatura do Responsável:</strong> _________________________________________________</p>
  `;
}

function gerarMensagemWhatsApp(dados) {
  const ocorrencias = dados.checklist.filter((item) => item.status === "SIM");
  const resumoChecklist = dados.checklist.map((item, index) => {
    let linha = `${index + 1}. ${item.titulo}: ${item.status}`;
    if (item.quantidade) linha += ` | Qtd: ${item.quantidade}`;
    if (item.detalhe && item.detalhe !== "OK") linha += ` | Obs: ${item.detalhe}`;
    return linha;
  }).join("\n");

  const resumoOcorrencias = ocorrencias.length
    ? ocorrencias.map((item) => `- ${item.titulo}: ${item.detalhe || "Sem detalhe"}${item.quantidade ? ` | Qtd: ${item.quantidade}` : ""}`).join("\n")
    : "Sem ocorrências registradas. Checklist concluído como OK.";

  return `*RELATÓRIO DE MANUTENÇÃO CORRETIVA*
*Sistema:* Lubrificação Automática
*Código:* ${dados.codigoRelatorio || dados.id}

*DADOS DO EQUIPAMENTO*
TAG: ${dados.tagEquipamento}
Horímetro: ${dados.horimetro}
Data: ${formatarData(dados.data)}
Horário: ${dados.horaInicial} às ${dados.horaFim}
Duração: ${dados.duracao || "-"}

*EXECUTANTE*
Lubrificador: ${dados.nomeLubrificador}
Matrícula: ${dados.matricula}

*RESUMO DE OCORRÊNCIAS*
${resumoOcorrencias}

*CHECKLIST COMPLETO*
${resumoChecklist}

Relatório gerado em: ${dados.criadoEm}`;
}

function enviarWhatsApp() {
  if (!relatorioAtual) {
    alert("Nenhum relatório selecionado.");
    return;
  }

  const mensagem = gerarMensagemWhatsApp(relatorioAtual);
  const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
}

async function copiarRelatorio() {
  if (!relatorioAtual) {
    alert("Nenhum relatório selecionado.");
    return;
  }

  const mensagem = gerarMensagemWhatsApp(relatorioAtual);

  try {
    await navigator.clipboard.writeText(mensagem);
    toast("Texto do relatório copiado.");
  } catch (error) {
    const area = document.createElement("textarea");
    area.value = mensagem;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    toast("Texto do relatório copiado.");
  }
}

function atualizarDashboard() {
  const historico = carregarHistorico();
  const tagsUnicas = new Set(historico.map((item) => item.tagEquipamento));
  const totalOcorrencias = historico.reduce((total, item) => total + contarOcorrencias(item), 0);

  document.getElementById("totalManutencoes").textContent = historico.length;
  document.getElementById("totalEquipamentos").textContent = tagsUnicas.size;
  document.getElementById("totalOcorrencias").textContent = totalOcorrencias;
  document.getElementById("ultimoRegistro").textContent = historico[0]
    ? `${historico[0].tagEquipamento} - ${formatarData(historico[0].data)}`
    : "--";
}

function exportarCSV() {
  const historico = carregarHistorico();
  if (historico.length === 0) {
    alert("Não há registros para exportar.");
    return;
  }

  const linhas = [[
    "Codigo Relatorio",
    "TAG",
    "Horimetro",
    "Data",
    "Hora Inicial",
    "Hora Fim",
    "Duracao",
    "Lubrificador",
    "Matricula",
    "Item Checklist",
    "Status",
    "Quantidade",
    "Observacao"
  ]];

  historico.forEach((registro) => {
    registro.checklist.forEach((item) => {
      linhas.push([
        registro.codigoRelatorio || registro.id,
        registro.tagEquipamento,
        registro.horimetro,
        formatarData(registro.data),
        registro.horaInicial,
        registro.horaFim,
        registro.duracao || "",
        registro.nomeLubrificador,
        registro.matricula,
        item.titulo,
        item.status,
        item.quantidade || "",
        item.detalhe || ""
      ]);
    });
  });

  const csv = linhas
    .map((linha) => linha.map((campo) => `"${String(campo).replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  baixarArquivo("historico_manutencao_lubrificacao.csv", "\ufeff" + csv, "text/csv;charset=utf-8;");
}

function baixarArquivo(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

function formatarData(dataISO) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function calcularDuracao(inicio, fim) {
  if (!inicio || !fim) return "";

  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fim.split(":").map(Number);

  let minutosInicio = hi * 60 + mi;
  let minutosFim = hf * 60 + mf;

  if (minutosFim < minutosInicio) minutosFim += 24 * 60;

  const total = minutosFim - minutosInicio;
  const horas = Math.floor(total / 60);
  const minutos = total % 60;

  if (horas === 0) return `${minutos}min`;
  return `${horas}h ${String(minutos).padStart(2, "0")}min`;
}

function contarOcorrencias(registro) {
  return registro.checklist.filter((item) => item.status === "SIM").length;
}

function gerarCodigo(tag) {
  const agora = new Date();
  const data = agora.toISOString().slice(0, 10).replaceAll("-", "");
  const hora = String(agora.getHours()).padStart(2, "0") + String(agora.getMinutes()).padStart(2, "0");
  return `REL-${tag}-${data}-${hora}`;
}

function toast(mensagem) {
  const antigo = document.querySelector(".toast");
  if (antigo) antigo.remove();

  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = mensagem;
  document.body.appendChild(div);

  setTimeout(() => div.remove(), 2800);
}
