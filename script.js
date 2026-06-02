/* ==========================
   BANCO DE DADOS
========================== */

let livros = JSON.parse(localStorage.getItem("livros")) || [];
let alunos = JSON.parse(localStorage.getItem("alunos")) || [];
let emprestimos = JSON.parse(localStorage.getItem("emprestimos")) || [];

/* ==========================
   SALVAR DADOS
========================== */

function salvarDados(){

    localStorage.setItem("livros", JSON.stringify(livros));
    localStorage.setItem("alunos", JSON.stringify(alunos));
    localStorage.setItem("emprestimos", JSON.stringify(emprestimos));

}

/* ==========================
   DATA
========================== */

function atualizarData(){

    const hoje = new Date();

    document.getElementById("dataAtual").textContent =
    hoje.toLocaleDateString("pt-BR");

}

/* ==========================
   TROCAR TELAS
========================== */

function mostrarTela(id){

    document.querySelectorAll(".tela").forEach(tela=>{
        tela.classList.remove("ativa");
    });

    document.getElementById(id).classList.add("ativa");
}/* ==========================
   LIVROS
========================== */

function adicionarLivro(){

    const isbn = document.getElementById("isbnLivro").value.trim();
    const titulo = document.getElementById("tituloLivro").value.trim();
    const autor = document.getElementById("autorLivro").value.trim();
    const categoria = document.getElementById("categoriaLivro").value.trim();
    const quantidade = Number(document.getElementById("quantidadeLivro").value);

    if(!isbn || !titulo || !autor || !categoria || quantidade <= 0){
        alert("Preencha todos os campos.");
        return;
    }

    livros.push({
        id: Date.now(),
        isbn,
        titulo,
        autor,
        categoria,
        quantidade,
        disponiveis: quantidade
    });

    salvarDados();
    atualizarTudo();
}

/* EDITAR LIVRO (NOVO) */

function editarLivro(id){

    const livro = livros.find(l => l.id === id);
    if(!livro) return;

    const novoTitulo = prompt("Título:", livro.titulo);
    const novoAutor = prompt("Autor:", livro.autor);
    const novaCategoria = prompt("Categoria:", livro.categoria);
    const novaQtd = Number(prompt("Quantidade:", livro.quantidade));

    if(!novoTitulo || !novoAutor || !novaCategoria || novaQtd <= 0){
        alert("Valores inválidos.");
        return;
    }

    livro.disponiveis += (novaQtd - livro.quantidade);
    livro.titulo = novoTitulo;
    livro.autor = novoAutor;
    livro.categoria = novaCategoria;
    livro.quantidade = novaQtd;

    salvarDados();
    atualizarTudo();
}

/* EXCLUIR LIVRO */

function excluirLivro(id){

    if(!confirm("Deseja excluir este livro?")) return;

    livros = livros.filter(l => l.id !== id);

    salvarDados();
    atualizarTudo();
}function renderizarLivros(){

    const lista = document.getElementById("listaLivros");
    lista.innerHTML = "";

    livros.forEach(livro=>{

        lista.innerHTML += `
        <div class="item">

            <div class="item-info">
                <h4>${livro.titulo}</h4>
                <p>Autor: ${livro.autor}</p>
                <p>Categoria: ${livro.categoria}</p>
                <p>Disponíveis: ${livro.disponiveis}/${livro.quantidade}</p>
            </div>

            <div class="acoes">

                <button class="editar" onclick="editarLivro(${livro.id})">
                    Editar
                </button>

                <button class="excluir" onclick="excluirLivro(${livro.id})">
                    Excluir
                </button>

            </div>

        </div>`;
    });
}

function pesquisarLivros(){

    const texto = document.getElementById("pesquisaLivro").value.toLowerCase();
    const lista = document.getElementById("listaLivros");

    lista.innerHTML = "";

    livros.filter(l =>
        l.titulo.toLowerCase().includes(texto) ||
        l.autor.toLowerCase().includes(texto) ||
        l.categoria.toLowerCase().includes(texto)
    ).forEach(livro=>{

        lista.innerHTML += `
        <div class="item">
            <div class="item-info">
                <h4>${livro.titulo}</h4>
                <p>${livro.autor}</p>
            </div>
        </div>`;
    });
}function adicionarAluno(){

    const matricula = document.getElementById("matriculaAluno").value.trim();
    const nome = document.getElementById("nomeAluno").value.trim();
    const turma = document.getElementById("turmaAluno").value.trim();
    const email = document.getElementById("emailAluno").value.trim();

    if(!matricula || !nome || !turma || !email){
        alert("Preencha todos os campos.");
        return;
    }

    alunos.push({
        id: Date.now(),
        matricula,
        nome,
        turma,
        email
    });

    salvarDados();
    atualizarTudo();
}

/* EDITAR ALUNO (NOVO) */

function editarAluno(id){

    const aluno = alunos.find(a => a.id === id);
    if(!aluno) return;

    aluno.nome = prompt("Nome:", aluno.nome);
    aluno.turma = prompt("Turma:", aluno.turma);
    aluno.email = prompt("Email:", aluno.email);

    salvarDados();
    atualizarTudo();
}

/* EXCLUIR */

function excluirAluno(id){

    if(!confirm("Deseja excluir este aluno?")) return;

    alunos = alunos.filter(a => a.id !== id);

    salvarDados();
    atualizarTudo();
}function renderizarAlunos(){

    const lista = document.getElementById("listaAlunos");
    lista.innerHTML = "";

    alunos.forEach(aluno=>{

        lista.innerHTML += `
        <div class="item">

            <div class="item-info">
                <h4>${aluno.nome}</h4>
                <p>Matrícula: ${aluno.matricula}</p>
                <p>Turma: ${aluno.turma}</p>
                <p>Email: ${aluno.email}</p>
            </div>

            <div class="acoes">

                <button class="editar" onclick="editarAluno(${aluno.id})">
                    Editar
                </button>

                <button class="excluir" onclick="excluirAluno(${aluno.id})">
                    Excluir
                </button>

            </div>

        </div>`;
    });
}/* ==========================
   ATUALIZAR SELECTS
========================== */

