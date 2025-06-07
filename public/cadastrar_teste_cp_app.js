console.log("cadastrar_teste_cp_app.js carregado e DOM pronto!");

const db = firebase.firestore();
const storage = firebase.storage();

// --- Elementos do formulário ---
const selectTipoTesteCp = document.getElementById('tipoTesteCp');
const formCadastrarTesteCp = document.getElementById('formCadastrarTesteCp');
const inputFotosCalcado = document.getElementById('fotosCalcado');

// --- Funções de Inicialização ---
function carregarTiposTesteCalcadoPronto() {
    if (!selectTipoTesteCp) return;
    db.collection("TiposTeste")
      .where("categoria_aplicavel", "in", ["Calçado Pronto", "Ambos"])
      .orderBy("nome_tipo_teste")
      .get().then((querySnapshot) => {
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
      });
}

/**
 * NOVO: Verifica se há dados de uma solicitação no localStorage e preenche o formulário.
 */
function verificarEPreencherFormularioCp() {
    const dadosSolicitacaoString = localStorage.getItem('solicitacaoParaTeste');
    if (dadosSolicitacaoString) {
        const dados = JSON.parse(dadosSolicitacaoString);

        // Apenas preenche se a solicitação for para 'Calçado Pronto'
        if (dados.categoria_teste === 'Calçado Pronto') {
            console.log("Dados da solicitação encontrados. Preenchendo formulário de Calçado Pronto...");

            // Preenche os campos relevantes
            const campoReferencias = document.getElementById('referenciaCalcado');
            const campoObservacoes = document.getElementById('observacoesGerais');
            
            if (campoReferencias) {
                campoReferencias.value = dados.referencias_envolvidas || '';
            }
            if (campoObservacoes) {
                let textoPreenchido = `--- DADOS DA SOLICITAÇÃO ---\n`;
                textoPreenchido += `Descrição: ${dados.descricao}\n`;
                textoPreenchido += `Solicitante: ${dados.solicitante_email}\n`;
                textoPreenchido += `--------------------------------\n\n`;
                campoObservacoes.value = textoPreenchido;
            }
            
            showToast("Formulário pré-preenchido com dados da solicitação.", "info");

            // Limpa os dados do localStorage para não usar de novo
            localStorage.removeItem('solicitacaoParaTeste');
        }
    }
}

// --- PONTO DE ENTRADA PRINCIPAL ---
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        document.getElementById('userInfo').textContent = 'Logado como: ' + (user.displayName || user.email);
        carregarTiposTesteCalcadoPronto();
        
        // **NOVO**: Chama a função para verificar e preencher o formulário
        verificarEPreencherFormularioCp();

        if (formCadastrarTesteCp) {
            formCadastrarTesteCp.addEventListener('submit', async function(event) {
                event.preventDefault();
                const submitButton = formCadastrarTesteCp.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = 'Salvando...';

                const arquivos = inputFotosCalcado.files;
                const urlsFotos = [];

                if (arquivos.length > 0) {
                    submitButton.textContent = 'Enviando fotos...';
                    const uploadPromises = [];
                    for (let i = 0; i < arquivos.length; i++) {
                        const arquivo = arquivos[i];
                        const nomeArquivo = `testes_calcado_pronto_fotos/${user.uid}_${Date.now()}_${arquivo.name}`;
                        const arquivoRef = storage.ref(nomeArquivo);
                        uploadPromises.push(arquivoRef.put(arquivo).then(snapshot => snapshot.ref.getDownloadURL()));
                    }
                    try {
                        const urlsResolvidas = await Promise.all(uploadPromises);
                        urlsFotos.push(...urlsResolvidas);
                    } catch (error) {
                        showToast("Erro ao fazer upload das fotos. O teste não foi salvo.", "error");
                        submitButton.disabled = false;
                        submitButton.textContent = 'Salvar Teste de Calçado';
                        return;
                    }
                }

                submitButton.textContent = 'Salvando dados do teste...';
                const testeDataCp = {
                    sub_categoria: document.getElementById('subCategoriaCp').value,
                    linha_calcado: document.getElementById('linhaCalcado').value,
                    referencia_calcado: document.getElementById('referenciaCalcado').value,
                    data_inicio_teste: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataInicioTesteCp').value + 'T00:00:00')),
                    data_fim_teste: document.getElementById('dataFimTesteCp').value ? firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dataFimTesteCp').value + 'T00:00:00')) : null,
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

                db.collection("TestesCalcadoPronto").add(testeDataCp)
                    .then(() => {
                        showToast("Teste de Calçado Pronto salvo com sucesso!", "success");
                        formCadastrarTesteCp.reset();
                    })
                    .catch((error) => {
                        showToast("Erro ao salvar os dados do teste: " + error.message, "error");
                    })
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Salvar Teste de Calçado';
                    });
            });
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
        });
    });
}