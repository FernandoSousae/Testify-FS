document.addEventListener('DOMContentLoaded', function() {
    console.log("visualizar_testes_mp_app.js carregado e DOM pronto!");

    const db = firebase.firestore();
    const storage = firebase.storage(); // Adicionamos referência ao Storage para excluir fotos
    const listaTestesMpDiv = document.getElementById('listaTestesMp');

    // Elementos do Modal de Imagem (já existentes no seu código)
    const imageModal = document.getElementById("imageModal");
    const modalImage = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const closeImageModalButton = document.getElementById("closeImageModalBtn"); // Usando o ID do seu HTML para o modal de imagem

    // Elementos do Modal de Edição de Teste de Matéria-Prima
    let modalEdicaoTesteMp, formEdicaoTesteMp, inputDataTesteEdicao, selectResultadoEdicao, textareaObservacoesEdicao, hiddenTesteMpIdEdicao, botaoFecharModalEdicaoTesteMp;

    // Função para fechar o modal de IMAGEM
    function fecharModalImagem() {
        if (imageModal) imageModal.style.display = "none";
    }

    if (closeImageModalButton) {
        closeImageModalButton.onclick = fecharModalImagem;
    }
    if (imageModal) {
        imageModal.onclick = function(event) {
            if (event.target === imageModal) { // Verifica se o clique foi no fundo do modal
                fecharModalImagem();
            }
        }
    }

    // Função para formatar Timestamps do Firestore para uma data legível (DD/MM/AAAA)
    function formatarTimestamp(timestamp) {
        if (timestamp && typeof timestamp.toDate === 'function') {
            const data = timestamp.toDate();
            const dia = String(data.getDate()).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0'); // Meses são de 0 a 11
            const ano = data.getFullYear();
            return `${dia}/${mes}/${ano}`;
        }
        return 'Data inválida';
    }

    // Função para formatar data para input type="date" (AAAA-MM-DD)
    function formatarParaInputDate(timestamp) {
        if (timestamp && typeof timestamp.toDate === 'function') {
            const data = timestamp.toDate();
            const ano = data.getFullYear();
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const dia = String(data.getDate()).padStart(2, '0');
            return `${ano}-${mes}-${dia}`;
        }
        return '';
    }

    // Função para abrir e popular o modal de edição de Teste de Matéria-Prima
    function abrirModalEdicaoTesteMp(testeId, dadosTeste) {
        // Inicializar referências aos elementos do modal de EDIÇÃO aqui
        modalEdicaoTesteMp = document.getElementById('modalEdicaoTesteMp');
        formEdicaoTesteMp = document.getElementById('formEdicaoTesteMp');
        inputDataTesteEdicao = document.getElementById('dataTesteEdicao');
        selectResultadoEdicao = document.getElementById('resultadoTesteEdicao');
        textareaObservacoesEdicao = document.getElementById('observacoesTesteEdicao');
        hiddenTesteMpIdEdicao = document.getElementById('hiddenTesteMpIdEdicao');
        
        if (!modalEdicaoTesteMp || !formEdicaoTesteMp || !inputDataTesteEdicao || !selectResultadoEdicao || !textareaObservacoesEdicao || !hiddenTesteMpIdEdicao) {
            console.error("Um ou mais elementos do modal de edição de Teste MP não foram encontrados. Verifique o HTML do modal.");
            // Assumindo que showToast existe e está carregado (do utils.js)
            if (typeof showToast === 'function') {
                showToast("Erro ao abrir formulário de edição. Verifique o console.", "error");
            } else {
                alert("Erro ao abrir formulário de edição. Verifique o console.");
            }
            return;
        }

        console.log("Abrindo modal para editar Teste MP ID:", testeId, "Dados:", dadosTeste);
        hiddenTesteMpIdEdicao.value = testeId;
        inputDataTesteEdicao.value = formatarParaInputDate(dadosTeste.data_teste);
        selectResultadoEdicao.value = dadosTeste.resultado;
        textareaObservacoesEdicao.value = dadosTeste.observacoes || '';
        
        // Lógica para exibir fotos existentes e permitir adicionar/remover fotos seria mais complexa e viria aqui.
        // Por simplicidade inicial, não vamos permitir editar fotos diretamente neste modal.

        modalEdicaoTesteMp.style.display = 'block';
    }

    // Função para fechar o modal de EDIÇÃO
    function fecharModalEdicaoTesteMp() {
        if (modalEdicaoTesteMp) { // Verifica se modalEdicaoTesteMp foi inicializado
            modalEdicaoTesteMp.style.display = 'none';
        }
    }

    // Função para salvar as alterações do Teste de Matéria-Prima
    async function salvarEdicaoTesteMp() {
        // Re-obter referências caso o DOM tenha sido modificado ou para garantir
        // Estas referências já devem ter sido inicializadas em abrirModalEdicaoTesteMp ou no onAuthStateChanged
        if (!formEdicaoTesteMp || !hiddenTesteMpIdEdicao || !inputDataTesteEdicao || !selectResultadoEdicao || !textareaObservacoesEdicao) {
            console.error("Formulário de edição ou seus campos não encontrados ao tentar salvar.");
            if (typeof showToast === 'function') showToast("Erro ao salvar: formulário de edição não encontrado.", "error");
            else alert("Erro ao salvar: formulário de edição não encontrado.");
            return;
        }

        const testeId = hiddenTesteMpIdEdicao.value;
        const novosDados = {
            data_teste: firebase.firestore.Timestamp.fromDate(new Date(inputDataTesteEdicao.value)),
            resultado: selectResultadoEdicao.value,
            observacoes: textareaObservacoesEdicao.value,
            data_ultima_modificacao: firebase.firestore.FieldValue.serverTimestamp()
        };

        const submitButton = formEdicaoTesteMp.querySelector('button[type="submit"]');
        if(submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'A Salvar...';
        }

        try {
            await db.collection("TestesMateriaPrima").doc(testeId).update(novosDados);
            console.log("Teste de Matéria-Prima atualizado com sucesso!");
            if (typeof showToast === 'function') showToast("Teste atualizado com sucesso!", "success");
            else alert("Teste atualizado com sucesso!");
            fecharModalEdicaoTesteMp();
            carregarEExibirTestes(); 
        } catch (error) {
            console.error("Erro ao atualizar o teste de matéria-prima:", error);
            if (typeof showToast === 'function') showToast("Erro ao atualizar o teste: " + error.message, "error");
            else alert("Erro ao atualizar o teste: " + error.message);
        } finally {
            if(submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Salvar Alterações';
            }
        }
    }
    
    // Função para excluir um Teste de Matéria-Prima
    async function excluirTesteMp(testeId, fotosUrls) {
        if (!confirm("Tem certeza que deseja excluir este teste de matéria-prima? Esta ação não pode ser desfeita.")) {
            return;
        }
        console.log(`Iniciando exclusão do teste ID: ${testeId}`);

        try {
            if (fotosUrls && fotosUrls.length > 0) {
                console.log(`Existem ${fotosUrls.length} fotos para excluir do Storage.`);
                const deletePromises = fotosUrls.map(url => {
                    try {
                        // Tentativa mais robusta de obter a referência do arquivo a partir da URL de download
                        const fileRef = storage.refFromURL(url);
                        console.log("A tentar excluir do Storage:", fileRef.fullPath);
                        return fileRef.delete();
                    } catch(e) {
                        console.error("Erro ao obter referência da foto para exclusão a partir da URL:", url, e);
                        // Tentar a abordagem anterior como fallback se refFromURL falhar (menos provável com URLs de download padrão)
                        try {
                            const urlObj = new URL(url);
                            const pathName = decodeURIComponent(urlObj.pathname);
                            const filePath = pathName.substring(pathName.indexOf('/o/') + 3);
                            if (filePath) {
                                console.log("Fallback: A tentar excluir do Storage:", filePath);
                                return storage.ref(filePath).delete();
                            } else {
                                console.warn("Fallback: Não foi possível extrair o caminho do arquivo da URL:", url);
                                return Promise.resolve();
                            }
                        } catch (e2) {
                            console.error("Fallback: Erro ao parsear URL da foto para exclusão:", url, e2);
                            return Promise.resolve(); 
                        }
                    }
                });
                await Promise.all(deletePromises);
                console.log("Fotos associadas excluídas do Storage (ou tentativa feita).");
            } else {
                console.log("Nenhuma foto para excluir do Storage para este teste.");
            }

            await db.collection("TestesMateriaPrima").doc(testeId).delete();
            console.log("Teste de Matéria-Prima excluído do Firestore com sucesso!");
            if (typeof showToast === 'function') showToast("Teste excluído com sucesso!", "success");
            else alert("Teste excluído com sucesso!");
            carregarEExibirTestes();
        } catch (error) {
            console.error("Erro ao excluir o teste de matéria-prima:", error);
            if (typeof showToast === 'function') showToast("Erro ao excluir o teste: " + error.message, "error");
            else alert("Erro ao excluir o teste: " + error.message);
        }
    }

    async function carregarEExibirTestes() {
        if (!listaTestesMpDiv) {
            console.error("Elemento #listaTestesMp não encontrado!");
            return;
        }
        listaTestesMpDiv.innerHTML = '<p>A carregar testes...</p>';

        try {
            console.log("Debug: Iniciando carregarEExibirTestes...");
            const querySnapshot = await db.collection("TestesMateriaPrima")
                .orderBy("data_cadastro", "desc")
                .get();
            console.log("Debug: Query principal para TestesMateriaPrima concluída. Documentos:", querySnapshot.docs.length);

            if (querySnapshot.empty) {
                listaTestesMpDiv.innerHTML = '<p>Nenhum teste de matéria-prima encontrado.</p>';
                console.log("Debug: Nenhum teste encontrado.");
                return;
            }

            let htmlTestesItens = [];
            console.log("Debug: Iniciando loop pelos testes...");

            for (const doc of querySnapshot.docs) {
                const teste = doc.data();
                const idTeste = doc.id;
                console.log(`Debug: Processando teste ID: ${idTeste}`);

                let nomeMateriaPrima = `ID MP: ${teste.id_materia_prima}`;
                if (teste.id_materia_prima) {
                    try {
                        const mpDoc = await db.collection("MateriasPrimas").doc(teste.id_materia_prima).get();
                        if (mpDoc.exists) {
                            nomeMateriaPrima = mpDoc.data().descricao_mp + (mpDoc.data().codigo_interno_mp ? ` (${mpDoc.data().codigo_interno_mp})` : '');
                        } else {
                            nomeMateriaPrima = `Matéria-Prima ID: ${teste.id_materia_prima} (não encontrada)`;
                        }
                    } catch (error) { // Adicionar log no catch também
                        console.error("Erro ao buscar matéria-prima ID:", teste.id_materia_prima, error);
                        nomeMateriaPrima = `Erro ao buscar MP ID: ${teste.id_materia_prima}`;
                    }
                }

                let nomeTipoTeste = `ID Tipo: ${teste.id_tipo_teste}`;
                if (teste.id_tipo_teste) {
                    try {
                        const ttDoc = await db.collection("TiposTeste").doc(teste.id_tipo_teste).get();
                        if (ttDoc.exists) {
                            nomeTipoTeste = ttDoc.data().nome_tipo_teste;
                        } else {
                            nomeTipoTeste = `Tipo de Teste ID: ${teste.id_tipo_teste} (não encontrado)`;
                        }
                    } catch (error) { // Adicionar log no catch também
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
                        <div>
                            <h3>Matéria-Prima: ${nomeMateriaPrima}</h3>
                            <p><strong>ID do Teste:</strong> ${idTeste}</p>
                            <p><strong>Tipo de Teste:</strong> ${nomeTipoTeste}</p>
                            <p><strong>Data do Teste:</strong> ${formatarTimestamp(teste.data_teste)}</p>
                            <p><strong>Resultado:</strong> ${teste.resultado || 'N/A'}</p>
                            <p><strong>Observações:</strong> ${teste.observacoes || 'Nenhuma'}</p>
                            <p><strong>Responsável:</strong> ${teste.responsavel_teste_email || 'N/A'}</p>
                            <p><strong>Data de Cadastro:</strong> ${formatarTimestamp(teste.data_cadastro)}</p>
                            <div><strong>Fotos:</strong> ${fotosHtml}</div>
                        </div>
                        <div class="acoes-teste">
                            <button class="edit-test-btn" data-id="${idTeste}">Editar</button>
                            <button class="delete-test-btn" data-id="${idTeste}">Excluir</button>
                        </div>
                        <hr style="clear:both; margin-top:10px;">
                    </li>
                `);
            }
            console.log("Debug: Loop concluído. Montando HTML final.");
            listaTestesMpDiv.innerHTML = `<ul>${htmlTestesItens.join('')}</ul>`;
            console.log("Debug: HTML renderizado.");

            document.querySelectorAll('.thumbnail-image').forEach(img => {
                img.onclick = function() {
                    if (imageModal && modalImage && captionText) { 
                        imageModal.style.display = "block";
                        modalImage.src = this.dataset.src;
                        captionText.innerHTML = this.alt;
                    }
                }
            });

            document.querySelectorAll('.edit-test-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const testeId = this.dataset.id;
                    db.collection("TestesMateriaPrima").doc(testeId).get().then(docSnapshot => {
                        if (docSnapshot.exists) {
                            abrirModalEdicaoTesteMp(testeId, docSnapshot.data());
                        } else {
                            console.error("Documento do teste não encontrado para edição.");
                            if (typeof showToast === 'function') showToast("Erro: Teste não encontrado para edição.", "error");
                            else alert("Erro: Teste não encontrado para edição.");
                        }
                    }).catch(err => {
                        console.error("Erro ao buscar dados do teste para edição:", err);
                        if (typeof showToast === 'function') showToast("Erro ao carregar dados para edição.", "error");
                        else alert("Erro ao carregar dados para edição.");
                    });
                });
            });

            document.querySelectorAll('.delete-test-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const testeId = this.dataset.id;
                    db.collection("TestesMateriaPrima").doc(testeId).get().then(docSnapshot => {
                        if (docSnapshot.exists) {
                            const dadosTeste = docSnapshot.data();
                            excluirTesteMp(testeId, dadosTeste.fotos_material_urls || []);
                        } else {
                             console.error("Documento do teste não encontrado para exclusão.");
                             if (typeof showToast === 'function') showToast("Erro: Teste não encontrado para exclusão.", "error");
                             else alert("Erro: Teste não encontrado para exclusão.");
                        }
                    }).catch(err => {
                        console.error("Erro ao buscar dados do teste para exclusão:", err);
                        if (typeof showToast === 'function') showToast("Erro ao carregar dados para exclusão.", "error");
                        else alert("Erro ao carregar dados para exclusão.");
                    });
                });
            });

        } catch (error) {
            console.error("Erro DETALHADO em carregarEExibirTestes: ", error);
            listaTestesMpDiv.innerHTML = `<p>Erro ao carregar testes. Verifique o console para detalhes. (${error.message || 'Erro desconhecido'})</p>`;
        }
    }

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.textContent = 'Sessão iniciada como: ' + (user.displayName || user.email);
            }
            carregarEExibirTestes();

            // Configurar listeners para o modal de edição de Teste de Matéria-Prima
            // É importante que o HTML do modal já exista na página para estes getElementById funcionarem
            modalEdicaoTesteMp = document.getElementById('modalEdicaoTesteMp');
            formEdicaoTesteMp = document.getElementById('formEdicaoTesteMp');
            botaoFecharModalEdicaoTesteMp = document.getElementById('botaoFecharModalEdicaoTesteMp');

            if (formEdicaoTesteMp) {
                formEdicaoTesteMp.addEventListener('submit', function(event) {
                    event.preventDefault();
                    salvarEdicaoTesteMp();
                });
            } else {
                console.warn("Formulário de edição de Teste MP não encontrado para adicionar listener de submit.");
            }

            if (botaoFecharModalEdicaoTesteMp) {
                botaoFecharModalEdicaoTesteMp.addEventListener('click', fecharModalEdicaoTesteMp);
            } else {
                console.warn("Botão de fechar modal de edição de Teste MP não encontrado.");
            }

            if (modalEdicaoTesteMp) { 
                modalEdicaoTesteMp.addEventListener('click', function(event) {
                    if (event.target === modalEdicaoTesteMp) { // Para fechar clicando fora
                        fecharModalEdicaoTesteMp();
                    }
                });
            } else {
                 console.warn("Elemento do modal de edição de Teste MP não encontrado.");
            }

        } else {
            window.location.href = 'login.html';
        }
    });

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            firebase.auth().signOut().then(() => {
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Erro ao terminar a sessão:', error);
                if (typeof showToast === 'function') { 
                    showToast('Erro ao terminar a sessão: ' + error.message, "error");
                } else {
                    alert('Erro ao terminar a sessão: ' + error.message);
                }
            });
        });
    }
});