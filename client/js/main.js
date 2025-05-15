document.addEventListener('DOMContentLoaded', function() {
    // Проверка авторизации
    if (window.location.pathname.includes('functional.html')) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'auth.html';
        }
    }

    // Сохранение данных формы
    const mainForm = document.getElementById('mainForm');
    if (mainForm) {
        mainForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                numberInput: document.getElementById('numberInput').value,
                textArea: document.getElementById('textArea').value,
                options: document.querySelector('input[name="options"]:checked')?.value,
                savedAt: new Date().toISOString()
            };
            
            localStorage.setItem('formData', JSON.stringify(formData));
            alert('Форма сохранена!');
        });

        // Восстановление данных при загрузке
        const savedData = localStorage.getItem('formData');
        if (savedData) {
            const formData = JSON.parse(savedData);
            document.getElementById('numberInput').value = formData.numberInput || '';
            document.getElementById('textArea').value = formData.textArea || '';
            if (formData.options) {
                document.querySelector(`input[name="options"][value="${formData.options}"]`).checked = true;
            }
        }
    }
});