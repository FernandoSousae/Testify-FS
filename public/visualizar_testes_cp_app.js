console.log("visualizar_testes_cp_app.js INICIADO.");

const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

const mainContent = document.querySelector('main');
const listaTestesCpDiv = document.getElementById('listaTestesCp');

const TAMANHO_PAGINA_CP = 5;
let primeiroDocumentoDaPaginaCp = null;
let ultimoDocumentoDaPaginaCp = null;
let paginaAtualCp = 1;

auth.onAuthStateChanged(user => {
    if (user) {
        mainContent.style.display = 'block';
        document.getElementById('userInfo').textContent = `Logado como: ${user.email}`;
        carregarEExibirTestesCp('primeira');
        configurarListenersDaPaginaCp();
    } else {
        window.location.href = 'login.html';
    }
});

function configurarListenersDaPaginaCp() {
    popularFiltroTipoTeste();
    document.getElementById('botaoFiltrarCp').addEventListener('click', () => carregarEExibirTestesCp('primeira'));
    document.getElementById('botaoLimparFiltrosCp').addEventListener('click', () => {
        document.getElementById('buscaCp').value = '';
        document.getElementById('filtroSubCategoriaCp').value = '';
        document.getElementById('filtroTipoTesteCp').value = '';
        document.getElementById('filtroResultadoCp').value = '';
        document.getElementById('filtroDataInicioCp').value = '';
        document.getElementById('filtroDataFimCp').value = '';
        carregarEExibirTestesCp('primeira');
    });
    document.getElementById('botaoProximo').addEventListener('click', () => carregarEExibirTestesCp('proximo'));
    document.getElementById('botaoAnterior').addEventListener('click', () => carregarEExibirTestesCp('anterior'));
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

async function popularFiltroTipoTeste() {
    const selectFiltro = document.getElementById('filtroTipoTesteCp');
    try {
        const snapshot = await db.collection("TiposTeste").where("categoria_aplicavel", "in", ["Calçado Pronto", "Ambos"]).orderBy("nome_tipo_teste").get();
        selectFiltro.innerHTML = '<option value="">Todos os Tipos de Teste</option>';
        snapshot.forEach(doc => selectFiltro.innerHTML += `<option value="${doc.id}">${doc.data().nome_tipo_teste}</option>`);
    } catch (error) {
        console.error("Erro ao popular filtro de tipos de teste:", error);
    }
}

async function carregarEExibirTestesCp(direcao = 'primeira') {
    if (!listaTestesCpDiv) return;
    listaTestesCpDiv.innerHTML = '<p>A carregar testes...</p>';
    try {
        const tiposTesteMap = new Map((await db.collection("TiposTeste").get()).docs.map(doc => [doc.id, doc.data().nome_tipo_teste]));
        let query = construirQueryComFiltrosCp();
        
        let queryPaginada;
        if (direcao === 'primeira') {
            queryPaginada = query.orderBy("data_inicio_teste", "desc").limit(TAMANHO_PAGINA_CP);
        } else if (direcao === 'proximo' && ultimoDocumentoDaPaginaCp) {
            queryPaginada = query.orderBy("data_inicio_teste", "desc").startAfter(ultimoDocumentoDaPaginaCp).limit(TAMANHO_PAGINA_CP);
        } else if (direcao === 'anterior' && primeiroDocumentoDaPaginaCp) {
            queryPaginada = query.orderBy("data_inicio_teste", "asc").startAfter(primeiroDocumentoDaPaginaCp).limit(TAMANHO_PAGINA_CP);
        } else {
            return; 
        }
        
        const querySnapshot = await queryPaginada.get();
        let docs = querySnapshot.docs;

        if (direcao === 'anterior') {
            docs.reverse();
        }

        if (docs.length === 0) {
            if (direcao !== 'primeira') showToast("Não há mais testes para mostrar.", "info");
            else listaTestesCpDiv.innerHTML = '<p>Nenhum teste encontrado com os filtros aplicados.</p>';
            atualizarEstadoBotoesCp(0, direcao);
            return;
        }
        
        primeiroDocumentoDaPaginaCp = docs[0];
        ultimoDocumentoDaPaginaCp = docs[docs.length - 1];

        renderizarListaCp(docs, tiposTesteMap);
        atualizarEstadoBotoesCp(docs.length, direcao);
    } catch (error) {
        handleError("Erro ao carregar e filtrar testes de calçado pronto:", error);
    }
}

function construirQueryComFiltrosCp() {
    const subCategoriaFiltro = document.getElementById('filtroSubCategoriaCp').value;
    const tipoTesteFiltro = document.getElementById('filtroTipoTesteCp').value;
    const resultadoFiltro = document.getElementById('filtroResultadoCp').value;
    const dataInicio = document.getElementById('filtroDataInicioCp').value;
    const dataFim = document.getElementById('filtroDataFimCp').value;
    let query = db.collection("TestesCalcadoPronto");
    if (subCategoriaFiltro) query = query.where("sub_categoria", "==", subCategoriaFiltro);
    if (tipoTesteFiltro) query = query.where("id_tipo_teste", "==", tipoTesteFiltro);
    if (resultadoFiltro) query = query.where("resultado", "==", resultadoFiltro);
    if (dataInicio) query = query.where("data_inicio_teste", ">=", firebase.firestore.Timestamp.fromDate(new Date(dataInicio + 'T00:00:00')));
    if (dataFim) query = query.where("data_inicio_teste", "<=", firebase.firestore.Timestamp.fromDate(new Date(dataFim + 'T23:59:59')));
    return query;
}

function renderizarListaCp(docs, tiposTesteMap) {
    const termoBusca = document.getElementById('buscaCp').value.toLowerCase();
    const docsFiltrados = docs.filter(doc => {
        if (!termoBusca) return true;
        const t = doc.data();
        return (t.linha_calcado || '').toLowerCase().includes(termoBusca) || (t.referencia_calcado || '').toLowerCase().includes(termoBusca);
    });
    if (docsFiltrados.length === 0) {
        listaTestesCpDiv.innerHTML = '<p>Nenhum teste encontrado nesta página com a busca aplicada.</p>';
        return;
    }
    const htmlTestesItens = docsFiltrados.map(doc => {
        const t = doc.data();
        const nomeTipoTeste = tiposTesteMap.get(t.id_tipo_teste) || `ID: ${t.id_tipo_teste}`;
        let fotosHtml = '<p>Sem fotos.</p>';
        if (t.fotos_calcado_urls && t.fotos_calcado_urls.length > 0) {
            fotosHtml = '<div class="fotos-container">' + t.fotos_calcado_urls.map(url => `<img src="${url}" alt="Foto do calçado" class="thumbnail-image" data-src="${url}">`).join('') + '</div>';
        }
        return `<li class="item-teste" data-id="${doc.id}"><h3>Ref: ${t.referencia_calcado||'N/A'} (Linha: ${t.linha_calcado||'N/A'})</h3><p><strong>Sub-categoria:</strong> ${t.sub_categoria||'N/A'}</p><p><strong>Tipo de Teste:</strong> ${nomeTipoTeste}</p><p><strong>Período:</strong> ${formatarTimestamp(t.data_inicio_teste)} a ${formatarTimestamp(t.data_fim_teste)}</p><p><strong>Resultado:</strong> <span class="resultado-${(t.resultado||'').toLowerCase().replace(' ','-')}">${t.resultado||'N/A'}</span></p><p><strong>Responsável pelo Teste:</strong> ${t.responsavel_teste_email||'N/A'}</p><p><strong>Requisitante:</strong> ${t.requisitante_teste||'N/A'}</p><p><strong>Fábrica:</strong> ${t.fabrica_producao||'N/A'}</p><div><strong>Fotos:</strong> ${fotosHtml}</div><div class="acoes-teste"><button class="edit-test-cp-btn">Editar</button><button class="delete-test-cp-btn">Excluir</button></div></li>`;
    }).join('');
    listaTestesCpDiv.innerHTML = `<ul>${htmlTestesItens}</ul>`;
    conectarBotoesDaListaCp(docsFiltrados);
}

function atualizarEstadoBotoesCp(tamanhoResultado, direcao) {
    const botaoAnterior = document.getElementById('botaoAnterior');
    const botaoProximo = document.getElementById('botaoProximo');
    
    if (direcao === 'proximo' && tamanhoResultado > 0) paginaAtualCp++;
    if (direcao === 'anterior' && tamanhoResultado > 0) paginaAtualCp--;
    if (direcao === 'primeira') paginaAtualCp = 1;

    botaoAnterior.disabled = paginaAtualCp <= 1;
    botaoAnterior.style.opacity = botaoAnterior.disabled ? '0.6' : '1';
    botaoAnterior.style.cursor = botaoAnterior.disabled ? 'not-allowed' : 'pointer';

    botaoProximo.disabled = tamanhoResultado < TAMANHO_PAGINA_CP;
    botaoProximo.style.opacity = botaoProximo.disabled ? '0.6' : '1';
    botaoProximo.style.cursor = botaoProximo.disabled ? 'not-allowed' : 'pointer';
}

function conectarBotoesDaListaCp(docs) {
    const itens = listaTestesCpDiv.querySelectorAll('.item-teste');
    itens.forEach((item, i) => {
        item.querySelector('.edit-test-cp-btn').addEventListener('click', () => abrirModalEdicaoTesteCp(docs[i].id, docs[i].data()));
        item.querySelector('.delete-test-cp-btn').addEventListener('click', () => excluirTesteCp(docs[i].id, docs[i].data().fotos_calcado_urls));
    });
    document.querySelectorAll('.thumbnail-image').forEach(img => {
        img.addEventListener('click', function() {
            const modal = document.getElementById("imageModal");
            const modalImg = document.getElementById("modalImage");
            if (modal && modalImg) {
                modal.style.display = "block";
                modalImg.src = this.dataset.src;
            }
        });
    });
}

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
    const snapshot = await db.collection("TiposTeste").where("categoria_aplicavel", "in", ["Calçado Pronto", "Ambos"]).get();
    selectTipoTeste.innerHTML = snapshot.docs.map(doc => `<option value="${doc.id}">${doc.data().nome_tipo_teste}</option>`).join('');
    selectTipoTeste.value = dados.id_tipo_teste;

    // NOVO: Carrega as fotos existentes
    const fotosContainer = document.getElementById('fotosExistentesCpContainer');
    const urlsFotos = dados.fotos_calcado_urls || [];
    if (urlsFotos.length > 0) {
        fotosContainer.innerHTML = urlsFotos.map(url => `<img src="${url}" alt="Foto existente">`).join('');
    } else {
        fotosContainer.innerHTML = '<p>Nenhuma foto cadastrada para este teste.</p>';
    }
    document.getElementById('fotosCalcadoEdicao').value = ''; // Limpa o seletor de arquivos

    modal.style.display = 'block';
}

