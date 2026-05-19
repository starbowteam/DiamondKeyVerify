// ==================== DIAMKEY ADMIN — управление пользователями, аудит, тикеты, статистика ====================

async function renderAdminPage() {
  const page = document.getElementById('pageContent');
  if (!page) return;
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'staff')) {
    page.innerHTML = '<p>Доступ запрещён</p>';
    return;
  }

  page.innerHTML = `
    <h2><i class="fas fa-users-cog"></i> Панель управления</h2>
    <div class="admin-tabs">
      <button class="btn admin-tab active" data-tab="users">Пользователи</button>
      <button class="btn admin-tab" data-tab="audit">Аудит</button>
      <button class="btn admin-tab" data-tab="stats">Статистика</button>
      <button class="btn admin-tab" data-tab="tickets">Тикеты</button>
    </div>
    <div id="adminContent"></div>
  `;

  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      switch (tab) {
        case 'users': renderAdminUsers(); break;
        case 'audit': renderAdminAudit(); break;
        case 'stats': renderAdminStats(); break;
        case 'tickets': renderAdminTickets(); break;
      }
    });
  });

  renderAdminUsers();
}

async function renderAdminUsers() {
  const container = document.getElementById('adminContent');
  const { data: users, error } = await _supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) { container.innerHTML = '<p>Ошибка загрузки</p>'; return; }

  container.innerHTML = `
    <div class="search-box">
      <input type="text" id="userSearch" placeholder="Поиск по логину или почте...">
    </div>
    <div class="user-list" id="userList">
      ${users.map(u => `
        <div class="user-row" data-login="${u.login}" data-email="${u.email || ''}">
          <span><strong>${escapeHtml(u.login)}</strong> (${escapeHtml(u.email || '-')})</span>
          <span>Роль: ${u.role || 'user'}</span>
          <span>IP: ${u.ip_address || '-'}</span>
          <button class="btn" onclick="editUserByAdmin('${u.login}')"><i class="fas fa-edit"></i></button>
          <button class="btn" onclick="deleteUserByAdmin('${u.login}')"><i class="fas fa-trash"></i></button>
        </div>
      `).join('')}
    </div>
    <div class="mass-actions">
      <button class="btn" id="banSelected">Забанить выбранных</button>
      <button class="btn" id="notifySelected">Уведомить выбранных</button>
    </div>
  `;

  document.getElementById('userSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.user-row').forEach(row => {
      const login = row.dataset.login.toLowerCase();
      const email = row.dataset.email.toLowerCase();
      row.style.display = login.includes(term) || email.includes(term) ? '' : 'none';
    });
  });
}

async function editUserByAdmin(login) {
  const { data: user } = await _supabase.from('users').select('*').eq('login', login).maybeSingle();
  if (!user) return;
  const page = document.getElementById('pageContent');
  page.innerHTML = `
    <h3>Редактирование: ${escapeHtml(login)}</h3>
    <div class="card">
      <div class="input-group">
        <label>Логин</label>
        <input type="text" id="editAdminLogin" value="${escapeHtml(user.login)}">
      </div>
      <div class="input-group">
        <label>Роль</label>
        <select id="editAdminRole">
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>Пользователь</option>
          <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Персонал</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Админ</option>
        </select>
      </div>
      <div class="input-group">
        <label>Подписка</label>
        <select id="editAdminSub">
          <option value="free" ${user.subscription_tier === 'free' ? 'selected' : ''}>Бесплатно</option>
          <option value="diamond_plus" ${user.subscription_tier === 'diamond_plus' ? 'selected' : ''}>Diamond Plus</option>
        </select>
      </div>
      <button class="btn btn-primary" id="saveAdminEdit">Сохранить</button>
      <button class="btn btn-outline" onclick="renderAdminPage()">Назад</button>
    </div>
  `;
  document.getElementById('saveAdminEdit').addEventListener('click', async () => {
    const newLogin = document.getElementById('editAdminLogin').value.trim();
    const newRole = document.getElementById('editAdminRole').value;
    const newSub = document.getElementById('editAdminSub').value;
    await _supabase.from('users').update({ login: newLogin, role: newRole, subscription_tier: newSub }).eq('login', login);
    showToast('Сохранено', 'success');
    renderAdminPage();
  });
}

async function deleteUserByAdmin(login) {
  if (!confirm(`Удалить пользователя ${login}?`)) return;
  await _supabase.from('users').delete().eq('login', login);
  showToast('Пользователь удалён', 'success');
  renderAdminUsers();
}

async function renderAdminAudit() {
  const container = document.getElementById('adminContent');
  const { data: logs } = await _supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
  container.innerHTML = logs?.length ? logs.map(l => `<p>${new Date(l.created_at).toLocaleString()} — ${l.action} (${l.user_login})</p>`).join('') : '<p>Записей нет</p>';
}

async function renderAdminStats() {
  const container = document.getElementById('adminContent');
  const { data: users } = await _supabase.from('users').select('created_at');
  const now = Date.now();
  const day = 86400000;
  const newToday = users?.filter(u => now - new Date(u.created_at).getTime() < day).length || 0;
  const newWeek = users?.filter(u => now - new Date(u.created_at).getTime() < 7*day).length || 0;
  const newMonth = users?.filter(u => now - new Date(u.created_at).getTime() < 30*day).length || 0;
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-box">Новых сегодня: ${newToday}</div>
      <div class="stat-box">Новых за неделю: ${newWeek}</div>
      <div class="stat-box">Новых за месяц: ${newMonth}</div>
      <div class="stat-box">Всего: ${users?.length || 0}</div>
    </div>
  `;
}

async function renderAdminTickets() {
  const container = document.getElementById('adminContent');
  const { data: tickets } = await _supabase.from('purchase_discussions').select('*').order('created_at', { ascending: false });
  container.innerHTML = tickets?.length ? tickets.map(t => `
    <div class="ticket-row">
      <span>${t.user_login} — ${t.status}</span>
      <span>${new Date(t.created_at).toLocaleString()}</span>
      ${t.admin_notes ? `<p>${escapeHtml(t.admin_notes)}</p>` : ''}
      <button class="btn" onclick="resolveTicket('${t.id}')">Решить</button>
    </div>
  `).join('') : '<p>Тикетов нет</p>';
}

async function resolveTicket(id) {
  await _supabase.from('purchase_discussions').update({ status: 'resolved' }).eq('id', id);
  showToast('Тикет решён', 'success');
  renderAdminTickets();
}
