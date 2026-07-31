import React, { useState } from 'react';
import { PAYMENT_METHODS, PAYMENT_GROUPS, WALLET_METHODS } from '../utils/paymentMethods';

/**
 * PaymentSelector — Visual payment method picker.
 * Shows category pills (Efectivo, Tarjeta, Transferencia, Billetera)
 * and expands wallet sub-options when "Billetera Virtual" is selected.
 *
 * Props:
 *   value: string — current payment_method key
 *   onChange: (method: string) => void
 *   compact: boolean — smaller layout for scanner mode
 */
export function PaymentSelector({ value = 'efectivo', onChange, compact = false }) {
  const [expandedGroup, setExpandedGroup] = useState(() => {
    const info = PAYMENT_METHODS[value];
    return info?.group === 'wallet' ? 'wallet' : null;
  });

  const currentInfo = PAYMENT_METHODS[value] || PAYMENT_METHODS.efectivo;

  const handleGroupClick = (groupKey) => {
    if (groupKey === 'wallet') {
      setExpandedGroup(expandedGroup === 'wallet' ? null : 'wallet');
      // If currently not a wallet method, select mercado_pago as default
      if (currentInfo.group !== 'wallet') {
        onChange('mercado_pago');
      }
    } else if (groupKey === 'cash') {
      setExpandedGroup(null);
      onChange('efectivo');
    } else if (groupKey === 'transfer') {
      setExpandedGroup(null);
      onChange('transferencia');
    } else if (groupKey === 'card') {
      // Expand to choose debit or credit
      setExpandedGroup(expandedGroup === 'card' ? null : 'card');
      if (currentInfo.group !== 'card') {
        onChange('tarjeta_debito');
      }
    }
  };

  const pillSize = compact ? { padding: '5px 10px', fontSize: 11 } : { padding: '7px 14px', fontSize: 12.5 };
  const subPillSize = compact ? { padding: '4px 8px', fontSize: 10 } : { padding: '5px 11px', fontSize: 11.5 };

  return (
    <div style={{ marginBottom: compact ? 10 : 16 }}>
      <label style={{
        fontSize: 11,
        color: 'var(--text-dim)',
        display: 'block',
        marginBottom: 6,
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}>
        MEDIO DE PAGO
      </label>

      {/* Main category pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: expandedGroup ? 8 : 0 }}>
        {Object.entries(PAYMENT_GROUPS).map(([groupKey, group]) => {
          const isActive = currentInfo.group === groupKey;
          return (
            <button
              key={groupKey}
              type="button"
              onClick={() => handleGroupClick(groupKey)}
              className="sc-btn sc-focus"
              style={{
                ...pillSize,
                borderRadius: 8,
                cursor: 'pointer',
                border: isActive ? `1.5px solid ${currentInfo.color}` : '1px solid var(--border)',
                background: isActive ? `${currentInfo.color}18` : 'var(--panel-alt)',
                color: isActive ? currentInfo.color : 'var(--text-dim)',
                fontWeight: isActive ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all .15s ease',
              }}
            >
              <span style={{ fontSize: compact ? 13 : 15 }}>{group.icon}</span>
              {group.label}
            </button>
          );
        })}
      </div>

      {/* Card sub-options */}
      {expandedGroup === 'card' && (
        <div style={{
          display: 'flex',
          gap: 5,
          flexWrap: 'wrap',
          padding: '8px 10px',
          background: 'var(--panel-alt)',
          border: '1px solid var(--border-soft)',
          borderRadius: 8,
          animation: 'sc-fade .2s ease forwards',
        }}>
          {[
            { key: 'tarjeta_debito', label: 'Débito' },
            { key: 'tarjeta_credito', label: 'Crédito' },
          ].map((card) => {
            const active = value === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => onChange(card.key)}
                className="sc-btn sc-focus"
                style={{
                  ...subPillSize,
                  borderRadius: 6,
                  cursor: 'pointer',
                  border: active ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  background: active ? '#45D9C71A' : 'transparent',
                  color: active ? 'var(--cyan)' : 'var(--text-faint)',
                  fontWeight: active ? 600 : 500,
                }}
              >
                💳 {card.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Wallet sub-options */}
      {expandedGroup === 'wallet' && (
        <div style={{
          display: 'flex',
          gap: 5,
          flexWrap: 'wrap',
          padding: '8px 10px',
          background: 'var(--panel-alt)',
          border: '1px solid var(--border-soft)',
          borderRadius: 8,
          animation: 'sc-fade .2s ease forwards',
        }}>
          {WALLET_METHODS.map((w) => {
            const active = value === w.key;
            return (
              <button
                key={w.key}
                type="button"
                onClick={() => onChange(w.key)}
                className="sc-btn sc-focus"
                style={{
                  ...subPillSize,
                  borderRadius: 6,
                  cursor: 'pointer',
                  border: active ? `1px solid ${w.color}` : '1px solid var(--border)',
                  background: active ? `${w.color}22` : 'transparent',
                  color: active ? w.color : 'var(--text-faint)',
                  fontWeight: active ? 600 : 500,
                  transition: 'all .12s ease',
                }}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Current selection display */}
      <div style={{
        marginTop: 6,
        fontSize: compact ? 10 : 11,
        color: currentInfo.color,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        <span>{currentInfo.icon}</span>
        <span>{currentInfo.label}</span>
      </div>
    </div>
  );
}

/**
 * PaymentBadge — Small inline badge showing the payment method.
 */
export function PaymentBadge({ method }) {
  const info = PAYMENT_METHODS[method] || { label: method, icon: '❓', color: 'var(--text-dim)' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 8px',
      borderRadius: 5,
      fontSize: 11,
      fontWeight: 600,
      color: info.color,
      background: `${info.color}15`,
      border: `1px solid ${info.color}30`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 12 }}>{info.icon}</span>
      {info.label}
    </span>
  );
}
