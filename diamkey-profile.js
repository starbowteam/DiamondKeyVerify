// ==================== DIAMKEY PROFILE — личный и публичный профиль, достижения, кастомизация ====================

async function renderProfilePage(username = null) {
  const page = document.getElementById('pageContent');
  if (!page) return;

  // Если передан username — показываем публичный профиль
  if (username) {
    return renderPublicProfile(username);
  }

  // Если пользователь не авторизован
  if (!currentUser) {
    page.innerHTML = '<p class="text-muted">Войдите, чтобы увидеть профиль</p>';
    return;
  }

  // Проверяем, хочет ли пользователь редактировать профиль
  if (window.location.search.includes('edit')) {
    return renderProfileEdit();
  }

  // Загружаем полные данные пользователя
  const { data: user } = await _supabase.from('users').select('*').eq('login', currentUser.login).maybeSingle();
  if (!user) {
    page.innerHTML = '<p>Пользователь не найден</p>';
    return;
  }

  const avatarFrame = getAvatarFrame(user);
  const coverStyle = user.cover_image 
    ? `background-image: url(${user.cover_image}); background-size: cover; background-position: center;` 
    : 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);';
  const trustPercent = Math.min((user.trust_level || 0) * 10, 100);

  // Получаем достижения
  const { data: achievements } = await _supabase.from('achievements').select('*').eq('user_login', user.login);

  // Собираем бейджи
  let badgesHtml = '';
  if (user.subscription_tier === 'diamond_plus') {
    badgesHtml += `<span class="badge badge-diamond"><i class="fas fa-gem"></i> Diamond Plus</span>`;
  }
  if (user.role === 'admin') {
    badgesHtml += `<span class="badge badge-admin"><i class="fas fa-shield-haltered"></i> Админ</span>`;
  }
  if (user.role === 'staff') {
    badgesHtml += `<span class="badge badge-staff"><i class="fas fa-user-cog"></i> Персонал</span>`;
  }
  // Ранний пользователь (если зарегистрирован давно)
  if (new Date(user.created_at) < new Date('2026-01-01')) {
    badgesHtml += `<span class="badge badge-early"><i class="fas fa-clock"></i> Ранний пользователь</span>`;
  }

  page.innerHTML = `
    <div class="profile-cover" style="${coverStyle}">
      <div class="profile-avatar-wrapper" style="border: 3px solid ${avatarFrame}; border-radius: 50%; width: 100px; height: 100px; overflow: hidden;">
        ${user.avatar ? `<img src="${user.avatar}" alt="Avatar" style="width:100%; height:100%; object-fit:cover;">` : '<i class="fas fa-user-circle" style="font-size: 5rem;"></i>'}
      </div>
    </div>
    <div class="profile-info">
      <h1 class="profile-name ${user.nickname_effect || ''}">${escapeHtml(user.name || user.login)}</h1>
      <p class="profile-status"><i class="fas ${user.fa_icon || 'fa-comment'}"></i> ${escapeHtml(user.status_text || 'Привет! Я использую DiamKey')}</p>
      <div class="profile-badges">${badgesHtml}</div>
      <div class="trust-bar">
        <div class="trust-fill" style="width: ${trustPercent}%;"></div>
        <span>Уровень доверия: ${user.trust_level || 0}/10</span>
      </div>
      <div class="profile-actions">
        <button class="btn btn-outline" onclick="navigate('/profile?edit=true')"><i class="fas fa-edit"></i> Редактировать</button>
        <button class="btn btn-outline" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Выйти</button>
      </div>
    </div>
    <div class="achievements-section">
      <h2><i class="fas fa-trophy"></i> Достижения</h2>
      <div class="achievements-grid">
        ${achievements && achievements.length ? achievements.map(a => `
          <div class="achievement-card">
            <i class="fas ${a.icon || 'fa-star'}"></i>
            <strong>${escapeHtml(a.title)}</strong>
            <p>${escapeHtml(a.description || '')}</p>
            <div class="progress-bar"><div style="width:${(a.progress/a.max_progress)*100}%"></div></div>
            <small>${a.progress}/${a.max_progress}</small>
          </div>
        `).join('') : '<p class="text-muted">Пока нет достижений</p>'}
      </div>
    </div>
  `;
}

