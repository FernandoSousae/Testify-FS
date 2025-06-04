document.addEventListener("DOMContentLoaded", function () {
  console.log("cadastrar_teste_mp_app.js carregado e DOM pronto!");

  const db = firebase.firestore();
  const storage = firebase.storage(); // Referência ao Firebase Storage

  // Elementos do formulário
  const selectMateriaPrima = document.getElementById("materiaPrima");
  const selectTipoTeste = document.getElementById("tipoTeste");
  const formCadastrarTesteMp = document.getElementById("formCadastrarTesteMp");
  const inputFotosMaterial = document.getElementById("fotosMaterial"); // Referência ao input de arquivos

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
        console.log("Matérias-Primas encontradas:", querySnapshot.size);
        selectMateriaPrima.innerHTML =
          '<option value="">Selecione a Matéria-Prima...</option>'; // Limpa e adiciona placeholder
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const option = document.createElement("option");
          option.value = doc.id; // O ID do documento será o valor
          option.textContent =
            data.descricao_mp +
            (data.codigo_interno_mp ? ` (${data.codigo_interno_mp})` : ""); // Ex: Couro Bovino Preto (MP001)
          selectMateriaPrima.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Erro ao carregar matérias-primas: ", error);
        selectMateriaPrima.innerHTML =
          '<option value="">Erro ao carregar opções</option>';
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
      .get()
      .then((querySnapshot) => {
        console.log(
          "Tipos de Teste (Matéria-Prima/Ambos) encontrados:",
          querySnapshot.size
        );
        selectTipoTeste.innerHTML =
          '<option value="">Selecione o Tipo de Teste...</option>'; // Limpa e adiciona placeholder
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const option = document.createElement("option");
          option.value = doc.id; // O ID do documento será o valor
          option.textContent = data.nome_tipo_teste;
          selectTipoTeste.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Erro ao carregar tipos de teste: ", error);
        selectTipoTeste.innerHTML =
          '<option value="">Erro ao carregar opções</option>';
      });
  }

  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      console.log("Usuário autenticado em cadastrar_teste_mp:", user.email);
      const userInfoElement = document.getElementById("userInfo");
      if (userInfoElement) {
        userInfoElement.textContent =
          "Logado como: " + (user.displayName || user.email);
      }

      // Carregar os dados para os dropdowns assim que o usuário estiver autenticado
      carregarMateriasPrimas();
      carregarTiposTeste();

      if (formCadastrarTesteMp) {
        // Substitua seu addEventListener existente por este:
        formCadastrarTesteMp.addEventListener("submit", async function (event) {
          // Tornamos a função async
          event.preventDefault();
          const submitButton = formCadastrarTesteMp.querySelector(
            'button[type="submit"]'
          );
          submitButton.disabled = true;
          submitButton.textContent = "Salvando..."; // Mudança inicial no texto do botão

          const arquivos = inputFotosMaterial.files;
          const urlsFotos = [];

          // Etapa 1: Fazer upload das fotos (se houver)
          if (arquivos.length > 0) {
            submitButton.textContent = "Enviando fotos..."; // Atualiza texto do botão
            console.log(`Enviando ${arquivos.length} arquivos...`);
            const uploadPromises = [];

            for (let i = 0; i < arquivos.length; i++) {
              const arquivo = arquivos[i];
              const nomeArquivo = `testes_materia_prima_fotos/${
                user.uid
              }_${Date.now()}_${arquivo.name}`;
              const arquivoRef = storage.ref(nomeArquivo);
              const uploadTask = arquivoRef.put(arquivo);
              uploadPromises.push(
                uploadTask.then((snapshot) => snapshot.ref.getDownloadURL())
              );
            }

            try {
              const urlsResolvidas = await Promise.all(uploadPromises);
              urlsFotos.push(...urlsResolvidas);
              console.log("URLs das fotos obtidas:", urlsFotos);
            } catch (error) {
              console.error(
                "Erro durante o upload de uma ou mais fotos: ",
                error
              );
              showToast("Erro ao fazer upload das fotos. O teste não foi salvo.", "error");
              submitButton.disabled = false;
              submitButton.textContent = "Salvar Teste";
              return;
            }
          }

          // Etapa 2: Salvar os dados do teste (incluindo as URLs das fotos) no Firestore
          submitButton.textContent = "Salvando dados do teste..."; // Atualiza texto do botão
          const testeData = {
            id_materia_prima: selectMateriaPrima.value,
            id_tipo_teste: selectTipoTeste.value,
            data_teste: firebase.firestore.Timestamp.fromDate(
              new Date(document.getElementById("dataTeste").value)
            ),
            resultado: document.getElementById("resultadoTeste").value,
            observacoes: document.getElementById("observacoesTeste").value,
            responsavel_teste_id: user.uid,
            responsavel_teste_email: user.email,
            data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
            fotos_material_urls: urlsFotos, // Array com as URLs das fotos (será vazio se não houver upload)
          };

          console.log("Dados finais a serem salvos:", testeData);

          db.collection("TestesMateriaPrima")
            .add(testeData)
            .then((docRef) => {
              console.log("Teste de Matéria-Prima salvo com ID: ", docRef.id);
              showToast("Teste de Matéria-Prima salvo com sucesso!", "success");
              formCadastrarTesteMp.reset();
            })
            .catch((error) => {
              console.error("Erro ao salvar o teste no Firestore: ", error);
              showToast("Erro ao salvar os dados do teste: " + error.message, "error");
            })
            .finally(() => {
              submitButton.disabled = false;
              submitButton.textContent = "Salvar Teste";
            });
        });
      } else {
        console.error("Elemento #formCadastrarTesteMp não encontrado!");
      }
    } else {
      console.log("Nenhum usuário autenticado. Redirecionando para login...");
      window.location.href = "login.html";
    }
  });

  // Lógica para o botão de logout (permanece a mesma)
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      firebase
        .auth()
        .signOut()
        .then(() => {
          console.log("Usuário deslogado com sucesso.");
          window.location.href = "login.html";
        })
        .catch((error) => {
          console.error("Erro ao fazer logout:", error);
        });
    });
  }
});
