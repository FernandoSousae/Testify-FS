console.log("gerenciar_solicitacoes_app.js INICIADO.");

// --- INICIALIZAÇÃO E VARIÁVEIS GLOBAIS ---
const db = firebase.firestore();
const auth = firebase.auth();

const mainContent = document.querySelector('main');
const listaSolicitacoesDiv = document.getElementById('listaSolicitacoes');
const filtroStatusSelect = document.getElementById('filtroStatusSolicitacao');

// --- PONTO DE ENTRADA PRINCIPAL E AUTORIZAÇÃO ---
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('userInfo').textContent = `Logado como: ${user.email}`;
        verificarPermissoes(user);
        configurarLogout();
    } else {
        window.location.href = 'login.html';
    }
});

/**
 * Verifica se o usuário tem permissão para ver a página (Qualidade ou Administrador).
 * @param {object} user - O objeto do usuário autenticado.
 */
function verificarPermissoes(user) {
    const userDocRef = db.collection('Usuarios').doc(user.uid);
    userDocRef.get().then(doc => {
        if (doc.exists) {
            const userData = doc.data();
            const permissoesValidas = ['Administrador', 'Qualidade'];
            if (permissoesValidas.includes(userData.tipo_usuario)) {
                // Acesso permitido
                mainContent.style.display = 'block';
                carregarSolicitacoes(); // Carrega a lista inicial (Pendentes)
                filtroStatusSelect.addEventListener('change', carregarSolicitacoes);
            } else {
                acessoNegado();
            }
        } else {
            acessoNegado();
        }
    }).catch(error => {
        console.error("Erro ao verificar permissões:", error);
        acessoNegado();
    });
}

/**
 * Carrega e exibe as solicitações do Firestore com base no filtro de status.
 */
async function carregarSolicitacoes() {
    if (!listaSolicitacoesDiv) return;
    listaSolicitacoesDiv.innerHTML = '<p>A carregar solicitações...</p>';

    const statusFiltrado = filtroStatusSelect.value;
    let query = db.collection("SolicitacoesTeste");

    if (statusFiltrado !== "Todos") {
        query = query.where("status", "==", statusFiltrado);
    }

    try {
        const snapshot = await query.orderBy("data_solicitacao", "desc").get();
        if (snapshot.empty) {
            listaSolicitacoesDiv.innerHTML = '<p>Nenhuma solicitação encontrada para este status.</p>';
            return;
        }

        let htmlSolicitacoes = '<ul class="admin-list">';
        snapshot.forEach(doc => {
            const solicitacao = doc.data();
            const id = doc.id;
            const data = formatarTimestamp(solicitacao.data_solicitacao);
            const urgenciaClass = solicitacao.urgencia === 'Urgente' ? 'text-danger' : '';

            htmlSolicitacoes += `
                <li class="list-item" data-id="${id}" style="cursor: pointer;">
                    <div class="info-group">
                        <span><strong>Solicitante:</strong> ${solicitacao.solicitante_email}</span>
                        <span><strong>Categoria:</strong> ${solicitacao.categoria_teste}</span>
                        <span style="font-size: 0.9em; color: #666;"><strong>Data:</strong> ${data}</span>
                        <span class="${urgenciaClass}"><strong>Urgência:</strong> ${solicitacao.urgencia}</span>
                    </div>
                    <div class="status-group">
                        <span class="status-${solicitacao.status.toLowerCase()}">${solicitacao.status}</span>
                    </div>
                </li>
            `;
        });
        htmlSolicitacoes += '</ul>';
        listaSolicitacoesDiv.innerHTML = htmlSolicitacoes;

        // Adiciona evento de clique para cada item da lista
        document.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', () => abrirModalDetalhes(item.dataset.id));
        });

    } catch (error) {
        console.error("Erro ao carregar solicitações:", error);
        listaSolicitacoesDiv.innerHTML = '<p style="color:red;">Erro ao carregar dados.</p>';
    }
}

/**
 * Abre o modal com os detalhes de uma solicitação específica.
 * @param {string} solicitacaoId - O ID do documento da solicitação.
 */
