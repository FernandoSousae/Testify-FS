console.log("visualizar_testes_cp_app.js INICIADO.");

// --- INICIALIZAÇÃO E VARIÁVEIS GLOBAIS ---
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

const mainContent = document.querySelector('main');
const listaTestesCpDiv = document.getElementById('listaTestesCp');

// --- PONTO DE ENTRADA PRINCIPAL E AUTORIZAÇÃO ---
auth.onAuthStateChanged(user => {
    if (user) {
        mainContent.style.display = 'block';
        document.getElementById('userInfo').textContent = `Logado como: ${user.email}`;

        carregarEExibirTestesCp();
        configurarListenersDaPaginaCp();
        
    } else {
        window.location.href = 'login.html';
    }
});

/**
 * Configura todos os 'ouvintes' de eventos para elementos estáticos da página.
 */
function configurarListenersDaPaginaCp() {
    popularFiltroTipoTeste();
    document.getElementById('botaoFiltrarCp').addEventListener('click', carregarEExibirTestesCp);
    document.getElementById('botaoLimparFiltrosCp').addEventListener('click', () => {
        document.getElementById('buscaCp').value = '';
        document.getElementById('filtroSubCategoriaCp').value = '';
        document.getElementById('filtroTipoTesteCp').value = '';
        document.getElementById('filtroResultadoCp').value = '';
        document.getElementById('filtroDataInicioCp').value = '';
        document.getElementById('filtroDataFimCp').value = '';
        carregarEExibirTestesCp();
    });

    document.getElementById('formEdicaoTesteCp').addEventListener('submit', salvarEdicaoTesteCp);
    document.getElementById('botaoFecharModalEdicaoTesteCp').addEventListener('click', fecharModalEdicaoTesteCp);
    document.getElementById('modalEdicaoTesteCp').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalEdicaoTesteCp')) fecharModalEdicaoTesteCp();
    });

    const modalImagem = document.getElementById("imageModal");
    document.getElementById("closeImageModalBtn").addEventListener('click', () => modalImagem.style.display = 'none');
    if (modalImagem) modalImagem.addEventListener('click', (e) => { if (e.target === modalImagem) modalImagem.style.display = 'none'; });

    document.getElementById('logoutButton').addEventListener('click', () => {
        auth.signOut().then(() => window.location.href = 'login.html');
    });
}

/**
 * FUNÇÃO PRINCIPAL: Carrega e exibe a lista de testes, aplicando os filtros da tela.
 */
