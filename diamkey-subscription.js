// ==================== DIAMKEY SUBSCRIPTION — Diamond Plus ====================

async function renderSubscriptionPage() {
  const page = document.getElementById('pageContent');
  if (!page) return;

  page.innerHTML = `
    <div class="subscription-hero">
      <h1><i class="fas fa-gem"></i> Diamond Plus</h1>
      <p>Премиум-подписка для максимальных возможностей</p>
    </div>
    <div class="subscription-details card">
      <div class="price-tag">350 ₽ <small>/ месяц</small></div>
      <ul class="feature-list">
        <li><i class="fas fa-check-circle"></i> Более точные ответы ИИ</li>
        <li><i class="fas fa-check-circle"></i> Общение без границ</li>
        <li><i class="fas fa-check-circle"></i> Меньше правил и запретов</li>
        <li><i class="fas fa-check-circle"></i> Эксклюзивный бейдж и рамка аватара</li>
        <li><i class="fas fa-check-circle"></i> Приоритетная поддержка</li>
        <li><i class="fas fa-check-circle"></i> Доступ к экспериментальным функциям</li>
      </ul>
      ${currentUser ? `
        <button class="btn btn-primary" id="subscribeBtn"><i class="fas fa-crown"></i> Оформить подписку</button>
        <div id="subscribeForm" style="display:none; margin-top:20px;">
          <p>Заполните форму, и я свяжусь с вами для обсуждения деталей и активации.</p>
          <textarea id="subscribeMessage" placeholder="Ваши пожелания, вопросы..."></textarea>
          <button class="btn" id="submitSubscribe"><i class="fas fa-paper-plane"></i> Отправить заявку</button>
        </div>
      ` : '<p>Войдите в аккаунт, чтобы оформить подписку</p>'}
    </div>
    <div class="card" style="margin-top:20px;">
      <h3>Правила подписки</h3>
      <ul>
        <li>Подписка активируется после подтверждения администратором.</li>
        <li>Срок действия — 30 дней с момента активации.</li>
        <li>Автопродление не предусмотрено, вы сами решаете, когда продлить.</li>
        <li>Возврат средств не производится после активации.</li>
      </ul>
    </div>
  `;

  if (currentUser) {
    document.getElementById('subscribeBtn').addEventListener('click', () => {
      document.getElementById('subscribeForm').style.display = 'block';
      document.getElementById('subscribeBtn').style.display = 'none';
    });

    document.getElementById('submitSubscribe').addEventListener('click', async () => {
      const msg = document.getElementById('subscribeMessage').value.trim();
      if (!msg) return showToast('Пожалуйста, напишите сообщение', 'error');

      const { error } = await _supabase.from('purchase_discussions').insert([{
        user_login: currentUser.login,
        status: 'pending',
        admin_notes: msg
      }]);

      if (error) {
        showToast('Ошибка при отправке заявки', 'error');
        console.error(error);
        return;
      }

      showToast('Заявка отправлена! Я свяжусь с вами в ближайшее время.', 'success');
      document.getElementById('subscribeForm').style.display = 'none';
      document.getElementById('subscribeBtn').style.display = 'inline-flex';
    });
  }
}