async function abrirModalDetalhes(solicitacaoId) {
    const modal = document.getElementById('modalDetalhesSolicitacao');
    const conteudoDiv = document.getElementById('conteudoModalDetalhes');
    const obsAdminTextarea = document.getElementById('observacoesAdminModal');

    conteudoDiv.innerHTML = '<p>A carregar...</p>';
    modal.style.display = 'block';

    const docRef = db.collection("SolicitacoesTeste").doc(solicitacaoId);
    const doc = await docRef.get();

    if (!doc.exists) {
        conteudoDiv.innerHTML = '<p>Erro: Solicitação não encontrada.</p>';
        return;
    }

    const solicitacao = doc.data();
    conteudoDiv.innerHTML = `
        <p><strong>Solicitante:</strong> ${solicitacao.solicitante_email}</p>
        <p><strong>Data:</strong> ${formatarTimestamp(solicitacao.data_solicitacao)}</p>
        <p><strong>Urgência:</strong> ${solicitacao.urgencia}</p>
        <p><strong>Categoria:</strong> ${solicitacao.categoria_teste}</p>
        <p><strong>Referências:</strong> ${solicitacao.referencias_envolvidas || 'N/A'}</p>
        <p><strong>Descrição:</strong></p>
        <p style="white-space: pre-wrap; background: #f4f4f4; padding: 10px; border-radius: 4px;">${solicitacao.descricao}</p>
    `;
    obsAdminTextarea.value = solicitacao.observacoes_admin || '';

    // Configura os botões do modal
    const botaoAprovar = document.getElementById('botaoAprovar');
    const botaoRejeitar = document.getElementById('botaoRejeitar');

    // Remove listeners antigos para evitar chamadas múltiplas
    botaoAprovar.replaceWith(botaoAprovar.cloneNode(true));
    botaoRejeitar.replaceWith(botaoRejeitar.cloneNode(true));

    // Adiciona novos listeners
    document.getElementById('botaoAprovar').addEventListener('click', () => aprovarSolicitacao(solicitacaoId, solicitacao));
    document.getElementById('botaoRejeitar').addEventListener('click', () => rejeitarSolicitacao(solicitacaoId));
}

/**
 * Aprova uma solicitação e redireciona para a página de criação de teste.
 * @param {string} id - O ID da solicitação.
 * @param {object} dados - Os dados da solicitação.
 */
function aprovarSolicitacao(id, dados) {
    // Salva os dados da solicitação no localStorage para serem lidos na próxima página
    localStorage.setItem('solicitacaoParaTeste', JSON.stringify(dados));

    // Atualiza o status no Firestore
    db.collection("SolicitacoesTeste").doc(id).update({
        status: "Aprovada",
        observacoes_admin: document.getElementById('observacoesAdminModal').value
    }).then(() => {
        showToast("Solicitação aprovada! Redirecionando para o cadastro do teste...", "success");
        // Redireciona para a página de cadastro correta
        if (dados.categoria_teste === "Matéria-Prima") {
            window.location.href = 'cadastrar_teste_mp.html';
        } else {
            window.location.href = 'cadastrar_teste_cp.html';
        }
    }).catch(handleError);
}

/**
 * Rejeita uma solicitação.
 * @param {string} id - O ID da solicitação.
 */
function rejeitarSolicitacao(id) {
    db.collection("SolicitacoesTeste").doc(id).update({
        status: "Rejeitada",
        observacoes_admin: document.getElementById('observacoesAdminModal').value
    }).then(() => {
        showToast("Solicitação rejeitada com sucesso.", "info");
        fecharModalDetalhes();
        carregarSolicitacoes();
    }).catch(handleError);
}

// --- FUNÇÕES AUXILIARES ---

function fecharModalDetalhes() {
    document.getElementById('modalDetalhesSolicitacao').style.display = 'none';
}

function acessoNegado() {
    mainContent.innerHTML = '<div class="admin-container"><h2>Acesso Negado</h2><p>Você não tem permissão para visualizar esta página.</p></div>';
    mainContent.style.display = 'block';
}

function configurarLogout() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => window.location.href = 'login.html');
        });
    }
}

function formatarTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const data = timestamp.toDate();
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${data.getFullYear()}`;
}

function handleError(error) {
    console.error("Ocorreu um erro: ", error);
    showToast("Ocorreu um erro. Verifique o console.", "error");
}

// Configura o botão de fechar do modal
document.getElementById('botaoFecharModalDetalhes').addEventListener('click', fecharModalDetalhes);

