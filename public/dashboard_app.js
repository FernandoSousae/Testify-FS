console.log("dashboard_app.js: Ficheiro INICIADO.");

if (typeof firebase === 'undefined') {
    console.error("ERRO CRÍTICO: Firebase não definido.");
} else {
    const db = firebase.firestore();
    const auth = firebase.auth();
    const logoutButton = document.getElementById('logoutButton');

    // --- PONTO DE ENTRADA PRINCIPAL ---
    auth.onAuthStateChanged(function(user) {
        if (user) {
            document.getElementById('userInfo').textContent = 'Sessão iniciada como: ' + (user.displayName || user.email);
            verificarPermissoesAdmin(user);
            carregarMetricasDashboard();
            configurarListenersDashboard(); // <-- NOVA CHAMADA DE FUNÇÃO
        } else {
            window.location.href = 'login.html';
        }
    });

    // --- FUNÇÃO PARA CONFIGURAR LISTENERS ESTÁTICOS ---
    /**
     * NOVO: Adiciona os listeners de clique aos cards e ao botão de logout.
     */
    function configurarListenersDashboard() {
        const cardMp = document.getElementById('totalTestesMp')?.parentElement;
        const cardCp = document.getElementById('totalTestesCp')?.parentElement;

        if (cardMp) {
            cardMp.style.cursor = 'pointer';
            cardMp.title = 'Clique para ver todos os testes de Matéria-Prima';
            cardMp.addEventListener('click', () => {
                window.location.href = 'visualizar_testes_mp.html';
            });
        }

        if (cardCp) {
            cardCp.style.cursor = 'pointer';
            cardCp.title = 'Clique para ver todos os testes de Calçado Pronto';
            cardCp.addEventListener('click', () => {
                window.location.href = 'visualizar_testes_cp.html';
            });
        }

        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                auth.signOut().then(() => { window.location.href = 'login.html'; });
            });
        }
    }


    // --- FUNÇÕES DE CARREGAMENTO DE MÉTRICAS (sem alterações) ---
    function carregarMetricasDashboard() {
        atualizarContadores();
        gerarGraficoResultadosMp();
        gerarGraficoResultadosCp();
        exibirAtividadeRecente();
    }

    async function atualizarContadores() {
        try {
            const [testesMpSnapshot, testesCpSnapshot] = await Promise.all([
                db.collection("TestesMateriaPrima").get(),
                db.collection("TestesCalcadoPronto").get()
            ]);
            document.getElementById('totalTestesMp').textContent = testesMpSnapshot.size;
            document.getElementById('totalTestesCp').textContent = testesCpSnapshot.size;
        } catch (error) {
            console.error("Erro ao atualizar contadores:", error);
        }
    }

    async function gerarGraficoResultadosMp() {
        try {
            const snapshot = await db.collection("TestesMateriaPrima").get();
            let contadores = { 'Aprovado': 0, 'Reprovado': 0, 'Em Análise': 0 };
            snapshot.forEach(doc => {
                const resultado = doc.data().resultado;
                if (resultado in contadores) contadores[resultado]++;
            });

            const totalValidos = contadores['Aprovado'] + contadores['Reprovado'];
            const taxaAprovacao = totalValidos > 0 ? ((contadores['Aprovado'] / totalValidos) * 100).toFixed(1) + '%' : 'N/A';
            document.getElementById('taxaAprovacaoMp').textContent = taxaAprovacao;
            
            const ctx = document.getElementById('graficoResultadosMp').getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Aprovado', 'Reprovado', 'Em Análise'],
                    datasets: [{
                        data: [contadores['Aprovado'], contadores['Reprovado'], contadores['Em Análise']],
                        backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)'],
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'top' } } }
            });
        } catch (error) {
            console.error("Erro ao gerar gráfico de MP:", error);
        }
    }

    async function gerarGraficoResultadosCp() {
        try {
            const snapshot = await db.collection("TestesCalcadoPronto").get();
            let contadores = { 'Aprovado': 0, 'Reprovado': 0, 'Em Análise': 0 };
            snapshot.forEach(doc => {
                const resultado = doc.data().resultado;
                if (resultado in contadores) contadores[resultado]++;
            });

            const totalValidos = contadores['Aprovado'] + contadores['Reprovado'];
            const taxaAprovacao = totalValidos > 0 ? ((contadores['Aprovado'] / totalValidos) * 100).toFixed(1) + '%' : 'N/A';
            document.getElementById('taxaAprovacaoCp').textContent = taxaAprovacao;
            
            const ctx = document.getElementById('graficoResultadosCp').getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Aprovado', 'Reprovado', 'Em Análise'],
                    datasets: [{
                        data: [contadores['Aprovado'], contadores['Reprovado'], contadores['Em Análise']],
                        backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)'],
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'top' } } }
            });
        } catch (error) {
            console.error("Erro ao gerar gráfico de CP:", error);
        }
    }

    /**
     * ATUALIZADO: Busca os 5 últimos testes de AMBAS as coleções,
     * combina, ordena e exibe o resultado.
     */
    async function exibirAtividadeRecente() {
        const listaUl = document.getElementById('listaAtividadeRecente');
        try {
            // Buscamos os dados de apoio primeiro (catálogo de matérias-primas)
            const materiasPrimasMap = new Map((await db.collection("MateriasPrimas").get()).docs.map(doc => [doc.id, doc.data().descricao_mp]));

            // 1. Fazemos as duas buscas em paralelo
            const [testesMpSnapshot, testesCpSnapshot] = await Promise.all([
                db.collection("TestesMateriaPrima").orderBy("data_cadastro", "desc").limit(5).get(),
                db.collection("TestesCalcadoPronto").orderBy("data_cadastro", "desc").limit(5).get()
            ]);

            // 2. Juntamos os resultados das duas buscas em uma única lista
            const todosOsTestes = [];
            testesMpSnapshot.forEach(doc => todosOsTestes.push({ tipo: 'MP', ...doc.data() }));
            testesCpSnapshot.forEach(doc => todosOsTestes.push({ tipo: 'CP', ...doc.data() }));

            // 3. Ordenamos a lista combinada pela data de cadastro
            todosOsTestes.sort((a, b) => b.data_cadastro.toMillis() - a.data_cadastro.toMillis());

            // 4. Pegamos apenas os 5 mais recentes da lista combinada
            const ultimos5Testes = todosOsTestes.slice(0, 5);

            if (ultimos5Testes.length === 0) {
                listaUl.innerHTML = '<li>Nenhuma atividade recente.</li>';
                return;
            }
            
            // 5. Geramos o HTML para exibir a lista final
            let htmlAtividades = '';
            ultimos5Testes.forEach(teste => {
                const dataFormatada = formatarTimestamp(teste.data_cadastro);
                let descricaoTeste = '';

                if (teste.tipo === 'MP') {
                    const nomeMateriaPrima = materiasPrimasMap.get(teste.id_materia_prima) || 'Matéria-prima desconhecida';
                    descricaoTeste = `Teste de Matéria-Prima em <strong>${nomeMateriaPrima}</strong>`;
                } else if (teste.tipo === 'CP') {
                    descricaoTeste = `Teste de Calçado Pronto na Ref: <strong>${teste.referencia_calcado}</strong>`;
                }
                
                htmlAtividades += `<li>${descricaoTeste} - ${dataFormatada}</li>`;
            });
            listaUl.innerHTML = htmlAtividades;

        } catch (error) {
            console.error("Erro ao exibir atividade recente:", error);
            listaUl.innerHTML = '<li>Erro ao carregar atividades.</li>';
        }
    }

    // --- FUNÇÕES DE PERMISSÃO E LOGOUT ---
    function verificarPermissoesAdmin(user) {
        const userDocRef = db.collection('Usuarios').doc(user.uid);
        userDocRef.get().then((doc) => {
            const isAdmin = doc.exists && doc.data().tipo_usuario === 'Administrador';
            document.querySelectorAll('.admin-only').forEach(item => {
                item.style.display = isAdmin ? 'flex' : 'none';
            });
        }).catch(error => {
            console.error("Erro ao verificar permissões:", error);
            document.querySelectorAll('.admin-only').forEach(item => item.style.display = 'none');
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => { window.location.href = 'login.html'; });
        });
    }

    function formatarTimestamp(timestamp) {
        if (!timestamp) return '';
        const data = timestamp.toDate();
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        return `${dia}/${mes}/${data.getFullYear()}`;
    }
}