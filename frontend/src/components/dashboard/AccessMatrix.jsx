const LEVELS = [
  { id: 'off', label: 'Off' },
  { id: 'view', label: 'View' },
  { id: 'edit', label: 'Edit' },
];

export function pageLabel(page, audience = 'staff') {
  if (audience === 'client' && page.client_label) return page.client_label;
  return page.label;
}

export function mergeAccess(defaults, overrides) {
  return { ...(defaults || {}), ...(overrides || {}) };
}

export function AccessMatrix({ pages, value, defaults, onChange, audience = 'staff' }) {
  const groups = [];
  (pages || []).forEach((page) => {
    const last = groups[groups.length - 1];
    if (!last || last.id !== page.group) groups.push({ id: page.group, pages: [page] });
    else last.pages.push(page);
  });

  const setLevel = (key, level) => onChange({ ...value, [key]: level });

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id}>
          <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">{group.id}</div>
          <div className="space-y-1">
            {group.pages.map((page) => {
              const current = value?.[page.key] || 'off';
              const roleDefault = defaults?.[page.key] || 'off';
              const custom = current !== roleDefault;
              const options = page.writeable ? LEVELS : LEVELS.filter((l) => l.id !== 'edit');
              return (
                <div
                  key={page.key}
                  className="flex items-center gap-3 min-h-11 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm truncate">{pageLabel(page, audience)}</div>
                    <div className="text-white/30 text-[10px]">
                      {custom ? `Custom · role default is ${roleDefault}` : `Role default · ${roleDefault}`}
                    </div>
                  </div>
                  <div className="flex rounded-lg border border-white/10 overflow-hidden flex-shrink-0">
                    {options.map((opt) => {
                      const on = current === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setLevel(page.key, opt.id)}
                          className={`px-2.5 min-h-8 text-[11px] font-medium ${
                            on
                              ? opt.id === 'off'
                                ? 'bg-white/10 text-white'
                                : opt.id === 'edit'
                                  ? 'bg-[#E8734A] text-white'
                                  : 'bg-[#4DD9FF]/20 text-[#4DD9FF]'
                              : 'text-white/40 hover:text-white/70'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
