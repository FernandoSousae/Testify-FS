console.log("solicitar_teste_app.js INICIADO.");

// --- INICIALIZAÇÃO E VARIÁVEIS GLOBAIS ---
const db = firebase.firestore();
const auth = firebase.auth();

const formSolicitarTeste = document.getElementById('formSolicitarTeste');

// --- PONTO DE ENTRADA PRINCIPAL E AUTORIZAÇÃO ---
auth.onAuthStateChanged(user => {
    if (user) {
        // Usuário está logado, configura a página
        document.getElementById('userInfo').textContent = `Logado como: ${user.email}`;
        configurarFormulario(user);
        configurarLogout();
    } else {
        // Se não há usuário, redireciona para a página de login
        console.log("Nenhum usuário logado. Redirecionando para login...");
        window.location.href = 'login.html';
    }
});

/**
 * Configura o 'ouvinte' de evento para o formulário de solicitação.
 * @param {object} user - O objeto do usuário autenticado do Firebase.
 */
function configurarFormulario(user) {
    if (!formSolicitarTeste) {
        console.error("Formulário #formSolicitarTeste não encontrado.");
        return;
    }

    formSolicitarTeste.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        // Coleta os dados do formulário
        const dadosSolicitacao = {
            solicitante_id: user.uid,
            solicitante_email: user.email,
            data_solicitacao: firebase.firestore.FieldValue.serverTimestamp(),
            categoria_teste: document.getElementById('categoriaTeste').value,
            descricao: document.getElementById('descricaoSolicitacao').value,
            referencias_envolvidas: document.getElementById('referenciasEnvolvidas').value,
            urgencia: document.getElementById('urgenciaSolicitacao').value,
            status: "Pendente" // Status inicial padrão
        };

        try {
            // Salva os dados na nova coleção 'SolicitacoesTeste'
            const docRef = await db.collection("SolicitacoesTeste").add(dadosSolicitacao);
            console.log("Solicitação salva com ID: ", docRef.id);
            showToast("Sua solicitação de teste foi enviada com sucesso!", "success");
            formSolicitarTeste.reset(); // Limpa o formulário
        } catch (error) {
            console.error("Erro ao enviar solicitação: ", error);
            showToast("Ocorreu um erro ao enviar sua solicitação. Tente novamente.", "error");
        } finally {
            // Reabilita o botão, independentemente do resultado
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar Solicitação';
        }
    });
}

/**
 * Configura o 'ouvinte' de evento para o botão de logout.
 */
function configurarLogout() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    }
}