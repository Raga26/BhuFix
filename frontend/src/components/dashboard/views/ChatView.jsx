import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';

const ROLE_COLOR = {
  owner: 'linear-gradient(135deg,#E8734A,#D4633D)',
  employee: 'linear-gradient(135deg,#A78BFA,#F472B6)',
  client: 'linear-gradient(135deg,#4DD9FF,#34D399)',
};

function Message({ msg, isMe }) {
  const t = new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
        style={{ background: ROLE_COLOR[msg.sender_role] || ROLE_COLOR.employee }}>
        {msg.sender_name?.[0]?.toUpperCase()}
      </div>
      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMe
            ? 'bg-[#E8734A]/20 border border-[#E8734A]/25 rounded-tr-sm'
            : 'bg-white/[0.07] border border-white/[0.08] rounded-tl-sm'
        } text-white`}>
          {msg.message}
        </div>
        <div className="text-[10px] text-white/25 mt-1">{msg.sender_name} · {t}</div>
      </div>
    </div>
  );
}

// Used for both team chat (staff) and client chat thread
export default function ChatView({ clientThread = false }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const isClient = user?.role === 'client';

  const loadMessages = useCallback(() => {
    if (isClient) {
      apiClient.get('/chat', { params: { thread: 'client' } }).then((r) => setMessages(r.data || []));
    } else if (clientThread && selectedClient) {
      apiClient.get('/chat', { params: { thread: 'client', client_id: selectedClient } }).then((r) => setMessages(r.data || []));
    } else if (!clientThread) {
      apiClient.get('/chat', { params: { thread: 'team' } }).then((r) => setMessages(r.data || []));
    }
  }, [isClient, clientThread, selectedClient]);

  useEffect(() => {
    if (!isClient && clientThread) {
      apiClient.get('/clients').then((r) => {
        const cl = r.data || [];
        setClients(cl);
        if (cl.length > 0) setSelectedClient(cl[0].id);
      });
    } else {
      loadMessages();
    }
  }, [isClient, clientThread, loadMessages]);

  useEffect(() => {
    if (!clientThread || selectedClient) loadMessages();
  }, [selectedClient, clientThread, loadMessages]);

  // Poll for new messages every 5s
  useEffect(() => {
    const id = setInterval(loadMessages, 5000);
    return () => clearInterval(id);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const payload = isClient
        ? { thread: 'client', message: input }
        : clientThread
          ? { thread: 'client', client_id: selectedClient, message: input }
          : { thread: 'team', message: input };
      const r = await apiClient.post('/chat', payload);
      setMessages((m) => [...m, r.data]);
      setInput('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const clientName = (id) => clients.find((c) => c.id === id)?.name || id;

  const title = isClient ? 'Chat with BhuFix' : clientThread ? 'Client Messages' : 'Team Chat';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-white font-extrabold text-2xl">{isClient ? 'Messages' : clientThread ? 'Client Messages' : 'Team Chat'}</h1>
        <p className="text-white/40 text-sm mt-1">{isClient ? 'Chat directly with your BhuFix team' : clientThread ? 'Direct message threads with each client' : 'Internal BhuFix team communication'}</p>
      </div>

      <div className={`grid gap-6 ${!isClient && !clientThread ? 'md:grid-cols-[1fr_280px]' : ''}`}>
        {/* Main chat area */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl flex flex-col" style={{ height: 'min(70vh, 520px)' }}>
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <div className="text-white font-semibold text-sm">{title}</div>
            {!isClient && clientThread && clients.length > 0 && (
              <select
                value={selectedClient || ''}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="bg-white/[0.06] border border-white/[0.08] text-white text-xs rounded-lg px-2 py-1.5 outline-none"
              >
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          {/* Messages */}
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

          {/* Input */}
          <div className="flex gap-2 p-3 border-t border-white/[0.06]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/40 transition-colors"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8734A] to-[#D4633D] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(232,115,74,0.35)] hover:scale-110 disabled:opacity-40 transition-all"
            >
              ➤
            </button>
          </div>
        </div>

        {/* Team member list (staff team chat only) */}
        {!isClient && !clientThread && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
            <div className="text-white font-semibold text-sm mb-3">👤 Team</div>
            <div className="text-white/30 text-xs text-center py-6">
              Team presence will show here as members come online.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
