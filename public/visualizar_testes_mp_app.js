console.log("visualizar_testes_mp_app.js INICIADO.");

// --- INICIALIZAÇÃO E VARIÁVEIS GLOBAIS ---
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

const mainContent = document.querySelector('main');
const listaTestesMpDiv = document.getElementById('listaTestesMp');

// --- PONTO DE ENTRADA PRINCIPAL E AUTORIZAÇÃO ---
auth.onAuthStateChanged(user => {
    if (user) {
        mainContent.style.display = 'block';
        document.getElementById('userInfo').textContent = `Logado como: ${user.email}`;

        carregarEExibirTestes(); // Carrega a lista inicial
        configurarListenersDaPagina(); // Configura todos os botões estáticos
        
    } else {
        window.location.href = 'login.html';
    }
});

/**
 * Configura todos os 'ouvintes' de eventos para elementos estáticos da página.
 */
function configurarListenersDaPagina() {
    // Listeners dos Filtros
    document.getElementById('botaoFiltrar').addEventListener('click', carregarEExibirTestes);
    document.getElementById('botaoLimparFiltros').addEventListener('click', () => {
        document.getElementById('buscaPorDescricao').value = '';
        document.getElementById('filtroResultado').value = '';
        document.getElementById('filtroDataInicio').value = '';
        document.getElementById('filtroDataFim').value = '';
        carregarEExibirTestes();
    });

    // Listeners do Modal de Edição
    document.getElementById('formEdicaoTesteMp').addEventListener('submit', salvarEdicaoTesteMp);
    document.getElementById('botaoFecharModalEdicaoTesteMp').addEventListener('click', fecharModalEdicaoTesteMp);
    document.getElementById('modalEdicaoTesteMp').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalEdicaoTesteMp')) fecharModalEdicaoTesteMp();
    });

    // Listeners do Modal de Imagem
    document.getElementById("closeImageModalBtn").addEventListener('click', fecharModalImagem);
    document.getElementById("imageModal").addEventListener('click', (e) => { if (e.target === document.getElementById("imageModal")) fecharModalImagem(); });

    // Listener do Botão de Logout
    document.getElementById('logoutButton').addEventListener('click', () => {
        auth.signOut().then(() => window.location.href = 'login.html');
    });
}

/**
 * FUNÇÃO PRINCIPAL: Carrega e exibe a lista de testes, aplicando os filtros da tela.
 */
async function carregarEExibirTestes() {
    if (!listaTestesMpDiv) return;
    listaTestesMpDiv.innerHTML = '<p>A carregar testes...</p>';

    try {
        const termoBusca = document.getElementById('buscaPorDescricao').value.toLowerCase();
        const resultadoFiltro = document.getElementById('filtroResultado').value;
        const dataInicio = document.getElementById('filtroDataInicio').value;
        const dataFim = document.getElementById('filtroDataFim').value;

        const [materiasPrimasSnapshot, tiposTesteSnapshot] = await Promise.all([
            db.collection("MateriasPrimas").get(),
            db.collection("TiposTeste").get()
        ]);
        const materiasPrimasMap = new Map(materiasPrimasSnapshot.docs.map(doc => [doc.id, doc.data()]));
        const tiposTesteMap = new Map(tiposTesteSnapshot.docs.map(doc => [doc.id, doc.data().nome_tipo_teste]));

        let query = db.collection("TestesMateriaPrima");

        if (resultadoFiltro) query = query.where("resultado", "==", resultadoFiltro);
        if (dataInicio) query = query.where("data_teste", ">=", firebase.firestore.Timestamp.fromDate(new Date(dataInicio + 'T00:00:00')));
        if (dataFim) query = query.where("data_teste", "<=", firebase.firestore.Timestamp.fromDate(new Date(dataFim + 'T23:59:59')));
        
        const querySnapshot = await query.orderBy("data_teste", "desc").get();

        const docsFiltrados = querySnapshot.docs.filter(doc => {
            if (!termoBusca) return true;
            const mpData = materiasPrimasMap.get(doc.data().id_materia_prima);
            return mpData && mpData.descricao_mp.toLowerCase().includes(termoBusca);
        });
        
        if (docsFiltrados.length === 0) {
            listaTestesMpDiv.innerHTML = '<p>Nenhum teste de matéria-prima encontrado com os filtros aplicados.</p>';
            return;
        }

        const htmlTestesItens = docsFiltrados.map(doc => {
            const teste = doc.data();
            const mpData = materiasPrimasMap.get(teste.id_materia_prima);
            const nomeMateriaPrima = mpData ? `${mpData.descricao_mp} (${mpData.codigo_interno_mp || 'S/C'})` : `ID: ${teste.id_materia_prima}`;
            const nomeTipoTeste = tiposTesteMap.get(teste.id_tipo_teste) || `ID: ${teste.id_tipo_teste}`;
            
            let fotosHtml = '<p>Sem fotos.</p>';
            if (teste.fotos_material_urls && teste.fotos_material_urls.length > 0) {
                fotosHtml = '<div class="fotos-container">' + teste.fotos_material_urls.map(url => `<img src="${url}" alt="Foto" class="thumbnail-image" data-src="${url}">`).join('') + '</div>';
            }

            return `
                <li class="item-teste" data-id="${doc.id}">
                    <h3>Matéria-Prima: ${nomeMateriaPrima}</h3>
                    <p><strong>Tipo de Teste:</strong> ${nomeTipoTeste}</p>
                    <p><strong>Data:</strong> ${formatarTimestamp(teste.data_teste)}</p>
                    <p><strong>Resultado:</strong> <span class="resultado-${(teste.resultado || '').toLowerCase().replace(' ', '-')}">${teste.resultado || 'N/A'}</span></p>
                    <p><strong>Observações:</strong> ${teste.observacoes || 'Nenhuma'}</p>
                    <div><strong>Fotos:</strong> ${fotosHtml}</div>
                    <div class="acoes-teste">
                        <button class="edit-test-btn">Editar</button>
                        <button class="delete-test-btn">Excluir</button>
                    </div>
                </li>
            `;
        }).join('');
        listaTestesMpDiv.innerHTML = `<ul>${htmlTestesItens}</ul>`;

        conectarBotoesDaLista(docsFiltrados);

    } catch (error) {
        handleError("Erro ao carregar e filtrar testes:", error);
    }
}

