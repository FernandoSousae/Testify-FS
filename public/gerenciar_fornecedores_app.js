// Ponto de verificação inicial
console.log("gerenciar_fornecedores_app.js INICIADO.");

// --- INICIALIZAÇÃO E VARIÁVEIS GLOBAIS ---
const db = firebase.firestore();
const auth = firebase.auth();

const mainContent = document.querySelector('main');
const listaFornecedoresDiv = document.getElementById('listaFornecedores');
const formAdicionarFornecedor = document.getElementById('formAdicionarFornecedor');

// Esconde o conteúdo principal até que o usuário seja verificado como admin
mainContent.style.display = 'none'; 

// --- FUNÇÕES CRUD PARA FORNECEDORES ---

/**
 * Carrega a lista de fornecedores do Firestore e a exibe na página.
 */
function carregarListaFornecedores() {
    if (!listaFornecedoresDiv) return;
    listaFornecedoresDiv.innerHTML = '<p>A carregar fornecedores...</p>';

    db.collection("Fornecedores").orderBy("nome_fornecedor").get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                listaFornecedoresDiv.innerHTML = '<p>Nenhum fornecedor encontrado.</p>';
                return;
            }

            let htmlItens = '<ul class="admin-list">';
            querySnapshot.forEach((doc) => {
                const fornecedor = doc.data();
                const idFornecedor = doc.id;
                htmlItens += `
                    <li class="list-item">
                        <div class="info-group">
                            <span><strong>Nome:</strong> ${fornecedor.nome_fornecedor}</span>
                            <span style="font-size: 0.9em; color: #666;"><strong>CNPJ/CPF:</strong> ${fornecedor.cnpj_fornecedor || 'N/A'}</span>
                            <span style="font-size: 0.9em; color: #666;"><strong>Contato:</strong> ${fornecedor.contato_fornecedor || 'N/A'}</span>
                        </div>
                        <div class="actions-group">
                            <button class="edit-btn">Editar</button>
                            <button class="delete-btn">Excluir</button>
                        </div>
                    </li>
                `;
            });
            htmlItens += '</ul>';
            listaFornecedoresDiv.innerHTML = htmlItens;

            // Adicionar event listeners aos botões
            const itensDaLista = listaFornecedoresDiv.querySelectorAll('.list-item');
            itensDaLista.forEach((item, index) => {
                const doc = querySnapshot.docs[index];
                
                item.querySelector('.edit-btn').addEventListener('click', () => {
                    abrirModalEdicaoFornecedor(doc.id, doc.data());
                });
                
                item.querySelector('.delete-btn').addEventListener('click', () => {
                    excluirFornecedor(doc.id, doc.data().nome_fornecedor);
                });
            });
        })
        .catch(handleError);
}

/**
 * Configura o formulário para adicionar um novo fornecedor.
 */
function configurarFormularioAdicionar() {
    if (!formAdicionarFornecedor) return;

    formAdicionarFornecedor.addEventListener('submit', (event) => {
        event.preventDefault();
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'A adicionar...';

        const novoFornecedor = {
            nome_fornecedor: document.getElementById('nomeFornecedor').value,
            cnpj_fornecedor: document.getElementById('cnpjFornecedor').value,
            contato_fornecedor: document.getElementById('contatoFornecedor').value,
            telefone_fornecedor: document.getElementById('telefoneFornecedor').value,
            email_fornecedor: document.getElementById('emailFornecedor').value,
            data_cadastro: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection("Fornecedores").add(novoFornecedor)
            .then(() => {
                showToast("Fornecedor adicionado com sucesso!", "success");
                formAdicionarFornecedor.reset();
                carregarListaFornecedores();
            })
            .catch(handleError)
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Adicionar Fornecedor';
            });
    });
}

/**
 * Abre e popula o modal de edição com os dados do fornecedor.
 */
function abrirModalEdicaoFornecedor(id, dados) {
    document.getElementById('hiddenFornecedorIdEdicao').value = id;
    document.getElementById('nomeFornecedorEdicao').value = dados.nome_fornecedor;
    document.getElementById('cnpjFornecedorEdicao').value = dados.cnpj_fornecedor || '';
    document.getElementById('contatoFornecedorEdicao').value = dados.contato_fornecedor || '';
    document.getElementById('telefoneFornecedorEdicao').value = dados.telefone_fornecedor || '';
    document.getElementById('emailFornecedorEdicao').value = dados.email_fornecedor || '';
    
    document.getElementById('modalEdicaoFornecedor').style.display = 'block';
}

/**
 * Salva as alterações feitas no modal de edição.
 */
function salvarEdicaoFornecedor(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A salvar...';

    const id = document.getElementById('hiddenFornecedorIdEdicao').value;
    const dadosAtualizados = {
        nome_fornecedor: document.getElementById('nomeFornecedorEdicao').value,
        cnpj_fornecedor: document.getElementById('cnpjFornecedorEdicao').value,
        contato_fornecedor: document.getElementById('contatoFornecedorEdicao').value,
        telefone_fornecedor: document.getElementById('telefoneFornecedorEdicao').value,
        email_fornecedor: document.getElementById('emailFornecedorEdicao').value
    };

    db.collection("Fornecedores").doc(id).update(dadosAtualizados)
        .then(() => {
            showToast("Fornecedor atualizado com sucesso!", "success");
            fecharModalEdicao();
            carregarListaFornecedores();
        })
        .catch(handleError)
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Alterações';
        });
}

/**
 * Exclui um fornecedor do Firestore.
 */
function excluirFornecedor(id, nome) {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${nome}"?`)) return;
    
    db.collection("Fornecedores").doc(id).delete()
        .then(() => {
            showToast(`Fornecedor "${nome}" excluído com sucesso.`, "success");
            carregarListaFornecedores();
        })
        .catch(handleError);
}

// --- FUNÇÕES AUXILIARES (Modal, Erros) ---
function fecharModalEdicao() {
    document.getElementById('modalEdicaoFornecedor').style.display = 'none';
}

function handleError(error) {
    console.error("Ocorreu um erro:", error);
    showToast("Ocorreu um erro. Verifique o console para mais detalhes.", "error");
}

// --- PONTO DE ENTRADA E AUTORIZAÇÃO ---
auth.onAuthStateChanged(user => {
    if (user) {
        // Verifica se o usuário é administrador
        db.collection('Usuarios').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().tipo_usuario === 'Administrador') {
                // Acesso permitido: mostra o conteúdo e configura a página
                document.getElementById('userInfo').textContent = `Logado como: ${user.email}`;
                mainContent.style.display = 'block';
                
                carregarListaFornecedores();
                configurarFormularioAdicionar();
                
                // Configurar listeners do modal
                document.getElementById('formEdicaoFornecedor').addEventListener('submit', salvarEdicaoFornecedor);
                document.getElementById('botaoFecharModalEdicao').addEventListener('click', fecharModalEdicao);
                document.getElementById('modalEdicaoFornecedor').addEventListener('click', (e) => {
                    if (e.target === document.getElementById('modalEdicaoFornecedor')) fecharModalEdicao();
                });

            } else {
                // Acesso negado
                mainContent.innerHTML = '<div class="admin-container"><h2>Acesso Negado</h2><p>Você não tem permissão para ver esta página.</p></div>';
                mainContent.style.display = 'block';
            }
        }).catch(handleError);

        // Lógica de logout
        document.getElementById('logoutButton').addEventListener('click', () => {
            auth.signOut().then(() => window.location.href = 'login.html');
        });

    } else {
        // Nenhum usuário logado, redireciona para o login
        window.location.href = 'login.html';
    }
});