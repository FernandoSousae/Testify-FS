console.log("visualizar_testes_cp_app.js INICIADO.");

// --- VARIÁVEIS GLOBAIS E REFERÊNCIAS ---
const db = firebase.firestore();
const storage = firebase.storage();
const listaTestesCpDiv = document.getElementById('listaTestesCp');

// --- FUNÇÕES HELPER (Utilitários) ---
function formatarTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const data = timestamp.toDate();
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

function formatarParaInputDate(timestamp) {
    if (!timestamp) return '';
    const data = timestamp.toDate();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// --- FUNÇÕES CRUD (Create, Read, Update, Delete) ---

// READ: Carrega e exibe a lista de testes
async function carregarEExibirTestesCp() {
    if (!listaTestesCpDiv) return;
    listaTestesCpDiv.innerHTML = '<p>A carregar testes...</p>';

    try {
        const tiposTesteSnapshot = await db.collection("TiposTeste").get();
        const tiposTesteMap = new Map();
        tiposTesteSnapshot.forEach(doc => {
            tiposTesteMap.set(doc.id, doc.data().nome_tipo_teste);
        });

        const querySnapshot = await db.collection("TestesCalcadoPronto").orderBy("data_cadastro", "desc").get();

        if (querySnapshot.empty) {
            listaTestesCpDiv.innerHTML = '<p>Nenhum teste de calçado pronto encontrado.</p>';
            return;
        }

        let htmlTestesItens = querySnapshot.docs.map(doc => {
            const teste = doc.data();
            const idTeste = doc.id;
            const nomeTipoTeste = tiposTesteMap.get(teste.id_tipo_teste) || `ID: ${teste.id_tipo_teste}`;
            
            let fotosHtml = '<p>Sem fotos.</p>';
            if (teste.fotos_calcado_urls && teste.fotos_calcado_urls.length > 0) {
                fotosHtml = '<div class="fotos-container">' + teste.fotos_calcado_urls.map(url => `<img src="${url}" alt="Foto do calçado" class="thumbnail-image" data-src="${url}">`).join('') + '</div>';
            }

            return `
                <li class="item-teste" data-id="${idTeste}">
                    <h3>Ref: ${teste.referencia_calcado || 'N/A'} (Linha: ${teste.linha_calcado || 'N/A'})</h3>
                    <p><strong>Sub-categoria:</strong> ${teste.sub_categoria || 'N/A'}</p>
                    <p><strong>Tipo de Teste:</strong> ${nomeTipoTeste}</p>
                    <p><strong>Data Início:</strong> ${formatarTimestamp(teste.data_inicio_teste)}</p>
                    <p><strong>Data Fim:</strong> ${formatarTimestamp(teste.data_fim_teste)}</p>
                    <p><strong>Resultado:</strong> ${teste.resultado || 'N/A'}</p>
                    <p><strong>Responsável:</strong> ${teste.responsavel_teste_email || 'N/A'}</p>
                    <div><strong>Fotos:</strong> ${fotosHtml}</div>
                    <div class="acoes-teste">
                        <button class="edit-test-cp-btn" data-id="${idTeste}">Editar</button>
                        <button class="delete-test-cp-btn" data-id="${idTeste}">Excluir</button>
                    </div>
                </li>
            `;
        }).join('');

        listaTestesCpDiv.innerHTML = `<ul>${htmlTestesItens}</ul>`;

        // CONEXÃO DOS BOTÕES E IMAGENS DA LISTA (aqui os listeners são conectados)
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

        document.querySelectorAll('.edit-test-cp-btn').forEach(button => {
            button.addEventListener('click', function() {
                const testeId = this.dataset.id;
                db.collection("TestesCalcadoPronto").doc(testeId).get().then(doc => {
                    if (doc.exists) abrirModalEdicaoTesteCp(testeId, doc.data());
                });
            });
        });

        document.querySelectorAll('.delete-test-cp-btn').forEach(button => {
            button.addEventListener('click', function() {
                excluirTesteCp(this.dataset.id);
            });
        });

    } catch (error) {
        console.error("Erro ao carregar testes de calçado pronto:", error);
        listaTestesCpDiv.innerHTML = '<p style="color:red;">Erro ao carregar testes.</p>';
    }
}

// UPDATE (Parte 1): Abre o modal de edição
async function abrirModalEdicaoTesteCp(testeId, dadosTeste) {
    const modal = document.getElementById('modalEdicaoTesteCp');
    if (!modal) return;

    document.getElementById('hiddenTesteCpIdEdicao').value = testeId;
    document.getElementById('subCategoriaCpEdicao').value = dadosTeste.sub_categoria;
    document.getElementById('linhaCalcadoEdicao').value = dadosTeste.linha_calcado;
    document.getElementById('referenciaCalcadoEdicao').value = dadosTeste.referencia_calcado;
    document.getElementById('dataInicioTesteCpEdicao').value = formatarParaInputDate(dadosTeste.data_inicio_teste);
    document.getElementById('dataFimTesteCpEdicao').value = formatarParaInputDate(dadosTeste.data_fim_teste);
    document.getElementById('resultadoTesteCpEdicao').value = dadosTeste.resultado;
    document.getElementById('observacoesTesteCpEdicao').value = dadosTeste.observacoes_gerais || '';

    const selectTipoTeste = document.getElementById('tipoTesteCpEdicao');
    selectTipoTeste.innerHTML = '<option value="">A carregar...</option>';
    const tiposTesteSnapshot = await db.collection("TiposTeste").where("categoria_aplicavel", "in", ["Calçado Pronto", "Ambos"]).get();
    
    selectTipoTeste.innerHTML = '';
    tiposTesteSnapshot.forEach(doc => {
        selectTipoTeste.innerHTML += `<option value="${doc.id}">${doc.data().nome_tipo_teste}</option>`;
    });

    selectTipoTeste.value = dadosTeste.id_tipo_teste;
    modal.style.display = 'block';
}

// UPDATE (Parte 2): Salva as alterações
async function salvarEdicaoTesteCp(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A Salvar...';

    const testeId = document.getElementById('hiddenTesteCpIdEdicao').value;
    const novosDados = {
        sub_categoria: document.getElementById('subCategoriaCpEdicao').value,
        linha_calcado: document.getElementById('linhaCalcadoEdicao').value,
        referencia_calcado: document.getElementById('referenciaCalcadoEdicao').value,
        data_inicio_teste: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataInicioTesteCpEdicao').value)),
        data_fim_teste: document.getElementById('dataFimTesteCpEdicao').value ? firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataFimTesteCpEdicao').value)) : null,
        id_tipo_teste: document.getElementById('tipoTesteCpEdicao').value,
        resultado: document.getElementById('resultadoTesteCpEdicao').value,
        observacoes_gerais: document.getElementById('observacoesTesteCpEdicao').value,
        data_ultima_modificacao: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("TestesCalcadoPronto").doc(testeId).update(novosDados);
        showToast("Teste atualizado com sucesso!", "success");
        fecharModalEdicaoTesteCp();
        carregarEExibirTestesCp();
    } catch (error) {
        console.error("Erro ao atualizar o teste:", error);
        showToast("Erro ao atualizar o teste: " + error.message, "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Alterações';
    }
}

// DELETE: Exclui o teste
async function excluirTesteCp(testeId) {
    if (!confirm("Tem certeza que deseja excluir este teste?")) return;

    try {
        const testeDoc = await db.collection("TestesCalcadoPronto").doc(testeId).get();
        if (!testeDoc.exists) throw new Error("Documento não encontrado.");

        const fotosUrls = testeDoc.data().fotos_calcado_urls || [];
        if (fotosUrls.length > 0) {
            await Promise.all(fotosUrls.map(url => storage.refFromURL(url).delete()));
        }

        await db.collection("TestesCalcadoPronto").doc(testeId).delete();
        showToast("Teste excluído com sucesso!", "success");
        carregarEExibirTestesCp();
    } catch (error) {
        console.error("Erro ao excluir o teste:", error);
        showToast("Erro ao excluir o teste: " + error.message, "error");
    }
}

// FECHAR MODAL: Funções para fechar os modais
function fecharModalEdicaoTesteCp() {
    const modal = document.getElementById('modalEdicaoTesteCp');
    if (modal) modal.style.display = 'none';
}
function fecharModalImagem() {
    const modal = document.getElementById("imageModal");
    if (modal) modal.style.display = "none";
}

// --- PONTO DE ENTRADA PRINCIPAL ---
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        // Preenche info do usuário no header
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) userInfoElement.textContent = 'Logado como: ' + (user.displayName || user.email);

        // Inicia o carregamento da lista de testes
        carregarEExibirTestesCp();

        // CONEXÃO DOS MODAIS (elementos estáticos da página)
        const formEdicao = document.getElementById('formEdicaoTesteCp');
        const botaoFecharModalEdicao = document.getElementById('botaoFecharModalEdicaoTesteCp');
        const modalEdicao = document.getElementById('modalEdicaoTesteCp');
        const botaoFecharModalImagem = document.getElementById("closeImageModalBtn");
        const modalImagem = document.getElementById("imageModal");

        if (formEdicao) formEdicao.addEventListener('submit', salvarEdicaoTesteCp);
        if (botaoFecharModalEdicao) botaoFecharModalEdicao.addEventListener('click', fecharModalEdicaoTesteCp);
        if (modalEdicao) modalEdicao.addEventListener('click', (e) => { if (e.target === modalEdicao) fecharModalEdicaoTesteCp(); });
        
        if (botaoFecharModalImagem) botaoFecharModalImagem.addEventListener('click', fecharModalImagem);
        if (modalImagem) modalImagem.addEventListener('click', (e) => { if (e.target === modalImagem) fecharModalImagem(); });

    } else {
        // Se não há usuário, redireciona para a página de login
        window.location.href = 'login.html';
    }
});

// Lógica de Logout
const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html';
        });
    });
}