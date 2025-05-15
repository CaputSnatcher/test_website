document.addEventListener('DOMContentLoaded', function() {
    const mailList = document.getElementById('mail-list');
    const loadMailsBtn = document.getElementById('load-mails');
    const addMailBtn = document.getElementById('add-mail');

    if (loadMailsBtn && addMailBtn) {
        loadMailsBtn.addEventListener('click', loadMails);
        addMailBtn.addEventListener('click', showAddMailForm);
    }

    async function loadMails() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                alert('Требуется авторизация');
                window.location.href = 'auth.html';
                return;
            }

            const response = await fetch('/api/mails', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const mails = await response.json();
                displayMails(mails);
            } else if (response.status === 401) {
                alert('Сессия истекла. Требуется повторная авторизация');
                window.location.href = 'auth.html';
            } else {
                throw new Error('Ошибка загрузки писем');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось загрузить письма');
        }
    }

    function displayMails(mails) {
        mailList.innerHTML = '';
        
        if (Array.isArray(mails) && mails.length === 0) {
            mailList.innerHTML = '<div class="alert alert-info">Нет писем</div>';
            return;
        }

        const mailsArray = Array.isArray(mails) ? mails : Object.entries(mails).map(([id, mail]) => ({ id, ...mail }));
        
        mailsArray.forEach(mail => {
            const mailElement = document.createElement('div');
            mailElement.className = 'mail-item card mb-3';
            mailElement.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${mail.subject}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">От: ${mail.from}</h6>
                    <p class="card-text">${mail.message}</p>
                    <p class="card-text"><small class="text-muted">${new Date(mail.datetime).toLocaleString()}</small></p>
                    ${mail.files?.length ? `
                        <div class="mail-files">
                            <strong>Файлы:</strong>
                            <ul class="list-unstyled">
                                ${mail.files.map(file => `<li>${file.originalname}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    <button class="btn btn-danger btn-sm delete-mail" data-id="${mail.id}">Удалить</button>
                </div>
            `;
            
            mailElement.querySelector('.delete-mail').addEventListener('click', () => deleteMail(mail.id));
            mailList.appendChild(mailElement);
        });
    }

    async function deleteMail(id) {
        if (!confirm('Удалить это письмо?')) return;
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/mails/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                loadMails();
            } else {
                throw new Error('Ошибка удаления');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось удалить письмо');
        }
    }

    function showAddMailForm() {
        mailList.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Добавить новое письмо</h5>
                    <form id="add-mail-form">
                        <div class="mb-3">
                            <label class="form-label">Тема:</label>
                            <input type="text" name="subject" class="form-control" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Сообщение:</label>
                            <textarea name="message" class="form-control" rows="3" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Файлы:</label>
                            <input type="file" name="files" class="form-control" multiple>
                        </div>
                        <button type="submit" class="btn btn-primary">Добавить</button>
                        <button type="button" id="cancel-add" class="btn btn-secondary">Отмена</button>
                    </form>
                </div>
            </div>
        `;
        
        document.getElementById('add-mail-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch('/api/mails', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                
                if (response.ok) {
                    loadMails();
                } else {
                    throw new Error('Ошибка добавления');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Не удалось добавить письмо');
            }
        });
        
        document.getElementById('cancel-add').addEventListener('click', loadMails);
    }
});