import React from 'react';

const ReactionsOverlay = ({ reactions = [] }) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/80 border border-white/20 shadow-2xl backdrop-blur-md animate-floatUp"
          style={{
            left: `${45 + (r.id.charCodeAt(r.id.length - 1) % 15)}%`,
          }}
        >
          <span className="text-3xl">{r.emoji}</span>
          <span className="text-xs font-semibold text-white">{r.senderName}</span>
        </div>
      ))}
    </div>
  );
};

export default ReactionsOverlay;
