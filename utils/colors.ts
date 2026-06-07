export const CATEGORY_COLORS: Record<string, string> = {
  'Transport': '#3b82f6', // blue-500
  'Food': '#f97316', // orange-500
  'Entertainment': '#ec4899', // pink-500
  'Infrastructure': '#8b5cf6', // violet-500
  'Groceries': '#10b981', // emerald-500
  'General': '#64748b', // slate-500
  'Health': '#ef4444', // red-500
  'Utilities': '#eab308', // yellow-500
  'Equipment': '#14b8a6', // teal-500
  'Other': '#6366f1' // indigo-500
};

export const getColorForCategory = (category: string | undefined): string => {
  if (!category) return CATEGORY_COLORS['Other'];
  
  // Return matched color or fall back to hash-based generation for consistent random colors
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }

  // Simple string hash to color for unknown categories
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = '#' + (hash & 0x00FFFFFF).toString(16).toUpperCase().padStart(6, '0');
  
  // Add to map so it's consistent during the session
  CATEGORY_COLORS[category] = color;
  
  return color;
};
