"use strict";

/* ============================================================
   CONFIGURAÇÕES PADRÃO
============================================================ */
const CFG_DEFAULT = {
  nome:   "Biblioteca Escolar",
  escola: "",
  prazo:  14,
  multa:  0.5,
  limite: 3
};

/* ============================================================
   ESTADO
============================================================ */
let livros      = parse("livros")      || [];
let alunos      = parse("alunos")      || [];
let emprestimos = parse("emprestimos") || [];
let reservas    = parse("reservas")    || [];
let atividades  = parse("atividades")  || [];
let notificacoes = parse("notificacoes") || [];
let cfg         = { ...CFG_DEFAULT, ...parse("config") };
let telaAtual   = "dashboard";
let filtroEmpAtual = "ativos";
let chartCat, chartStatus;

function parse(k) {
  try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
}

/* ============================================================
   PERSISTÊNCIA
============================================================ */
function salvar() {
  const store = { livros, alunos, emprestimos, reservas, atividades, notificacoes, config: cfg };
  for (const [k, v] of Object.entries(store))
    localStorage.setItem(k, JSON.stringify(v));
}

/* ============================================================
   TOAST
============================================================ */
const ICONS = { success:"fa-circle-check", error:"fa-circle-xmark", info:"fa-circle-info", warning:"fa-triangle-exclamation" };

