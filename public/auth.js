// Espera o conteúdo da página carregar completamente
document.addEventListener('DOMContentLoaded', function() {
    console.log("auth.js carregado e DOM pronto!");

    const auth = firebase.auth();

    // --- LÓGICA DE LOGIN (SEU CÓDIGO EXISTENTE) ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const emailInput = document.getElementById('email');
        const senhaInput = document.getElementById('senha');

        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            const email = emailInput.value;
            const senha = senhaInput.value;

            auth.signInWithEmailAndPassword(email, senha)
                .then((userCredential) => {
                    console.log("Login bem-sucedido!", userCredential.user);
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    const errorCode = error.code;
                    console.error("Erro no login:", errorCode, error.message);

                    let mensagemErroUsuario = "Ocorreu um erro ao tentar fazer login. Verifique suas credenciais.";
                    if (errorCode === 'auth/user-not-found') {
                        mensagemErroUsuario = "Usuário não encontrado. Verifique o e-mail digitado.";
                    } else if (errorCode === 'auth/wrong-password') {
                        mensagemErroUsuario = "Senha incorreta. Tente novamente.";
                    } else if (errorCode === 'auth/invalid-email') {
                        mensagemErroUsuario = "O formato do e-mail é inválido.";
                    }
                    showToast(mensagemErroUsuario, "error");
                });
        });
    }

    // --- NOVO: LÓGICA PARA REDEFINIÇÃO DE SENHA ---
    const loginContainer = document.getElementById('loginContainer');
    const resetContainer = document.getElementById('resetContainer');
    const esqueciSenhaLink = document.getElementById('esqueciSenhaLink');
    const voltarLoginLink = document.getElementById('voltarLoginLink');
    const resetForm = document.getElementById('resetForm');
    
    // Mostrar o formulário de redefinição
    if (esqueciSenhaLink) {
        esqueciSenhaLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginContainer.style.display = 'none';
            resetContainer.style.display = 'block';
        });
    }

    // Voltar para o formulário de login
    if (voltarLoginLink) {
        voltarLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            resetContainer.style.display = 'none';
            loginContainer.style.display = 'block';
        });
    }

    // Lógica para enviar o email de redefinição
    if (resetForm) {
        const resetEmailInput = document.getElementById('resetEmail');
        resetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = resetEmailInput.value;
            const submitButton = resetForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'A enviar...';

            auth.sendPasswordResetEmail(email).then(() => {
                showToast("Email de redefinição enviado com sucesso! Verifique a sua caixa de entrada.", "success");
                // Volta para a tela de login após o sucesso
                setTimeout(() => {
                    resetContainer.style.display = 'none';
                    loginContainer.style.display = 'block';
                }, 4000); // Aguarda 4 segundos para o utilizador ler o toast

            }).catch((error) => {
                let mensagemErro = "Ocorreu um erro ao enviar o email.";
                if (error.code === 'auth/user-not-found') {
                    mensagemErro = "Nenhuma conta encontrada com este email.";
                }
                showToast(mensagemErro, "error");
            }).finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Enviar Link de Redefinição';
            });
        });
    }
});