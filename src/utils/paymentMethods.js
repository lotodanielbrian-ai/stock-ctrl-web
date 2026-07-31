/**
 * Payment method constants and display configuration.
 * Maps the PostgreSQL enum `payment_method` to UI labels, icons, and colors.
 */

export const PAYMENT_METHODS = {
  efectivo: { label: 'Efectivo', icon: '💵', color: 'var(--green)', group: 'cash' },
  tarjeta_debito: { label: 'Tarjeta Débito', icon: '💳', color: 'var(--cyan)', group: 'card' },
  tarjeta_credito: { label: 'Tarjeta Crédito', icon: '💳', color: 'var(--cyan)', group: 'card' },
  transferencia: { label: 'Transferencia', icon: '🏦', color: 'var(--amber)', group: 'transfer' },
  mercado_pago: { label: 'Mercado Pago', icon: '📱', color: '#009EE3', group: 'wallet' },
  uala: { label: 'Ualá', icon: '📱', color: '#7B61FF', group: 'wallet' },
  naranja_x: { label: 'Naranja X', icon: '📱', color: '#FF6B00', group: 'wallet' },
  personal_pay: { label: 'Personal Pay', icon: '📱', color: '#00A5E5', group: 'wallet' },
  modo: { label: 'MODO', icon: '📱', color: '#6C63FF', group: 'wallet' },
  lemon_cash: { label: 'Lemon Cash', icon: '📱', color: '#80FF00', group: 'wallet' },
  belo: { label: 'Belo', icon: '📱', color: '#1E1E1E', group: 'wallet' },
  brubank: { label: 'Brubank', icon: '📱', color: '#7B2FBE', group: 'wallet' },
};

export const PAYMENT_GROUPS = {
  cash: { label: 'Efectivo', icon: '💵' },
  card: { label: 'Tarjeta', icon: '💳' },
  transfer: { label: 'Transferencia', icon: '🏦' },
  wallet: { label: 'Billetera Virtual', icon: '📱' },
};

export const WALLET_METHODS = Object.entries(PAYMENT_METHODS)
  .filter(([, v]) => v.group === 'wallet')
  .map(([key, val]) => ({ key, ...val }));

export function getPaymentInfo(method) {
  return PAYMENT_METHODS[method] || { label: method, icon: '❓', color: 'var(--text-dim)', group: 'other' };
}

export function getPaymentGroupLabel(method) {
  const info = getPaymentInfo(method);
  return PAYMENT_GROUPS[info.group]?.label || 'Otro';
}