function toast(msg, tipo = "success") {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className = `toast ${tipo}`;
  t.innerHTML = `<i class="fa-solid ${ICONS[tipo]}"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = "toastOut .22s ease forwards"; setTimeout(() => t.remove(), 220); }, 3000);
}

/* ============================================================
   MODAL GENÉRICO
============================================================ */
function abrirModal(titulo, body, onConfirm, confirmLabel = "Confirmar", confirmClass = "btn-primary") {
  document.getElementById("modalTitle").textContent = titulo;
  document.getElementById("modalBody").innerHTML = body;
  const foot = document.getElementById("modalFooter");
  foot.innerHTML = `<button class="btn btn-ghost" onclick="fecharModal()">Cancelar</button>
    <button class="btn ${confirmClass}" id="modalConfirm">${confirmLabel}</button>`;
  document.getElementById("modalConfirm").onclick = () => { if (onConfirm()) fecharModal(); };
  document.getElementById("modalOverlay").classList.add("open");
}

function fecharModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("modalOverlay").classList.remove("open");
}

/* ============================================================
   MODAL LIVRO
============================================================ */
function abrirModalLivro(id = null) {
  const l = id ? livros.find(x => x.id === id) : null;
  const titulo = l ? "Editar Livro" : "Novo Livro";

  abrirModal(titulo, `
    <div class="form-grid">
      <div class="form-group"><label>ISBN</label>
        <input id="mIsbn" placeholder="978-85-..." value="${l?.isbn || ''}" ${l ? 'readonly style="opacity:.6"' : ''} /></div>
      <div class="form-group"><label>Título *</label>
        <input id="mTitulo" placeholder="Título do livro" value="${l?.titulo || ''}" /></div>
      <div class="form-group"><label>Autor *</label>
        <input id="mAutor" placeholder="Nome do autor" value="${l?.autor || ''}" /></div>
      <div class="form-group"><label>Categoria *</label>
        <input id="mCategoria" placeholder="Ex: Literatura, Ciências..." value="${l?.categoria || ''}" list="catList" />
        <datalist id="catList">${[...new Set(livros.map(x=>x.categoria))].map(c=>`<option value="${c}">`).join('')}</datalist></div>
      <div class="form-group"><label>Quantidade *</label>
        <input id="mQtd" type="number" min="1" placeholder="1" value="${l?.quantidade || ''}" /></div>
      <div class="form-group"><label>Editora</label>
        <input id="mEditora" placeholder="Nome da editora" value="${l?.editora || ''}" /></div>
      <div class="form-group"><label>Ano de publicação</label>
        <input id="mAno" type="number" placeholder="2024" min="1000" max="2099" value="${l?.ano || ''}" /></div>
    </div>`, () => {
      const isbn     = g("mIsbn");
      const titulo   = g("mTitulo");
      const autor    = g("mAutor");
      const categoria = g("mCategoria");
      const qtd      = Number(g("mQtd"));
      const editora  = g("mEditora");
      const ano      = g("mAno");

      if (!titulo || !autor || !categoria || qtd <= 0) { toast("Preencha os campos obrigatórios (*)", "error"); return false; }

      if (l) {
        const diff = qtd - l.quantidade;
        l.titulo = titulo; l.autor = autor; l.categoria = categoria;
        l.quantidade = qtd; l.disponiveis = Math.max(0, l.disponiveis + diff);
        l.editora = editora; l.ano = ano;
        registrarAti(`Livro <strong>${titulo}</strong> atualizado.`, "blue");
        toast(`"${titulo}" atualizado.`);
      } else {
        if (isbn && livros.find(x => x.isbn === isbn)) { toast("ISBN já cadastrado.", "error"); return false; }
        livros.push({ id: Date.now(), isbn, titulo, autor, categoria, quantidade: qtd, disponiveis: qtd, editora, ano });
        registrarAti(`Livro <strong>${titulo}</strong> adicionado ao acervo.`, "blue");
        toast(`"${titulo}" adicionado.`);
      }
      salvar(); atualizar(); return true;
    }, l ? "Salvar" : "Cadastrar");
}

/* ============================================================
   MODAL ALUNO
============================================================ */
function abrirModalAluno(id = null) {
  const a = id ? alunos.find(x => x.id === id) : null;

  abrirModal(a ? "Editar Aluno" : "Novo Aluno", `
    <div class="form-grid">
      <div class="form-group"><label>Matrícula *</label>
        <input id="mMatricula" placeholder="Nº de matrícula" value="${a?.matricula || ''}" ${a?'readonly style="opacity:.6"':''}/></div>
      <div class="form-group"><label>Nome Completo *</label>
        <input id="mNome" placeholder="Nome do aluno" value="${a?.nome || ''}" /></div>
      <div class="form-group"><label>Turma *</label>
        <input id="mTurma" placeholder="Ex: 9º A" value="${a?.turma || ''}" list="turmaList" />
        <datalist id="turmaList">${[...new Set(alunos.map(x=>x.turma))].map(t=>`<option value="${t}">`).join('')}</datalist></div>
      <div class="form-group"><label>E-mail</label>
        <input id="mEmail" type="email" placeholder="email@escola.edu.br" value="${a?.email || ''}" /></div>
      <div class="form-group"><label>Telefone / Responsável</label>
        <input id="mTel" placeholder="(00) 00000-0000" value="${a?.telefone || ''}" /></div>
    </div>`, () => {
      const matricula = g("mMatricula");
      const nome  = g("mNome");
      const turma = g("mTurma");
      const email = g("mEmail");
      const tel   = g("mTel");

      if (!matricula || !nome || !turma) { toast("Preencha os campos obrigatórios (*)", "error"); return false; }

      if (a) {
        a.nome = nome; a.turma = turma; a.email = email; a.telefone = tel;
        registrarAti(`Aluno <strong>${nome}</strong> atualizado.`, "green");
        toast(`${nome} atualizado.`);
      } else {
        if (alunos.find(x => x.matricula === matricula)) { toast("Matrícula já cadastrada.", "error"); return false; }
        alunos.push({ id: Date.now(), matricula, nome, turma, email, telefone: tel });
        registrarAti(`Aluno <strong>${nome}</strong> cadastrado.`, "green");
        toast(`${nome} cadastrado.`);
      }
      salvar(); atualizar(); return true;
    }, a ? "Salvar" : "Cadastrar");
}

/* ============================================================
   MODAL EMPRÉSTIMO
============================================================ */
function abrirModalEmprestimo() {
  const livrosDisp = livros.filter(l => l.disponiveis > 0);
  if (!livrosDisp.length) { toast("Nenhum livro disponível para empréstimo.", "warning"); return; }
  if (!alunos.length)     { toast("Nenhum aluno cadastrado.", "warning"); return; }

  const hoje = new Date();
  const dataPadrao = new Date(hoje.getTime() + cfg.prazo * 86400000).toISOString().split("T")[0];

  abrirModal("Novo Empréstimo", `
    <div class="form-grid">
      <div class="form-group"><label>Livro *</label>
        <select id="mLivro">
          <option value="">Selecione um livro</option>
          ${livrosDisp.map(l => `<option value="${l.id}">${l.titulo} (${l.disponiveis} disp.)</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Aluno *</label>
        <select id="mAluno">
          <option value="">Selecione um aluno</option>
          ${alunos.map(a => `<option value="${a.id}">${a.nome} — ${a.turma}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Prazo de Devolução *</label>
        <input id="mData" type="date" value="${dataPadrao}" min="${hoje.toISOString().split('T')[0]}" /></div>
    </div>`, () => {
      const livroId = Number(g("mLivro"));
      const alunoId = Number(g("mAluno"));
      const dataDev = g("mData");

      if (!livroId || !alunoId || !dataDev) { toast("Preencha todos os campos.", "error"); return false; }

      const livro = livros.find(l => l.id === livroId);
      const aluno = alunos.find(a => a.id === alunoId);

      if (livro.disponiveis <= 0) { toast("Livro indisponível.", "error"); return false; }

      const empAtivos = emprestimos.filter(e => e.alunoId === alunoId && !e.devolvido).length;
      if (empAtivos >= cfg.limite) { toast(`Aluno já atingiu o limite de ${cfg.limite} empréstimos.`, "error"); return false; }

      if (emprestimos.find(e => e.livroId === livroId && e.alunoId === alunoId && !e.devolvido)) {
        toast("Este aluno já está com este livro.", "error"); return false;
      }

      // Cancelar reserva se houver
      const res = reservas.find(r => r.livroId === livroId && r.alunoId === alunoId && r.ativa);
      if (res) res.ativa = false;

      emprestimos.push({
        id: Date.now(), livroId, alunoId,
        dataDevolucao:  dataDev,
        dataEmprestimo: hoje.toISOString().split("T")[0],
        devolvido: false, multa: 0
      });

      livro.disponiveis--;
      registrarAti(`<strong>${aluno.nome}</strong> pegou <strong>${livro.titulo}</strong>.`, "green");
      adicionarNotif(`Novo empréstimo: ${livro.titulo} → ${aluno.nome}`, "dot-green");
      salvar(); atualizar();
      toast(`Empréstimo registrado para ${aluno.nome}.`);
      return true;
    }, "Registrar Empréstimo");
}

/* ============================================================
   MODAL RESERVA
============================================================ */
function abrirModalReserva() {
  if (!livros.length || !alunos.length) { toast("Cadastre livros e alunos primeiro.", "warning"); return; }

  abrirModal("Nova Reserva", `
    <div class="form-grid">
      <div class="form-group"><label>Livro *</label>
        <select id="rLivro">
          <option value="">Selecione um livro</option>
          ${livros.map(l => `<option value="${l.id}">${l.titulo} (${l.disponiveis} disp.)</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Aluno *</label>
        <select id="rAluno">
          <option value="">Selecione um aluno</option>
          ${alunos.map(a => `<option value="${a.id}">${a.nome} — ${a.turma}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Observação</label>
        <input id="rObs" placeholder="Opcional..." /></div>
    </div>`, () => {
      const livroId = Number(g("rLivro"));
      const alunoId = Number(g("rAluno"));
      const obs = g("rObs");

      if (!livroId || !alunoId) { toast("Selecione livro e aluno.", "error"); return false; }
      if (reservas.find(r => r.livroId === livroId && r.alunoId === alunoId && r.ativa)) {
        toast("Reserva já existe para este aluno/livro.", "error"); return false;
      }

      const livro = livros.find(l => l.id === livroId);
      const aluno = alunos.find(a => a.id === alunoId);

      reservas.push({ id: Date.now(), livroId, alunoId, obs, ativa: true, data: new Date().toISOString().split("T")[0] });
      registrarAti(`<strong>${aluno.nome}</strong> reservou <strong>${livro.titulo}</strong>.`, "purple");
      salvar(); atualizar();
      toast(`Reserva criada para ${aluno.nome}.`);
      return true;
    }, "Reservar");
}

/* ============================================================
   DEVOLVER LIVRO
============================================================ */
function devolverLivro(id) {
  const emp   = emprestimos.find(e => e.id === id);
  const livro = livros.find(l => l.id === emp?.livroId);
  const aluno = alunos.find(a => a.id === emp?.alunoId);
  if (!emp || !livro) return;

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const dataDev = new Date(emp.dataDevolucao + "T00:00:00");
  const diasAtraso = Math.max(0, Math.ceil((hoje - dataDev) / 86400000));
  const multaTotal = diasAtraso > 0 ? +(diasAtraso * cfg.multa).toFixed(2) : 0;

  const corpo = multaTotal > 0
    ? `<p style="color:var(--text-2);line-height:1.6">
        Confirmar devolução de <strong>${livro.titulo}</strong> por <strong>${aluno?.nome}</strong>?<br><br>
        <span style="color:var(--red);font-weight:700">⚠ ${diasAtraso} dia(s) de atraso — Multa: R$ ${multaTotal.toFixed(2).replace('.',',')}</span>
       </p>`
    : `<p style="color:var(--text-2);line-height:1.6">
        Confirmar devolução de <strong>${livro.titulo}</strong> por <strong>${aluno?.nome}</strong>?
       </p>`;

  abrirModal("Confirmar Devolução", corpo, () => {
    emp.devolvido      = true;
    emp.dataDevolvido  = new Date().toISOString().split("T")[0];
    emp.diasAtraso     = diasAtraso;
    emp.multa          = multaTotal;
    livro.disponiveis++;

    registrarAti(`<strong>${aluno?.nome || "Aluno"}</strong> devolveu <strong>${livro.titulo}</strong>${multaTotal > 0 ? ` — multa R$ ${multaTotal.toFixed(2)}` : ''}.`, "amber");

    // Notificar reservas pendentes
    const res = reservas.find(r => r.livroId === livro.id && r.ativa);
    if (res) {
      const alunoRes = alunos.find(a => a.id === res.alunoId);
      adicionarNotif(`"${livro.titulo}" disponível — reservado por ${alunoRes?.nome}`, "dot-purple");
    }

    salvar(); atualizar();
    toast(multaTotal > 0 ? `Devolução registrada. Multa: R$ ${multaTotal.toFixed(2).replace('.',',' )}` : "Devolução registrada.");
    return true;
  }, "Confirmar Devolução", multaTotal > 0 ? "btn-amber" : "btn-green");
}

/* ============================================================
   EXCLUIR LIVRO
============================================================ */
function excluirLivro(id) {
  const l = livros.find(x => x.id === id);
  if (!l) return;
  abrirModal("Excluir Livro", `<p style="color:var(--text-2);line-height:1.6">Excluir <strong>${l.titulo}</strong>? Esta ação não pode ser desfeita.</p>`, () => {
    livros = livros.filter(x => x.id !== id);
    registrarAti(`Livro <strong>${l.titulo}</strong> removido.`, "red");
    salvar(); atualizar();
    toast("Livro excluído.", "info");
    return true;
  }, "Excluir", "btn-danger");
}

/* ============================================================
   EXCLUIR ALUNO
============================================================ */
function excluirAluno(id) {
  const a = alunos.find(x => x.id === id);
  if (!a) return;
  const empAtivo = emprestimos.some(e => e.alunoId === id && !e.devolvido);
  if (empAtivo) { toast("Aluno possui empréstimos ativos. Faça a devolução primeiro.", "error"); return; }
  abrirModal("Excluir Aluno", `<p style="color:var(--text-2);line-height:1.6">Excluir <strong>${a.nome}</strong>? Esta ação não pode ser desfeita.</p>`, () => {
    alunos = alunos.filter(x => x.id !== id);
    registrarAti(`Aluno <strong>${a.nome}</strong> removido.`, "red");
    salvar(); atualizar();
    toast("Aluno excluído.", "info");
    return true;
  }, "Excluir", "btn-danger");
}

/* ============================================================
   CANCELAR RESERVA
============================================================ */
function cancelarReserva(id) {
  const r = reservas.find(x => x.id === id);
  if (!r) return;
  r.ativa = false;
  salvar(); atualizar();
  toast("Reserva cancelada.", "info");
}

/* ============================================================
   PERFIL DO ALUNO
============================================================ */
function verPerfil(id) {
  const aluno = alunos.find(a => a.id === id);
  if (!aluno) return;

  const empsAluno    = emprestimos.filter(e => e.alunoId === id);
  const ativos       = empsAluno.filter(e => !e.devolvido);
  const historico    = empsAluno.filter(e => e.devolvido);
  const totalMultas  = historico.reduce((s, e) => s + (e.multa || 0), 0);
  const inicial      = aluno.nome.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();

  const rows = empsAluno.slice(0,6).map(e => {
    const l = livros.find(x => x.id === e.livroId);
    const status = e.devolvido
      ? `<span class="badge badge-green">Devolvido</span>`
      : `<span class="badge badge-amber">Em posse</span>`;
    return `<div class="item-row">
      <div class="item-avatar"><i class="fa-solid fa-book"></i></div>
      <div class="item-details">
        <div class="item-title">${l?.titulo || "Livro removido"}</div>
        <div class="item-meta">${e.dataEmprestimo} → ${e.dataDevolucao}</div>
      </div>${status}</div>`;
  }).join("") || '<div class="empty-state" style="padding:20px"><i class="fa-solid fa-book"></i><p>Sem histórico</p></div>';

  document.getElementById("perfilTitle").textContent = "Perfil do Aluno";
  document.getElementById("perfilBody").innerHTML = `
    <div class="perfil-hero">
      <div class="perfil-avatar">${inicial}</div>
      <div class="perfil-info">
        <h2>${aluno.nome}</h2>
        <p>Turma ${aluno.turma} · Matrícula ${aluno.matricula}</p>
        ${aluno.email ? `<p style="margin-top:2px;font-size:12px;color:var(--text-3)">${aluno.email}</p>` : ""}
      </div>
    </div>
    <div class="perfil-stats">
      <div class="perfil-stat"><div class="val">${empsAluno.length}</div><div class="lbl">Total</div></div>
      <div class="perfil-stat"><div class="val c-amber">${ativos.length}</div><div class="lbl">Ativos</div></div>
      <div class="perfil-stat"><div class="val c-red">R$ ${totalMultas.toFixed(2).replace('.',',')}</div><div class="lbl">Multas</div></div>
    </div>
    <h4 style="font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:8px">Últimos Empréstimos</h4>
    ${rows}`;
  document.getElementById("perfilOverlay").classList.add("open");
}

function fecharPerfil(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("perfilOverlay").classList.remove("open");
}

/* ============================================================
   RENDERS
============================================================ */
function renderLivros(lista = null) {
  pesquisarLivros(lista);
}

function pesquisarLivros(listaForce = null) {
  const q    = g("pesquisaLivro").toLowerCase();
  const cat  = g("filtroCategoria");
  const disp = g("filtroDisponivel");

  let lista = listaForce || livros.filter(l =>
    (!q   || l.titulo.toLowerCase().includes(q) || l.autor.toLowerCase().includes(q) || l.isbn?.toLowerCase().includes(q)) &&
    (!cat || l.categoria === cat) &&
    (!disp || (disp === "disponivel" ? l.disponiveis > 0 : l.disponiveis === 0))
  );

  set("countLivros", `${lista.length} livro${lista.length !== 1 ? "s" : ""}`);

  const el = document.getElementById("listaLivros");
  if (!lista.length) {
    el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-book"></i><p>Nenhum livro encontrado.</p></div>`;
    return;
  }

  el.innerHTML = lista.map(l => {
    const status = l.disponiveis > 0
      ? `<span class="badge badge-green">${l.disponiveis}/${l.quantidade} disp.</span>`
      : `<span class="badge badge-red">Esgotado</span>`;
    const res = reservas.filter(r => r.livroId === l.id && r.ativa).length;
    const resBadge = res ? `<span class="badge badge-purple">${res} reserva${res>1?'s':''}</span>` : "";
    return `<div class="item-row">
      <div class="item-avatar"><i class="fa-solid fa-book"></i></div>
      <div class="item-details">
        <div class="item-title">${l.titulo}</div>
        <div class="item-meta">${l.autor} · ${l.categoria}${l.editora ? ` · ${l.editora}` : ''}${l.ano ? ` · ${l.ano}` : ''}</div>
        <div class="item-tags">${status}${resBadge}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-ghost btn-sm" onclick="abrirModalLivro(${l.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" onclick="excluirLivro(${l.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
      </div></div>`;
  }).join("");
}

function pesquisarAlunos() {
  const q     = g("pesquisaAluno").toLowerCase();
  const turma = g("filtroTurma");

  let lista = alunos.filter(a =>
    (!q     || a.nome.toLowerCase().includes(q) || a.matricula.toLowerCase().includes(q)) &&
    (!turma || a.turma === turma)
  );

  set("countAlunos", `${lista.length} aluno${lista.length !== 1 ? "s" : ""}`);

  const el = document.getElementById("listaAlunos");
  if (!lista.length) {
    el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-user-graduate"></i><p>Nenhum aluno encontrado.</p></div>`;
    return;
  }

  el.innerHTML = lista.map(a => {
    const ativos = emprestimos.filter(e => e.alunoId === a.id && !e.devolvido).length;
    const atrasado = emprestimos.some(e => e.alunoId === a.id && !e.devolvido && new Date(e.dataDevolucao) < new Date());
    let badge = atrasado
      ? `<span class="badge badge-red">Em atraso</span>`
      : ativos ? `<span class="badge badge-blue">${ativos} empréstimo${ativos>1?"s":""}</span>` : "";
    return `<div class="item-row">
      <div class="item-avatar green"><i class="fa-solid fa-user-graduate"></i></div>
      <div class="item-details">
        <div class="item-title">${a.nome}</div>
        <div class="item-meta">Turma ${a.turma} · Matrícula ${a.matricula}${a.email ? ` · ${a.email}` : ''}</div>
        <div class="item-tags">${badge}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-ghost btn-sm" onclick="verPerfil(${a.id})" title="Ver perfil"><i class="fa-solid fa-eye"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="abrirModalAluno(${a.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" onclick="excluirAluno(${a.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
      </div></div>`;
  }).join("");
}

function filtrarEmprestimos(tipo, btn) {
  filtroEmpAtual = tipo;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  const titulos = { ativos: "Empréstimos Ativos", atrasados: "Empréstimos Atrasados", hoje: "Vencem Hoje" };
  set("empTitulo", titulos[tipo]);
  renderEmprestimos();
}

function renderEmprestimos() {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  let lista = emprestimos.filter(e => !e.devolvido);

  if (filtroEmpAtual === "atrasados")
    lista = lista.filter(e => new Date(e.dataDevolucao + "T00:00:00") < hoje);
  else if (filtroEmpAtual === "hoje")
    lista = lista.filter(e => {
      const d = new Date(e.dataDevolucao + "T00:00:00");
      return d.getTime() === hoje.getTime();
    });

  set("countEmp", `${lista.length}`);
  const el = document.getElementById("listaEmprestimos");

  if (!lista.length) {
    el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-arrow-right-arrow-left"></i><p>Nenhum empréstimo ${filtroEmpAtual === "atrasados" ? "atrasado" : filtroEmpAtual === "hoje" ? "vencendo hoje" : "ativo"}.</p></div>`;
    return;
  }

  el.innerHTML = lista.map(emp => {
    const livro = livros.find(l => l.id === emp.livroId);
    const aluno = alunos.find(a => a.id === emp.alunoId);
    const dataDev = new Date(emp.dataDevolucao + "T00:00:00");
    const diff = Math.ceil((dataDev - hoje) / 86400000);
    const multaPrev = diff < 0 ? (Math.abs(diff) * cfg.multa).toFixed(2).replace('.', ',') : null;

    let badge;
    if (diff < 0)      badge = `<span class="badge badge-red"><i class="fa-solid fa-triangle-exclamation"></i>${Math.abs(diff)}d atraso — R$ ${multaPrev}</span>`;
    else if (diff === 0) badge = `<span class="badge badge-amber">Vence hoje</span>`;
    else               badge = `<span class="badge badge-green">${diff}d restantes</span>`;

    return `<div class="item-row">
      <div class="item-avatar purple"><i class="fa-solid fa-book-open-reader"></i></div>
      <div class="item-details">
        <div class="item-title">${livro?.titulo || "Livro removido"}</div>
        <div class="item-meta">${aluno?.nome || "?"} · ${aluno?.turma || ""} · Emprestado em ${formatData(emp.dataEmprestimo)} · Devolução: ${formatData(emp.dataDevolucao)}</div>
        <div class="item-tags">${badge}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-ghost btn-sm" onclick="verPerfil(${emp.alunoId})" title="Perfil"><i class="fa-solid fa-user"></i></button>
        <button class="btn btn-green btn-sm" onclick="devolverLivro(${emp.id})"><i class="fa-solid fa-rotate-left"></i> Devolver</button>
      </div></div>`;
  }).join("");
}

function renderReservas() {
  const lista = reservas.filter(r => r.ativa);
  set("countRes", lista.length || "");
  document.getElementById("badgeRes").textContent = lista.length > 0 ? lista.length : "";

  const el = document.getElementById("listaReservas");
  if (!lista.length) {
    el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bookmark"></i><p>Nenhuma reserva ativa.</p></div>`;
    return;
  }

  el.innerHTML = lista.map(r => {
    const livro = livros.find(l => l.id === r.livroId);
    const aluno = alunos.find(a => a.id === r.alunoId);
    const dispBadge = livro?.disponiveis > 0
      ? `<span class="badge badge-green">Disponível agora</span>`
      : `<span class="badge badge-gray">Aguardando devolução</span>`;
    return `<div class="item-row">
      <div class="item-avatar amber"><i class="fa-solid fa-bookmark"></i></div>
      <div class="item-details">
        <div class="item-title">${livro?.titulo || "Livro removido"}</div>
        <div class="item-meta">${aluno?.nome || "?"} · ${aluno?.turma || ""} · Reservado em ${formatData(r.data)}</div>
        <div class="item-tags">${dispBadge}${r.obs ? `<span class="badge badge-gray">${r.obs}</span>` : ""}</div>
      </div>
      <div class="item-actions">
        ${livro?.disponiveis > 0 ? `<button class="btn btn-primary btn-sm" onclick="converterReservaEmEmprestimo(${r.id})"><i class="fa-solid fa-arrow-right"></i> Emprestar</button>` : ""}
        <button class="btn btn-danger btn-sm" onclick="cancelarReserva(${r.id})"><i class="fa-solid fa-xmark"></i></button>
      </div></div>`;
  }).join("");
}

function converterReservaEmEmprestimo(resId) {
  const r = reservas.find(x => x.id === resId);
  if (!r) return;
  const livro = livros.find(l => l.id === r.livroId);
  if (!livro || livro.disponiveis <= 0) { toast("Livro indisponível.", "error"); return; }

  const dataPadrao = new Date(Date.now() + cfg.prazo * 86400000).toISOString().split("T")[0];
  r.ativa = false;
  emprestimos.push({ id: Date.now(), livroId: r.livroId, alunoId: r.alunoId, dataDevolucao: dataPadrao, dataEmprestimo: new Date().toISOString().split("T")[0], devolvido: false, multa: 0 });
  livro.disponiveis--;
  const aluno = alunos.find(a => a.id === r.alunoId);
  registrarAti(`Reserva convertida: <strong>${aluno?.nome}</strong> pegou <strong>${livro.titulo}</strong>.`, "green");
  salvar(); atualizar();
  toast("Reserva convertida em empréstimo.");
}

function renderizarHistorico() {
  const q = (g("pesquisaHistorico") || "").toLowerCase();
  const di = g("filtroDataInicio");
  const df = g("filtroDataFim");

  let lista = emprestimos.filter(e => e.devolvido).filter(e => {
    const livro = livros.find(l => l.id === e.livroId);
    const aluno = alunos.find(a => a.id === e.alunoId);
    const match = !q || livro?.titulo.toLowerCase().includes(q) || aluno?.nome.toLowerCase().includes(q);
    const afterDi = !di || e.dataDevolvido >= di;
    const beforeDf = !df || e.dataDevolvido <= df;
    return match && afterDi && beforeDf;
  }).sort((a, b) => b.dataDevolvido?.localeCompare(a.dataDevolvido || ""));

  set("countHistorico", `${lista.length} registro${lista.length !== 1 ? "s" : ""}`);
  const el = document.getElementById("listaHistorico");

  if (!lista.length) {
    el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>Nenhum registro encontrado.</p></div>`;
    return;
  }

  el.innerHTML = lista.map(e => {
    const livro = livros.find(l => l.id === e.livroId);
    const aluno = alunos.find(a => a.id === e.alunoId);
    const multaBadge = e.multa > 0
      ? `<span class="badge badge-red">Multa R$ ${e.multa.toFixed(2).replace('.', ',')}</span>`
      : `<span class="badge badge-green">Sem multa</span>`;
    return `<div class="item-row">
      <div class="item-avatar green"><i class="fa-solid fa-rotate-left"></i></div>
      <div class="item-details">
        <div class="item-title">${livro?.titulo || "Livro removido"}</div>
        <div class="item-meta">${aluno?.nome || "?"} · Emprestado: ${formatData(e.dataEmprestimo)} · Devolvido: ${formatData(e.dataDevolvido)}</div>
        <div class="item-tags">${multaBadge}${e.diasAtraso > 0 ? `<span class="badge badge-amber">${e.diasAtraso}d atraso</span>` : ""}</div>
      </div></div>`;
  }).join("");
}

/* ============================================================
   DASHBOARD
============================================================ */
function atualizarDashboard() {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const ativos    = emprestimos.filter(e => !e.devolvido);
  const atrasados = ativos.filter(e => new Date(e.dataDevolucao + "T00:00:00") < hoje);
  const multaTotal = atrasados.reduce((s, e) => s + (Math.ceil((hoje - new Date(e.dataDevolucao + "T00:00:00")) / 86400000) * cfg.multa), 0);
  const disponiveis = livros.reduce((s, l) => s + l.disponiveis, 0);
  const alunosAtivos = new Set(ativos.map(e => e.alunoId)).size;

  set("totalLivros", livros.length);
  set("totalAlunos", alunos.length);
  set("totalEmprestimos", ativos.length);
  set("totalAtrasados", atrasados.length);
  set("subLivros", `${disponiveis} disponíveis`);
  set("subAlunos", `${alunosAtivos} com empréstimos`);
  set("subMulta", `R$ ${multaTotal.toFixed(2).replace('.', ',')} em multas`);

  set("badgeAtraso", atrasados.length > 0 ? "●" : "");
  document.getElementById("badgeEmp").textContent = atrasados.length > 0 ? atrasados.length : "";

  atualizarGraficos();
  renderizarAtividade();
}

function atualizarGraficos() {
  // Categorias
  const catMap = {};
  livros.forEach(l => { catMap[l.categoria] = (catMap[l.categoria] || 0) + 1; });
  const cats  = Object.keys(catMap);
  const vals  = Object.values(catMap);
  const cores = ["#3B82F6","#059669","#7C3AED","#D97706","#DC2626","#06B6D4","#EC4899","#14B8A6"];

  if (chartCat) {
    chartCat.data.labels   = cats;
    chartCat.data.datasets[0].data = vals;
    chartCat.data.datasets[0].backgroundColor = cores.slice(0, cats.length);
    chartCat.update();
  } else {
    const ctx = document.getElementById("chartCategorias");
    if (!ctx) return;
    chartCat = new Chart(ctx, {
      type: "bar",
      data: {
        labels: cats.length ? cats : ["Sem dados"],
        datasets: [{ data: cats.length ? vals : [0], backgroundColor: cores, borderRadius: 6, borderSkipped: false }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, family: "'Inter',sans-serif" } } },
          y: { grid: { color: "rgba(0,0,0,.05)" }, ticks: { stepSize: 1, font: { size: 11 } } }
        }
      }
    });
  }

  // Status donut
  const disponiveis = livros.reduce((s, l) => s + l.disponiveis, 0);
  const emprestados = livros.reduce((s, l) => s + (l.quantidade - l.disponiveis), 0);
  const donutData  = [disponiveis, emprestados];
  const donutCores = ["#059669", "#3B82F6"];
  const donutLabels = ["Disponíveis", "Emprestados"];

  if (chartStatus) {
    chartStatus.data.datasets[0].data = donutData;
    chartStatus.update();
  } else {
    const ctx2 = document.getElementById("chartStatus");
    if (!ctx2) return;
    chartStatus = new Chart(ctx2, {
      type: "doughnut",
      data: { labels: donutLabels, datasets: [{ data: donutData, backgroundColor: donutCores, borderWidth: 3, borderColor: "transparent", hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: "65%",
        plugins: { legend: { display: false } }
      }
    });
  }

  // Legenda donut
  const legendEl = document.getElementById("donutLegend");
  if (legendEl) {
    legendEl.innerHTML = donutLabels.map((lbl, i) => `
      <div class="donut-legend-item">
        <div class="donut-dot" style="background:${donutCores[i]}"></div>
        <span>${lbl}</span>
        <span class="val">${donutData[i]}</span>
      </div>`).join("");
  }
}

function renderizarAtividade() {
  const el = document.getElementById("listaAtividade");
  if (!atividades.length) {
    el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bolt"></i><p>Sem atividades ainda</p></div>`;
    return;
  }
  el.innerHTML = `<div class="activity-feed">` +
    atividades.slice(0, 12).map(a => `
      <div class="activity-item">
        <div class="activity-dot dot-${a.cor}"></div>
        <span class="activity-text">${a.texto}</span>
        <span class="activity-time">${a.hora}</span>
      </div>`).join("") + `</div>`;
}

function limparAtividade() {
  atividades = []; salvar(); renderizarAtividade();
}

/* ============================================================
   RELATÓRIOS
============================================================ */
function atualizarRelatorios() {
  const hoje = new Date();
  const ativos    = emprestimos.filter(e => !e.devolvido);
  const devolvidos = emprestimos.filter(e => e.devolvido);
  const atrasados = ativos.filter(e => new Date(e.dataDevolucao) < hoje);
  const disponiveis = livros.reduce((s, l) => s + l.disponiveis, 0);
  const emprestados = livros.reduce((s, l) => s + (l.quantidade - l.disponiveis), 0);
  const alunosAtivos = new Set(ativos.map(e => e.alunoId)).size;
  const totalExemplares = livros.reduce((s, l) => s + l.quantidade, 0);
  const taxaOcup = totalExemplares > 0 ? Math.round((emprestados / totalExemplares) * 100) : 0;
  const multaAbertas = atrasados.reduce((s, e) => s + (Math.ceil((hoje - new Date(e.dataDevolucao)) / 86400000) * cfg.multa), 0);
  const multaArrecadadas = devolvidos.reduce((s, e) => s + (e.multa || 0), 0);

  set("rLivros", livros.length); set("rDisponiveis", disponiveis); set("rEmprestados", emprestados);
  set("rTaxaOcup", `${taxaOcup}%`); set("rAlunos", alunos.length); set("rAlunosAtivos", alunosAtivos);
  set("rEmprestimos", ativos.length); set("rAtrasados", atrasados.length);
  set("rMultasAbertas", `R$ ${multaAbertas.toFixed(2).replace('.', ',')}`);
  set("rMultasArrecadadas", `R$ ${multaArrecadadas.toFixed(2).replace('.', ',')}`);
  set("rValorDia", `R$ ${cfg.multa.toFixed(2).replace('.', ',')}`);
  set("rTotalDev", devolvidos.length);

  // Top livros
  const empCount = {};
  emprestimos.forEach(e => { empCount[e.livroId] = (empCount[e.livroId] || 0) + 1; });
  const top = Object.entries(empCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topEl = document.getElementById("topLivros");
  if (!top.length) {
    topEl.innerHTML = `<div class="empty-state" style="padding:20px"><i class="fa-solid fa-trophy"></i><p>Sem dados ainda</p></div>`;
  } else {
    const medals = ["gold", "silver", "bronze", "", ""];
    topEl.innerHTML = top.map(([id, count], i) => {
      const l = livros.find(x => x.id === Number(id));
      return `<div class="top-item">
        <span class="top-rank ${medals[i]}">${i + 1}</span>
        <div class="item-details"><div class="item-title">${l?.titulo || "Removido"}</div><div class="item-meta">${l?.autor || ""}</div></div>
        <span class="badge badge-blue">${count} empréstimo${count > 1 ? "s" : ""}</span>
      </div>`;
    }).join("");
  }
}

/* ============================================================
   CONFIGURAÇÕES
============================================================ */
function salvarConfiguracoes() {
  cfg.nome   = g("cfgNome")   || cfg.nome;
  cfg.escola = g("cfgEscola") || cfg.escola;
  cfg.prazo  = Number(g("cfgPrazo"))  || cfg.prazo;
  cfg.multa  = parseFloat(g("cfgMulta"))  || cfg.multa;
  cfg.limite = Number(g("cfgLimite")) || cfg.limite;
  salvar(); atualizarConfiguracoes();
  toast("Configurações salvas.");
}

function atualizarConfiguracoes() {
  const ids = { cfgNome: cfg.nome, cfgEscola: cfg.escola, cfgPrazo: cfg.prazo, cfgMulta: cfg.multa, cfgLimite: cfg.limite };
  for (const [id, v] of Object.entries(ids)) {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = v;
  }
  set("cfgCountLivros", livros.length);
  set("cfgCountAlunos", alunos.length);
  set("cfgCountEmp",    emprestimos.filter(e => !e.devolvido).length);
  const kb = (JSON.stringify({ livros, alunos, emprestimos, reservas }).length / 1024).toFixed(1);
  set("cfgEspaco", `${kb} KB`);
}

function confirmarLimparDados() {
  abrirModal("Limpar Todos os Dados", `
    <p style="color:var(--text-2);line-height:1.6">
      <strong style="color:var(--red)">Atenção:</strong> Esta ação irá apagar <strong>todos os livros, alunos, empréstimos e reservas</strong> permanentemente. Esta ação é irreversível.
    </p>`, () => {
      livros = []; alunos = []; emprestimos = []; reservas = []; atividades = []; notificacoes = [];
      salvar(); atualizar();
      toast("Todos os dados foram removidos.", "info");
      return true;
    }, "Limpar Tudo", "btn-danger");
}

/* ============================================================
   BACKUP
============================================================ */
function exportarBackup() {
  const data = JSON.stringify({ livros, alunos, emprestimos, reservas, atividades, config: cfg }, null, 2);
  downloadFile("biblioescolar-backup.json", data, "application/json");
  toast("Backup exportado.");
}

function importarBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (d.livros)      livros      = d.livros;
      if (d.alunos)      alunos      = d.alunos;
      if (d.emprestimos) emprestimos = d.emprestimos;
      if (d.reservas)    reservas    = d.reservas;
      if (d.atividades)  atividades  = d.atividades;
      if (d.config)      cfg         = { ...CFG_DEFAULT, ...d.config };
      salvar(); atualizar();
      toast("Backup importado com sucesso.");
    } catch { toast("Arquivo inválido.", "error"); }
  };
  r.readAsText(file);
  e.target.value = "";
}

/* ============================================================
   EXPORTAR CSV
============================================================ */
function exportarLivrosCSV() {
  const rows = [["ISBN","Título","Autor","Categoria","Editora","Ano","Quantidade","Disponíveis"]];
  livros.forEach(l => rows.push([l.isbn||"",l.titulo,l.autor,l.categoria,l.editora||"",l.ano||"",l.quantidade,l.disponiveis]));
  downloadCSV("livros.csv", rows);
  toast("CSV de livros exportado.");
}

function exportarAlunosCSV() {
  const rows = [["Matrícula","Nome","Turma","E-mail","Telefone"]];
  alunos.forEach(a => rows.push([a.matricula,a.nome,a.turma,a.email||"",a.telefone||""]));
  downloadCSV("alunos.csv", rows);
  toast("CSV de alunos exportado.");
}

function exportarHistoricoCSV() {
  const rows = [["Livro","Aluno","Turma","Data Empréstimo","Data Devolução","Dias Atraso","Multa"]];
  emprestimos.filter(e => e.devolvido).forEach(e => {
    const l = livros.find(x => x.id === e.livroId);
    const a = alunos.find(x => x.id === e.alunoId);
    rows.push([l?.titulo||"",a?.nome||"",a?.turma||"",e.dataEmprestimo||"",e.dataDevolvido||"",e.diasAtraso||0,e.multa?.toFixed(2)||"0.00"]);
  });
  downloadCSV("historico.csv", rows);
  toast("Histórico exportado.");
}

function exportarRelatorioCompleto() {
  exportarLivrosCSV();
  setTimeout(exportarAlunosCSV, 300);
  setTimeout(exportarHistoricoCSV, 600);
  toast("Relatório completo exportado (3 arquivos).", "info");
}

function downloadCSV(nome, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadFile(nome, "\ufeff" + csv, "text/csv;charset=utf-8;");
}

function downloadFile(nome, conteudo, tipo) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  a.download = nome; a.click();
}

