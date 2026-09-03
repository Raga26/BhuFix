const LEGACY_JOB = {
  editor: 'junior_editor',
  videographer: 'cinematographer',
  graphic_designer: 'designer',
  management: 'operations_staff',
};

const CREATIVE_DESK = [
  'dashboard', 'clients', 'tasks', 'assets', 'calendar', 'chat',
  'strategy', 'approvals', 'notifications', 'clips',
];

const MARKETING_CORE = [
  'dashboard', 'clients', 'tasks', 'assets', 'calendar', 'chat',
  'strategy', 'approvals', 'notifications', 'post_reports',
];

export const EMPLOYEE_JOB_RESOURCES = {
  digital_marketer: [...MARKETING_CORE, 'ads', 'performance', 'kpis', 'insights', 'competitors'],
  smm: [...MARKETING_CORE],
  seo: [...MARKETING_CORE, 'seo', 'competitors', 'insights', 'web'],
  data_analyst: ['dashboard', 'clients', 'tasks', 'chat', 'notifications', 'ads', 'performance', 'kpis', 'insights', 'seo'],
  senior_editor: CREATIVE_DESK,
  junior_editor: CREATIVE_DESK,
  cinematographer: CREATIVE_DESK,
  content_writer: CREATIVE_DESK,
  designer: CREATIVE_DESK,
  web_developer: ['dashboard', 'clients', 'tasks', 'assets', 'chat', 'approvals', 'notifications', 'web', 'seo'],
  operations_staff: ['dashboard', 'clients', 'tasks', 'assets', 'calendar', 'chat', 'strategy', 'approvals', 'notifications'],
  custom: ['dashboard', 'clients', 'tasks', 'calendar', 'chat', 'notifications'],
};

export function normalizedJob(user) {
  const raw = user?.job_role || user?.sub_role || '';
  return LEGACY_JOB[raw] || raw || 'custom';
}

export function employeeAllows(user, resource) {
  if (!user || user.role !== 'employee') return true;
  const job = normalizedJob(user);
  let set = EMPLOYEE_JOB_RESOURCES[job];
  if (!set) {
    if (user.department === 'creative') set = CREATIVE_DESK;
    else if (user.department === 'marketing') set = MARKETING_CORE;
    else if (user.department === 'technology') set = EMPLOYEE_JOB_RESOURCES.web_developer;
    else set = EMPLOYEE_JOB_RESOURCES.custom;
  }
  return set.includes(resource);
}

export function can(user, permission) {
  if (!user) return false;
  if (user.role === 'owner') return true;
  const resource = String(permission || '').split('.')[0];
  if (user.role === 'employee' && resource && !employeeAllows(user, resource)) return false;
  const keys = user.permissions || [];
  if (keys.includes('*')) return true;
  if (keys.includes(permission)) return true;
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

const CREATIVE_JOBS = ['senior_editor', 'junior_editor', 'cinematographer', 'content_writer', 'designer'];
const MARKETING_JOBS = ['digital_marketer', 'smm', 'seo', 'data_analyst'];

export function isCreative(user) {
  const job = normalizedJob(user);
  if (job && EMPLOYEE_JOB_RESOURCES[job] && !CREATIVE_JOBS.includes(job)) return false;
  if (user?.department === 'creative') return true;
  return CREATIVE_JOBS.includes(job);
}

export function isTech(user) {
  const job = normalizedJob(user);
  if (job === 'web_developer') return true;
  if (job && EMPLOYEE_JOB_RESOURCES[job]) return false;
  return user?.department === 'technology';
}

export function isMarketing(user) {
  const job = normalizedJob(user);
  if (MARKETING_JOBS.includes(job)) return true;
  if (job && EMPLOYEE_JOB_RESOURCES[job]) return false;
  return user?.department === 'marketing';
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

export function canSeePublish(user) {
  if (!user || user.role === 'client') return false;
  if (isLeadership(user)) return true;
  return ['smm', 'digital_marketer', 'operations_staff'].includes(normalizedJob(user));
}

export function deskKind(user) {
  if (!user) return 'guest';
  if (user.role === 'client') return 'client';
  if (isLeadership(user)) return 'leadership';
  if (isCreative(user)) return 'creative';
  if (isTech(user)) return 'tech';
  const job = normalizedJob(user);
  if (job === 'digital_marketer') return 'ads';
  if (job === 'smm') return 'smm';
  if (job === 'seo') return 'seo';
  if (job === 'data_analyst') return 'analyst';
  if (job === 'operations_staff') return 'ops';
  return 'staff';
}
