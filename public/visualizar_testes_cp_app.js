document.addEventListener('DOMContentLoaded', function() {
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

                let nomeTipoTeste = teste.id_tipo_teste; // Predefinição para o ID
                if (teste.id_tipo_teste) {
                    try {
                        const ttDoc = await db.collection("TiposTeste").doc(teste.id_tipo_teste).get();
                        if (ttDoc.exists) {
                            nomeTipoTeste = ttDoc.data().nome_tipo_teste;
                        } else {
                            nomeTipoTeste = `Tipo de Teste ID: ${teste.id_tipo_teste} (não encontrado)`;
                        }
                    } catch (error) {
                        console.error("Erro ao buscar tipo de teste ID:", teste.id_tipo_teste, error);
                        nomeTipoTeste = `Erro ao buscar Tipo Teste ID: ${teste.id_tipo_teste}`;
                    }
                }

                let fotosHtml = '<p>Sem fotos.</p>';
                if (teste.fotos_calcado_urls && teste.fotos_calcado_urls.length > 0) {
                    fotosHtml = '<div class="fotos-container">';
                    teste.fotos_calcado_urls.forEach(url => {
                        // LINHA CORRIGIDA:
                        fotosHtml += `<img src="${url}" alt="Foto do calçado" class="thumbnail-image" data-src="${url}" style="max-width: 100px; max-height: 100px; margin: 5px;">`;
                    });
                    fotosHtml += '</div>';
                }

                htmlTestesItens.push(`
                    <li class="item-teste" data-id="${idTeste}">
                        <h3>Ref: ${teste.referencia_calcado || 'N/A'} (Linha: ${teste.linha_calcado || 'N/A'})</h3>
                        <p><strong>Sub-categoria:</strong> ${teste.sub_categoria || 'N/A'}</p>
                        <p><strong>ID do Teste no Sistema:</strong> ${idTeste}</p>
                        <p><strong>Tipo de Teste:</strong> ${nomeTipoTeste}</p>
                        <p><strong>Data Início:</strong> ${formatarTimestamp(teste.data_inicio_teste)}</p>
                        <p><strong>Data Fim:</strong> ${teste.data_fim_teste ? formatarTimestamp(teste.data_fim_teste) : 'N/A'}</p>
                        <p><strong>Resultado:</strong> ${teste.resultado || 'N/A'}</p>
                        <p><strong>Requisitante:</strong> ${teste.requisitante_teste || 'N/A'}</p>
                        <p><strong>Plano de Produção:</strong> ${teste.plano_producao || 'N/A'}</p>
                        <p><strong>Fábrica:</strong> ${teste.fabrica_producao || 'N/A'}</p>
                        <p><strong>Materiais Avaliados:</strong> ${teste.materiais_avaliados || 'Nenhum'}</p>
                        <p><strong>Observações Gerais:</strong> ${teste.observacoes_gerais || 'Nenhuma'}</p>
                        <p><strong>Responsável:</strong> ${teste.responsavel_teste_email || 'N/A'}</p>
                        <p><strong>Data de Cadastro:</strong> ${formatarTimestamp(teste.data_cadastro)}</p>
                        <div><strong>Fotos:</strong> ${fotosHtml}</div>
                        <hr>
                    </li>
                `);
            }
            listaTestesCpDiv.innerHTML = `<ul>${htmlTestesItens.join('')}</ul>`;

            // Após adicionar o HTML ao DOM, adicionamos os event listeners às imagens
            document.querySelectorAll('.thumbnail-image').forEach(img => {
                img.onclick = function() {
                    if (modal && modalImg && captionText) {
                        modal.style.display = "block";
                        modalImg.src = this.dataset.src; // Usamos data-src para garantir que é o URL original
                        captionText.innerHTML = this.alt; // Opcional: usar o alt como legenda
                    }
                }
            });

        } catch (error) {
            console.error("Erro ao buscar testes de calçado pronto: ", error);
            listaTestesCpDiv.innerHTML = '<p>Erro ao carregar testes. Tente novamente mais tarde.</p>';
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
});