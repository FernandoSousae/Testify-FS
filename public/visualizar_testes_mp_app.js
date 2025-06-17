console.log("visualizar_testes_mp_app.js INICIADO.");

// --- INICIALIZAÇÃO E VARIÁVEIS GLOBAIS ---
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

const mainContent = document.querySelector('main');
const listaTestesMpDiv = document.getElementById('listaTestesMp');

// --- VARIÁVEIS DE ESTADO PARA PAGINAÇÃO ---
const TAMANHO_PAGINA = 5;
let primeiroDocumentoDaPagina = null;
let ultimoDocumentoDaPagina = null;
let paginaAtual = 1;

// --- VARIÁVEIS DE ESTADO PARA A GALERIA DE IMAGENS ---
let galeriaImagensAtual = [];
let indiceImagemAtual = 0;

// --- VARIÁVEL PARA CONTROLE DE EXCLUSÃO DE FOTOS NO MODAL ---
let urlsParaExcluir = [];


// --- PONTO DE ENTRADA PRINCIPAL E AUTORIZAÇÃO ---
auth.onAuthStateChanged(user => {
    if (user) {
        mainContent.style.display = 'block';
        document.getElementById('userInfo').textContent = `Logado como: ${user.email}`;
        carregarEExibirTestes('primeira');
        configurarListenersDaPagina();
    } else {
        window.location.href = 'login.html';
    }
});

function configurarListenersDaPagina() {
    document.getElementById('botaoFiltrar').addEventListener('click', () => carregarEExibirTestes('primeira'));
    document.getElementById('botaoLimparFiltros').addEventListener('click', () => {
        document.getElementById('buscaPorDescricao').value = '';
        document.getElementById('filtroResultado').value = '';
        document.getElementById('filtroDataInicio').value = '';
        document.getElementById('filtroDataFim').value = '';
        carregarEExibirTestes('primeira');
    });
    document.getElementById('botaoProximo').addEventListener('click', () => carregarEExibirTestes('proximo'));
    document.getElementById('botaoAnterior').addEventListener('click', () => carregarEExibirTestes('anterior'));
    document.getElementById('formEdicaoTesteMp').addEventListener('submit', salvarEdicaoTesteMp);
    document.getElementById('botaoFecharModalEdicaoTesteMp').addEventListener('click', fecharModalEdicaoTesteMp);
    document.getElementById('modalEdicaoTesteMp').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalEdicaoTesteMp')) fecharModalEdicaoTesteMp();
    });

    // Listeners do Modal de Imagem (com as setas)
    document.getElementById("closeImageModalBtn").addEventListener('click', fecharModalImagem);
    document.getElementById('modalNextBtn').addEventListener('click', mostrarProximaImagem);
    document.getElementById('modalPrevBtn').addEventListener('click', mostrarImagemAnterior);

    document.getElementById('logoutButton').addEventListener('click', () => {
        auth.signOut().then(() => window.location.href = 'login.html');
    });
}

// --- FUNÇÕES DA GALERIA ---
function abrirModalImagem(urls, startIndex) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    if (!modal || !modalImg) return;

    galeriaImagensAtual = urls;
    indiceImagemAtual = startIndex;
    
    modalImg.src = galeriaImagensAtual[indiceImagemAtual];
    modal.style.display = "block";

    document.addEventListener('keydown', navegarComTeclado);
}

function fecharModalImagem() {
    const modal = document.getElementById('imageModal');
    if (modal) modal.style.display = 'none';
    document.removeEventListener('keydown', navegarComTeclado);
}

function mostrarProximaImagem() {
    indiceImagemAtual = (indiceImagemAtual + 1) % galeriaImagensAtual.length;
    document.getElementById('modalImage').src = galeriaImagensAtual[indiceImagemAtual];
}

function mostrarImagemAnterior() {
    indiceImagemAtual = (indiceImagemAtual - 1 + galeriaImagensAtual.length) % galeriaImagensAtual.length;
    document.getElementById('modalImage').src = galeriaImagensAtual[indiceImagemAtual];
}

