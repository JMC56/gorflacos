import { isAuthorizedAdmin, startAdminSession } from '../lib/admin';

if (document.cookie.includes('gorflacos_admin=')) window.location.href = '/admin';
document.querySelector('#admin-login-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = (document.querySelector('#admin-email') as HTMLInputElement).value.trim().toLowerCase();
  const error = document.querySelector('#admin-login-error');
  if (!isAuthorizedAdmin(email)) { error?.classList.remove('hidden'); return; }
  startAdminSession(email); window.location.href = '/admin';
});