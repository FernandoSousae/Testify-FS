console.log("gerenciar_materias_primas_app.js INICIADO.");

// --- INICIALIZAÇÃO E VARIÁVEIS GLOBAIS ---
const db = firebase.firestore();
const auth = firebase.auth();

const mainContent = document.querySelector('main');
const listaMateriasPrimasDiv = document.getElementById('listaMateriasPrimas');
const formAdicionarMateriaPrima = document.getElementById('formAdicionarMateriaPrima');

// Esconde o conteúdo principal até que o usuário seja verificado como admin
mainContent.style.display = 'none'; 

// --- FUNÇÕES CRUD PARA MATÉRIAS-PRIMAS ---

/**
 * Carrega a lista de matérias-primas do Firestore e a exibe na página.
 */
function carregarListaMateriasPrimas() {
    if (!listaMateriasPrimasDiv) return;
    listaMateriasPrimasDiv.innerHTML = '<p>A carregar...</p>';

    // Acessa a coleção 'MateriasPrimas' e ordena pela descrição
    db.collection("MateriasPrimas").orderBy("descricao_mp").get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                listaMateriasPrimasDiv.innerHTML = '<p>Nenhuma matéria-prima encontrada.</p>';
                return;
            }

            let htmlItens = '<ul class="admin-list">';
            querySnapshot.forEach((doc) => {
                const mp = doc.data();
                htmlItens += `
                    <li class="list-item">
                        <div class="info-group">
                            <span><strong>Descrição:</strong> ${mp.descricao_mp}</span>
                            <span style="font-size: 0.9em; color: #666;"><strong>Código:</strong> ${mp.codigo_interno_mp || 'N/A'}</span>
                        </div>
                        <div class="actions-group">
                            <button class="edit-btn">Editar</button>
                            <button class="delete-btn">Excluir</button>
                        </div>
                    </li>
                `;
            });
            htmlItens += '</ul>';
            listaMateriasPrimasDiv.innerHTML = htmlItens;

            // Adicionar event listeners aos botões
            const itensDaLista = listaMateriasPrimasDiv.querySelectorAll('.list-item');
            itensDaLista.forEach((item, index) => {
                const doc = querySnapshot.docs[index];
                
                item.querySelector('.edit-btn').addEventListener('click', () => {
                    abrirModalEdicaoMateriaPrima(doc.id, doc.data());
                });
                
                item.querySelector('.delete-btn').addEventListener('click', () => {
                    excluirMateriaPrima(doc.id, doc.data().descricao_mp);
                });
            });
        })
        .catch(handleError);
}

/**
 * Configura o formulário para adicionar uma nova matéria-prima.
 */
function configurarFormularioAdicionar() {
    if (!formAdicionarMateriaPrima) return;

    formAdicionarMateriaPrima.addEventListener('submit', (event) => {
        event.preventDefault();
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'A adicionar...';

        const novaMateriaPrima = {
            descricao_mp: document.getElementById('nomeMateriaPrima').value,
            codigo_interno_mp: document.getElementById('codigoMateriaPrima').value,
            data_cadastro: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection("MateriasPrimas").add(novaMateriaPrima)
            .then(() => {
                showToast("Matéria-prima adicionada com sucesso!", "success");
                formAdicionarMateriaPrima.reset();
                carregarListaMateriasPrimas();
            })
            .catch(handleError)
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Adicionar Matéria-Prima';
            });
    });
}

/**
 * Abre e popula o modal de edição com os dados da matéria-prima.
 */
function abrirModalEdicaoMateriaPrima(id, dados) {
    document.getElementById('hiddenMateriaPrimaIdEdicao').value = id;
    document.getElementById('nomeMateriaPrimaEdicao').value = dados.descricao_mp;
    document.getElementById('codigoMateriaPrimaEdicao').value = dados.codigo_interno_mp || '';
    
    document.getElementById('modalEdicaoMateriaPrima').style.display = 'block';
}

/**
 * Salva as alterações feitas no modal de edição.
 */
function salvarEdicaoMateriaPrima(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'A salvar...';

    const id = document.getElementById('hiddenMateriaPrimaIdEdicao').value;
    const dadosAtualizados = {
        descricao_mp: document.getElementById('nomeMateriaPrimaEdicao').value,
        codigo_interno_mp: document.getElementById('codigoMateriaPrimaEdicao').value,
    };

    db.collection("MateriasPrimas").doc(id).update(dadosAtualizados)
        .then(() => {
            showToast("Matéria-prima atualizada com sucesso!", "success");
            fecharModalEdicao();
            carregarListaMateriasPrimas();
        })
        .catch(handleError)
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Alterações';
        });
}

/**
 * Exclui uma matéria-prima do Firestore.
 */
function excluirMateriaPrima(id, nome) {
    if (!confirm(`Tem certeza que deseja excluir a matéria-prima "${nome}"?`)) return;
    
    db.collection("MateriasPrimas").doc(id).delete()
        .then(() => {
            showToast(`Matéria-prima "${nome}" excluída com sucesso.`, "success");
            carregarListaMateriasPrimas();
        })
        .catch(handleError);
}

// --- FUNÇÕES AUXILIARES (Modal, Erros) ---
function fecharModalEdicao() {
    document.getElementById('modalEdicaoMateriaPrima').style.display = 'none';
}

function handleError(error) {
    console.error("Ocorreu um erro:", error);
    showToast("Ocorreu um erro. Verifique o console para mais detalhes.", "error");
}

// --- PONTO DE ENTRADA E AUTORIZAÇÃO ---
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('Usuarios').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().tipo_usuario === 'Administrador') {
                document.getElementById('userInfo').textContent = `Logado como: ${user.email}`;
                mainContent.style.display = 'block';
                
                carregarListaMateriasPrimas();
                configurarFormularioAdicionar();
                
                document.getElementById('formEdicaoMateriaPrima').addEventListener('submit', salvarEdicaoMateriaPrima);
                document.getElementById('botaoFecharModalEdicao').addEventListener('click', fecharModalEdicao);
                document.getElementById('modalEdicaoMateriaPrima').addEventListener('click', (e) => {
                    if (e.target === document.getElementById('modalEdicaoMateriaPrima')) fecharModalEdicao();
                });

            } else {
                mainContent.innerHTML = '<div class="admin-container"><h2>Acesso Negado</h2><p>Você não tem permissão para ver esta página.</p></div>';
                mainContent.style.display = 'block';
            }
        }).catch(handleError);

        document.getElementById('logoutButton').addEventListener('click', () => {
            auth.signOut().then(() => window.location.href = 'login.html');
        });

    } else {
        window.location.href = 'login.html';
    }
});