function atualizarSelects(){

    const selectLivros = document.getElementById("livroEmprestimo");
    const selectAlunos = document.getElementById("alunoEmprestimo");

    selectLivros.innerHTML = "<option value=''>Selecione um livro</option>";
    selectAlunos.innerHTML = "<option value=''>Selecione um aluno</option>";

    livros.forEach(livro=>{
        if(livro.disponiveis > 0){
            selectLivros.innerHTML += `
            <option value="${livro.id}">
                ${livro.titulo}
            </option>`;
        }
    });

    alunos.forEach(aluno=>{
        selectAlunos.innerHTML += `
        <option value="${aluno.id}">
            ${aluno.nome}
        </option>`;
    });
}

/* ==========================
   REGISTRAR EMPRÉSTIMO
========================== */

function registrarEmprestimo(){

    const livroId = Number(document.getElementById("livroEmprestimo").value);
    const alunoId = Number(document.getElementById("alunoEmprestimo").value);

    if(!livroId || !alunoId){
        alert("Selecione livro e aluno.");
        return;
    }

    const livro = livros.find(l => l.id === livroId);
    const aluno = alunos.find(a => a.id === alunoId);

    if(!livro || !aluno) return;

    const ativos = emprestimos.filter(e =>
        e.alunoId === alunoId && e.status === "Emprestado"
    );

    if(ativos.length >= 3){
        alert("Aluno já tem 3 livros.");
        return;
    }

    if(livro.disponiveis <= 0){
        alert("Livro indisponível.");
        return;
    }

    const hoje = new Date();
    const devolucao = new Date();
    devolucao.setDate(hoje.getDate() + 7);

    emprestimos.push({
        id: Date.now(),
        livroId,
        alunoId,
        livro: livro.titulo,
        aluno: aluno.nome,
        dataEmprestimo: hoje.toLocaleDateString("pt-BR"),
        dataDevolucao: devolucao.toLocaleDateString("pt-BR"),
        status: "Emprestado"
    });

    livro.disponiveis--;

    salvarDados();
    atualizarTudo();

    alert("Empréstimo realizado!");
}

/* ==========================
   DEVOLVER LIVRO
========================== */

function devolverLivro(id){

    const emp = emprestimos.find(e => e.id === id);
    if(!emp) return;

    const livro = livros.find(l => l.id === emp.livroId);

    if(livro){
        livro.disponiveis++;
    }

    emp.status = "Devolvido";

    salvarDados();
    atualizarTudo();
}function renderizarEmprestimos(){

    const lista = document.getElementById("listaEmprestimos");
    lista.innerHTML = "";

    emprestimos.forEach(emp=>{

        let status = emp.status;

        if(emp.status === "Emprestado"){

            const hoje = new Date();
            const dataPrev = new Date(
                emp.dataDevolucao.split("/").reverse().join("-")
            );

            if(hoje > dataPrev){
                status = "Atrasado";
            }
        }

        let classe = "";

        if(status === "Emprestado") classe = "status-emprestado";
        if(status === "Atrasado") classe = "status-atrasado";
        if(status === "Devolvido") classe = "status-disponivel";

        lista.innerHTML += `
        <div class="item">

            <div class="item-info">
                <h4>${emp.livro}</h4>
                <p>Aluno: ${emp.aluno}</p>
                <p>Emprestimo: ${emp.dataEmprestimo}</p>
                <p>Devolução: ${emp.dataDevolucao}</p>
                <p class="${classe}">${status}</p>
            </div>

            <div class="acoes">

                ${emp.status === "Emprestado" ? `
                    <button class="devolver" onclick="devolverLivro(${emp.id})">
                        Devolver
                    </button>
                ` : ""}

            </div>

        </div>`;
    });
}function atualizarDashboard(){

    document.getElementById("totalLivros").textContent = livros.length;
    document.getElementById("totalAlunos").textContent = alunos.length;

    document.getElementById("totalEmprestimos").textContent =
        emprestimos.filter(e => e.status === "Emprestado").length;

    document.getElementById("totalAtrasados").textContent =
        emprestimos.filter(e => {
            if(e.status !== "Emprestado") return false;

            const hoje = new Date();
            const data = new Date(
                e.dataDevolucao.split("/").reverse().join("-")
            );

            return hoje > data;
        }).length;
}function atualizarRelatorios(){

    document.getElementById("rLivros").textContent = livros.length;
    document.getElementById("rAlunos").textContent = alunos.length;

    document.getElementById("rEmprestimos").textContent =
        emprestimos.filter(e => e.status === "Emprestado").length;

    document.getElementById("rDisponiveis").textContent =
        livros.reduce((acc, l) => acc + l.disponiveis, 0);

    document.getElementById("rAtrasados").textContent =
        emprestimos.filter(e => {
            if(e.status !== "Emprestado") return false;

            const hoje = new Date();
            const data = new Date(
                e.dataDevolucao.split("/").reverse().join("-")
            );

            return hoje > data;
        }).length;
}function atualizarTudo(){

    renderizarLivros();
    renderizarAlunos();
    renderizarEmprestimos();
    atualizarSelects();
    atualizarData();

    atualizarDashboard();
    atualizarRelatorios();
}function iniciarSistema(){

    atualizarTudo();
    setInterval(atualizarData, 1000);
}

window.onload = iniciarSistema;