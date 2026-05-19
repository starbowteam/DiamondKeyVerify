// ==================== DIAMKEY ROUTER — маршрутизация, рендер страниц, инициализация ====================

// Сопоставление путей с функциями отрисовки
const routes = {
  '/': renderHomePage,
  '/profile': renderProfilePage,
  '/subscription': renderSubscriptionPage,
  '/docs': renderDocsPage,
  '/admin': renderAdminPage,
  '/support': renderSupportPage,
};

// Динамический путь для публичного профиля /@username
function matchRoute(path) {
  if (routes[path]) return routes[path];
  if (path.startsWith('/@')) {
    const username = path.substring(2);
    return () => renderPublicProfile(username);
  }
  return null;
}

// Главная страница (вход/регистрация + лендинг)
function renderHomePage() {
  const page = document.getElementById('pageContent');
  if (!page) return;

  if (currentUser) {
    // Если уже вошли — показываем приветствие
    page.innerHTML = `
      <div class="hero">
        <h1>Добро пожаловать, ${escapeHtml(currentUser.name || currentUser.login)}!</h1>
        <p>Вы вошли в свой DiamKey — единый ключ экосистемы Diamond.</p>
        <div style="display:flex; gap:16px; justify-content:center;">
          <a href="/profile" class="btn btn-primary"><i class="fas fa-user"></i> Мой профиль</a>
          <a href="/docs" class="btn btn-outline"><i class="fas fa-folder"></i> Документы</a>
        </div>
      </div>
    `;
    return;
  }

  page.innerHTML = `
    <div class="hero">
      <h1>DiamKey</h1>
      <p>Единый аккаунт для всех сервисов Diamond</p>
    </div>
    <div class="card" style="max-width:400px; margin:0 auto;">
      <div class="auth-tabs">
        <button class="btn auth-tab active" id="tabLogin">Вход</button>
        <button class="btn auth-tab" id="tabRegister">Регистрация</button>
      </div>
      <div id="authForms">
        <div id="loginForm">
          <div class="input-group">
            <label>Логин</label>
            <input type="text" id="loginInput" placeholder="Введите логин">
          </div>
          <div class="input-group">
            <label>Пароль</label>
            <input type="password" id="loginPassword" placeholder="········">
          </div>
          <button class="btn btn-primary" id="doLogin">Войти</button>
        </div>
        <div id="registerForm" style="display:none;">
          <div class="input-group">
            <label>Логин</label>
            <input type="text" id="regLogin" placeholder="Придумайте логин">
          </div>
          <div class="input-group">
            <label>Пароль</label>
            <input type="password" id="regPassword" placeholder="Минимум 6 символов">
          </div>
          <button class="btn btn-primary" id="doRegister">Создать</button>
        </div>
      </div>
    </div>
  `;

  // Переключение вкладок
  document.getElementById('tabLogin').addEventListener('click', () => {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('tabLogin').classList.add('active');
    document.getElementById('tabRegister').classList.remove('active');
  });
  document.getElementById('tabRegister').addEventListener('click', () => {
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('tabRegister').classList.add('active');
    document.getElementById('tabLogin').classList.remove('active');
  });

  // Действия
  document.getElementById('doLogin').addEventListener('click', () => {
    const login = document.getElementById('loginInput').value.trim();
    const pass = document.getElementById('loginPassword').value;
    login(login, pass);
  });
  document.getElementById('doRegister').addEventListener('click', () => {
    const login = document.getElementById('regLogin').value.trim();
    const pass = document.getElementById('regPassword').value;
    register(login, pass);
  });
}

// Страница документов
async function renderDocsPage() {
  const page = document.getElementById('pageContent');
  if (!currentUser) {
    page.innerHTML = '<p>Войдите для доступа к документам</p>';
    return;
  }
  const { data } = await _supabase.from('knowledge_docs').select('*').eq('user_login', currentUser.login);
  page.innerHTML = `
    <h2><i class="fas fa-book"></i> Мои документы</h2>
    ${data?.length ? data.map(d => `<div class="card">${escapeHtml(d.title)}</div>`).join('') : '<p>Нет документов</p>'}
  `;
}

// Страница поддержки (тикеты) — старый функционал
async function renderSupportPage() {
  const page = document.getElementById('pageContent');
  if (!currentUser) {
    page.innerHTML = '<p>Войдите для доступа к поддержке</p>';
    return;
  }

  // Проверяем существующие тикеты
  const { data: tickets } = await _supabase.from('tickets').select('*').eq('email', currentUser.email);
  const existingTicket = tickets?.length ? tickets[0] : null;

  if (existingTicket) {
    // Показываем чат тикета
    page.innerHTML = `
      <h2><i class="fas fa-headset"></i> Поддержка</h2>
      <div class="ticket-chat">
        <div class="ticket-messages" id="ticketMessages">
          ${(existingTicket.messages || []).map(m => `<div class="chat-message ${m.sender==='admin'?'bot':'user'}"><div class="chat-bubble">${escapeHtml(m.text)}</div></div>`).join('')}
        </div>
        <div class="ticket-input">
          <input type="text" id="ticketMessage" placeholder="Введите сообщение...">
          <button class="btn" id="sendTicketMsg"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    `;
    document.getElementById('sendTicketMsg').addEventListener('click', async () => {
      const input = document.getElementById('ticketMessage');
      const text = input.value.trim();
      if (!text) return;
      const messages = [...(existingTicket.messages || []), { sender: 'user', text, time: new Date().toISOString() }];
      await _supabase.from('tickets').update({ messages }).eq('id', existingTicket.id);
      input.value = '';
      renderSupportPage();
    });
  } else {
    page.innerHTML = `
      <h2><i class="fas fa-headset"></i> Поддержка</h2>
      <p>Нет открытых тикетов.</p>
      <button class="btn btn-primary" id="openTicketBtn"><i class="fas fa-plus"></i> Открыть тикет</button>
    `;
    document.getElementById('openTicketBtn').addEventListener('click', async () => {
      await _supabase.from('tickets').insert([{ id: Date.now().toString(), email: currentUser.email, messages: [] }]);
      renderSupportPage();
    });
  }
}

// Навигация
function navigate(path) {
  history.pushState(null, '', path);
  handleRoute();
}

function handleRoute() {
  const path = window.location.pathname;
  const route = matchRoute(path);
  if (route) {
    route();
  } else {
    document.getElementById('pageContent').innerHTML = '<h2>404 — Страница не найдена</h2>';
  }
}

// Бургер-меню
document.getElementById('burgerMenu').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('active');
});

// Выпадающее меню "Инструменты"
document.addEventListener('click', (e) => {
  if (e.target.id === 'toolsBtn') {
    const menu = document.getElementById('toolsMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  } else if (!e.target.closest('#toolsDropdown')) {
    const menu = document.getElementById('toolsMenu');
    if (menu) menu.style.display = 'none';
  }
});

// Инициализация приложения
(async function() {
  initSession(); // из diamkey-core.js

  // Обработка переходов
  window.addEventListener('popstate', handleRoute);
  handleRoute();

  // Запускаем сервисы (статусы, уведомления)
  if (typeof initServices === 'function') {
    initServices();
  }
})();