function navegarComTeclado(e) {
    if (e.key === "ArrowRight") {
        mostrarProximaImagem();
    } else if (e.key === "ArrowLeft") {
        mostrarImagemAnterior();
    } else if (e.key === "Escape") {
        fecharModalImagem();
    }
}

function conectarBotoesDaLista(docs) {
    const itensDaLista = listaTestesMpDiv.querySelectorAll('.item-teste');
    itensDaLista.forEach((item, index) => {
        const doc = docs[index];
        item.querySelector('.edit-test-btn').addEventListener('click', () => abrirModalEdicaoTesteMp(doc.id, doc.data()));
        item.querySelector('.delete-test-btn').addEventListener('click', () => excluirTesteMp(doc.id, doc.data().fotos_material_urls));

        const thumbnails = item.querySelectorAll('.thumbnail-image');
        const urlsDasImagensDoItem = Array.from(thumbnails).map(t => t.dataset.src);

        thumbnails.forEach((img, idx) => {
            img.addEventListener('click', function() {
                abrirModalImagem(urlsDasImagensDoItem, idx);
            });
        });
    });
}

async function carregarEExibirTestes(direcao = 'primeira') {
    if (!listaTestesMpDiv) return;
    listaTestesMpDiv.innerHTML = '<p>A carregar testes...</p>';
    
    try {
        const [materiasPrimasMap, tiposTesteMap] = await preCarregarDadosDeApoio();
        let query = construirQueryComFiltros();
        
        let queryPaginada;
        if (direcao === 'primeira') {
            paginaAtual = 1;
            queryPaginada = query.orderBy("data_teste", "desc").limit(TAMANHO_PAGINA);
        } else if (direcao === 'proximo' && ultimoDocumentoDaPagina) {
            queryPaginada = query.orderBy("data_teste", "desc").startAfter(ultimoDocumentoDaPagina).limit(TAMANHO_PAGINA);
        } else if (direcao === 'anterior' && primeiroDocumentoDaPagina) {
            queryPaginada = query.orderBy("data_teste", "asc").startAfter(primeiroDocumentoDaPagina).limit(TAMANHO_PAGINA);
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
            else listaTestesMpDiv.innerHTML = '<p>Nenhum teste encontrado com os filtros aplicados.</p>';
            atualizarEstadoBotoes(0, direcao);
            return;
        }

        primeiroDocumentoDaPagina = docs[0];
        ultimoDocumentoDaPagina = docs[docs.length - 1];

        renderizarLista(docs, materiasPrimasMap, tiposTesteMap);
        atualizarEstadoBotoes(docs.length, direcao);

    } catch (error) {
        handleError("Erro ao carregar e filtrar testes:", error);
    }
}

function atualizarEstadoBotoes(tamanhoResultado, direcao) {
    const botaoAnterior = document.getElementById('botaoAnterior');
    const botaoProximo = document.getElementById('botaoProximo');
    
    if (direcao === 'proximo' && tamanhoResultado > 0) paginaAtual++;
    if (direcao === 'anterior' && tamanhoResultado > 0) paginaAtual--;
    if (direcao === 'primeira') paginaAtual = 1;

    botaoAnterior.disabled = paginaAtual <= 1;
    botaoAnterior.style.opacity = botaoAnterior.disabled ? '0.6' : '1';
    botaoAnterior.style.cursor = botaoAnterior.disabled ? 'not-allowed' : 'pointer';

    botaoProximo.disabled = tamanhoResultado < TAMANHO_PAGINA;
    botaoProximo.style.opacity = botaoProximo.disabled ? '0.6' : '1';
    botaoProximo.style.cursor = botaoProximo.disabled ? 'not-allowed' : 'pointer';
}

function construirQueryComFiltros() {
    const resultadoFiltro = document.getElementById('filtroResultado').value;
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;
    
    let query = db.collection("TestesMateriaPrima");
    if (resultadoFiltro) query = query.where("resultado", "==", resultadoFiltro);
    if (dataInicio) query = query.where("data_teste", ">=", firebase.firestore.Timestamp.fromDate(new Date(dataInicio + 'T00:00:00')));
    if (dataFim) query = query.where("data_teste", "<=", firebase.firestore.Timestamp.fromDate(new Date(dataFim + 'T23:59:59')));
    
    return query;
}