/* ============================================================
   BUSCA GLOBAL
============================================================ */
function abrirBuscaGlobal() {
  document.getElementById("searchOverlay").classList.add("open");
  setTimeout(() => document.getElementById("buscaGlobalInput")?.focus(), 50);
}

function fecharBuscaGlobal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("searchOverlay").classList.remove("open");
  document.getElementById("buscaGlobalInput").value = "";
  document.getElementById("searchResults").innerHTML = '<p class="search-hint">Digite para buscar em todo o sistema</p>';
}

function executarBuscaGlobal() {
  const q = document.getElementById("buscaGlobalInput").value.toLowerCase().trim();
  const el = document.getElementById("searchResults");
  if (!q) { el.innerHTML = '<p class="search-hint">Digite para buscar em todo o sistema</p>'; return; }

  const rLivros = livros.filter(l => l.titulo.toLowerCase().includes(q) || l.autor.toLowerCase().includes(q) || l.isbn?.toLowerCase().includes(q));
  const rAlunos = alunos.filter(a => a.nome.toLowerCase().includes(q) || a.matricula.toLowerCase().includes(q));

  if (!rLivros.length && !rAlunos.length) {
    el.innerHTML = '<p class="search-hint">Nenhum resultado encontrado.</p>'; return;
  }

  let html = "";

  if (rLivros.length) {
    html += `<p class="search-section-label">Livros</p>`;
    html += rLivros.slice(0,4).map(l => `
      <div class="search-result-item" onclick="fecharBuscaGlobal();mostrarTela('livros',document.querySelector('[data-tela=livros]'))">
        <div class="search-result-icon" style="background:var(--blue-light);color:var(--blue)"><i class="fa-solid fa-book"></i></div>
        <div class="search-result-text"><div class="title">${l.titulo}</div><div class="sub">${l.autor} · ${l.categoria}</div></div>
      </div>`).join("");
  }

  if (rAlunos.length) {
    html += `<p class="search-section-label">Alunos</p>`;
    html += rAlunos.slice(0,4).map(a => `
      <div class="search-result-item" onclick="fecharBuscaGlobal();verPerfil(${a.id})">
        <div class="search-result-icon" style="background:var(--green-light);color:var(--green)"><i class="fa-solid fa-user-graduate"></i></div>
        <div class="search-result-text"><div class="title">${a.nome}</div><div class="sub">Turma ${a.turma} · Matrícula ${a.matricula}</div></div>
      </div>`).join("");
  }

  el.innerHTML = html;
}