// Публичный профиль (доступен по /@username)
async function renderPublicProfile(username) {
  const page = document.getElementById('pageContent');
  const { data: user } = await _supabase.from('users').select('*').eq('login', username).maybeSingle();
  if (!user) {
    page.innerHTML = '<h2>Пользователь не найден</h2>';
    return;
  }

  const avatarFrame = getAvatarFrame(user);
  const coverStyle = user.cover_image 
    ? `background-image: url(${user.cover_image}); background-size: cover; background-position: center;` 
    : 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);';
  const trustPercent = Math.min((user.trust_level || 0) * 10, 100);
  const { data: achievements } = await _supabase.from('achievements').select('*').eq('user_login', user.login);

  page.innerHTML = `
    <div class="profile-cover" style="${coverStyle}">
      <div class="profile-avatar-wrapper" style="border: 3px solid ${avatarFrame}; border-radius: 50%; width: 100px; height: 100px; overflow: hidden;">
        ${user.avatar ? `<img src="${user.avatar}" alt="Avatar" style="width:100%; height:100%; object-fit:cover;">` : '<i class="fas fa-user-circle" style="font-size: 5rem;"></i>'}
      </div>
    </div>
    <div class="profile-info">
      <h1>${escapeHtml(user.name || user.login)}</h1>
      <p>${escapeHtml(user.status_text || '')}</p>
      <div class="trust-bar">
        <div class="trust-fill" style="width: ${trustPercent}%;"></div>
        <span>Уровень доверия: ${user.trust_level || 0}/10</span>
      </div>
    </div>
    <div class="achievements-section">
      <h2>Достижения</h2>
      <div class="achievements-grid">
        ${achievements && achievements.length ? achievements.map(a => `
          <div class="achievement-card">
            <i class="fas ${a.icon || 'fa-star'}"></i>
            <strong>${escapeHtml(a.title)}</strong>
            <p>${escapeHtml(a.description || '')}</p>
          </div>
        `).join('') : '<p>Пока нет достижений</p>'}
      </div>
    </div>
  `;
}

// Редактирование профиля
function renderProfileEdit() {
  const page = document.getElementById('pageContent');
  if (!currentUser) return;

  page.innerHTML = `
    <h2><i class="fas fa-edit"></i> Редактирование профиля</h2>
    <div class="card">
      <div class="input-group">
        <label>Имя</label>
        <input type="text" id="editName" value="${escapeHtml(currentUser.name || '')}" placeholder="Ваше имя">
      </div>
      <div class="input-group">
        <label>Статус</label>
        <input type="text" id="editStatus" value="${escapeHtml(currentUser.status_text || '')}" placeholder="Ваш статус">
      </div>
      <div class="input-group">
        <label>Иконка статуса (Font Awesome)</label>
        <input type="text" id="editFaIcon" value="${escapeHtml(currentUser.fa_icon || 'fa-comment')}" placeholder="fa-comment">
      </div>
      <div class="input-group">
        <label>Рамка аватара</label>
        <select id="editFrame">
          <option value="default" ${currentUser.avatar_frame === 'default' ? 'selected' : ''}>Обычная</option>
          <option value="gold" ${currentUser.avatar_frame === 'gold' ? 'selected' : ''}>Золотая</option>
          <option value="silver" ${currentUser.avatar_frame === 'silver' ? 'selected' : ''}>Серебряная</option>
          <option value="neon" ${currentUser.avatar_frame === 'neon' ? 'selected' : ''}>Неоновая</option>
        </select>
      </div>
      <div class="input-group">
        <label>Эффект ника</label>
        <select id="editNicknameEffect">
          <option value="none" ${currentUser.nickname_effect === 'none' ? 'selected' : ''}>Обычный</option>
          <option value="gradient" ${currentUser.nickname_effect === 'gradient' ? 'selected' : ''}>Градиент</option>
          <option value="shadow" ${currentUser.nickname_effect === 'shadow' ? 'selected' : ''}>Тень</option>
          <option value="glow" ${currentUser.nickname_effect === 'glow' ? 'selected' : ''}>Свечение</option>
        </select>
      </div>
      <div class="input-group">
        <label>Фон карточки</label>
        <select id="editCardBackground">
          <option value="default" ${currentUser.card_background === 'default' ? 'selected' : ''}>Стандартный</option>
          <option value="dark" ${currentUser.card_background === 'dark' ? 'selected' : ''}>Тёмный</option>
          <option value="glass" ${currentUser.card_background === 'glass' ? 'selected' : ''}>Стеклянный</option>
        </select>
      </div>
      <div class="input-group">
        <label>Обложка профиля (URL)</label>
        <input type="text" id="editCover" value="${escapeHtml(currentUser.cover_image || '')}" placeholder="https://...">
      </div>
      <button class="btn btn-primary" id="saveProfile"><i class="fas fa-check"></i> Сохранить</button>
      <button class="btn btn-outline" onclick="navigate('/profile')">Отмена</button>
    </div>
  `;

  document.getElementById('saveProfile').addEventListener('click', async () => {
    const name = document.getElementById('editName').value.trim();
    const status = document.getElementById('editStatus').value.trim();
    const faIcon = document.getElementById('editFaIcon').value.trim();
    const frame = document.getElementById('editFrame').value;
    const nickEffect = document.getElementById('editNicknameEffect').value;
    const cardBg = document.getElementById('editCardBackground').value;
    const cover = document.getElementById('editCover').value.trim();

    const { error } = await _supabase.from('users').update({
      name, status_text: status, fa_icon: faIcon,
      avatar_frame: frame, nickname_effect: nickEffect,
      card_background: cardBg, cover_image: cover
    }).eq('login', currentUser.login);

    if (error) {
      showToast('Ошибка сохранения', 'error');
      return;
    }

    // Обновляем локального пользователя
    currentUser.name = name;
    currentUser.status_text = status;
    currentUser.fa_icon = faIcon;
    currentUser.avatar_frame = frame;
    currentUser.nickname_effect = nickEffect;
    currentUser.card_background = cardBg;
    currentUser.cover_image = cover;
    localStorage.setItem('diamkey_current', JSON.stringify(currentUser));
    showToast('Профиль обновлён', 'success');
    navigate('/profile');
  });
}
