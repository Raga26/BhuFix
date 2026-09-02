export function can(user, permission) {
  if (!user) return false;
  if (user.role === 'owner') return true;
  const keys = user.permissions || [];
  if (keys.includes('*')) return true;
  if (keys.includes(permission)) return true;
  if (permission === 'performance.read' && keys.includes('ads.read')) return true;
  if (permission === 'insights.read' && (keys.includes('ads.read') || keys.includes('strategy.read'))) return true;
  if (permission === 'insights.write' && user.role !== 'client') return true;
  if (permission === 'notifications.read' || permission === 'notifications.write') return true;
  if (permission === 'audit.read' && ['admin', 'operations_manager'].includes(user.role)) return true;
  return false;
}

export function isClient(user) {
  return user?.role === 'client';
}

export function isAgency(user) {
  return ['owner', 'admin', 'operations_manager', 'employee'].includes(user?.role);
}

export function jobLabel(user) {
  return user?.job_label || user?.job_title || user?.sub_role || user?.role || 'User';
}

export const JOB_OPTIONS = [
  { value: 'admin', role: 'admin', label: 'Admin', group: 'Leadership' },
  { value: 'operations_manager', role: 'operations_manager', label: 'Operations Manager', group: 'Leadership' },
  { value: 'digital_marketer', role: 'employee', label: 'Digital Marketer', group: 'Marketing' },
  { value: 'smm', role: 'employee', label: 'SMM', group: 'Marketing' },
  { value: 'seo', role: 'employee', label: 'SEO', group: 'Marketing' },
  { value: 'data_analyst', role: 'employee', label: 'Data Analyst', group: 'Marketing' },
  { value: 'senior_editor', role: 'employee', label: 'Senior Editor', group: 'Creative' },
  { value: 'junior_editor', role: 'employee', label: 'Junior Editor', group: 'Creative' },
  { value: 'content_writer', role: 'employee', label: 'Content Writer', group: 'Creative' },
  { value: 'designer', role: 'employee', label: 'Designer', group: 'Creative' },
  { value: 'cinematographer', role: 'employee', label: 'Cinematographer', group: 'Creative' },
  { value: 'web_developer', role: 'employee', label: 'Web Developer', group: 'Technology' },
  { value: 'operations_staff', role: 'employee', label: 'Operations', group: 'Operations' },
  { value: 'custom', role: 'employee', label: 'Custom role', group: 'Operations' },
  { value: 'client', role: 'client', label: 'Client', group: 'External' },
];

export const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'in_review', label: 'In review' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function isCreative(user) {
  return ['senior_editor', 'junior_editor', 'cinematographer', 'content_writer', 'designer'].includes(user?.job_role);
}

export function canReview(user) {
  if (!user || user.role === 'client') return false;
  return ['owner', 'admin', 'operations_manager', 'employee'].includes(user.role);
}

export const CLIP_CATEGORIES = [
  { value: 'educational', label: 'Educational' },
  { value: 'lead_gen', label: 'Lead gen' },
  { value: 'montage', label: 'Montage' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'reveal', label: 'Reveal' },
  { value: 'bts', label: 'Behind the scenes' },
  { value: 'collab', label: 'Collab' },
  { value: 'other', label: 'Other' },
];

export const ASSET_BUCKETS = [
  'brand', 'raw', 'reference', 'working', 'review',
  'approved', 'published', 'reports', 'invoices',
];

export function isLeadership(user) {
  return ['owner', 'admin', 'operations_manager'].includes(user?.role);
}
