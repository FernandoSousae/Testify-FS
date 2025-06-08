// Este console.log deve ser a primeira coisa a aparecer se o ficheiro for carregado e executado.
console.log("gerenciar_usuarios_app.js: Ficheiro INICIADO.");

// Verifica se o objeto firebase e seus serviços essenciais estão disponíveis globalmente.
if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined' || typeof firebase.firestore === 'undefined') {
    console.error("ERRO CRÍTICO em gerenciar_usuarios_app.js: Firebase, firebase.auth(), ou firebase.firestore() NÃO está definido. Verifique a ordem de carregamento e inicialização dos scripts no HTML.");
    const mainContentErrorCheck = document.querySelector('main');
    if (mainContentErrorCheck) {
        mainContentErrorCheck.innerHTML = '<div class="admin-container"><p style="color:red; text-align:center;">Erro crítico na inicialização da aplicação. Contacte o suporte.</p></div>';
        mainContentErrorCheck.style.display = 'block';
    }
} else {
    console.log("gerenciar_usuarios_app.js: Firebase, auth e firestore estão definidos. A prosseguir.");

    const db = firebase.firestore();
    const auth = firebase.auth();

    const userInfoElement = document.getElementById('userInfo');
    const logoutButton = document.getElementById('logoutButton');
    const mainContent = document.querySelector('main');
    const listaUsuariosDiv = document.getElementById('listaUsuarios');
    const formAdicionarUsuario = document.getElementById('formAdicionarUsuario');

    // Elementos do Modal de Edição
    let modalEdicaoUsuario, formEdicaoUsuario, inputNomeEdicao, inputEmailEdicao, selectTipoEdicao, botaoSalvarEdicao, botaoFecharModalEdicao, hiddenUserIdEdicao;

    if (!userInfoElement) {
        console.error("gerenciar_usuarios_app.js: Elemento 'userInfo' NÃO encontrado no DOM.");
    } else {
        console.log("gerenciar_usuarios_app.js: Elemento 'userInfo' encontrado.");
    }
    if (!logoutButton) {
        console.error("gerenciar_usuarios_app.js: Elemento 'logoutButton' NÃO encontrado no DOM.");
    } else {
        console.log("gerenciar_usuarios_app.js: Elemento 'logoutButton' encontrado.");
    }
    if (!mainContent) {
        console.error("gerenciar_usuarios_app.js: Elemento 'main' NÃO encontrado no DOM.");
    } else {
        mainContent.style.display = 'none';
        console.log("gerenciar_usuarios_app.js: Conteúdo principal ('main') escondido inicialmente.");
    }
    if (!listaUsuariosDiv) {
        console.error("gerenciar_usuarios_app.js: Elemento 'listaUsuarios' NÃO encontrado no DOM.");
    }
    if (!formAdicionarUsuario) {
        console.error("gerenciar_usuarios_app.js: Elemento 'formAdicionarUsuario' NÃO encontrado no DOM.");
    }

    // Função para excluir usuário (do Firestore)
    function excluirUsuario(userId, userEmail) {
        console.log(`Tentando excluir usuário do Firestore: ID=${userId}, Email=${userEmail}`);

        // Não podemos excluir o próprio administrador logado desta forma simples
        if (auth.currentUser && auth.currentUser.uid === userId) {
            showToast("Não é possível excluir a sua própria conta de administrador através desta interface.", "error");
            return;
        }

        db.collection("Usuarios").doc(userId).delete()
            .then(() => {
                console.log("Documento do utilizador excluído do Firestore com sucesso!");
                showToast(`Utilizador ${userEmail} excluído da base de dados da aplicação. A conta de autenticação ainda existe.`, "success");
                carregarListaUsuarios(); // Recarrega a lista para refletir a exclusão
            })
            .catch((error) => {
                console.error("Erro ao excluir documento do utilizador do Firestore:", error);
                showToast("Erro ao excluir o utilizador da base de dados da aplicação. Detalhes no console.", "error");
            });
    }


    // Função para carregar e exibir a lista de usuários
    function carregarListaUsuarios() {
        if (!listaUsuariosDiv) return;
        listaUsuariosDiv.innerHTML = '<p>A carregar utilizadores...</p>';

        db.collection("Usuarios").orderBy("nome_usuario").get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    listaUsuariosDiv.innerHTML = '<p>Nenhum utilizador encontrado.</p>';
                    return;
                }

                let htmlUsuarios = '<ul>';
                querySnapshot.forEach((doc) => {
                    const usuario = doc.data();
                    const idUsuario = doc.id;
                    htmlUsuarios += `
                        <li class="user-item" data-id="${idUsuario}">
                            <div>
                                <span><strong>Nome:</strong> ${usuario.nome_usuario || 'N/A'}</span>
                                <span><strong>Email:</strong> ${usuario.email_usuario || 'N/A'}</span>
                                <span><strong>Tipo:</strong> ${usuario.tipo_usuario || 'N/A'}</span>
                            </div>
                            <div>
                                <button class="edit-user-btn" data-id="${idUsuario}" data-nome="${usuario.nome_usuario || ''}" data-email="${usuario.email_usuario || ''}" data-tipo="${usuario.tipo_usuario || ''}">Editar</button>
                                <button class="delete-user-btn" data-id="${idUsuario}" data-email="${usuario.email_usuario || ''}">Excluir</button>
                            </div>
                        </li>
                    `;
                });
                htmlUsuarios += '</ul>';
                listaUsuariosDiv.innerHTML = htmlUsuarios;

                document.querySelectorAll('.edit-user-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = this.dataset.id;
                        const nome = this.dataset.nome;
                        const email = this.dataset.email;
                        const tipo = this.dataset.tipo;
                        abrirModalEdicaoUsuario(userId, nome, email, tipo);
                    });
                });

                document.querySelectorAll('.delete-user-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = this.dataset.id;
                        const userEmail = this.dataset.email;
                        if (confirm(`Tem certeza que deseja excluir o registo do utilizador ${userEmail} da base de dados da aplicação?\nEsta ação não remove o utilizador do sistema de autenticação do Firebase.`)) {
                            excluirUsuario(userId, userEmail);
                        }
                    });
                });
            })
            .catch(error => {
                console.error("Erro ao carregar lista de utilizadores:", error);
                listaUsuariosDiv.innerHTML = '<p style="color:red;">Erro ao carregar utilizadores.</p>';
            });
    }

    // Função para abrir e popular o modal de edição
    function abrirModalEdicaoUsuario(userId, nome, email, tipo) {
        modalEdicaoUsuario = document.getElementById('modalEdicaoUsuario');
        formEdicaoUsuario = document.getElementById('formEdicaoUsuario');
        inputNomeEdicao = document.getElementById('nomeUsuarioEdicao');
        inputEmailEdicao = document.getElementById('emailUsuarioEdicao');
        selectTipoEdicao = document.getElementById('tipoUsuarioEdicao');
        botaoSalvarEdicao = document.getElementById('botaoSalvarEdicao'); // Não usado diretamente aqui, mas o form tem o botão
        botaoFecharModalEdicao = document.getElementById('botaoFecharModalEdicao');
        hiddenUserIdEdicao = document.getElementById('hiddenUserIdEdicao');

        if (!modalEdicaoUsuario || !formEdicaoUsuario || !inputNomeEdicao || !inputEmailEdicao || !selectTipoEdicao || !hiddenUserIdEdicao) {
            console.error("Um ou mais elementos do modal de edição não foram encontrados. Verifique o HTML do modal.");
            showToast("Erro ao abrir o formulário de edição. Verifique o console.", "error");
            return;
        }

        console.log(`Abrindo modal para editar usuário: ID=${userId}, Nome=${nome}, Email=${email}, Tipo=${tipo}`);

        hiddenUserIdEdicao.value = userId;
        inputNomeEdicao.value = nome;
        inputEmailEdicao.value = email;
        inputEmailEdicao.readOnly = true;
        selectTipoEdicao.value = tipo;

        modalEdicaoUsuario.style.display = 'block';
    }

    // VERSÃO NOVA (SALVA NOME, EMAIL E TIPO)
    function salvarEdicaoUsuario() {
        if (!formEdicaoUsuario || !hiddenUserIdEdicao || !selectTipoEdicao) return;

        const userId = document.getElementById('hiddenUserIdEdicao').value;
        const novoNome = document.getElementById('nomeUsuarioEdicao').value;
        const novoEmail = document.getElementById('emailUsuarioEdicao').value;
        const novoTipo = document.getElementById('tipoUsuarioEdicao').value;

        if (!novoNome || !novoEmail || !novoTipo) {
            showToast("Todos os campos são obrigatórios.", "error");
            return;
        }
        
        const submitButton = formEdicaoUsuario.querySelector('button[type="submit"]');
        if(submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'A salvar...';
        }

        // Objeto atualizado com todos os campos
        db.collection("Usuarios").doc(userId).update({
            nome_usuario: novoNome,
            email_usuario: novoEmail,
            tipo_usuario: novoTipo
        })
        .then(() => {
            console.log("Dados do utilizador atualizados com sucesso no Firestore!");
            showToast("Dados do utilizador atualizados com sucesso!", "success");
            fecharModalEdicao();
            carregarListaUsuarios(); 
        })
        .catch((error) => {
            console.error("Erro ao atualizar dados do utilizador:", error);
            showToast("Erro ao atualizar os dados do utilizador. Detalhes no console.", "error");
        })
        .finally(() => {
            if(submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Salvar Alterações';
            }
        });
    }

    // Função para fechar o modal de edição
    function fecharModalEdicao() {
        if (modalEdicaoUsuario) {
            modalEdicaoUsuario.style.display = 'none';
        }
    }

    // Função para configurar o formulário de adicionar novo usuário
    function configurarFormularioAdicionarUsuario() {
        // ... (código existente) ...
        if (!formAdicionarUsuario) return;

        formAdicionarUsuario.addEventListener('submit', function(event) {
            event.preventDefault();
            const nome = document.getElementById('novoUsuarioNome').value;
            const email = document.getElementById('novoUsuarioEmail').value;
            const senha = document.getElementById('novoUsuarioSenha').value;
            const tipo = document.getElementById('novoUsuarioTipo').value;

            const submitButton = formAdicionarUsuario.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'A adicionar...';

            auth.createUserWithEmailAndPassword(email, senha)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log("Utilizador criado no Auth com UID:", user.uid);
                    return db.collection("Usuarios").doc(user.uid).set({
                        nome_usuario: nome,
                        email_usuario: email,
                        tipo_usuario: tipo,
                        data_cadastro: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    console.log("Documento do utilizador salvo no Firestore.");
                    showToast("Utilizador adicionado com sucesso!", "success");
                    formAdicionarUsuario.reset();
                    carregarListaUsuarios();
                })
                .catch((error) => {
                    console.error("Erro ao adicionar utilizador:", error);
                    let mensagemErro = "Ocorreu um erro ao adicionar o utilizador.";
                    if (error.code === 'auth/email-already-in-use') {
                        mensagemErro = "Este e-mail já está em uso por outra conta.";
                    } else if (error.code === 'auth/invalid-email') {
                        mensagemErro = "O formato do e-mail é inválido.";
                    } else if (error.code === 'auth/weak-password') {
                        mensagemErro = "A senha é muito fraca. Use pelo menos 6 caracteres.";
                    }
                    showToast(mensagemErro + " Detalhes: " + error.message, "error");
                })
                .finally(() => {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Adicionar Usuário';
                });
        });
    }


    auth.onAuthStateChanged(function(user) {
        console.log("gerenciar_usuarios_app.js: onAuthStateChanged callback disparado.");
        if (user) {
            console.log("gerenciar_usuarios_app.js: Utilizador autenticado:", user.email);
            if (userInfoElement) {
                userInfoElement.textContent = 'Sessão iniciada como: ' + (user.displayName || user.email);
                console.log("gerenciar_usuarios_app.js: userInfoElement atualizado.");
            }

            const userDocRef = db.collection('Usuarios').doc(user.uid);
            userDocRef.get().then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    if (userData.tipo_usuario === 'Administrador') {
                        console.log("gerenciar_usuarios_app.js: Utilizador é Administrador. Acesso permitido.");
                        if (mainContent) mainContent.style.display = 'block';
                        carregarListaUsuarios();
                        configurarFormularioAdicionarUsuario();
                        
                        modalEdicaoUsuario = document.getElementById('modalEdicaoUsuario');
                        formEdicaoUsuario = document.getElementById('formEdicaoUsuario');
                        botaoFecharModalEdicao = document.getElementById('botaoFecharModalEdicao');

                        if (formEdicaoUsuario) {
                            formEdicaoUsuario.addEventListener('submit', function(event) {
                                event.preventDefault();
                                salvarEdicaoUsuario();
                            });
                        }
                        if (botaoFecharModalEdicao) {
                            botaoFecharModalEdicao.addEventListener('click', fecharModalEdicao);
                        }
                        if (modalEdicaoUsuario) {
                            modalEdicaoUsuario.addEventListener('click', function(event) {
                                if (event.target === modalEdicaoUsuario) { 
                                    fecharModalEdicao();
                                }
                            });
                        }
                    } else {
                        console.warn("gerenciar_usuarios_app.js: Acesso negado. Utilizador não é Administrador.");
                        if (mainContent) {
                            mainContent.innerHTML = '<div class="admin-container"><p style="color:red; text-align:center;">Acesso negado. Esta página é apenas para administradores.</p></div>';
                            mainContent.style.display = 'block';
                        }
                    }
                } else {
                    console.error("gerenciar_usuarios_app.js: Documento do utilizador não encontrado no Firestore para UID:", user.uid);
                    if (mainContent) {
                        mainContent.innerHTML = '<div class="admin-container"><p style="color:red; text-align:center;">Erro: Perfil de utilizador não encontrado.</p></div>';
                        mainContent.style.display = 'block';
                    }
                }
            }).catch(error => {
                console.error("gerenciar_usuarios_app.js: Erro ao buscar dados do utilizador:", error);
                if (mainContent) {
                    mainContent.innerHTML = '<div class="admin-container"><p style="color:red; text-align:center;">Erro ao verificar permissões.</p></div>';
                    mainContent.style.display = 'block';
                }
            });

        } else {
            console.log("gerenciar_usuarios_app.js: Nenhum utilizador autenticado. A redirecionar para o login...");
            window.location.href = 'login.html';
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            console.log("gerenciar_usuarios_app.js: Botão de logout clicado.");
            if (auth && typeof auth.signOut === 'function') {
                auth.signOut().then(() => {
                    console.log('gerenciar_usuarios_app.js: Utilizador terminou a sessão com sucesso via signOut.');
                    window.location.href = 'login.html';
                }).catch((error) => {
                    console.error('gerenciar_usuarios_app.js: Erro ao terminar a sessão:', error);
                    showToast('Erro ao terminar a sessão: ' + error.message, "error");
                });
            } else {
                console.error("gerenciar_usuarios_app.js: Erro: firebase.auth() ou auth.signOut não está disponível para o logout.");
                showToast("Erro crítico ao tentar terminar a sessão. Contacte o suporte.", "error");
            }
        });
    } else {
        console.warn("gerenciar_usuarios_app.js: Botão de logout não encontrado, listener de clique não adicionado.");
    }
}