async function preCarregarDadosDeApoio() {
    const [materiasPrimasSnapshot, tiposTesteSnapshot] = await Promise.all([
        db.collection("MateriasPrimas").get(),
        db.collection("TiposTeste").get()
    ]);
    const materiasPrimasMap = new Map(materiasPrimasSnapshot.docs.map(doc => [doc.id, doc.data()]));
    const tiposTesteMap = new Map(tiposTesteSnapshot.docs.map(doc => [doc.id, doc.data().nome_tipo_teste]));
    return [materiasPrimasMap, tiposTesteMap];
}

function renderizarLista(docs, materiasPrimasMap, tiposTesteMap) {
    const termoBusca = document.getElementById('buscaPorDescricao').value.toLowerCase();
    const docsFiltrados = docs.filter(doc => {
        if (!termoBusca) return true;
        const mpData = materiasPrimasMap.get(doc.data().id_materia_prima);
        return mpData && mpData.descricao_mp.toLowerCase().includes(termoBusca);
    });

    if (docsFiltrados.length === 0) {
        listaTestesMpDiv.innerHTML = '<p>Nenhum teste encontrado nesta página com a busca aplicada.</p>';
        return;
    }

    const htmlTestesItens = docsFiltrados.map(doc => {
        const teste = doc.data();
        const mpData = materiasPrimasMap.get(teste.id_materia_prima);
        const nomeMateriaPrima = mpData ? `${mpData.descricao_mp} (${mpData.codigo_interno_mp || 'S/C'})` : `ID: ${teste.id_materia_prima}`;
        const nomeTipoTeste = tiposTesteMap.get(teste.id_tipo_teste) || `ID: ${teste.id_tipo_teste}`;
        const fotosHtml = (teste.fotos_material_urls && teste.fotos_material_urls.length > 0) 
            ? '<div class="fotos-container">' + teste.fotos_material_urls.map(url => `<img src="${url}" alt="Foto" class="thumbnail-image" data-src="${url}">`).join('') + '</div>'
            : '<p>Sem fotos.</p>';
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
}

async function abrirModalEdicaoTesteMp(id, dados) {
    const modal = document.getElementById('modalEdicaoTesteMp');
    document.getElementById('hiddenTesteMpIdEdicao').value = id;
    document.getElementById('dataTesteEdicao').value = formatarParaInputDate(dados.data_teste);
    document.getElementById('resultadoTesteEdicao').value = dados.resultado;
    document.getElementById('observacoesTesteEdicao').value = dados.observacoes || '';
    
    // Limpa a lista de fotos a excluir
    urlsParaExcluir = [];

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

    const fotosContainer = document.getElementById('fotosExistentesContainer');
    const urlsFotos = dados.fotos_material_urls || [];
    if (urlsFotos.length > 0) {
        // Gera o HTML para cada foto com um botão de exclusão
        fotosContainer.innerHTML = urlsFotos.map(url => `
            <div class="photo-wrapper">
                <img src="${url}" alt="Foto existente">
                <button type="button" class="delete-photo-btn" data-url="${encodeURIComponent(url)}">&times;</button>
            </div>
        `).join('');

        // Adiciona os event listeners para os novos botões de exclusão
        fotosContainer.querySelectorAll('.delete-photo-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault(); // Impede o submit do formulário
                const urlParaExcluir = decodeURIComponent(this.dataset.url);
                
                // Adiciona a URL à lista de exclusão se ainda não estiver lá
                if (!urlsParaExcluir.includes(urlParaExcluir)) {
                    urlsParaExcluir.push(urlParaExcluir);
                }
                
                // Remove o elemento da foto da tela para feedback visual imediato
                this.parentElement.style.display = 'none';
                showToast("Foto marcada para exclusão.", "info");
            });
        });
    } else {
        fotosContainer.innerHTML = '<p>Nenhuma foto cadastrada para este teste.</p>';
    }
    document.getElementById('fotosMaterialEdicao').value = '';

    modal.style.display = 'block';
}

