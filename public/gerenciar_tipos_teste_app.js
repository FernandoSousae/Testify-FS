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
    
    // Elementos específicos desta página
    const listaTiposTesteDiv = document.getElementById('listaTiposTeste');
    const formAdicionarTipoTeste = document.getElementById('formAdicionarTipoTeste');
    // Elementos do Modal de Edição (serão referenciados depois)
    let modalEdicaoTipoTeste, formEdicaoTipoTeste, inputNomeEdicao, inputDescricaoEdicao, selectCategoriaEdicao, hiddenTipoTesteIdEdicao, botaoFecharModalEdicaoTipoTeste;


    if (!mainContent) {
        console.error("gerenciar_tipos_teste_app.js: Elemento 'main' NÃO encontrado no DOM.");
    } else {
        mainContent.style.display = 'none'; // Esconde por defeito
    }
    if (!listaTiposTesteDiv) {
        console.error("gerenciar_tipos_teste_app.js: Elemento 'listaTiposTeste' NÃO encontrado no DOM.");
    }
    if (!formAdicionarTipoTeste) {
        console.error("gerenciar_tipos_teste_app.js: Elemento 'formAdicionarTipoTeste' NÃO encontrado no DOM.");
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
                                <button class="edit-btn" data-id="${idTipoTeste}">Editar</button>
                                <button class="delete-btn" data-id="${idTipoTeste}">Excluir</button>
                            </div>
                        </li>
                    `;
                });
                htmlTiposTeste += '</ul>';
                listaTiposTesteDiv.innerHTML = htmlTiposTeste;

                // Adicionar event listeners para os botões de editar e excluir (implementação futura)
                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const id = this.dataset.id;
                        // Lógica para abrir modal de edição com dados do tipo de teste 'id'
                        console.log("Editar tipo de teste ID:", id);
                        alert("Funcionalidade de edição ainda não implementada.");
                    });
                });
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const id = this.dataset.id;
                        // Lógica para excluir tipo de teste 'id'
                        console.log("Excluir tipo de teste ID:", id);
                        alert("Funcionalidade de exclusão ainda não implementada.");
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
                alert("O nome do tipo de teste e a categoria aplicável são obrigatórios.");
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
                alert("Novo tipo de teste adicionado com sucesso!");
                formAdicionarTipoTeste.reset();
                carregarListaTiposTeste(); // Atualiza a lista
            })
            .catch((error) => {
                console.error("Erro ao adicionar novo tipo de teste:", error);
                alert("Erro ao adicionar tipo de teste. Detalhes no console.");
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
                        // configurarModalEdicaoTipoTeste(); // Implementaremos depois
                    } else {
                        console.warn("gerenciar_tipos_teste_app.js: Acesso negado. Utilizador não é Administrador.");
                        if (mainContent) {
                            mainContent.innerHTML = '<div class="admin-container"><p style="color:red; text-align:center;">Acesso negado. Esta página é apenas para administradores.</p></div>';
                            mainContent.style.display = 'block';
                        }
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