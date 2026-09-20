export const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const GRADIENTS = [
  'from-indigo-600 to-cyan-500',
  'from-purple-600 to-pink-500',
  'from-brand-600 to-blue-500',
  'from-emerald-600 to-teal-500',
  'from-rose-600 to-amber-500',
  'from-cyan-600 to-indigo-500',
  'from-fuchsia-600 to-rose-500',
];

export const getAvatarGradient = (name) => {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
};
