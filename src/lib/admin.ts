import adminConfig from '../data/admins.json';

export const ownerEmail = adminConfig.owner;
export function isAuthorizedAdmin(email: string) { return adminConfig.admins.includes(email.trim().toLowerCase()); }
export function isOwner(email: string) { return email.trim().toLowerCase() === ownerEmail.toLowerCase(); }
export function startAdminSession(email: string) { document.cookie = `gorflacos_admin=${encodeURIComponent(email)}; max-age=${60 * 60 * 2}; path=/; SameSite=Lax`; localStorage.setItem('gorflacos-admin-last-active', String(Date.now())); }
export function endAdminSession() { document.cookie = 'gorflacos_admin=; max-age=0; path=/'; localStorage.removeItem('gorflacos-admin-last-active'); }
export function currentAdminEmail() { return decodeURIComponent(document.cookie.match(/(?:^|; )gorflacos_admin=([^;]*)/)?.[1] || ''); }