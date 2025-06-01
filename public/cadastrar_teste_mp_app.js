document.addEventListener('DOMContentLoaded', function() {
    console.log("cadastrar_teste_mp_app.js carregado e DOM pronto!");

    // Inicializa a referência ao serviço do Firestore (se necessário para esta página no futuro)
    // const db = firebase.firestore();

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // O usuário está logado!
            console.log("Usuário autenticado em cadastrar_teste_mp:", user.email);
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.textContent = 'Logado como: ' + (user.displayName || user.email);
            }

            // Lógica específica da página de cadastro de teste de matéria-prima virá aqui
            // Por exemplo, carregar dados de Matérias-Primas, Tipos de Teste, etc.

        } else {
            // Ninguém logado.
            console.log("Nenhum usuário autenticado. Redirecionando para login...");
            window.location.href = 'login.html';
        }
    });

    // Lógica para o botão de logout
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            firebase.auth().signOut().then(() => {
                console.log('Usuário deslogado com sucesso.');
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Erro ao fazer logout:', error);
            });
        });
    }
});