/* ============================================================
   NOTIFICAÇÕES
============================================================ */
function adicionarNotif(texto, cor = "dot-blue") {
  const hora = new Date().toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
  notificacoes.unshift({ texto, cor, hora });
  if (notificacoes.length > 30) notificacoes.pop();
  renderNotificacoes();
}

function renderNotificacoes() {
  const el = document.getElementById("notifList");
  const badge = document.getElementById("badgeNotif");
  badge.textContent = notificacoes.length > 0 ? "●" : "";

  if (!notificacoes.length) {
    el.innerHTML = `<div class="notif-empty"><i class="fa-regular fa-bell-slash"></i><p>Sem notificações</p></div>`;
    return;
  }

  el.innerHTML = notificacoes.slice(0, 10).map(n => `
    <div class="notif-item">
      <div class="notif-dot ${n.cor}"></div>
      <div>
        <div class="notif-text">${n.texto}</div>
        <div class="notif-time">${n.hora}</div>
      </div>
    </div>`).join("");
}

function toggleNotificacoes() {
  document.getElementById("notifPanel").classList.toggle("open");
}

function limparNotificacoes() {
  notificacoes = []; salvar(); renderNotificacoes();
}

/* ============================================================
   NAVEGAÇÃO
============================================================ */
function mostrarTela(id, btn) {
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
  document.getElementById(id).classList.add("ativa");
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  telaAtual = id;
  fecharSidebarMobile();
  document.getElementById("notifPanel").classList.remove("open");
  atualizar();
}

