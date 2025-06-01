document.addEventListener('DOMContentLoaded', function() {
    console.log("dashboard_app.js carregado e DOM pronto!");

    // Inicializa a referência ao serviço do Firestore
    const db = firebase.firestore();

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // O usuário está logado!
            console.log("Usuário autenticado no dashboard:", user.email, "UID:", user.uid);

            // Exibe informações básicas do usuário
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.textContent = 'Bem-vindo(a), ' + (user.displayName || user.email) + '!';
            }

            // Buscar o tipo de usuário no Firestore
            const userDocRef = db.collection('Usuarios').doc(user.uid);

            userDocRef.get().then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    console.log("Dados do usuário do Firestore:", userData);
                    const tipoUsuario = userData.tipo_usuario;

                    if (tipoUsuario === 'Administrador') {
                        console.log("Usuário é Administrador. Mostrando itens de admin.");
                        mostrarItensAdmin(true);
                    } else {
                        console.log("Usuário não é Administrador. Escondendo itens de admin.");
                        mostrarItensAdmin(false);
                    }
                } else {
                    // Documento do usuário não encontrado no Firestore
                    console.warn("Documento do usuário não encontrado no Firestore para UID:", user.uid);
                    mostrarItensAdmin(false); // Esconde por segurança
                }
            }).catch((error) => {
                console.error("Erro ao buscar dados do usuário no Firestore:", error);
                mostrarItensAdmin(false); // Esconde por segurança em caso de erro
            });

        } else {
            // Ninguém logado.
            console.log("Nenhum usuário autenticado. Redirecionando para login...");
            window.location.href = 'login.html';
        }
    });

    // Função para mostrar ou esconder os itens de menu de administrador
    function mostrarItensAdmin(mostrar) {
        const itensAdmin = document.querySelectorAll('.admin-only');
        itensAdmin.forEach(item => {
            item.style.display = mostrar ? 'flex' : 'none'; // 'flex' porque usamos display:flex nos menu-item
        });
    }

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