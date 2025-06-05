document.addEventListener('DOMContentLoaded', function() {
    console.log("cadastrar_teste_cp_app.js carregado e DOM pronto!");

    const db = firebase.firestore();
    const storage = firebase.storage(); // Descomente ou adicione para o Storage

    // Elementos do formulário
    const selectTipoTesteCp = document.getElementById('tipoTesteCp');
    const formCadastrarTesteCp = document.getElementById('formCadastrarTesteCp'); // Referência ao formulário
    const inputFotosCalcado = document.getElementById('fotosCalcado'); // Referência ao input de arquivos

    // ... (Função carregarTiposTesteCalcadoPronto permanece a mesma) ...
    function carregarTiposTesteCalcadoPronto() {
        if (!selectTipoTesteCp) {
            console.error("Elemento select#tipoTesteCp não encontrado.");
            return;
        }
        db.collection("TiposTeste")
          .where("categoria_aplicavel", "in", ["Calçado Pronto", "Ambos"])
          .orderBy("nome_tipo_teste")
          .get().then((querySnapshot) => {
            console.log("Tipos de Teste (Calçado Pronto/Ambos) encontrados:", querySnapshot.size);
            selectTipoTesteCp.innerHTML = '<option value="">Selecione o Tipo de Teste...</option>';
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = data.nome_tipo_teste;
                selectTipoTesteCp.appendChild(option);
            });
        }).catch((error) => {
            console.error("Erro ao carregar tipos de teste para calçado pronto: ", error);
            selectTipoTesteCp.innerHTML = '<option value="">Erro ao carregar opções</option>';
        });
    }


    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log("Usuário autenticado em cadastrar_teste_cp:", user.email);
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.textContent = 'Logado como: ' + (user.displayName || user.email);
            }

            carregarTiposTesteCalcadoPronto();

            // --- INÍCIO: LÓGICA DE SUBMISSÃO DO FORMULÁRIO DE CALÇADO PRONTO ---
            if (formCadastrarTesteCp) {
                formCadastrarTesteCp.addEventListener('submit', async function(event) { // Tornamos a função async
                    event.preventDefault();
                    const submitButton = formCadastrarTesteCp.querySelector('button[type="submit"]');
                    submitButton.disabled = true;
                    submitButton.textContent = 'Salvando...';

                    const arquivos = inputFotosCalcado.files;
                    const urlsFotos = [];

                    // Etapa 1: Fazer upload das fotos (se houver)
                    if (arquivos.length > 0) {
                        submitButton.textContent = 'Enviando fotos...';
                        console.log(`Enviando ${arquivos.length} arquivos para calçado pronto...`);
                        const uploadPromises = [];

                        for (let i = 0; i < arquivos.length; i++) {
                            const arquivo = arquivos[i];
                            const nomeArquivo = `testes_calcado_pronto_fotos/${user.uid}_${Date.now()}_${arquivo.name}`;
                            const arquivoRef = storage.ref(nomeArquivo);
                            const uploadTask = arquivoRef.put(arquivo);
                            uploadPromises.push(
                                uploadTask.then(snapshot => snapshot.ref.getDownloadURL())
                            );
                        }

                        try {
                            const urlsResolvidas = await Promise.all(uploadPromises);
                            urlsFotos.push(...urlsResolvidas);
                            console.log("URLs das fotos do calçado obtidas:", urlsFotos);
                        } catch (error) {
                            console.error("Erro durante o upload de uma ou mais fotos do calçado: ", error);
                            showToast("Erro ao fazer upload das fotos do calçado. O teste não foi salvo.", "error");
                            submitButton.disabled = false;
                            submitButton.textContent = 'Salvar Teste de Calçado';
                            return;
                        }
                    }

                    // Etapa 2: Salvar os dados do teste no Firestore
                    submitButton.textContent = 'Salvando dados do teste...';
                    const testeDataCp = {
                        sub_categoria: document.getElementById('subCategoriaCp').value,
                        linha_calcado: document.getElementById('linhaCalcado').value,
                        referencia_calcado: document.getElementById('referenciaCalcado').value,
                        data_inicio_teste: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataInicioTesteCp').value)),
                        data_fim_teste: document.getElementById('dataFimTesteCp').value ? firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataFimTesteCp').value)) : null,
                        id_tipo_teste: selectTipoTesteCp.value,
                        resultado: document.getElementById('resultadoTesteCp').value,
                        requisitante_teste: document.getElementById('requisitanteTesteCp').value,
                        plano_producao: document.getElementById('planoProducaoCp').value,
                        materiais_avaliados: document.getElementById('materiaisAvaliadosCp').value,
                        fabrica_producao: document.getElementById('fabricaProducaoCp').value,
                        observacoes_gerais: document.getElementById('observacoesTesteCp').value,
                        responsavel_teste_id: user.uid,
                        responsavel_teste_email: user.email,
                        data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
                        fotos_calcado_urls: urlsFotos
                    };

                    console.log("Dados finais do teste de calçado pronto a serem salvos:", testeDataCp);

                    db.collection("TestesCalcadoPronto").add(testeDataCp) // Nova coleção
                        .then((docRef) => {
                            console.log("Teste de Calçado Pronto salvo com ID: ", docRef.id);
                            showToast("Teste de Calçado Pronto salvo com sucesso!", "success");
                            formCadastrarTesteCp.reset();
                        })
                        .catch((error) => {
                            console.error("Erro ao salvar o teste de calçado pronto no Firestore: ", error);
                            showToast("Erro ao salvar os dados do teste de calçado pronto: " + error.message, "error");
                        })
                        .finally(() => {
                            submitButton.disabled = false;
                            submitButton.textContent = 'Salvar Teste de Calçado';
                        });
                });
            } else {
                console.error("Elemento #formCadastrarTesteCp não encontrado!");
            }
            // --- FIM: LÓGICA DE SUBMISSÃO DO FORMULÁRIO DE CALÇADO PRONTO ---

        } else {
            console.log("Nenhum usuário autenticado em cadastrar_teste_cp. Redirecionando para login...");
            window.location.href = 'login.html';
        }
    });

    // Lógica para o botão de logout (permanece a mesma)
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