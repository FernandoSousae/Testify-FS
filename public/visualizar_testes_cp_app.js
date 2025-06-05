
    console.log("visualizar_testes_cp_app.js carregado e DOM pronto!");

    const db = firebase.firestore();
    const listaTestesCpDiv = document.getElementById('listaTestesCp');

    // Elementos do Modal
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const closeModalButton = document.querySelector(".close-modal-button");

    // Função para fechar o modal
    function fecharModal() {
        if (modal) modal.style.display = "none";
    }

        if (closeModalButton) {
            closeModalButton.onclick = fecharModal;
    }
        // Opcional: Fechar modal ao clicar fora da imagem (no fundo escuro)
        if (modal) {
            modal.onclick = function(event) {
                if (event.target === modal) { // Verifica se o clique foi no fundo do modal
                    fecharModal();
            }
        }
    }

    function formatarTimestamp(timestamp) {
        if (timestamp && typeof timestamp.toDate === 'function') {
            const data = timestamp.toDate();
            const dia = String(data.getDate()).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const ano = data.getFullYear();
            return `${dia}/${mes}/${ano}`;
        }
        return 'Data inválida';
    }

    async function carregarEExibirTestesCp() {
        if (!listaTestesCpDiv) {
            console.error("Elemento #listaTestesCp não encontrado!");
        return;
        }
        listaTestesCpDiv.innerHTML = '<p>A carregar testes...</p>';

        try {
        // ETAPA DE OTIMIZAÇÃO: Buscar Tipos de Teste UMA ÚNICA VEZ
        const tiposTesteSnapshot = await db.collection("TiposTeste").get();
        const tiposTesteMap = new Map();
        tiposTesteSnapshot.forEach(doc => {
            tiposTesteMap.set(doc.id, doc.data().nome_tipo_teste);
        });

        // BUSCA PRINCIPAL: Agora busca apenas os testes de calçado pronto
        const querySnapshot = await db.collection("TestesCalcadoPronto")
            .orderBy("data_cadastro", "desc")
            .get();

        if (querySnapshot.empty) {
            listaTestesCpDiv.innerHTML = '<p>Nenhum teste de calçado pronto encontrado.</p>';
            return;
        }

        let htmlTestesItens = [];
        for (const doc of querySnapshot.docs) {
            const teste = doc.data();
            const idTeste = doc.id;

            // Consulta RÁPIDA no mapa em memória, sem acessar o banco de dados aqui
            const nomeTipoTeste = tiposTesteMap.get(teste.id_tipo_teste) || `ID Tipo: ${teste.id_tipo_teste} (não encontrado)`;

            let fotosHtml = '<p>Sem fotos.</p>';
            if (teste.fotos_calcado_urls && teste.fotos_calcado_urls.length > 0) {
                fotosHtml = '<div class="fotos-container">';
                teste.fotos_calcado_urls.forEach(url => {
                    fotosHtml += `<img src="${url}" alt="Foto do calçado" class="thumbnail-image" data-src="${url}">`;
                });
                fotosHtml += '</div>';
            }

            // Adicionamos a div .acoes-teste com os botões de Editar e Excluir
            htmlTestesItens.push(`
                <li class="item-teste" data-id="${idTeste}">
                    <h3>Ref: ${teste.referencia_calcado || 'N/A'} (Linha: ${teste.linha_calcado || 'N/A'})</h3>
                    <p><strong>Sub-categoria:</strong> ${teste.sub_categoria || 'N/A'}</p>
                    <p><strong>Tipo de Teste:</strong> ${nomeTipoTeste}</p>
                    <p><strong>Data Início:</strong> ${formatarTimestamp(teste.data_inicio_teste)}</p>
                    <p><strong>Data Fim:</strong> ${teste.data_fim_teste ? formatarTimestamp(teste.data_fim_teste) : 'Em andamento'}</p>
                    <p><strong>Resultado:</strong> ${teste.resultado || 'N/A'}</p>
                    <p><strong>Responsável:</strong> ${teste.responsavel_teste_email || 'N/A'}</p>
                    <div><strong>Fotos:</strong> ${fotosHtml}</div>
                    <div class="acoes-teste">
                        <button class="edit-test-cp-btn" data-id="${idTeste}">Editar</button>
                        <button class="delete-test-cp-btn" data-id="${idTeste}">Excluir</button>
                    </div>
                </li>
                `);
            }
        listaTestesCpDiv.innerHTML = `<ul>${htmlTestesItens.join('')}</ul>`;

        // Anexar os event listeners para as imagens e os novos botões
        document.querySelectorAll('.thumbnail-image').forEach(img => {
            img.onclick = function() { /* ... sua lógica de modal de imagem ... */ }
        });

        document.querySelectorAll('.edit-test-cp-btn').forEach(button => {
            button.addEventListener('click', function() {
                // A lógica para abrir o modal de edição virá aqui na próxima etapa
                console.log("Clicou em Editar teste ID:", this.dataset.id);
                alert("Funcionalidade de Editar a ser implementada!");
            });
        });

        document.querySelectorAll('.delete-test-cp-btn').forEach(button => {
            button.addEventListener('click', function() {
                // A lógica para excluir o teste virá aqui na próxima etapa
                console.log("Clicou em Excluir teste ID:", this.dataset.id);
                alert("Funcionalidade de Excluir a ser implementada!");
            });
        });

        } catch (error) {
            console.error("Erro ao buscar testes de calçado pronto: ", error);
            listaTestesCpDiv.innerHTML = '<p style="color:red;">Erro ao carregar testes. Tente novamente mais tarde.</p>';
        }
    }

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log("Utilizador autenticado em visualizar_testes_cp:", user.email);
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.textContent = 'Sessão iniciada como: ' + (user.displayName || user.email);
            }
            carregarEExibirTestesCp();
        } else {
            console.log("Nenhum utilizador autenticado. A redirecionar para o login...");
            window.location.href = 'login.html';
        }
    });

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            firebase.auth().signOut().then(() => {
                console.log('Utilizador terminou a sessão com sucesso.');
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Erro ao terminar a sessão:', error);
            });
        });
    }
