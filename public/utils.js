// Função para exibir notificações toast
function showToast(message, type = 'info', duration = 5000) {
    const toastElement = document.getElementById('toastNotification');
    const toastMessageElement = document.getElementById('toastMessage');

    if (!toastElement || !toastMessageElement) {
        console.error("Elementos do Toast não encontrados no DOM. Certifique-se de que o HTML do toast existe e que o CSS global está vinculado.");
        // Como fallback, use alert se o toast não estiver configurado
        alert(message); 
        return;
    }

    toastMessageElement.textContent = message;

    // Remove classes de tipo anteriores e adiciona a nova
    toastElement.classList.remove('success', 'error', 'info'); // 'info' seria a classe padrão se quiser estilizar
    if (type === 'success') {
        toastElement.classList.add('success');
    } else if (type === 'error') {
        toastElement.classList.add('error');
    } else { // 'info' ou qualquer outro tipo que queira estilizar
        toastElement.classList.add('info'); // Pode precisar de um estilo para .toast.info no CSS
    }

    toastElement.classList.add('show');

    // Esconder o toast após a duração especificada
    setTimeout(function() {
        toastElement.classList.remove('show');
    }, duration);
}