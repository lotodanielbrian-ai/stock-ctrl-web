import React from 'react';

/**
 * Skeleton loading placeholder components.
 * Mimics the shape of real content while data loads.
 */

const shimmerStyle = `
@keyframes skeleton-shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
`;

if (typeof document !== 'undefined') {
  const id = 'skeleton-shimmer-style';
  if (!document.getElementById(id)) {
    const el = document.createElement('style');
    el.id = id;
    el.textContent = shimmerStyle;
    document.head.appendChild(el);
  }
}

function SkeletonBase({ width = '100%', height = 14, borderRadius = 4, style = {} }) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, var(--panel-alt) 25%, var(--border-soft) 50%, var(--panel-alt) 75%)',
      backgroundSize: '200px 100%',
      animation: 'skeleton-shimmer 1.5s infinite ease-in-out',
      ...style,
    }} />
  );
}

export function SkeletonText({ width = '80%', lines = 1, gap = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          width={i === lines - 1 && lines > 1 ? '60%' : width}
          height={14}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 80 }) {
  return (
    <div style={{
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: 9,
      padding: 16,
      height,
    }}>
      <SkeletonBase width="40%" height={12} style={{ marginBottom: 10 }} />
      <SkeletonBase width="60%" height={22} />
    </div>
  );
}

export function SkeletonKpiRow({ count = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ flex: 1, minWidth: 160 }}>
          <SkeletonCard height={80} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTableRow({ columns = 6 }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '12px 14px',
      borderBottom: '1px solid var(--border-soft)',
    }}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBase
          key={i}
          width={i === 1 ? '30%' : `${10 + Math.random() * 10}%`}
          height={14}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 6 }) {
  return (
    <div style={{
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: 9,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        gap: 16,
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--panel-alt)',
      }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBase key={i} width={`${8 + Math.random() * 8}%`} height={10} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="sc-fadein" style={{ padding: '0' }}>
      <div style={{ marginBottom: 16 }}>
        <SkeletonBase width="30%" height={22} style={{ marginBottom: 6 }} />
        <SkeletonBase width="50%" height={13} />
      </div>
      <SkeletonKpiRow count={4} />
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}
