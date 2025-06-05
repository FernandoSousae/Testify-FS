// Este console.log deve ser a primeira coisa a aparecer se o ficheiro for carregado e executado.
console.log("gerenciar_tipos_teste_app.js: Ficheiro INICIADO.");

if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined' || typeof firebase.firestore === 'undefined') {
    console.error("ERRO CRÍTICO em gerenciar_tipos_teste_app.js: Firebase, firebase.auth(), ou firebase.firestore() NÃO está definido.");
    const mainContentErrorCheck = document.querySelector('main');
    if (mainContentErrorCheck) {
        mainContentErrorCheck.innerHTML = '<div class="admin-container"><p style="color:red; text-align:center;">Erro crítico na inicialização da aplicação. Contacte o suporte.</p></div>';
        mainContentErrorCheck.style.display = 'block';
    }
} else {
    console.log("gerenciar_tipos_teste_app.js: Firebase, auth e firestore estão definidos. A prosseguir.");

    const db = firebase.firestore();
    const auth = firebase.auth();

    const userInfoElement = document.getElementById('userInfo');
    const logoutButton = document.getElementById('logoutButton');
    const mainContent = document.querySelector('main');
    
    const listaTiposTesteDiv = document.getElementById('listaTiposTeste');
    const formAdicionarTipoTeste = document.getElementById('formAdicionarTipoTeste');
    
    // Elementos do Modal de Edição
    const modalEdicaoTipoTeste = document.getElementById('modalEdicaoTipoTeste');
    const formEdicaoTipoTeste = document.getElementById('formEdicaoTipoTeste');
    const inputNomeEdicao = document.getElementById('nomeTipoTesteEdicao');
    const inputDescricaoEdicao = document.getElementById('descricaoTipoTesteEdicao');
    const selectCategoriaEdicao = document.getElementById('categoriaAplicavelEdicao');
    const hiddenTipoTesteIdEdicao = document.getElementById('hiddenTipoTesteIdEdicao');
    const botaoFecharModalEdicaoTipoTeste = document.getElementById('botaoFecharModalEdicaoTipoTeste');

    if (!mainContent) {
        console.error("gerenciar_tipos_teste_app.js: Elemento 'main' NÃO encontrado no DOM.");
    } else {
        mainContent.style.display = 'none'; 
    }
    if (!listaTiposTesteDiv) {
        console.error("gerenciar_tipos_teste_app.js: Elemento 'listaTiposTeste' NÃO encontrado no DOM.");
    }
    if (!formAdicionarTipoTeste) {
        console.error("gerenciar_tipos_teste_app.js: Elemento 'formAdicionarTipoTeste' NÃO encontrado no DOM.");
    }
    if (!modalEdicaoTipoTeste || !formEdicaoTipoTeste || !inputNomeEdicao || !inputDescricaoEdicao || !selectCategoriaEdicao || !hiddenTipoTesteIdEdicao || !botaoFecharModalEdicaoTipoTeste) {
        console.warn("gerenciar_tipos_teste_app.js: Um ou mais elementos do modal de edição de tipo de teste não foram encontrados. Serão inicializados quando o modal for aberto.");
    }

    // Função para abrir e popular o modal de edição de Tipo de Teste
    function abrirModalEdicaoTipoTeste(id, nome, descricao, categoria) {
        if (!modalEdicaoTipoTeste || !formEdicaoTipoTeste || !inputNomeEdicao || !inputDescricaoEdicao || !selectCategoriaEdicao || !hiddenTipoTesteIdEdicao) {
            console.error("Erro fatal: Elementos do modal de edição não encontrados ao tentar abrir.");
            showToast("Erro ao abrir formulário de edição.", "error");
            return;
        }
        hiddenTipoTesteIdEdicao.value = id;
        inputNomeEdicao.value = nome;
        inputDescricaoEdicao.value = descricao;
        selectCategoriaEdicao.value = categoria;
        modalEdicaoTipoTeste.style.display = 'block';
    }

    // Função para fechar o modal de edição de Tipo de Teste
    function fecharModalEdicaoTipoTeste() {
        if (modalEdicaoTipoTeste) {
            modalEdicaoTipoTeste.style.display = 'none';
        }
    }

    // Função para salvar as alterações do Tipo de Teste
    function salvarEdicaoTipoTeste() {
        if (!formEdicaoTipoTeste || !hiddenTipoTesteIdEdicao || !inputNomeEdicao || !selectCategoriaEdicao) return;

        const id = hiddenTipoTesteIdEdicao.value;
        const nome = inputNomeEdicao.value;
        const descricao = inputDescricaoEdicao.value;
        const categoria = selectCategoriaEdicao.value;

        if (!nome || !categoria) {
            showToast("O nome do tipo de teste e a categoria aplicável são obrigatórios.", "error");
            return;
        }
        
        const submitButton = formEdicaoTipoTeste.querySelector('button[type="submit"]');
        if(submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'A salvar...';
        }

        db.collection("TiposTeste").doc(id).update({
            nome_tipo_teste: nome,
            descricao_tipo_teste: descricao,
            categoria_aplicavel: categoria
        })
        .then(() => {
            console.log("Tipo de teste atualizado com sucesso!");
            showToast("Tipo de teste atualizado com sucesso!", "success");
            fecharModalEdicaoTipoTeste();
            carregarListaTiposTeste();
        })
        .catch((error) => {
            console.error("Erro ao atualizar tipo de teste:", error);
            showToast("Erro ao atualizar tipo de teste. Detalhes no console.", "error");
        })
        .finally(() => {
            if(submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Salvar Alterações';
            }
        });
    }
    
    // Função para excluir Tipo de Teste
    function excluirTipoTeste(id, nome) {
        if (confirm(`Tem certeza que deseja excluir o tipo de teste "${nome}"? Esta ação não pode ser desfeita.`)) {
            db.collection("TiposTeste").doc(id).delete()
                .then(() => {
                    console.log("Tipo de teste excluído com sucesso!");
                    showToast(`Tipo de teste "${nome}" excluído com sucesso.`, "success");
                    carregarListaTiposTeste();
                })
                .catch((error) => {
                    console.error("Erro ao excluir tipo de teste:", error);
                    showToast("Erro ao excluir tipo de teste. Detalhes no console.", "error");
                });
        }
    }


    // Função para carregar e exibir a lista de Tipos de Teste
    function carregarListaTiposTeste() {
        if (!listaTiposTesteDiv) return;
        listaTiposTesteDiv.innerHTML = '<p>A carregar tipos de teste...</p>';

        db.collection("TiposTeste").orderBy("nome_tipo_teste").get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    listaTiposTesteDiv.innerHTML = '<p>Nenhum tipo de teste encontrado.</p>';
                    return;
                }

                let htmlTiposTeste = '<ul>';
                querySnapshot.forEach((doc) => {
                    const tipoTeste = doc.data();
                    const idTipoTeste = doc.id;
                    htmlTiposTeste += `
                        <li class="list-item" data-id="${idTipoTeste}">
                            <div>
                                <span><strong>Nome:</strong> ${tipoTeste.nome_tipo_teste || 'N/A'}</span>
                                <span><strong>Categoria:</strong> ${tipoTeste.categoria_aplicavel || 'N/A'}</span>
                                <span style="font-size: 0.8em; color: #666;"><strong>Descrição:</strong> ${tipoTeste.descricao_tipo_teste || 'Nenhuma'}</span>
                            </div>
                            <div>
                                <button class="edit-btn" data-id="${idTipoTeste}" data-nome="${tipoTeste.nome_tipo_teste || ''}" data-descricao="${tipoTeste.descricao_tipo_teste || ''}" data-categoria="${tipoTeste.categoria_aplicavel || ''}">Editar</button>
                                <button class="delete-btn" data-id="${idTipoTeste}" data-nome="${tipoTeste.nome_tipo_teste || ''}">Excluir</button>
                            </div>
                        </li>
                    `;
                });
                htmlTiposTeste += '</ul>';
                listaTiposTesteDiv.innerHTML = htmlTiposTeste;

                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const id = this.dataset.id;
                        const nome = this.dataset.nome;
                        const descricao = this.dataset.descricao;
                        const categoria = this.dataset.categoria;
                        abrirModalEdicaoTipoTeste(id, nome, descricao, categoria);
                    });
                });
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const id = this.dataset.id;
                        const nome = this.dataset.nome;
                        excluirTipoTeste(id, nome);
                    });
                });

            })
            .catch(error => {
                console.error("Erro ao carregar lista de tipos de teste:", error);
                listaTiposTesteDiv.innerHTML = '<p style="color:red;">Erro ao carregar tipos de teste.</p>';
            });
    }

    // Função para configurar o formulário de adicionar novo Tipo de Teste
    function configurarFormularioAdicionarTipoTeste() {
        if (!formAdicionarTipoTeste) return;

        formAdicionarTipoTeste.addEventListener('submit', function(event) {
            event.preventDefault();
            const nome = document.getElementById('nomeTipoTeste').value;
            const descricao = document.getElementById('descricaoTipoTeste').value;
            const categoria = document.getElementById('categoriaAplicavel').value;

            if (!nome || !categoria) {
                showToast("O nome do tipo de teste e a categoria aplicável são obrigatórios.", "error");
                return;
            }

            const submitButton = formAdicionarTipoTeste.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'A adicionar...';

            db.collection("TiposTeste").add({
                nome_tipo_teste: nome,
                descricao_tipo_teste: descricao,
                categoria_aplicavel: categoria,
                data_cadastro: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then((docRef) => {
                console.log("Novo tipo de teste adicionado com ID:", docRef.id);
                showToast("Novo tipo de teste adicionado com sucesso!", "success");
                formAdicionarTipoTeste.reset();
                carregarListaTiposTeste();
            })
            .catch((error) => {
                console.error("Erro ao adicionar novo tipo de teste:", error);
                showToast("Erro ao adicionar tipo de teste. Detalhes no console.", "error");
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Adicionar Tipo de Teste';
            });
        });
    }

    auth.onAuthStateChanged(function(user) {
        console.log("gerenciar_tipos_teste_app.js: onAuthStateChanged callback disparado.");
        if (user) {
            console.log("gerenciar_tipos_teste_app.js: Utilizador autenticado:", user.email);
            if (userInfoElement) {
                userInfoElement.textContent = 'Sessão iniciada como: ' + (user.displayName || user.email);
            }

            const userDocRef = db.collection('Usuarios').doc(user.uid);
            userDocRef.get().then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    if (userData.tipo_usuario === 'Administrador') {
                        console.log("gerenciar_tipos_teste_app.js: Utilizador é Administrador. Acesso permitido.");
                        if (mainContent) mainContent.style.display = 'block';
                        
                        carregarListaTiposTeste();
                        configurarFormularioAdicionarTipoTeste();
                        
                        // Configurar listeners para o modal de edição
                        if (formEdicaoTipoTeste) {
                            formEdicaoTipoTeste.addEventListener('submit', function(event) {
                                event.preventDefault();
                                salvarEdicaoTipoTeste();
                            });
                        }
                        if (botaoFecharModalEdicaoTipoTeste) {
                            botaoFecharModalEdicaoTipoTeste.addEventListener('click', fecharModalEdicaoTipoTeste);
                        }
                        if (modalEdicaoTipoTeste) { // Para fechar clicando fora
                            modalEdicaoTipoTeste.addEventListener('click', function(event) {
                                if (event.target === modalEdicaoTipoTeste) {
                                    fecharModalEdicaoTipoTeste();
                                }
                            });
                        }

                    } else {
                        // ... (lógica de acesso negado)
                    }
                } else {
                    // ... (tratamento de erro se documento do utilizador não for encontrado)
                }
            }).catch(error => {
                // ... (tratamento de erro ao buscar dados do utilizador)
            });

        } else {
            console.log("gerenciar_tipos_teste_app.js: Nenhum utilizador autenticado. A redirecionar para o login...");
            window.location.href = 'login.html';
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Erro ao terminar a sessão:', error);
            });
        });
    }
}