async function carregarEExibirTestesCp() {
    if (!listaTestesCpDiv) return;
    listaTestesCpDiv.innerHTML = '<p>A carregar testes...</p>';

    try {
        // 1. LÊ OS VALORES DOS FILTROS
        const termoBusca = document.getElementById('buscaCp').value.toLowerCase();
        const subCategoriaFiltro = document.getElementById('filtroSubCategoriaCp').value;
        const tipoTesteFiltro = document.getElementById('filtroTipoTesteCp').value;
        const resultadoFiltro = document.getElementById('filtroResultadoCp').value;
        const dataInicio = document.getElementById('filtroDataInicioCp').value;
        const dataFim = document.getElementById('filtroDataFimCp').value;

        // 2. OTIMIZAÇÃO: Busca Tipos de Teste
        const tiposTesteSnapshot = await db.collection("TiposTeste").get();
        const tiposTesteMap = new Map(tiposTesteSnapshot.docs.map(doc => [doc.id, doc.data().nome_tipo_teste]));

        // 3. CONSTRÓI A CONSULTA DINÂMICA
        let query = db.collection("TestesCalcadoPronto");
        if (subCategoriaFiltro) query = query.where("sub_categoria", "==", subCategoriaFiltro);
        if (tipoTesteFiltro) query = query.where("id_tipo_teste", "==", tipoTesteFiltro);
        if (resultadoFiltro) query = query.where("resultado", "==", resultadoFiltro);
        if (dataInicio) query = query.where("data_inicio_teste", ">=", firebase.firestore.Timestamp.fromDate(new Date(dataInicio + 'T00:00:00')));
        if (dataFim) query = query.where("data_inicio_teste", "<=", firebase.firestore.Timestamp.fromDate(new Date(dataFim + 'T23:59:59')));
        
        const querySnapshot = await query.orderBy("data_inicio_teste", "desc").get();

        // 4. FILTRO ADICIONAL POR TEXTO
        const docsFiltrados = querySnapshot.docs.filter(doc => {
            if (!termoBusca) return true;
            const teste = doc.data();
            return (teste.linha_calcado || '').toLowerCase().includes(termoBusca) || (teste.referencia_calcado || '').toLowerCase().includes(termoBusca);
        });
        
        if (docsFiltrados.length === 0) {
            listaTestesCpDiv.innerHTML = '<p>Nenhum teste de calçado pronto encontrado com os filtros aplicados.</p>';
            return;
        }

        // 5. RENDERIZA O HTML (ESTA É A PARTE CORRIGIDA)
        const htmlTestesItens = docsFiltrados.map(doc => {
            const teste = doc.data();
            const nomeTipoTeste = tiposTesteMap.get(teste.id_tipo_teste) || `ID: ${teste.id_tipo_teste}`;
            
            let fotosHtml = '<p>Sem fotos.</p>';
            if (teste.fotos_calcado_urls && teste.fotos_calcado_urls.length > 0) {
                fotosHtml = '<div class="fotos-container">' + teste.fotos_calcado_urls.map(url => `<img src="${url}" alt="Foto do calçado" class="thumbnail-image" data-src="${url}">`).join('') + '</div>';
            }

            // --- HTML CORRIGIDO E COMPLETO PARA CADA ITEM ---
            return `
                <li class="item-teste" data-id="${doc.id}">
                    <h3>Ref: ${teste.referencia_calcado || 'N/A'} (Linha: ${teste.linha_calcado || 'N/A'})</h3>
                    <p><strong>Sub-categoria:</strong> ${teste.sub_categoria || 'N/A'}</p>
                    <p><strong>Tipo de Teste:</strong> ${nomeTipoTeste}</p>
                    <p><strong>Período:</strong> ${formatarTimestamp(teste.data_inicio_teste)} a ${formatarTimestamp(teste.data_fim_teste)}</p>
                    <p><strong>Resultado:</strong> <span class="resultado-${(teste.resultado || '').toLowerCase().replace(' ', '-')}">${teste.resultado || 'N/A'}</span></p>
                    <p><strong>Responsável pelo Teste:</strong> ${teste.responsavel_teste_email || 'N/A'}</p>
                    <p><strong>Requisitante:</strong> ${teste.requisitante_teste || 'N/A'}</p>
                    <p><strong>Fábrica:</strong> ${teste.fabrica_producao || 'N/A'}</p>
                    <div><strong>Fotos:</strong> ${fotosHtml}</div>
                    <div class="acoes-teste">
                        <button class="edit-test-cp-btn">Editar</button>
                        <button class="delete-test-cp-btn">Excluir</button>
                    </div>
                </li>
            `;
        }).join('');
        listaTestesCpDiv.innerHTML = `<ul>${htmlTestesItens}</ul>`;

        // 6. CONECTA OS BOTÕES DA LISTA
        conectarBotoesDaListaCp(docsFiltrados);

    } catch (error) {
        handleError("Erro ao carregar e filtrar testes de calçado pronto:", error);
    }
}

/**
 * Conecta os 'ouvintes' de eventos para elementos dinâmicos da lista.
 */
function conectarBotoesDaListaCp(docs) {
    const itensDaLista = listaTestesCpDiv.querySelectorAll('.item-teste');
    itensDaLista.forEach((item, index) => {
        const doc = docs[index];
        // Listener para o botão de editar (já existente)
        item.querySelector('.edit-test-cp-btn').addEventListener('click', () => abrirModalEdicaoTesteCp(doc.id, doc.data()));
        // Listener para o botão de excluir (já existente)
        item.querySelector('.delete-test-cp-btn').addEventListener('click', () => excluirTesteCp(doc.id));
    });

    // ADICIONE OU VERIFIQUE ESTE TRECHO PARA AS IMAGENS
    document.querySelectorAll('.thumbnail-image').forEach(img => {
        img.addEventListener('click', function() {
            const modal = document.getElementById("imageModal");
            const modalImg = document.getElementById("modalImage");
            if (modal && modalImg) {
                modal.style.display = "block";
                modalImg.src = this.dataset.src; // Pega o link da imagem grande do atributo data-src
            }
        });
    });
}

// --- FUNÇÕES CRUD E MODAL ---

