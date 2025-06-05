
    console.log("DEPURAÇÃO: 'visualizar_testes_mp_app.js' INICIOU A EXECUÇÃO (sem DOMContentLoaded).");

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

    async function abrirModalEdicaoTesteMp(testeId, dadosTeste) {
        // Busca os elementos do modal
        modalEdicaoTesteMp = document.getElementById('modalEdicaoTesteMp');
        formEdicaoTesteMp = document.getElementById('formEdicaoTesteMp');
        hiddenTesteMpIdEdicao = document.getElementById('hiddenTesteMpIdEdicao');
        
        // CAMPOS NOVOS
        const selectMateriaPrimaEdicao = document.getElementById('materiaPrimaEdicao');
        const selectTipoTesteEdicao = document.getElementById('tipoTesteEdicao');

        // CAMPOS ANTIGOS
        const inputDataTesteEdicao = document.getElementById('dataTesteEdicao');
        const selectResultadoEdicao = document.getElementById('resultadoTesteEdicao');
        const textareaObservacoesEdicao = document.getElementById('observacoesTesteEdicao');

        if (!modalEdicaoTesteMp || !selectMateriaPrimaEdicao || !selectTipoTesteEdicao) {
            console.error("Elementos essenciais do modal de edição não encontrados.");
            showToast("Erro ao abrir formulário de edição.", "error");
            return;
        }

        console.log("Abrindo modal para editar Teste MP ID:", testeId);
        
        // 1. Limpar e popular os dropdowns de Matéria-Prima e Tipo de Teste
        selectMateriaPrimaEdicao.innerHTML = '<option value="">A carregar MP...</option>';
        selectTipoTesteEdicao.innerHTML = '<option value="">A carregar Tipos...</option>';
        
        const [materiasPrimasSnapshot, tiposTesteSnapshot] = await Promise.all([
            db.collection("MateriasPrimas").orderBy("descricao_mp").get(),
            db.collection("TiposTeste").where("categoria_aplicavel", "in", ["Matéria-Prima", "Ambos"]).orderBy("nome_tipo_teste").get()
        ]);

        selectMateriaPrimaEdicao.innerHTML = '<option value="">Selecione...</option>';
        materiasPrimasSnapshot.forEach(doc => {
            const data = doc.data();
            const nomeCompleto = data.descricao_mp + (data.codigo_interno_mp ? ` (${data.codigo_interno_mp})` : '');
            selectMateriaPrimaEdicao.innerHTML += `<option value="${doc.id}">${nomeCompleto}</option>`;
        });

        selectTipoTesteEdicao.innerHTML = '<option value="">Selecione...</option>';
        tiposTesteSnapshot.forEach(doc => {
            selectTipoTesteEdicao.innerHTML += `<option value="${doc.id}">${doc.data().nome_tipo_teste}</option>`;
        });

        // 2. Preencher TODOS os campos do formulário com os dados do teste atual
        hiddenTesteMpIdEdicao.value = testeId;
        selectMateriaPrimaEdicao.value = dadosTeste.id_materia_prima; // Pré-seleciona a matéria-prima
        selectTipoTesteEdicao.value = dadosTeste.id_tipo_teste;       // Pré-seleciona o tipo de teste
        inputDataTesteEdicao.value = formatarParaInputDate(dadosTeste.data_teste);
        selectResultadoEdicao.value = dadosTeste.resultado;
        textareaObservacoesEdicao.value = dadosTeste.observacoes || '';

        // 3. Exibir o modal
        modalEdicaoTesteMp.style.display = 'block';
    }

    // Função para fechar o modal de EDIÇÃO
    function fecharModalEdicaoTesteMp() {
        if (modalEdicaoTesteMp) { // Verifica se modalEdicaoTesteMp foi inicializado
            modalEdicaoTesteMp.style.display = 'none';
        }
    }

    async function salvarEdicaoTesteMp() {
        const testeId = document.getElementById('hiddenTesteMpIdEdicao').value;
        
        // Captura os valores de TODOS os campos, incluindo os novos
        const novosDados = {
            id_materia_prima: document.getElementById('materiaPrimaEdicao').value,
            id_tipo_teste: document.getElementById('tipoTesteEdicao').value,
            data_teste: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataTesteEdicao').value)),
            resultado: document.getElementById('resultadoTesteEdicao').value,
            observacoes: document.getElementById('observacoesTesteEdicao').value,
            data_ultima_modificacao: firebase.firestore.FieldValue.serverTimestamp()
        };

        const submitButton = document.getElementById('formEdicaoTesteMp').querySelector('button[type="submit"]');
        if(submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'A Salvar...';
        }

        try {
            await db.collection("TestesMateriaPrima").doc(testeId).update(novosDados);
            showToast("Teste atualizado com sucesso!", "success");
            fecharModalEdicaoTesteMp();
            carregarEExibirTestes(); // Recarrega a lista para mostrar os dados atualizados
        } catch (error) {
            console.error("Erro ao atualizar o teste:", error);
            showToast("Erro ao atualizar o teste: " + error.message, "error");
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
        // ETAPA 1: Buscar coleções de apoio (Matérias-Primas e Tipos de Teste) UMA ÚNICA VEZ
        console.log("Otimização: Buscando coleções de apoio...");
        const [materiasPrimasSnapshot, tiposTesteSnapshot] = await Promise.all([
            db.collection("MateriasPrimas").get(),
            db.collection("TiposTeste").get()
        ]);

        // ETAPA 2: Criar Mapas para consulta rápida na memória
        const materiasPrimasMap = new Map();
        materiasPrimasSnapshot.forEach(doc => {
            const data = doc.data();
            const nomeCompleto = data.descricao_mp + (data.codigo_interno_mp ? ` (${data.codigo_interno_mp})` : '');
            materiasPrimasMap.set(doc.id, nomeCompleto);
        });

        const tiposTesteMap = new Map();
        tiposTesteSnapshot.forEach(doc => {
            tiposTesteMap.set(doc.id, doc.data().nome_tipo_teste);
        });
        console.log("Otimização: Mapas de consulta criados.");

        // ETAPA 3: Buscar a coleção principal de Testes
        console.log("Buscando a lista principal de testes...");
        const querySnapshot = await db.collection("TestesMateriaPrima")
            .orderBy("data_cadastro", "desc")
            .get();

        if (querySnapshot.empty) {
            listaTestesMpDiv.innerHTML = '<p>Nenhum teste de matéria-prima encontrado.</p>';
            return;
        }

        // ETAPA 4: Montar o HTML usando os Mapas (muito mais rápido, sem novas leituras no banco)
        let htmlTestesItens = [];
        for (const doc of querySnapshot.docs) {
            const teste = doc.data();
            const idTeste = doc.id;

            // Consulta rápida nos mapas locais, sem 'await'
            const nomeMateriaPrima = materiasPrimasMap.get(teste.id_materia_prima) || `ID MP: ${teste.id_materia_prima} (não encontrada)`;
            const nomeTipoTeste = tiposTesteMap.get(teste.id_tipo_teste) || `ID Tipo: ${teste.id_tipo_teste} (não encontrado)`;

            let fotosHtml = '<p>Sem fotos.</p>';
            if (teste.fotos_material_urls && teste.fotos_material_urls.length > 0) {
                fotosHtml = '<div class="fotos-container">';
                teste.fotos_material_urls.forEach(url => {
                    fotosHtml += `<img src="${url}" alt="Foto do material" class="thumbnail-image" data-src="${url}">`;
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
                    <hr>
                </li>
            `);
        }
        
        listaTestesMpDiv.innerHTML = `<ul>${htmlTestesItens.join('')}</ul>`;

        // Anexar os event listeners DEPOIS de inserir o HTML no DOM
        // (O seu código para isso já estava correto, então o mantemos igual)
        document.querySelectorAll('.thumbnail-image').forEach(img => {
            img.onclick = function() {
                if (imageModal && modalImage) { 
                    imageModal.style.display = "block";
                    modalImage.src = this.dataset.src;
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
                        showToast("Erro: Teste não encontrado para edição.", "error");
                    }
                }).catch(err => {
                    console.error("Erro ao buscar dados do teste para edição:", err);
                    showToast("Erro ao carregar dados para edição.", "error");
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
                        showToast("Erro: Teste não encontrado para exclusão.", "error");
                    }
                }).catch(err => {
                    console.error("Erro ao buscar dados do teste para exclusão:", err);
                    showToast("Erro ao carregar dados para exclusão.", "error");
                });
            });
        });

    } catch (error) {
        console.error("Erro em carregarEExibirTestes: ", error);
        listaTestesMpDiv.innerHTML = `<p style="color:red;">Erro ao carregar testes. Verifique o console.</p>`;
    }
}

    firebase.auth().onAuthStateChanged(function(user) {
        // Ponto de verificação 1: O listener de autenticação foi acionado?
        console.log("DEPURAÇÃO: onAuthStateChanged foi acionado.");

        if (user) {
            // Ponto de verificação 2: O objeto 'user' foi encontrado?
            console.log("DEPURAÇÃO: Usuário ENCONTRADO.", user.email);

            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.textContent = 'Sessão iniciada como: ' + (user.displayName || user.email);
            }

            // Ponto de verificação 3: A função principal de carregamento está sendo chamada?
            console.log("DEPURAÇÃO: Chamando a função carregarEExibirTestes()...");
            carregarEExibirTestes(); // <-- Aqui chamamos a função otimizada que você colou antes

            // Configurar listeners para o modal de edição de Teste de Matéria-Prima
            modalEdicaoTesteMp = document.getElementById('modalEdicaoTesteMp');
            formEdicaoTesteMp = document.getElementById('formEdicaoTesteMp');
            botaoFecharModalEdicaoTesteMp = document.getElementById('botaoFecharModalEdicaoTesteMp');

            if (formEdicaoTesteMp) {
                formEdicaoTesteMp.addEventListener('submit', function(event) {
                    event.preventDefault();
                    salvarEdicaoTesteMp();
                });
            } else {
                console.warn("DEPURAÇÃO: Formulário de edição de Teste MP não encontrado.");
            }

            if (botaoFecharModalEdicaoTesteMp) {
                botaoFecharModalEdicaoTesteMp.addEventListener('click', fecharModalEdicaoTesteMp);
            } else {
                console.warn("DEPURAÇÃO: Botão de fechar modal de edição de Teste MP não encontrado.");
            }

            if (modalEdicaoTesteMp) { 
                modalEdicaoTesteMp.addEventListener('click', function(event) {
                    if (event.target === modalEdicaoTesteMp) {
                        fecharModalEdicaoTesteMp();
                    }
                });
            } else {
                console.warn("DEPURAÇÃO: Elemento do modal de edição de Teste MP não encontrado.");
            }

        } else {
            // Ponto de verificação 4: O usuário foi considerado 'null' (deslogado)?
            console.log("DEPURAÇÃO: Usuário NÃO encontrado. Redirecionando para login.html...");
            // window.location.href = 'login.html'; // Comentado temporariamente para podermos ver os logs
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