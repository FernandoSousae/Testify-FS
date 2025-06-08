document.addEventListener('DOMContentLoaded', function() {
    console.log("auth.js carregado e DOM pronto!");

    const auth = firebase.auth();

    // --- LÓGICA DE LOGIN ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;

            auth.signInWithEmailAndPassword(email, senha)
                .then(() => {
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    let mensagemErroUsuario = "Ocorreu um erro. Verifique as suas credenciais.";
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                        mensagemErroUsuario = "Email ou senha incorretos.";
                    } else if (error.code === 'auth/invalid-email') {
                        mensagemErroUsuario = "O formato do email é inválido.";
                    }
                    // A função showToast deve existir no seu ficheiro utils.js
                    if (typeof showToast === 'function') {
                        showToast(mensagemErroUsuario, "error");
                    } else {
                        alert(mensagemErroUsuario);
                    }
                });
        });
    }

    // --- LÓGICA PARA REDEFINIÇÃO DE SENHA (CORRIGIDA) ---
    const loginContainer = document.getElementById('loginContainer');
    const resetContainer = document.getElementById('resetContainer');
    const esqueciSenhaLink = document.getElementById('esqueciSenhaLink');
    const voltarLoginLink = document.getElementById('voltarLoginLink');
    const resetForm = document.getElementById('resetForm');
    
    // Mostrar o formulário de redefinição
    if (esqueciSenhaLink) {
        esqueciSenhaLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Trocamos 'style.display' pela manipulação de classes
            loginContainer.classList.add('hidden');
            resetContainer.classList.remove('hidden');
        });
    }

    // Voltar para o formulário de login
    if (voltarLoginLink) {
        voltarLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Trocamos 'style.display' pela manipulação de classes
            resetContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        });
    }

    // Lógica para enviar o email de redefinição
    if (resetForm) {
        resetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value;
            const submitButton = resetForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'A enviar...';

            auth.sendPasswordResetEmail(email).then(() => {
                showToast("Email de redefinição enviado com sucesso! Verifique a sua caixa de entrada.", "success");
                setTimeout(() => {
                    resetContainer.classList.add('hidden');
                    loginContainer.classList.remove('hidden');
                }, 4000); 
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