async function salvarEdicaoTesteCp(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'A salvar...';

    const id = document.getElementById('hiddenTesteCpIdEdicao').value;
    const user = auth.currentUser;
    if (!user) {
        showToast("Usuário não autenticado. Faça login novamente.", "error");
        return;
    }

    // --- LÓGICA DE UPLOAD DE NOVAS FOTOS ---
    const inputNovasFotos = document.getElementById('fotosCalcadoEdicao');
    const arquivos = inputNovasFotos.files;
    const novasUrlsFotos = [];

    if (arquivos.length > 0) {
        btn.textContent = 'Enviando fotos...';
        const uploadPromises = [];
        for (let i = 0; i < arquivos.length; i++) {
            const arquivo = arquivos[i];
            const nomeArquivo = `testes_calcado_pronto_fotos/${user.uid}_${Date.now()}_${arquivo.name}`;
            const arquivoRef = storage.ref(nomeArquivo);
            uploadPromises.push(arquivoRef.put(arquivo).then(snapshot => snapshot.ref.getDownloadURL()));
        }
        try {
            const urlsResolvidas = await Promise.all(uploadPromises);
            novasUrlsFotos.push(...urlsResolvidas);
        } catch (error) {
            handleError("Erro no upload das novas fotos. As alterações não foram salvas.", error);
            btn.disabled = false;
            btn.textContent = 'Salvar Alterações';
            return;
        }
    }

    btn.textContent = 'A salvar dados...';
    try {
        const testeDocRef = db.collection("TestesCalcadoPronto").doc(id);
        const testeDoc = await testeDocRef.get();
        const dadosAtuais = testeDoc.data();
        
        const urlsFotosExistentes = dadosAtuais.fotos_calcado_urls || [];
        const urlsCombinadas = [...urlsFotosExistentes, ...novasUrlsFotos];
        
        const dados = {
            sub_categoria: document.getElementById('subCategoriaCpEdicao').value,
            linha_calcado: document.getElementById('linhaCalcadoEdicao').value,
            referencia_calcado: document.getElementById('referenciaCalcadoEdicao').value,
            data_inicio_teste: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataInicioTesteCpEdicao').value + 'T00:00:00')),
            data_fim_teste: document.getElementById('dataFimTesteCpEdicao').value ? firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataFimTesteCpEdicao').value + 'T00:00:00')) : null,
            id_tipo_teste: document.getElementById('tipoTesteCpEdicao').value,
            resultado: document.getElementById('resultadoTesteCpEdicao').value,
            observacoes_gerais: document.getElementById('observacoesTesteCpEdicao').value,
            fotos_calcado_urls: urlsCombinadas,
            data_ultima_modificacao: firebase.firestore.FieldValue.serverTimestamp()
        };

        await testeDocRef.update(dados);
        showToast("Teste atualizado com sucesso!", "success");
        fecharModalEdicaoTesteCp();
        carregarEExibirTestesCp('primeira');
    } catch (e) {
        handleError("Erro ao atualizar o teste:", e);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar Alterações';
    }
}

async function excluirTesteCp(id, urlsFotos) {
    if (!confirm("Tem certeza que deseja excluir este teste?")) return;
    try {
        if (urlsFotos && urlsFotos.length > 0) {
            await Promise.all(urlsFotos.map(url => storage.refFromURL(url).delete()));
        }
        await db.collection("TestesCalcadoPronto").doc(id).delete();
        showToast("Teste excluído com sucesso!", "success");
        carregarEExibirTestesCp('primeira');
    } catch (e) {
        handleError("Erro ao excluir o teste:", e);
    }
}

function fecharModalEdicaoTesteCp() { document.getElementById('modalEdicaoTesteCp').style.display = 'none'; }
function fecharModalImagem() { document.getElementById('imageModal').style.display = 'none'; }
function handleError(msg, err) { console.error(msg, err); showToast(msg, "error"); }
function formatarTimestamp(ts) { if (!ts) return 'N/A'; const d = ts.toDate(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }
function formatarParaInputDate(ts) { if (!ts) return ''; const d = ts.toDate(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }