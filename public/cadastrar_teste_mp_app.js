document.addEventListener('DOMContentLoaded', function() {
    console.log("cadastrar_teste_mp_app.js carregado e DOM pronto!");

    const db = firebase.firestore(); // Referência ao Firestore

    // Elementos do formulário
    const selectMateriaPrima = document.getElementById('materiaPrima');
    const selectTipoTeste = document.getElementById('tipoTeste');
    const formCadastrarTesteMp = document.getElementById('formCadastrarTesteMp');

    // Função para carregar Matérias-Primas no dropdown
    function carregarMateriasPrimas() {
        if (!selectMateriaPrima) {
            console.error("Elemento select#materiaPrima não encontrado.");
            return;
        }
        db.collection("MateriasPrimas").orderBy("descricao_mp").get().then((querySnapshot) => {
            console.log("Matérias-Primas encontradas:", querySnapshot.size);
            selectMateriaPrima.innerHTML = '<option value="">Selecione a Matéria-Prima...</option>'; // Limpa e adiciona placeholder
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const option = document.createElement('option');
                option.value = doc.id; // O ID do documento será o valor
                option.textContent = data.descricao_mp + (data.codigo_interno_mp ? ` (${data.codigo_interno_mp})` : ''); // Ex: Couro Bovino Preto (MP001)
                selectMateriaPrima.appendChild(option);
            });
        }).catch((error) => {
            console.error("Erro ao carregar matérias-primas: ", error);
            selectMateriaPrima.innerHTML = '<option value="">Erro ao carregar opções</option>';
        });
    }

    // Função para carregar Tipos de Teste no dropdown (filtrados para Matéria-Prima)
    function carregarTiposTeste() {
        if (!selectTipoTeste) {
            console.error("Elemento select#tipoTeste não encontrado.");
            return;
        }
        db.collection("TiposTeste")
          .where("categoria_aplicavel", "in", ["Matéria-Prima", "Ambos"])
          .orderBy("nome_tipo_teste")
          .get().then((querySnapshot) => {
            console.log("Tipos de Teste (Matéria-Prima/Ambos) encontrados:", querySnapshot.size);
            selectTipoTeste.innerHTML = '<option value="">Selecione o Tipo de Teste...</option>'; // Limpa e adiciona placeholder
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const option = document.createElement('option');
                option.value = doc.id; // O ID do documento será o valor
                option.textContent = data.nome_tipo_teste;
                selectTipoTeste.appendChild(option);
            });
        }).catch((error) => {
            console.error("Erro ao carregar tipos de teste: ", error);
            selectTipoTeste.innerHTML = '<option value="">Erro ao carregar opções</option>';
        });
    }

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log("Usuário autenticado em cadastrar_teste_mp:", user.email);
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.textContent = 'Logado como: ' + (user.displayName || user.email);
            }

            // Carregar os dados para os dropdowns assim que o usuário estiver autenticado
            carregarMateriasPrimas();
            carregarTiposTeste();

            if (formCadastrarTesteMp) {
                formCadastrarTesteMp.addEventListener('submit', function(event) {
                    event.preventDefault(); // Impede o recarregamento da página
                    console.log("Formulário enviado!");

                    // Desabilitar botão para evitar múltiplos envios
                    const submitButton = formCadastrarTesteMp.querySelector('button[type="submit"]');
                    submitButton.disabled = true;
                    submitButton.textContent = 'Salvando...';

                    // Coletar os dados do formulário
                    const testeData = {
                        id_materia_prima: selectMateriaPrima.value, // ID da matéria-prima selecionada
                        // nome_materia_prima: selectMateriaPrima.options[selectMateriaPrima.selectedIndex].text, // Opcional: guardar o texto também
                        id_tipo_teste: selectTipoTeste.value, // ID do tipo de teste selecionado
                        // nome_tipo_teste: selectTipoTeste.options[selectTipoTeste.selectedIndex].text, // Opcional: guardar o texto também
                        data_teste: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataTeste').value)), // Converter para Timestamp do Firestore
                        resultado: document.getElementById('resultadoTeste').value,
                        observacoes: document.getElementById('observacoesTeste').value,
                        responsavel_teste_id: user.uid, // UID do usuário logado
                        responsavel_teste_email: user.email, // Email do usuário logado (opcional, mas útil)
                        data_cadastro: firebase.firestore.FieldValue.serverTimestamp() // Data/hora do cadastro no servidor
                        // fotos_material_urls: [] // Trataremos o upload de fotos depois
                    };

                    console.log("Dados a serem salvos:", testeData);

                    // Salvar no Firestore na coleção 'TestesMateriaPrima'
                    db.collection("TestesMateriaPrima").add(testeData)
                        .then((docRef) => {
                            console.log("Teste de Matéria-Prima salvo com ID: ", docRef.id);
                            alert("Teste de Matéria-Prima salvo com sucesso!");
                            formCadastrarTesteMp.reset(); // Limpa o formulário
                        })
                        .catch((error) => {
                            console.error("Erro ao salvar o teste: ", error);
                            alert("Erro ao salvar o teste. Verifique o console para mais detalhes.");
                        })
                        .finally(() => {
                            // Reabilitar o botão após o término (sucesso ou erro)
                            submitButton.disabled = false;
                            submitButton.textContent = 'Salvar Teste';
                        });
                });
            } else {
                console.error("Elemento #formCadastrarTesteMp não encontrado!");
            }

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
                console.log('Usuário deslogado com sucesso.');
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Erro ao fazer logout:', error);
            });
        });
    }
});