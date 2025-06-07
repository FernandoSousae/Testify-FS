console.log("cadastrar_teste_mp_app.js carregado e DOM pronto!");

const db = firebase.firestore();
const storage = firebase.storage(); // Referência ao Firebase Storage

// Elementos do formulário
const selectMateriaPrima = document.getElementById("materiaPrima");
const selectTipoTeste = document.getElementById("tipoTeste");
const formCadastrarTesteMp = document.getElementById("formCadastrarTesteMp");
const inputFotosMaterial = document.getElementById("fotosMaterial");

// Função para carregar Matérias-Primas no dropdown
function carregarMateriasPrimas() {
    if (!selectMateriaPrima) {
        console.error("Elemento select#materiaPrima não encontrado.");
        return;
    }
    db.collection("MateriasPrimas")
        .orderBy("descricao_mp")
        .get()
        .then((querySnapshot) => {
            selectMateriaPrima.innerHTML = '<option value="">Selecione a Matéria-Prima...</option>';
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const option = document.createElement("option");
                option.value = doc.id;
                option.textContent = data.descricao_mp + (data.codigo_interno_mp ? ` (${data.codigo_interno_mp})` : "");
                selectMateriaPrima.appendChild(option);
            });
        })
        .catch((error) => {
            console.error("Erro ao carregar matérias-primas: ", error);
        });
}

// Função para carregar Tipos de Teste no dropdown
function carregarTiposTeste() {
    if (!selectTipoTeste) {
        console.error("Elemento select#tipoTeste não encontrado.");
        return;
    }
    db.collection("TiposTeste")
        .where("categoria_aplicavel", "in", ["Matéria-Prima", "Ambos"])
        .orderBy("nome_tipo_teste")
        .get()
        .then((querySnapshot) => {
            selectTipoTeste.innerHTML = '<option value="">Selecione o Tipo de Teste...</option>';
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const option = document.createElement("option");
                option.value = doc.id;
                option.textContent = data.nome_tipo_teste;
                selectTipoTeste.appendChild(option);
            });
        })
        .catch((error) => {
            console.error("Erro ao carregar tipos de teste: ", error);
        });
}

/**
 * NOVO: Verifica se há dados de uma solicitação no localStorage e preenche o formulário.
 */
function verificarEPreencherFormulario() {
    const dadosSolicitacaoString = localStorage.getItem('solicitacaoParaTeste');
    if (dadosSolicitacaoString) {
        const dados = JSON.parse(dadosSolicitacaoString);

        // Apenas preenche se a solicitação for para 'Matéria-Prima'
        if (dados.categoria_teste === 'Matéria-Prima') {
            console.log("Dados da solicitação encontrados. Preenchendo formulário...");

            // Preenche o campo de observações com a descrição e referências da solicitação
            const campoObservacoes = document.getElementById('observacoesTeste');
            if (campoObservacoes) {
                let textoPreenchido = `--- DADOS DA SOLICITAÇÃO ---\n`;
                textoPreenchido += `Descrição: ${dados.descricao}\n`;
                textoPreenchido += `Referências: ${dados.referencias_envolvidas || 'Nenhuma'}\n`;
                textoPreenchido += `Solicitante: ${dados.solicitante_email}\n`;
                textoPreenchido += `--------------------------------\n\n`;
                campoObservacoes.value = textoPreenchido;
            }
            
            // Exibe uma notificação para o usuário
            showToast("Formulário pré-preenchido com dados da solicitação.", "info");

            // IMPORTANTE: Limpa os dados do localStorage para não usar de novo na próxima vez
            localStorage.removeItem('solicitacaoParaTeste');
        }
    }
}


firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        console.log("Usuário autenticado em cadastrar_teste_mp:", user.email);
        const userInfoElement = document.getElementById("userInfo");
        if (userInfoElement) {
            userInfoElement.textContent = "Logado como: " + (user.displayName || user.email);
        }

        // Carregar os dados para os dropdowns
        carregarMateriasPrimas();
        carregarTiposTeste();

        // **NOVO**: Chama a função para verificar e preencher o formulário
        verificarEPreencherFormulario();

        if (formCadastrarTesteMp) {
            formCadastrarTesteMp.addEventListener("submit", async function (event) {
                event.preventDefault();
                const submitButton = formCadastrarTesteMp.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = "Salvando...";

                const arquivos = inputFotosMaterial.files;
                const urlsFotos = [];

                if (arquivos.length > 0) {
                    submitButton.textContent = "Enviando fotos...";
                    const uploadPromises = [];
                    for (let i = 0; i < arquivos.length; i++) {
                        const arquivo = arquivos[i];
                        const nomeArquivo = `testes_materia_prima_fotos/${user.uid}_${Date.now()}_${arquivo.name}`;
                        const arquivoRef = storage.ref(nomeArquivo);
                        const uploadTask = arquivoRef.put(arquivo);
                        uploadPromises.push(uploadTask.then((snapshot) => snapshot.ref.getDownloadURL()));
                    }
                    try {
                        const urlsResolvidas = await Promise.all(uploadPromises);
                        urlsFotos.push(...urlsResolvidas);
                    } catch (error) {
                        showToast("Erro ao fazer upload das fotos. O teste não foi salvo.", "error");
                        submitButton.disabled = false;
                        submitButton.textContent = "Salvar Teste";
                        return;
                    }
                }

                submitButton.textContent = "Salvando dados do teste...";
                const testeData = {
                    id_materia_prima: selectMateriaPrima.value,
                    id_tipo_teste: selectTipoTeste.value,
                    data_teste: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById("dataTeste").value + 'T00:00:00')),
                    resultado: document.getElementById("resultadoTeste").value,
                    observacoes: document.getElementById("observacoesTeste").value,
                    responsavel_teste_id: user.uid,
                    responsavel_teste_email: user.email,
                    data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
                    fotos_material_urls: urlsFotos,
                };

                db.collection("TestesMateriaPrima").add(testeData)
                    .then(() => {
                        showToast("Teste de Matéria-Prima salvo com sucesso!", "success");
                        formCadastrarTesteMp.reset();
                    })
                    .catch((error) => {
                        showToast("Erro ao salvar os dados do teste: " + error.message, "error");
                    })
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = "Salvar Teste";
                    });
            });
        }
    } else {
        console.log("Nenhum usuário autenticado. Redirecionando para login...");
        window.location.href = "login.html";
    }
});

const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
    logoutButton.addEventListener("click", function () {
        firebase.auth().signOut().then(() => {
            window.location.href = "login.html";
        });
    });
}