async function abrirModalEdicaoTesteCp(id, dados) {
    const modal = document.getElementById('modalEdicaoTesteCp');
    document.getElementById('hiddenTesteCpIdEdicao').value = id;
    document.getElementById('subCategoriaCpEdicao').value = dados.sub_categoria;
    document.getElementById('linhaCalcadoEdicao').value = dados.linha_calcado;
    document.getElementById('referenciaCalcadoEdicao').value = dados.referencia_calcado;
    document.getElementById('dataInicioTesteCpEdicao').value = formatarParaInputDate(dados.data_inicio_teste);
    document.getElementById('dataFimTesteCpEdicao').value = formatarParaInputDate(dados.data_fim_teste);
    document.getElementById('resultadoTesteCpEdicao').value = dados.resultado;
    document.getElementById('observacoesTesteCpEdicao').value = dados.observacoes_gerais || '';
    
    const selectTipoTeste = document.getElementById('tipoTesteCpEdicao');
    selectTipoTeste.innerHTML = '<option value="">A carregar...</option>';
    const tiposTesteSnapshot = await db.collection("TiposTeste").where("categoria_aplicavel", "in", ["Calçado Pronto", "Ambos"]).get();
    selectTipoTeste.innerHTML = tiposTesteSnapshot.docs.map(doc => `<option value="${doc.id}">${doc.data().nome_tipo_teste}</option>`).join('');
    selectTipoTeste.value = dados.id_tipo_teste;
    
    modal.style.display = 'block';
}

async function salvarEdicaoTesteCp(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A salvar...';

    const id = document.getElementById('hiddenTesteCpIdEdicao').value;
    const dadosAtualizados = {
        sub_categoria: document.getElementById('subCategoriaCpEdicao').value,
        linha_calcado: document.getElementById('linhaCalcadoEdicao').value,
        referencia_calcado: document.getElementById('referenciaCalcadoEdicao').value,
        data_inicio_teste: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataInicioTesteCpEdicao').value + 'T00:00:00')),
        data_fim_teste: document.getElementById('dataFimTesteCpEdicao').value ? firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataFimTesteCpEdicao').value + 'T00:00:00')) : null,
        id_tipo_teste: document.getElementById('tipoTesteCpEdicao').value,
        resultado: document.getElementById('resultadoTesteCpEdicao').value,
        observacoes_gerais: document.getElementById('observacoesTesteCpEdicao').value,
        data_ultima_modificacao: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("TestesCalcadoPronto").doc(id).update(dadosAtualizados);
        showToast("Teste atualizado com sucesso!", "success");
        fecharModalEdicaoTesteCp();
        carregarEExibirTestesCp();
    } catch (error) {
        handleError("Erro ao atualizar o teste:", error);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Alterações';
    }
}

async function excluirTesteCp(id) {
    if (!confirm("Tem certeza que deseja excluir este teste?")) return;
    try {
        const testeDoc = await db.collection("TestesCalcadoPronto").doc(id).get();
        if (!testeDoc.exists) throw new Error("Documento não encontrado.");
        const fotosUrls = testeDoc.data().fotos_calcado_urls || [];
        if (fotosUrls.length > 0) {
            await Promise.all(fotosUrls.map(url => storage.refFromURL(url).delete()));
        }
        await db.collection("TestesCalcadoPronto").doc(id).delete();
        showToast("Teste excluído com sucesso!", "success");
        carregarEExibirTestesCp();
    } catch (error) {
        handleError("Erro ao excluir o teste:", error);
    }
}

// --- FUNÇÕES AUXILIARES ---
function fecharModalEdicaoTesteCp() { document.getElementById('modalEdicaoTesteCp').style.display = 'none'; }
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

/**
 * NOVO: Função para buscar os tipos de teste e popular o dropdown de filtro.
 */
async function popularFiltroTipoTeste() {
    const selectFiltro = document.getElementById('filtroTipoTesteCp');
    try {
        const tiposTesteSnapshot = await db.collection("TiposTeste")
            .where("categoria_aplicavel", "in", ["Calçado Pronto", "Ambos"])
            .orderBy("nome_tipo_teste")
            .get();

        // Limpa opções antigas (exceto a primeira "Todos")
        selectFiltro.innerHTML = '<option value="">Todos os Tipos de Teste</option>';

        tiposTesteSnapshot.forEach(doc => {
            selectFiltro.innerHTML += `<option value="${doc.id}">${doc.data().nome_tipo_teste}</option>`;
        });
    } catch (error) {
        console.error("Erro ao popular filtro de tipos de teste:", error);
    }
}