// Генератор сложных паролей
function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    let hasUpper = false;
    let hasLower = false;
    let hasNumber = false;
    let hasSpecial = false;

    // Генерируем пароль, пока не будут выполнены все требования
    while (password.length < 12 || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        password = '';
        hasUpper = false;
        hasLower = false;
        hasNumber = false;
        hasSpecial = false;

        for (let i = 0; i < 12; i++) {
            const char = chars.charAt(Math.floor(Math.random() * chars.length));
            password += char;

            // Проверяем требования к паролю
            if (/[A-Z]/.test(char)) hasUpper = true;
            else if (/[a-z]/.test(char)) hasLower = true;
            else if (/[0-9]/.test(char)) hasNumber = true;
            else hasSpecial = true;
        }
    }

    return password;
}

// Проверка авторизации при загрузке страницы
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const currentPage = window.location.pathname.split('/').pop();

    // Защищенные страницы
    const protectedPages = ['functional.html', 'profile.html'];

    // Страницы авторизации
    const authPages = ['auth.html', 'register.html'];

    // Если нет токена и пытается получить доступ к защищенной странице
    if (!token && protectedPages.includes(currentPage)) {
        localStorage.removeItem('authToken'); // На всякий случай очищаем токен
        alert('Пожалуйста, войдите в систему');
        window.location.href = 'auth.html';
        return false;
    }

    // Проверяем валидность токена
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = Date.now() >= payload.exp * 1000;

            if (isExpired) {
                localStorage.removeItem('authToken');
                if (protectedPages.includes(currentPage)) {
                    alert('Сессия истекла. Пожалуйста, войдите снова');
                    window.location.href = 'auth.html';
                    return false;
                }
            }
        } catch (e) {
            localStorage.removeItem('authToken');
            if (protectedPages.includes(currentPage)) {
                alert('Ошибка авторизации. Пожалуйста, войдите снова');
                window.location.href = 'auth.html';
                return false;
            }
        }
    }

    // Если есть валидный токен и пытается получить доступ к страницам авторизации
    if (token && authPages.includes(currentPage)) {
        window.location.href = 'functional.html';
        return false;
    }

    return !!token;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию
    checkAuth();
    
    // Обработка формы регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        // Генератор паролей
        const generatePassBtn = document.getElementById('generatePassBtn');
        if (generatePassBtn) {
            generatePassBtn.addEventListener('click', function() {
                const password = generatePassword();
                document.getElementById('regPassword').value = password;
                document.getElementById('confirmPassword').value = password;
            });
        }

        // Отправка формы регистрации
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('regUsername').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Валидация
            if (password !== confirmPassword) {
                alert('Пароли не совпадают!');
                return;
            }
            
            if (password.length < 8) {
                alert('Пароль должен содержать минимум 8 символов!');
                return;
            }
            
            try {
                const response = await fetch('http://localhost:3000/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, email, password })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('Регистрация прошла успешно! Теперь вы можете войти.');
                    window.location.href = 'auth.html';
                } else {
                    alert(result.error || 'Ошибка регистрации');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка сети. Пожалуйста, попробуйте позже.');
            }
        });
    }

    // Обработка формы авторизации
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Сохраняем токен
                    localStorage.setItem('authToken', result.token);
                    alert('Вход выполнен успешно!');
                    window.location.href = 'functional.html';
                } else {
                    alert(result.error || 'Неверные учетные данные');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка сети. Пожалуйста, попробуйте позже.');
            }
        });
    }

    // Кнопка выхода
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('authToken');
            alert('Вы вышли из системы');
            window.location.href = 'index.html';
        });
    }

    // Проверка email при потере фокуса
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const email = this.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (email && !emailRegex.test(email)) {
                this.classList.add('is-invalid');
                alert('Пожалуйста, введите корректный email');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }
});

// Функция для проверки авторизации в других модулях
function isAuthenticated() {
    return !!localStorage.getItem('authToken');
}

// Функция для получения токена
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Экспортируем функции для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isAuthenticated, getAuthToken };
}