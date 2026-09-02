export function can(user, permission) {
  if (!user) return false;
  const keys = user.permissions || [];
  if (keys.includes('*')) return true;
  return keys.includes(permission);
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

export const ASSET_BUCKETS = [
  'brand', 'raw', 'reference', 'working', 'review',
  'approved', 'published', 'reports', 'invoices',
];
