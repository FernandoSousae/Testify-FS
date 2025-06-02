document.addEventListener('DOMContentLoaded', function() {
    console.log("cadastrar_teste_cp_app.js carregado e DOM pronto!");

    // const db = firebase.firestore(); // Descomentaremos quando formos usar Firestore aqui
    // const storage = firebase.storage(); // Descomentaremos quando formos usar Storage aqui

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // O usuário está logado!
            console.log("Usuário autenticado em cadastrar_teste_cp:", user.email);
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.textContent = 'Logado como: ' + (user.displayName || user.email);
            }

            // Lógica específica da página de cadastro de teste de CALÇADO PRONTO virá aqui
            // Ex: carregar dropdowns, adicionar listener ao formulário

        } else {
            // Ninguém logado.
            console.log("Nenhum usuário autenticado em cadastrar_teste_cp. Redirecionando para login...");
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