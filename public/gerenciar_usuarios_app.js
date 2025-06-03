// Este console.log deve ser a primeira coisa a aparecer se o ficheiro for carregado e executado.
console.log("gerenciar_usuarios_app.js: Ficheiro INICIADO.");

// Verifica se o objeto firebase e seus serviços essenciais estão disponíveis globalmente.
// Isto assume que firebase-config.js e os SDKs do Firebase foram carregados
// e firebase.initializeApp() foi chamado com sucesso ANTES deste script ser executado.
if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined' || typeof firebase.firestore === 'undefined') {
    console.error("ERRO CRÍTICO em gerenciar_usuarios_app.js: Firebase, firebase.auth(), ou firebase.firestore() NÃO está definido. Verifique a ordem de carregamento e inicialização dos scripts no HTML.");
    // Poderia exibir uma mensagem de erro para o utilizador aqui também, se o mainContent existir.
    const mainContentErrorCheck = document.querySelector('main');
    if (mainContentErrorCheck) {
        mainContentErrorCheck.innerHTML = '<div class="admin-container"><p style="color:red; text-align:center;">Erro crítico na inicialização da aplicação. Contacte o suporte.</p></div>';
        mainContentErrorCheck.style.display = 'block';
    }
    // Interrompe a execução se o Firebase não estiver pronto.
    // No entanto, como este script é carregado dinamicamente após a inicialização,
    // este erro não deveria ocorrer se o HTML estiver correto.
} else {
    console.log("gerenciar_usuarios_app.js: Firebase, auth e firestore estão definidos. A prosseguir.");

    const db = firebase.firestore();
    const auth = firebase.auth();

    const userInfoElement = document.getElementById('userInfo');
    const logoutButton = document.getElementById('logoutButton');
    const mainContent = document.querySelector('main');

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
        // Esconder conteúdo principal até a verificação do admin
        mainContent.style.display = 'none';
        console.log("gerenciar_usuarios_app.js: Conteúdo principal ('main') escondido inicialmente.");
    }

    auth.onAuthStateChanged(function(user) {
        console.log("gerenciar_usuarios_app.js: onAuthStateChanged callback disparado.");
        if (user) {
            console.log("gerenciar_usuarios_app.js: Utilizador autenticado:", user.email);
            if (userInfoElement) {
                userInfoElement.textContent = 'Sessão iniciada como: ' + (user.displayName || user.email);
                console.log("gerenciar_usuarios_app.js: userInfoElement atualizado.");
            } else {
                console.warn("gerenciar_usuarios_app.js: Tentativa de atualizar userInfo, mas o elemento não foi encontrado.");
            }

            const userDocRef = db.collection('Usuarios').doc(user.uid);
            userDocRef.get().then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    if (userData.tipo_usuario === 'Administrador') {
                        console.log("gerenciar_usuarios_app.js: Utilizador é Administrador. Acesso permitido.");
                        if (mainContent) mainContent.style.display = 'block';
                        // carregarListaUsuarios();
                        // configurarFormularioAdicionarUsuario();
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
                    alert('Erro ao terminar a sessão: ' + error.message);
                });
            } else {
                console.error("gerenciar_usuarios_app.js: Erro: firebase.auth() ou auth.signOut não está disponível para o logout.");
                alert("Erro crítico ao tentar terminar a sessão. Contacte o suporte.");
            }
        });
    } else {
        console.warn("gerenciar_usuarios_app.js: Botão de logout não encontrado, listener de clique não adicionado.");
    }
}