/* ============================================================
   SIDEBAR COLLAPSE
============================================================ */
function toggleCollapse() {
  const sb = document.getElementById("sidebar");
  const tb = document.getElementById("topbar");
  const mc = document.getElementById("mainContent");
  sb.classList.toggle("collapsed");
  tb.classList.toggle("collapsed");
  mc.classList.toggle("collapsed");
}

function toggleSidebarMobile() {
  document.getElementById("sidebar").classList.toggle("mobile-open");
  document.getElementById("overlay").classList.toggle("visible");
}

function fecharSidebarMobile() {
  document.getElementById("sidebar").classList.remove("mobile-open");
  document.getElementById("overlay").classList.remove("visible");
}

/* ============================================================
   TEMA
============================================================ */
function toggleTheme() {
  const html = document.documentElement;
  const dark = html.getAttribute("data-theme") === "dark";
  html.setAttribute("data-theme", dark ? "light" : "dark");
  document.getElementById("themeIcon").className  = dark ? "fa-solid fa-moon" : "fa-solid fa-sun";
  document.getElementById("themeLabel").textContent = dark ? "Tema escuro" : "Tema claro";
  localStorage.setItem("theme", dark ? "light" : "dark");
  setTimeout(() => { if (chartCat) { chartCat.destroy(); chartCat = null; } if (chartStatus) { chartStatus.destroy(); chartStatus = null; } atualizarGraficos(); }, 50);
}

