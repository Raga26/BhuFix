import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Search, Send, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { CloseButton } from '../CloseButton';

const ROLE_COLOR = {
  owner: '#E8734A',
  employee: '#4A6FA5',
  client: '#8BA3C7',
};

const SUB_ROLE_LABEL = {
  editor: 'Editor',
  videographer: 'Videographer',
  management: 'Management',
  digital_marketer: 'Digital Marketer',
  graphic_designer: 'Graphic Designer',
  content_writer: 'Content Writer',
};

function roleLabel(person) {
  if (person?.sub_role) return SUB_ROLE_LABEL[person.sub_role] || person.sub_role;
  if (person?.role === 'owner') return 'Owner';
  if (person?.role === 'client') return 'Client';
  return 'Team';
}

function initial(name) {
  return name?.[0]?.toUpperCase() || '?';
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatLastSeen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const t = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday - startThat) / 86400000);
  if (diffDays === 0) return `last seen today at ${t}`;
  if (diffDays === 1) return `last seen yesterday at ${t}`;
  return `last seen ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${t}`;
}

function Ticks({ status }) {
  if (!status) return null;
  const color = status === 'read' ? '#53bdeb' : 'rgba(255,255,255,0.45)';
  const Icon = status === 'sent' ? Check : CheckCheck;
  return <Icon size={13} strokeWidth={2.4} style={{ color }} aria-label={status} />;
}

function Avatar({ name, color, size = 'md', online, group }) {
  const box = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${box} rounded-md flex items-center justify-center font-semibold text-white`}
        style={{ background: color }}
      >
        {group ? <Users size={size === 'sm' ? 14 : 16} strokeWidth={1.75} /> : initial(name)}
      </div>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#25D366] border-2 border-[#162038]" />
      )}
    </div>
  );
}

function Message({ msg, isMe }) {
  const t = new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 text-white"
        style={{ background: ROLE_COLOR[msg.sender_role] || ROLE_COLOR.employee }}
      >
        {initial(msg.sender_name)}
      </div>
      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMe
            ? 'bg-[#E8734A]/20 border border-[#E8734A]/25 rounded-tr-sm'
            : 'bg-white/[0.07] border border-white/[0.08] rounded-tl-sm'
        } text-white`}>
          {msg.message}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/25 mt-1">
          {!isMe && <span>{msg.sender_name} · {t}</span>}
          {isMe && <span>{t}</span>}
          {isMe && <Ticks status={msg.receipt || 'sent'} />}
        </div>
      </div>
    </div>
  );
}

