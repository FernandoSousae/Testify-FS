// Este console.log deve ser a primeira coisa a aparecer se o ficheiro for carregado e executado.
console.log("dashboard_app.js: Ficheiro INICIADO.");

// Verifica se o objeto firebase e seus serviços essenciais estão disponíveis globalmente.
// Isto assume que firebase-config.js e os SDKs do Firebase foram carregados
// e firebase.initializeApp() foi chamado com sucesso ANTES deste script ser carregado
// (conforme a lógica no dashboard.html).
if (typeof firebase === 'undefined' || typeof firebase.auth === 'undefined' || typeof firebase.firestore === 'undefined') {
    console.error("ERRO CRÍTICO em dashboard_app.js: Firebase, firebase.auth(), ou firebase.firestore() NÃO está definido. Verifique a inicialização no HTML.");
    const mainContentErrorCheck = document.querySelector('main');
    if (mainContentErrorCheck) {
        mainContentErrorCheck.innerHTML = '<div class="admin-container"><p style="color:red; text-align:center;">Erro crítico na inicialização da aplicação (dashboard_app). Contacte o suporte.</p></div>';
        // Não escondemos o main content aqui, pois já pode estar visível com erro do HTML.
    }
} else {
    console.log("dashboard_app.js: Firebase, auth e firestore estão definidos. A prosseguir.");

    const db = firebase.firestore();
    const auth = firebase.auth();

    const userInfoElement = document.getElementById('userInfo');
    const logoutButton = document.getElementById('logoutButton');
    const adminOnlyMenuItems = document.querySelectorAll('.admin-only');

    if (!userInfoElement) {
        console.error("dashboard_app.js: Elemento 'userInfo' NÃO encontrado no DOM.");
    } else {
        console.log("dashboard_app.js: Elemento 'userInfo' encontrado.");
    }
    if (!logoutButton) {
        console.error("dashboard_app.js: Elemento 'logoutButton' NÃO encontrado no DOM.");
    } else {
        console.log("dashboard_app.js: Elemento 'logoutButton' encontrado.");
    }
    if (adminOnlyMenuItems.length === 0) {
        console.warn("dashboard_app.js: Nenhum elemento com a classe '.admin-only' foi encontrado.");
    } else {
        console.log(`dashboard_app.js: Encontrados ${adminOnlyMenuItems.length} itens de menu '.admin-only'.`);
        // Esconder por defeito, serão mostrados se o utilizador for admin
        adminOnlyMenuItems.forEach(item => item.style.display = 'none');
    }


    auth.onAuthStateChanged(function(user) {
        console.log("dashboard_app.js: onAuthStateChanged callback disparado.");
        if (user) {
            console.log("dashboard_app.js: Utilizador autenticado:", user.email);
            if (userInfoElement) {
                userInfoElement.textContent = 'Sessão iniciada como: ' + (user.displayName || user.email);
                console.log("dashboard_app.js: userInfoElement atualizado.");
            }

            // Verificar se o utilizador é Administrador para mostrar/esconder itens
            const userDocRef = db.collection('Usuarios').doc(user.uid);
            userDocRef.get().then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    if (userData.tipo_usuario === 'Administrador') {
                        console.log("dashboard_app.js: Utilizador é Administrador. A mostrar itens de admin.");
                        adminOnlyMenuItems.forEach(item => item.style.display = 'flex'); // 'flex' porque .menu-item usa flex
                    } else {
                        console.log("dashboard_app.js: Utilizador não é Administrador. Itens de admin permanecem escondidos.");
                        adminOnlyMenuItems.forEach(item => item.style.display = 'none');
                    }
                } else {
                    console.warn("dashboard_app.js: Documento do utilizador não encontrado no Firestore para UID:", user.uid, ". Itens de admin permanecerão escondidos.");
                    adminOnlyMenuItems.forEach(item => item.style.display = 'none');
                }
            }).catch(error => {
                console.error("dashboard_app.js: Erro ao buscar dados do utilizador para verificar tipo:", error);
                adminOnlyMenuItems.forEach(item => item.style.display = 'none'); // Esconder por segurança
            });

        } else {
            console.log("dashboard_app.js: Nenhum utilizador autenticado. A redirecionar para o login...");
            window.location.href = 'login.html';
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            console.log("dashboard_app.js: Botão de logout clicado.");
            if (auth && typeof auth.signOut === 'function') {
                auth.signOut().then(() => {
                    console.log('dashboard_app.js: Utilizador terminou a sessão com sucesso via signOut.');
                    window.location.href = 'login.html';
                }).catch((error) => {
                    console.error('dashboard_app.js: Erro ao terminar a sessão:', error);
                    showToast('Erro ao terminar a sessão: ' + error.message, 'error');
                });
            } else {
                console.error("dashboard_app.js: Erro: firebase.auth() ou auth.signOut não está disponível para o logout.");
                showToast("Erro crítico ao tentar terminar a sessão. Contacte o suporte.", "error");
            }
        });
    } else {
        console.warn("dashboard_app.js: Botão de logout não encontrado, listener de clique não adicionado.");
    }
}