import { subscribeToOrders } from '../lib/catalog';
import { supabase } from '../lib/supabase';

const bar = document.querySelector('#tracking-bar');
const copy = document.querySelector('#tracking-copy');
const step = document.querySelector('#tracking-step');
const orderId = JSON.parse(localStorage.getItem('gorflacos-order') || 'null')?.id;
const labels: Record<string, string> = { received: 'El equipo recibió tu pedido', preparing: 'Tu pedido se está preparando', on_the_way: 'Tu pedido está en camino', delivered: 'Fue entregado' };
const steps: Record<string, string> = { received: '1 de 4', preparing: '2 de 4', on_the_way: '3 de 4', delivered: '4 de 4' };

async function refresh() {
  if (!supabase || !orderId) return;
  const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
  if (!data || data.status === 'delivered') { bar?.classList.add('hidden'); return; }
  bar?.classList.remove('hidden'); if (copy) copy.textContent = labels[data.status] || labels.received; if (step) step.textContent = steps[data.status] || steps.received;
}
document.querySelector('#dismiss-tracking')?.addEventListener('click', () => bar?.classList.add('hidden'));
void refresh(); subscribeToOrders(() => { void refresh(); });