function NewGroupModal({ contacts, currentUser, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [picked, setPicked] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const people = useMemo(() => {
    const myId = currentUser?.id;
    const myEmail = (currentUser?.email || '').trim().toLowerCase();
    const myName = (currentUser?.name || '').trim().toLowerCase();
    return (contacts || []).filter((c) => {
      if (!c?.id || c.id === myId) return false;
      if (myEmail && (c.email || '').trim().toLowerCase() === myEmail) return false;
      if (myName && (c.name || '').trim().toLowerCase() === myName) return false;
      return true;
    });
  }, [contacts, currentUser]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return people;
    return people.filter((c) => c.name?.toLowerCase().includes(q));
  }, [people, filter]);

  const toggle = (id) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const create = async () => {
    if (!name.trim()) {
      toast.error('Give the group a name');
      return;
    }
    if (picked.size < 1) {
      toast.error('Add at least one member');
      return;
    }
    setSaving(true);
    try {
      const r = await apiClient.post('/chat/conversations', {
        type: 'group',
        name: name.trim(),
        member_ids: [...picked].filter((id) => id && id !== currentUser?.id),
      });
      onCreated(r.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not create group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="dash-modal p-6 w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-medium">New group</h2>
          <CloseButton onClick={onClose} />
        </div>
        <label className="dash-label">Group name</label>
        <input
          className="dash-input mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Editors"
          maxLength={80}
        />
        <label className="dash-label">Members</label>
        <input
          className="dash-input mb-3"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search people…"
        />
        <div className="flex-1 overflow-y-auto space-y-0.5 min-h-[160px] max-h-[280px] -mx-1 px-1">
          {visible.length === 0 ? (
            <div className="text-white/30 text-sm text-center py-8">No people to add.</div>
          ) : visible.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.04] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={picked.has(c.id)}
                onChange={() => toggle(c.id)}
                className="accent-[#E8734A]"
              />
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                style={{ background: ROLE_COLOR[c.role] || ROLE_COLOR.employee }}
              >
                {initial(c.name)}
              </div>
              <div className="min-w-0">
                <div className="text-white text-sm truncate">{c.name}</div>
                <div className="text-[11px] text-white/35">{roleLabel(c)}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-2.5 mt-5">
          <button type="button" onClick={onClose} className="dash-btn dash-btn-ghost flex-1">Cancel</button>
          <button
            type="button"
            onClick={create}
            disabled={saving}
            className="dash-btn dash-btn-primary flex-1"
          >
            {saving ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatView() {
  const { user } = useAuth();
  const [tab, setTab] = useState('chats');
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const bottomRef = useRef(null);
  const selectedIdRef = useRef(null);
  const typingPingRef = useRef({ at: 0, convId: null });
  selectedIdRef.current = selected?.id || null;

  const loadContacts = useCallback(() => {
    apiClient.get('/chat/contacts').then((r) => setContacts(r.data || [])).catch(() => {});
  }, []);

  const loadConversations = useCallback(() => {
    apiClient.get('/chat/conversations').then((r) => {
      const list = r.data || [];
      setConversations(list);
      setSelected((prev) => {
        if (!prev) return prev;
        return list.find((c) => c.id === prev.id) || prev;
      });
    }).catch(() => {});
  }, []);

  const loadMessages = useCallback(() => {
    const id = selectedIdRef.current;
    if (!id) {
      setMessages([]);
      return;
    }
    apiClient.get(`/chat/conversations/${id}/messages`).then((r) => {
      if (selectedIdRef.current === id) setMessages(r.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadContacts();
    loadConversations();
  }, [loadContacts, loadConversations]);

  useEffect(() => {
    loadMessages();
  }, [selected?.id, loadMessages]);

  useEffect(() => {
    const id = setInterval(() => {
      loadConversations();
      loadContacts();
      if (selectedIdRef.current) loadMessages();
    }, 2500);
    return () => clearInterval(id);
  }, [loadConversations, loadContacts, loadMessages]);

  useEffect(() => {
    const convId = selected?.id;
    return () => {
      if (convId) {
        apiClient.post(`/chat/conversations/${convId}/typing`, { typing: false }).catch(() => {});
      }
    };
  }, [selected?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = (conv) => {
    setSelected(conv);
    setTab('chats');
    setSearch('');
  };

  const openDm = async (contact) => {
    const existing = conversations.find((c) => {
      if (c.type !== 'dm') return false;
      if ((c.member_ids || []).includes(contact.id)) return true;
      return (c.members || []).some((m) =>
        m.id === contact.id
        || (contact.email && m.email && m.email.toLowerCase() === contact.email.toLowerCase())
      );
    });
    if (existing) {
      openConversation(existing);
      return;
    }
    try {
      const r = await apiClient.post('/chat/conversations', { type: 'dm', user_id: contact.id });
      const conv = r.data;
      setConversations((list) => {
        const withoutDupes = list.filter((c) => {
          if (c.id === conv.id) return false;
          if (c.type === 'dm' && conv.type === 'dm' && (c.member_ids || []).includes(contact.id)) return false;
          return true;
        });
        return [conv, ...withoutDupes];
      });
      openConversation(conv);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not open chat');
    }
  };

  const onGroupCreated = (conv) => {
    setConversations((list) => [conv, ...list.filter((c) => c.id !== conv.id)]);
    openConversation(conv);
  };

  const pingTyping = (on) => {
    const id = selectedIdRef.current;
    if (!id) return;
    apiClient.post(`/chat/conversations/${id}/typing`, { typing: on }).catch(() => {});
  };

  const onInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    const convId = selectedIdRef.current;
    if (!convId) return;
    if (!value.trim()) {
      pingTyping(false);
      typingPingRef.current = { at: 0, convId };
      return;
    }
    const now = Date.now();
    if (typingPingRef.current.convId !== convId || now - typingPingRef.current.at > 2000) {
      typingPingRef.current = { at: now, convId };
      pingTyping(true);
    }
  };

  const send = async () => {
    if (!input.trim() || sending || !selected) return;
    setSending(true);
    pingTyping(false);
    typingPingRef.current = { at: 0, convId: selected.id };
    try {
      const r = await apiClient.post(`/chat/conversations/${selected.id}/messages`, { message: input });
      setMessages((m) => [...m, r.data]);
      setInput('');
      setConversations((list) => {
        const updated = list.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                last_message: r.data.message,
                last_message_at: r.data.created_at,
                last_sender_id: user?.id,
                last_receipt: r.data.receipt || 'sent',
                typing: [],
              }
            : c
        );
        const current = updated.find((c) => c.id === selected.id);
        return current ? [current, ...updated.filter((c) => c.id !== selected.id)] : updated;
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const q = search.trim().toLowerCase();
  const filteredChats = q
    ? conversations.filter((c) => c.display_name?.toLowerCase().includes(q))
    : conversations;
  const filteredContacts = q
    ? contacts.filter((c) => c.name?.toLowerCase().includes(q))
    : contacts;

  const otherMembers = (selected?.members || []).filter((m) => m.id !== user?.id);
  const typing = selected?.typing || [];
  let headerSubtitle = '';
  if (typing.length === 1) {
    headerSubtitle = selected?.type === 'group'
      ? `${typing[0].name.split(' ')[0]} is typing…`
      : 'typing…';
  } else if (typing.length > 1) {
    headerSubtitle = 'typing…';
  } else if (selected?.type === 'group') {
    const names = [];
    const seen = new Set();
    for (const m of selected.members || []) {
      const nameKey = (m.name || '').trim().toLowerCase();
      const emailKey = (m.email || '').trim().toLowerCase();
      const key = m.id || emailKey || nameKey;
      if (!key || seen.has(m.id) || (emailKey && seen.has(emailKey)) || (nameKey && seen.has(`n:${nameKey}`))) continue;
      if (m.id) seen.add(m.id);
      if (emailKey) seen.add(emailKey);
      if (nameKey) seen.add(`n:${nameKey}`);
      names.push(m.name);
    }
    headerSubtitle = names.join(', ');
  } else {
    const other = otherMembers[0];
    if (other?.is_online) headerSubtitle = 'online';
    else headerSubtitle = formatLastSeen(other?.last_seen_at) || roleLabel(other);
  }
  const typingActive = typing.length > 0;

  const showThread = Boolean(selected);

  return (
    <div>
      <div className="mb-6">
        <h1 className="dash-title">Chat</h1>
        <p className="dash-sub">Message anyone, or start a group.</p>
      </div>

      <div className="dash-card flex overflow-hidden" style={{ height: 'min(calc(100vh - 220px), 680px)' }}>
        {/* Left pane */}
        <div className={`${showThread ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] flex-col border-r border-white/[0.06] flex-shrink-0`}>
          <div className="flex items-center gap-2 px-3 pt-3">
            {['chats', 'contacts'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 text-[12px] font-medium py-2 rounded-md capitalize transition-colors ${
                  tab === t ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {t === 'contacts' ? 'Contacts' : 'Chats'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setGroupOpen(true)}
              className="p-2 rounded-md text-white/45 hover:text-white hover:bg-white/[0.06]"
              aria-label="New group"
              title="New group"
            >
              <UserPlus size={16} strokeWidth={1.75} />
            </button>
          </div>

          <div className="px-3 py-2.5">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'contacts' ? 'Search contacts…' : 'Search chats…'}
                className="w-full bg-[#121C33] border border-white/[0.1] rounded-md pl-8 pr-3 py-2 text-white text-xs placeholder-white/20 outline-none focus:border-[#E8734A]/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'chats' && (
              filteredChats.length === 0 ? (
                <div className="text-white/25 text-xs text-center px-6 py-10">
                  No chats yet. Open Contacts to start a conversation.
                </div>
              ) : filteredChats.map((c) => {
                const isActive = selected?.id === c.id;
                const other = c.members?.find((m) => m.id !== user?.id);
                const avatarColor = c.type === 'group'
                  ? '#6B7C9A'
                  : ROLE_COLOR[other?.role] || ROLE_COLOR.employee;
                const previewTyping = (c.typing || []).length > 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openConversation(c)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <Avatar
                      name={c.display_name}
                      color={avatarColor}
                      group={c.type === 'group'}
                      online={c.type !== 'group' && other?.is_online}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-white text-sm font-medium truncate">{c.display_name}</div>
                        <div className="text-[10px] text-white/25 flex-shrink-0">{formatTime(c.last_message_at)}</div>
                      </div>
                      <div className={`text-[12px] truncate flex items-center gap-1 ${previewTyping ? 'text-[#25D366]' : 'text-white/35'}`}>
                        {!previewTyping && c.last_sender_id === user?.id && c.last_message && (
                          <Ticks status={c.last_receipt || 'sent'} />
                        )}
                        <span className="truncate">
                          {previewTyping
                            ? (c.type === 'group' ? `${c.typing[0].name.split(' ')[0]} typing…` : 'typing…')
                            : (c.last_message || (c.type === 'group' ? `${c.member_ids?.length || 0} members` : 'No messages yet'))}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}

            {tab === 'contacts' && (
              filteredContacts.length === 0 ? (
                <div className="text-white/25 text-xs text-center px-6 py-10">
                  No people found.
                </div>
              ) : filteredContacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openDm(c)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
                >
                  <Avatar
                    name={c.name}
                    color={ROLE_COLOR[c.role] || ROLE_COLOR.employee}
                    online={c.is_online}
                  />
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{c.name}</div>
                    <div className={`text-[12px] ${c.is_online ? 'text-[#25D366]' : 'text-white/35'}`}>
                      {c.is_online ? 'online' : (formatLastSeen(c.last_seen_at) || roleLabel(c))}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right pane */}
        <div className={`${showThread ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-white/25 text-sm px-6 text-center">
              Pick a contact or chat to start.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="md:hidden p-1.5 -ml-1 rounded-md text-white/50 hover:text-white"
                  aria-label="Back to chats"
                >
                  <ArrowLeft size={18} strokeWidth={1.75} />
                </button>
                  <Avatar
                    name={selected.display_name}
                    color={selected.type === 'group'
                      ? '#6B7C9A'
                      : ROLE_COLOR[otherMembers[0]?.role] || ROLE_COLOR.employee}
                    size="sm"
                    group={selected.type === 'group'}
                    online={selected.type !== 'group' && otherMembers[0]?.is_online}
                  />
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{selected.display_name}</div>
                    <div className={`text-[11px] truncate ${typingActive || headerSubtitle === 'online' ? 'text-[#25D366]' : 'text-white/35'}`}>
                      {headerSubtitle}
                    </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-white/20 text-sm pt-8">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map((m) => (
                    <Message key={m.id} msg={m} isMe={m.sender_id === user?.id} />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <div className="flex gap-2 p-3 border-t border-white/[0.06]">
                <input
                  value={input}
                  onChange={onInputChange}
                  onKeyDown={handleKey}
                  placeholder="Type a message…"
                  maxLength={2000}
                  className="flex-1 bg-[#121C33] border border-white/[0.1] rounded-md px-3.5 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors"
                />
                <button
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="dash-btn dash-btn-primary h-10 w-10 px-0"
                  aria-label="Send"
                >
                  <Send size={15} strokeWidth={1.75} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {groupOpen && (
        <NewGroupModal
          contacts={contacts}
          currentUser={user}
          onClose={() => setGroupOpen(false)}
          onCreated={onGroupCreated}
        />
      )}
    </div>
  );
}
