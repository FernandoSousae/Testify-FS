// Espera o conteúdo da página carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log("auth.js carregado e DOM pronto!");

    // Pega referências aos elementos do formulário de login
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');

    // Verifica se o formulário existe na página
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Impede o envio padrão do formulário (que recarregaria a página)
            console.log("Formulário de login enviado!");

            const email = emailInput.value;
            const senha = senhaInput.value;

            console.log("Email:", email, "Senha:", "********"); // Não logar a senha em produção

            // --- Autenticação com Firebase ---
            firebase.auth().signInWithEmailAndPassword(email, senha)
                .then((userCredential) => {
                    // Login bem-sucedido!
                    const user = userCredential.user;
                    console.log("Login bem-sucedido!", user);
                    //alert("Login realizado com sucesso! Bem-vindo, " + user.email);
                    // Aqui, futuramente, redirecionaremos para a página principal (dashboard)
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    // Tratar erros de login
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    console.error("Erro no login:", errorCode, errorMessage);

                    let mensagemErroUsuario = "Ocorreu um erro ao tentar fazer login. Verifique suas credenciais.";
                    if (errorCode === 'auth/user-not-found') {
                        mensagemErroUsuario = "Usuário não encontrado. Verifique o e-mail digitado.";
                    } else if (errorCode === 'auth/wrong-password') {
                        mensagemErroUsuario = "Senha incorreta. Tente novamente.";
                    } else if (errorCode === 'auth/invalid-email') {
                        mensagemErroUsuario = "O formato do e-mail é inválido.";
                    }
                    // Adicione mais tratamentos de erro conforme necessário

                    showToast(mensagemErroUsuario, "error");
                });
        });
    } else {
        console.error("Elemento #loginForm não encontrado!");
    }
});