async function salvarEdicaoTesteMp(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A salvar...';

    const id = document.getElementById('hiddenTesteMpIdEdicao').value;
    const user = auth.currentUser;
    if (!user) {
        showToast("Usuário não autenticado. Faça login novamente.", "error");
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Alterações';
        return;
    }

    try {
        // 1. Upload de novas fotos
        const inputNovasFotos = document.getElementById('fotosMaterialEdicao');
        const arquivos = inputNovasFotos.files;
        let novasUrlsFotos = [];
        if (arquivos.length > 0) {
            submitButton.textContent = 'Enviando fotos...';
            const uploadPromises = Array.from(arquivos).map(arquivo => {
                const nomeArquivo = `testes_materia_prima_fotos/${user.uid}_${Date.now()}_${arquivo.name}`;
                const arquivoRef = storage.ref(nomeArquivo);
                return arquivoRef.put(arquivo).then(snapshot => snapshot.ref.getDownloadURL());
            });
            novasUrlsFotos = await Promise.all(uploadPromises);
        }
        
        submitButton.textContent = 'A salvar dados...';
        
        // 2. Obter URLs atuais e filtrar as que foram marcadas para exclusão
        const testeDocRef = db.collection("TestesMateriaPrima").doc(id);
        const testeDoc = await testeDocRef.get();
        const dadosAtuais = testeDoc.data();
        
        const urlsFotosExistentes = (dadosAtuais.fotos_material_urls || []).filter(url => !urlsParaExcluir.includes(url));
        const urlsCombinadas = [...urlsFotosExistentes, ...novasUrlsFotos];

        // 3. Preparar dados para atualização
        const dadosAtualizados = {
            id_materia_prima: document.getElementById('materiaPrimaEdicao').value,
            id_tipo_teste: document.getElementById('tipoTesteEdicao').value,
            data_teste: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataTesteEdicao').value + 'T00:00:00')),
            resultado: document.getElementById('resultadoTesteEdicao').value,
            observacoes: document.getElementById('observacoesTesteEdicao').value,
            fotos_material_urls: urlsCombinadas,
            data_ultima_modificacao: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 4. Atualizar o documento no Firestore
        await testeDocRef.update(dadosAtualizados);

        // 5. Excluir as fotos marcadas do Storage
        if (urlsParaExcluir.length > 0) {
            const deletePromises = urlsParaExcluir.map(url => storage.refFromURL(url).delete());
            await Promise.all(deletePromises);
        }

        showToast("Teste atualizado com sucesso!", "success");
        fecharModalEdicaoTesteMp();
        carregarEExibirTestes('primeira');

    } catch (error) {
        handleError("Erro ao atualizar o teste:", error);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Alterações';
    }
}

async function excluirTesteMp(id, urlsFotos) {
    if (!confirm("Tem certeza que deseja excluir este teste? Esta ação também excluirá todas as fotos associadas.")) return;
    try {
        if (urlsFotos && urlsFotos.length > 0) {
            const deletePromises = urlsFotos.map(url => storage.refFromURL(url).delete());
            await Promise.all(deletePromises);
        }
        await db.collection("TestesMateriaPrima").doc(id).delete();
        showToast("Teste excluído com sucesso!", "success");
        carregarEExibirTestes('primeira');
    } catch (error) {
        handleError("Erro ao excluir o teste:", error);
    }
}

function fecharModalEdicaoTesteMp() { document.getElementById('modalEdicaoTesteMp').style.display = 'none'; }
function handleError(mensagem, error) {
    console.error(mensagem, error);
    showToast(mensagem, "error");
}
function formatarTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const data = timestamp.toDate();
    return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}
function formatarParaInputDate(timestamp) {
    if (!timestamp) return '';
    const data = timestamp.toDate();
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}