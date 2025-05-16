const express = require('express');
const fs = require('fs');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(express.static('../client'));

const SECRET_KEY = 'your-secret-key-here';
const CHAT_HISTORY_SIZE = 100;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 минут

// Загрузка данных
const countriesData = JSON.parse(fs.readFileSync('./data/countries.json'));
let mailDB = JSON.parse(fs.readFileSync('./data/maillist.json'));
let usersDB = JSON.parse(fs.readFileSync('./data/users.json'));

// WebSocket сервер
const wss = new WebSocket.Server({ port: 8081 });
const chatHistory = [];
const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  let username = `Гость-${Math.floor(Math.random() * 1000)}`;
  let timeout = setTimeout(() => disconnectForInactivity(), INACTIVITY_TIMEOUT);

  function disconnectForInactivity() {
    ws.close(4000, 'Неактивность');
  }

  function resetInactivityTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(() => disconnectForInactivity(), INACTIVITY_TIMEOUT);
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      resetInactivityTimeout();

      if (data.type === 'setUsername') {
        handleSetUsername(data.username);
      } else if (data.type === 'message') {
        handleNewMessage(data.text);
      }
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
    }
  });

  function handleSetUsername(newUsername) {
    // Проверка уникальности имени
    let uniqueUsername = newUsername;
    let counter = 1;
    while (Array.from(clients.values()).includes(uniqueUsername)) {
      uniqueUsername = `${newUsername}-${counter++}`;
    }
    username = uniqueUsername;
    clients.set(ws, username);

    // Отправка подтверждения и истории
    ws.send(JSON.stringify({
      type: 'system',
      message: `Ваше имя в чате: ${username}`
    }));
    sendChatHistory();
  }

  function handleNewMessage(text) {
    const message = {
      id: uuidv4(),
      username,
      text,
      timestamp: new Date().toISOString()
    };
    
    // Сохраняем в историю
    chatHistory.push(message);
    if (chatHistory.length > CHAT_HISTORY_SIZE) {
      chatHistory.shift();
    }
    
    // Рассылаем всем клиентам
    broadcastMessage(message);
  }

  function sendChatHistory() {
    ws.send(JSON.stringify({
      type: 'history',
      messages: chatHistory.slice(-50)
    }));
  }

  function broadcastMessage(message) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'message',
          ...message
        }));
      }
    });
  }

  ws.on('close', () => {
    clients.delete(ws);
    clearTimeout(timeout);
    console.log(`Клиент ${username} отключился`);
  });
});

// Middleware для проверки JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// API для авторизации
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = usersDB.find(u => u.username === username);
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Неверные учетные данные' });
  }
  
  const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  // Проверка существования пользователя
  const userExists = usersDB.some(u => u.username === username);
  if (userExists) {
    return res.status(400).json({ error: 'Username already taken' });
  }

  // Хеширование пароля
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Создание нового пользователя
  const newUser = { 
    username, 
    email, 
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };

  // Добавление в массив
  usersDB.push(newUser);

  // Запись в файл
  try {
    fs.writeFileSync('./data/users.json', JSON.stringify(usersDB, null, 2));
    console.log('User registered:', username); // Логирование
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API для работы с письмами (требует авторизации)
app.get('/api/mails', authenticateToken, (req, res) => {
  const { filter } = req.query;
  let result = mailDB.body;
  
  if (filter) {
    const filterObj = JSON.parse(filter);
    if (filterObj.subject) {
      result = Object.values(result).filter(mail => 
        mail.subject.includes(filterObj.subject)
      );
    }
  }
  
  res.json(result);
});

app.post('/api/mails', authenticateToken, upload.array('files'), (req, res) => {
  const newMail = {
    datetime: new Date().toISOString(),
    subject: req.body.subject,
    from: req.user.username,
    message: req.body.message,
    files: req.files?.map(file => ({
      originalname: file.originalname,
      filename: file.filename,
      path: file.path
    }))
  };
  
  const id = `mail_${mailDB.header.increment++}`;
  mailDB.body[id] = newMail;
  saveMailDB();
  
  res.status(201).json({ id, ...newMail });
});

app.delete('/api/mails/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  if (!mailDB.body[id]) return res.status(404).json({ error: 'Письмо не найдено' });
  
  delete mailDB.body[id];
  saveMailDB();
  
  res.sendStatus(204);
});

// API для городов
// Проверка валидности токена
app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.sendStatus(200);
});

app.get('/api/cities', (req, res) => {
  const country = req.query.country;
  if (country) {
    res.json(countriesData[country] || []);
  } else {
    res.json(countriesData);
  }
});

function saveMailDB() {
  fs.writeFileSync('./data/maillist.json', JSON.stringify(mailDB, null, 2));
}

app.listen(3000, () => console.log('Сервер запущен на порту 3000'));