// MessagesPage.jsx — Protected page at /messages.
//
// Two-panel layout:
//   Left:  conversation list — all bookings (as owner + as sitter), sorted newest-first.
//   Right: message thread for the selected booking.
//
// Polling: useMessages polls GET /api/messages/:bookingId every 5 seconds.
// New messages automatically scroll the thread to the bottom.
//
// otherParty derivation:
//   ownerBookings  → other party is the sitter   (booking.sitterProfile.user)
//   sitterBookings → other party is the owner    (booking.owner)

import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useBookings } from '../hooks/useBookings';
import { useDbUser }   from '../hooks/useDbUser';
import { useMessages } from '../hooks/useMessages';

const STATUS_STYLES = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100  text-green-700',
  CANCELLED: 'bg-gray-100   text-gray-500',
  COMPLETED: 'bg-blue-100   text-blue-700',
};

// Format a timestamp as time (today) or date (older)
function formatTime(dateStr) {
  const d   = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Coloured initials circle or avatar image
function Avatar({ user, size = 'md' }) {
  const sz = size === 'sm'
    ? 'w-8 h-8 text-sm'
    : 'w-10 h-10 text-base';

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.firstName}
        className={`${sz} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div className={`${sz} rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center shrink-0`}>
      {user?.firstName?.[0] ?? '?'}
    </div>
  );
}

// A single row in the conversation list
function ConversationItem({ convo, isActive, onClick }) {
  const other       = convo.otherParty;
  const statusStyle = STATUS_STYLES[convo.status] ?? 'bg-gray-100 text-gray-500';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex gap-3 items-start border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50 ${
        isActive ? 'bg-teal-50 border-l-2 border-l-teal-500' : ''
      }`}
    >
      <Avatar user={other} size="md" />

      <div className="min-w-0 flex-1">
        {/* Name + status badge */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {other ? `${other.firstName} ${other.lastName}` : 'Unknown'}
          </p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${statusStyle}`}>
            {convo.status}
          </span>
        </div>

        {/* Pet + service */}
        <p className="text-xs text-gray-500 truncate mt-0.5">
          🐾 {convo.pet?.name} · {convo.service}
        </p>

        {/* Role label */}
        <p className="text-[11px] text-gray-400 mt-0.5">
          {convo.role === 'owner' ? 'You booked' : 'Incoming request'}
        </p>
      </div>
    </button>
  );
}

// A single message bubble — sender on left (gray), self on right (teal)
function MessageBubble({ message, isMine }) {
  return (
    <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar user={message.sender} size="sm" />

      <div className={`max-w-[68%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isMine
              ? 'bg-teal-600 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-800 rounded-tl-sm'
          }`}
        >
          {message.text}
        </div>
        <p className="text-[11px] text-gray-400 px-1">
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

// Right-side thread panel
function ThreadPanel({ convo, messages, loading, dbUser, input, setInput, sending, sendError, onSend, bottomRef }) {
  const other = convo.otherParty;

  return (
    <div className="flex-1 flex flex-col min-w-0">

      {/* Thread header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white shrink-0">
        <Avatar user={other} size="md" />
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">
            {other ? `${other.firstName} ${other.lastName}` : 'Unknown'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            🐾 {convo.pet?.name} · {convo.service}
          </p>
        </div>
        <Link
          to="/bookings"
          className="ml-auto text-xs text-teal-600 hover:text-teal-700 font-medium shrink-0"
        >
          View booking →
        </Link>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
        {loading && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-16 text-gray-400">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Send a message to get the conversation started.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.sender.id === dbUser?.id}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-200 p-3 shrink-0 bg-white">
        {sendError && (
          <p className="text-xs text-red-500 mb-2">{sendError}</p>
        )}
        <form onSubmit={onSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </div>

    </div>
  );
}

export default function MessagesPage() {
  const { ownerBookings, sitterBookings, loading: bookingsLoading } = useBookings();
  const { dbUser, loading: userLoading } = useDbUser();

  const [selectedId, setSelectedId] = useState(null);
  const [input,      setInput]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [sendError,  setSendError]  = useState(null);

  const { messages, loading: messagesLoading, sendMessage } = useMessages(selectedId);
  const bottomRef = useRef(null);

  // Combine and sort all bookings into a single conversation list
  const conversations = useMemo(() => {
    const ownerConvos = ownerBookings.map((b) => ({
      ...b,
      role:       'owner',
      otherParty: b.sitterProfile?.user ?? null,
    }));
    const sitterConvos = sitterBookings.map((b) => ({
      ...b,
      role:       'sitter',
      otherParty: b.owner ?? null,
    }));

    const all = [...ownerConvos, ...sitterConvos];
    // Newest booking first
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return all;
  }, [ownerBookings, sitterBookings]);

  // Auto-select first conversation once bookings load
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  // Scroll to bottom whenever new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConvo = conversations.find((c) => c.id === selectedId) ?? null;

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSendError(null);
    setSending(true);
    try {
      await sendMessage(input.trim());
      setInput('');
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (bookingsLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Empty state — no bookings at all
  if (conversations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">
        <p className="text-5xl mb-4">💬</p>
        <p className="text-lg font-medium text-gray-500">No conversations yet</p>
        <p className="text-sm mt-1 mb-6">
          Once you book a sitter, you can message them here.
        </p>
        <Link
          to="/search"
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Find a Sitter
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>

      <h1 className="text-2xl font-bold text-gray-800 mb-4 shrink-0">Messages</h1>

      {/* Two-panel container */}
      <div className="flex flex-1 border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white min-h-0">

        {/* ── Left: conversation list ── */}
        <div className="w-72 border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Conversations
            </p>
          </div>
          <div className="overflow-y-auto flex-1">
            {conversations.map((convo) => (
              <ConversationItem
                key={convo.id}
                convo={convo}
                isActive={convo.id === selectedId}
                onClick={() => {
                  setSelectedId(convo.id);
                  setInput('');
                  setSendError(null);
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Right: thread ── */}
        {selectedConvo ? (
          <ThreadPanel
            convo={selectedConvo}
            messages={messages}
            loading={messagesLoading}
            dbUser={dbUser}
            input={input}
            setInput={setInput}
            sending={sending}
            sendError={sendError}
            onSend={handleSend}
            bottomRef={bottomRef}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p className="text-sm">Select a conversation</p>
          </div>
        )}

      </div>
    </div>
  );
}