/**
 * Conecta os 'ouvintes' de eventos para elementos dinâmicos da lista.
 */
function conectarBotoesDaLista(docs) {
    const itensDaLista = listaTestesMpDiv.querySelectorAll('.item-teste');
    itensDaLista.forEach((item, index) => {
        const doc = docs[index];
        item.querySelector('.edit-test-btn').addEventListener('click', () => abrirModalEdicaoTesteMp(doc.id, doc.data()));
        item.querySelector('.delete-test-btn').addEventListener('click', () => excluirTesteMp(doc.id, doc.data().fotos_material_urls));
    });

    document.querySelectorAll('.thumbnail-image').forEach(img => {
        img.addEventListener('click', function() {
            document.getElementById("modalImage").src = this.dataset.src;
            document.getElementById("imageModal").style.display = "block";
        });
    });
}

// --- FUNÇÕES CRUD E MODAL (ADAPTADAS DE ANTES) ---

async function abrirModalEdicaoTesteMp(id, dados) {
    const modal = document.getElementById('modalEdicaoTesteMp');
    document.getElementById('hiddenTesteMpIdEdicao').value = id;
    document.getElementById('dataTesteEdicao').value = formatarParaInputDate(dados.data_teste);
    document.getElementById('resultadoTesteEdicao').value = dados.resultado;
    document.getElementById('observacoesTesteEdicao').value = dados.observacoes || '';

    const selectMateriaPrima = document.getElementById('materiaPrimaEdicao');
    const selectTipoTeste = document.getElementById('tipoTesteEdicao');
    selectMateriaPrima.innerHTML = '<option value="">A carregar...</option>';
    selectTipoTeste.innerHTML = '<option value="">A carregar...</option>';

    const [materiasPrimasSnapshot, tiposTesteSnapshot] = await Promise.all([
        db.collection("MateriasPrimas").orderBy("descricao_mp").get(),
        db.collection("TiposTeste").where("categoria_aplicavel", "in", ["Matéria-Prima", "Ambos"]).orderBy("nome_tipo_teste").get()
    ]);
    
    selectMateriaPrima.innerHTML = materiasPrimasSnapshot.docs.map(doc => `<option value="${doc.id}">${doc.data().descricao_mp}</option>`).join('');
    selectTipoTeste.innerHTML = tiposTesteSnapshot.docs.map(doc => `<option value="${doc.id}">${doc.data().nome_tipo_teste}</option>`).join('');
    
    selectMateriaPrima.value = dados.id_materia_prima;
    selectTipoTeste.value = dados.id_tipo_teste;
    
    modal.style.display = 'block';
}

async function salvarEdicaoTesteMp(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A salvar...';

    const id = document.getElementById('hiddenTesteMpIdEdicao').value;
    const dadosAtualizados = {
        id_materia_prima: document.getElementById('materiaPrimaEdicao').value,
        id_tipo_teste: document.getElementById('tipoTesteEdicao').value,
        data_teste: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataTesteEdicao').value + 'T00:00:00')),
        resultado: document.getElementById('resultadoTesteEdicao').value,
        observacoes: document.getElementById('observacoesTesteEdicao').value,
        data_ultima_modificacao: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("TestesMateriaPrima").doc(id).update(dadosAtualizados);
        showToast("Teste atualizado com sucesso!", "success");
        fecharModalEdicaoTesteMp();
        carregarEExibirTestes();
    } catch (error) {
        handleError("Erro ao atualizar o teste:", error);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Alterações';
    }
}

async function excluirTesteMp(id, urlsFotos) {
    if (!confirm("Tem certeza que deseja excluir este teste?")) return;
    try {
        if (urlsFotos && urlsFotos.length > 0) {
            await Promise.all(urlsFotos.map(url => storage.refFromURL(url).delete()));
        }
        await db.collection("TestesMateriaPrima").doc(id).delete();
        showToast("Teste excluído com sucesso!", "success");
        carregarEExibirTestes();
    } catch (error) {
        handleError("Erro ao excluir o teste:", error);
    }
}

// --- FUNÇÕES AUXILIARES ---

function fecharModalEdicaoTesteMp() { document.getElementById('modalEdicaoTesteMp').style.display = 'none'; }
function fecharModalImagem() { document.getElementById('imageModal').style.display = 'none'; }

function handleError(mensagem, error) {
    console.error(mensagem, error);
    showToast(mensagem, "error");
}

function formatarTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const data = timestamp.toDate();
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${data.getFullYear()}`;
}

function formatarParaInputDate(timestamp) {
    if (!timestamp) return '';
    const data = timestamp.toDate();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}