/* ============================================================
   FILTROS DINÂMICOS
============================================================ */
function popularFiltros() {
  const sel = document.getElementById("filtroCategoria");
  if (!sel) return;
  const cats = [...new Set(livros.map(l => l.categoria))].sort();
  const atual = sel.value;
  sel.innerHTML = `<option value="">Todas as categorias</option>` + cats.map(c => `<option value="${c}" ${c===atual?"selected":""}>${c}</option>`).join("");

  const selT = document.getElementById("filtroTurma");
  if (!selT) return;
  const turmas = [...new Set(alunos.map(a => a.turma))].sort();
  const atualT = selT.value;
  selT.innerHTML = `<option value="">Todas as turmas</option>` + turmas.map(t => `<option value="${t}" ${t===atualT?"selected":""}>${t}</option>`).join("");
}

/* ============================================================
   ATIVIDADES
============================================================ */
function registrarAti(texto, cor = "blue") {
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  atividades.unshift({ texto, cor, hora });
  if (atividades.length > 30) atividades.pop();
}

/* ============================================================
   DATA
============================================================ */
function atualizarData() {
  const el = document.getElementById("dataAtual");
  if (el) el.textContent = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });
}

/* ============================================================
   VERIFICAR ATRASOS (NOTIFICAÇÃO AUTOMÁTICA)
============================================================ */
function verificarAtrasos() {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const atrasados = emprestimos.filter(e => !e.devolvido && new Date(e.dataDevolucao + "T00:00:00") < hoje);
  if (atrasados.length > 0 && !localStorage.getItem("notifAtraso_" + hoje.toDateString())) {
    adicionarNotif(`${atrasados.length} empréstimo(s) em atraso hoje.`, "dot-red");
    localStorage.setItem("notifAtraso_" + hoje.toDateString(), "1");
  }
}

