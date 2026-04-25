const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DATA_FILE = './data.json';

// Загружаем данные из файла или создаём пустую структуру
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { users: [], sessions: [], tickets: [], forumPosts: [] };
}

// Сохраняем данные в файл
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Инициализация
let DB = loadData();

// Автосохранение при каждом изменении (для простоты)
function updateDB() {
  saveData(DB);
}

// ==================== API ====================

// Регистрация
app.post('/api/register', (req, res) => {
  const { email, login, password } = req.body;
  if (!email || !login || !password) return res.status(400).json({ error: 'Все поля обязательны' });
  if (DB.users.find(u => u.email === email || u.login === login)) {
    return res.status(409).json({ error: 'Email или логин занят' });
  }
  const newUser = {
    email, login, password,
    token: 'diamkey_' + Math.random().toString(36).substring(2, 15),
    secretWord: generateSecret(email),
    createdAt: new Date().toISOString(),
    name: '',
    avatar: '',
    description: ''
  };
  DB.users.push(newUser);
  updateDB();
  res.json({ user: newUser });
});

// Вход
app.post('/api/login', (req, res) => {
  const { identity, password } = req.body;
  const user = DB.users.find(u => (u.email === identity || u.login === identity) && u.password === password);
  if (!user) return res.status(401).json({ error: 'Неверные данные' });
  DB.sessions.push({ email: user.email, login: user.login, token: user.token, time: new Date().toISOString() });
  updateDB();
  res.json({ user });
});

// Получить всех пользователей (только для админа можно, но для простоты отдаём всех)
app.get('/api/users', (req, res) => {
  res.json(DB.users);
});

// Удалить пользователя
app.delete('/api/users/:email', (req, res) => {
  const { email } = req.params;
  DB.users = DB.users.filter(u => u.email !== email);
  DB.sessions = DB.sessions.filter(s => s.email !== email);
  DB.tickets = DB.tickets.filter(t => t.email !== email);
  updateDB();
  res.json({ success: true });
});

// Обновить профиль
app.put('/api/users/:email', (req, res) => {
  const { email } = req.params;
  const idx = DB.users.findIndex(u => u.email === email);
  if (idx === -1) return res.status(404).json({ error: 'Пользователь не найден' });
  DB.users[idx] = { ...DB.users[idx], ...req.body };
  updateDB();
  res.json({ user: DB.users[idx] });
});

// ===== Форум =====
app.get('/api/forum', (req, res) => {
  res.json(DB.forumPosts);
});

app.post('/api/forum', (req, res) => {
  const { email, name, login, avatar, message } = req.body;
  if (!message) return res.status(400).json({ error: 'Сообщение обязательно' });
  const post = {
    email, name, login, avatar,
    message,
    time: new Date().toISOString()
  };
  DB.forumPosts.push(post);
  updateDB();
  res.json({ post });
});

app.delete('/api/forum/:index', (req, res) => {
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || idx < 0 || idx >= DB.forumPosts.length) return res.status(404).json({ error: 'Пост не найден' });
  DB.forumPosts.splice(idx, 1);
  updateDB();
  res.json({ success: true });
});

// ===== Тикеты =====
app.get('/api/tickets', (req, res) => {
  res.json(DB.tickets);
});

app.post('/api/tickets', (req, res) => {
  const { email, message } = req.body;
  if (!email || !message) return res.status(400).json({ error: 'Email и сообщение обязательны' });
  const ticket = {
    id: Date.now().toString(),
    email,
    messages: [{ sender: 'user', text: message, time: new Date().toISOString() }]
  };
  DB.tickets.push(ticket);
  updateDB();
  res.json({ ticket });
});

app.put('/api/tickets/:id', (req, res) => {
  const { id } = req.params;
  const idx = DB.tickets.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Тикет не найден' });
  const { sender, text } = req.body;
  DB.tickets[idx].messages.push({ sender, text, time: new Date().toISOString() });
  updateDB();
  res.json({ ticket: DB.tickets[idx] });
});

app.delete('/api/tickets/:id', (req, res) => {
  const { id } = req.params;
  DB.tickets = DB.tickets.filter(t => t.id !== id);
  updateDB();
  res.json({ success: true });
});

// Генерация секретного слова
function generateSecret(email) {
  // Простая генерация для демо (в реальности криптостойкая)
  return Math.random().toString(36).substring(2, 14).toUpperCase() + Math.random().toString(36).substring(2, 14).toUpperCase();
}

// Отдача статики (фронтенда)
app.use(express.static(path.join(__dirname, 'public')));

// Запуск
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер DiamKey запущен на порту ${PORT}`));
