document.addEventListener('DOMContentLoaded', function() {
    console.log("visualizar_testes_mp_app.js carregado e DOM pronto!");

    const db = firebase.firestore(); // Descomente ou adicione para ter a referência ao Firestore
    const listaTestesMpDiv = document.getElementById('listaTestesMp'); // Div onde os testes serão listados

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

    // Função para formatar Timestamps do Firestore para uma data legível
    function formatarTimestamp(timestamp) {
        if (timestamp && typeof timestamp.toDate === 'function') {
            const data = timestamp.toDate();
            // Formato dd/mm/aaaa
            const dia = String(data.getDate()).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0'); // Meses são de 0 a 11
            const ano = data.getFullYear();
            return `${dia}/${mes}/${ano}`;
        }
        return 'Data inválida'; // Ou alguma string placeholder
    }


    // Função para carregar e exibir os testes de matéria-prima (MODIFICADA)
    async function carregarEExibirTestes() { // Adicionamos async aqui
        if (!listaTestesMpDiv) {
            console.error("Elemento #listaTestesMp não encontrado!");
            return;
        }

        listaTestesMpDiv.innerHTML = '<p>Carregando testes...</p>';

        try {
            const querySnapshot = await db.collection("TestesMateriaPrima")
                .orderBy("data_cadastro", "desc")
                .get();

            if (querySnapshot.empty) {
                listaTestesMpDiv.innerHTML = '<p>Nenhum teste de matéria-prima encontrado.</p>';
                return;
            }

            let htmlTestesItens = []; // Usaremos um array para construir os itens HTML com dados assíncronos

            for (const doc of querySnapshot.docs) { // Usamos for...of para permitir await dentro do loop
                const teste = doc.data();
                const idTeste = doc.id;

                let nomeMateriaPrima = teste.id_materia_prima; // Default para o ID
                if (teste.id_materia_prima) {
                    try {
                        const mpDoc = await db.collection("MateriasPrimas").doc(teste.id_materia_prima).get();
                        if (mpDoc.exists) {
                            nomeMateriaPrima = mpDoc.data().descricao_mp + (mpDoc.data().codigo_interno_mp ? ` (${mpDoc.data().codigo_interno_mp})` : '');
                        } else {
                            nomeMateriaPrima = `Matéria-Prima ID: ${teste.id_materia_prima} (não encontrada)`;
                        }
                    } catch (error) {
                        console.error("Erro ao buscar matéria-prima ID:", teste.id_materia_prima, error);
                        nomeMateriaPrima = `Erro ao buscar MP ID: ${teste.id_materia_prima}`;
                    }
                }

                let nomeTipoTeste = teste.id_tipo_teste; // Default para o ID
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
                if (teste.fotos_material_urls && teste.fotos_material_urls.length > 0) {
                    fotosHtml = '<div class="fotos-container">';
                    teste.fotos_material_urls.forEach(url => {
                        fotosHtml += `<img src="${url}" alt="Foto do material" class="thumbnail-image" data-src="${url}" style="max-width: 100px; max-height: 100px; margin: 5px;">`;
                    });
                    fotosHtml += '</div>';
                }

                htmlTestesItens.push(`
                    <li class="item-teste" data-id="${idTeste}">
                        <h3>Matéria-Prima: ${nomeMateriaPrima}</h3>
                        <p><strong>ID do Teste no Sistema:</strong> ${idTeste}</p>
                        <p><strong>Tipo de Teste:</strong> ${nomeTipoTeste}</p>
                        <p><strong>Data do Teste:</strong> ${formatarTimestamp(teste.data_teste)}</p>
                        <p><strong>Resultado:</strong> ${teste.resultado || 'N/A'}</p>
                        <p><strong>Observações:</strong> ${teste.observacoes || 'Nenhuma'}</p>
                        <p><strong>Responsável:</strong> ${teste.responsavel_teste_email || 'N/A'}</p>
                        <p><strong>Data de Cadastro:</strong> ${formatarTimestamp(teste.data_cadastro)}</p>
                        <div><strong>Fotos:</strong> ${fotosHtml}</div>
                        <hr>
                    </li>
                `);
            }

            listaTestesMpDiv.innerHTML = `<ul>${htmlTestesItens.join('')}</ul>`;

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
            console.error("Erro ao buscar testes de matéria-prima: ", error);
            listaTestesMpDiv.innerHTML = '<p>Erro ao carregar testes. Tente novamente mais tarde.</p>';
        }
    }


    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log("Usuário autenticado em visualizar_testes_mp:", user.email);
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.textContent = 'Logado como: ' + (user.displayName || user.email);
            }

            // Chama a função para carregar e exibir os testes
            carregarEExibirTestes();

        } else {
            console.log("Nenhum usuário autenticado. Redirecionando para login...");
            window.location.href = 'login.html';
        }
    });

    // Lógica para o botão de logout (permanece a mesma)
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            firebase.auth().signOut().then(() => {
                // ... (código do logout)
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Erro ao fazer logout:', error);
            });
        });
    }
});