/* ============================================================
   ATUALIZAR TUDO
============================================================ */
function atualizar() {
  popularFiltros();
  atualizarDashboard();
  pesquisarLivros();
  pesquisarAlunos();
  renderEmprestimos();
  renderReservas();
  renderizarHistorico();
  atualizarRelatorios();
  atualizarConfiguracoes();
  renderNotificacoes();
}

/* ============================================================
   UTILITÁRIOS
============================================================ */
function g(id) { return document.getElementById(id)?.value.trim() || ""; }
function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function formatData(d) { if (!d) return "—"; return new Date(d + "T00:00:00").toLocaleDateString("pt-BR"); }

/* ============================================================
   ATALHOS DE TECLADO
============================================================ */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    fecharModal();
    fecharBuscaGlobal();
    fecharPerfil();
    document.getElementById("notifPanel").classList.remove("open");
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    const atalhos = { k:"busca", l:"livros", a:"alunos", e:"emprestimos", d:"dashboard" };
    const acao = atalhos[e.key.toLowerCase()];
    if (!acao) return;
    e.preventDefault();
    if (acao === "busca") { abrirBuscaGlobal(); return; }
    const btn = document.querySelector(`[data-tela="${acao}"]`);
    mostrarTela(acao, btn);
  }
});

// Fechar notificações ao clicar fora
document.addEventListener("click", e => {
  const panel = document.getElementById("notifPanel");
  const btn   = document.getElementById("btnNotif");
  if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
    panel.classList.remove("open");
  }
});

/* ============================================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Restaurar tema
  const tema = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", tema);
  document.getElementById("themeIcon").className  = tema === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  document.getElementById("themeLabel").textContent = tema === "dark" ? "Tema claro" : "Tema escuro";

  atualizarData();
  verificarAtrasos();
  atualizar();
});