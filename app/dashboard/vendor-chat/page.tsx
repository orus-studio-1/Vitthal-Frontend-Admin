'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import DashboardLayout from '../../../components/dashboard-layout';
import { adminAPI, extractApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { AdminVendorChatConversation, AdminVendorChatSummary } from '../../../lib/types';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function VendorChatPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [vendors, setVendors] = useState<AdminVendorChatSummary[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversation, setConversation] = useState<AdminVendorChatConversation | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  async function fetchConversation(vendorId: string, showLoader = true) {
    try {
      if (showLoader) {
        setConversationLoading(true);
      }
      setSelectedVendorId(vendorId);
      const response = await adminAPI.getVendorChatConversation(vendorId);
      setConversation(response.data.data);
    } catch (conversationError) {
      setError(extractApiError(conversationError, 'Failed to load conversation'));
    } finally {
      if (showLoader) {
        setConversationLoading(false);
      }
    }
  }

  async function fetchVendorList(preferredVendorId?: string | null, showLoader = true) {
    try {
      if (showLoader) {
        setVendorsLoading(true);
      }
      setError('');
      const response = await adminAPI.getVendorChats();
      const list = response.data.data;
      setVendors(list);

      const nextVendorId = preferredVendorId || selectedVendorId || list[0]?.vendorId || null;
      if (nextVendorId) {
        await fetchConversation(nextVendorId, showLoader);
      }
    } catch (chatError) {
      setError(extractApiError(chatError, 'Failed to load vendor chat list'));
    } finally {
      if (showLoader) {
        setVendorsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isAuthenticated) return;

    void fetchVendorList(null, true);
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = window.setInterval(() => {
      void fetchVendorList(selectedVendorId, false);
    }, 12000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, selectedVendorId]);

  const submitMessage = async () => {
    if (!selectedVendorId || !messageBody.trim() || sending) return;

    try {
      setSending(true);
      await adminAPI.sendVendorChatMessage(selectedVendorId, messageBody.trim());
      setMessageBody('');
      await Promise.all([
        fetchConversation(selectedVendorId, false),
        fetchVendorList(selectedVendorId, false),
      ]);
    } catch (sendError) {
      setError(extractApiError(sendError, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  const currentVendor = useMemo(
    () => vendors.find((item) => item.vendorId === selectedVendorId) || null,
    [vendors, selectedVendorId]
  );

  if (authLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>;
  }

  return (
    <DashboardLayout>
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] h-auto xl:h-[calc(100vh-140px)] xl:min-h-[500px]">
        {/* Vendor List Panel */}
        <section className="flex flex-col h-[450px] xl:h-full rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm min-h-0">
          <div className="mb-5 flex flex-shrink-0 items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Vendor chat</h1>
              <p className="text-sm text-slate-500">Choose a vendor and chat with them directly.</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><MessageSquare className="h-5 w-5" /></div>
          </div>

          {error ? <div className="mb-4 flex-shrink-0 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3">
            {vendorsLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
            ) : vendors.length ? (
              <div className="space-y-3">
                {vendors.map((item) => {
                  const isActive = item.vendorId === selectedVendorId;
                  return (
                    <button
                      key={item.vendorId}
                      onClick={() => void fetchConversation(item.vendorId)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${isActive ? 'border-[#1f4c45] bg-[#eef6f4]' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.vendor.companyName}</p>
                          <p className="text-sm text-slate-500">{item.vendor.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.vendor.email}</p>
                        </div>
                        {item.unreadCount > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">{item.unreadCount}</span>
                        ) : null}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-slate-600">{item.lastMessage?.body || 'No messages yet.'}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No vendors found for chat.</p>
            )}
          </div>
        </section>

        {/* Chat Conversation Panel */}
        <section className="flex flex-col h-[600px] xl:h-full rounded-[1.75rem] border border-slate-200 bg-white shadow-sm min-h-0">
          <div className="flex-shrink-0 border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">{currentVendor?.vendor.companyName || 'Select a vendor'}</h2>
            <p className="text-sm text-slate-500">
              {currentVendor ? `${currentVendor.vendor.name} • ${currentVendor.vendor.email}` : 'Open a vendor to see the one-to-one conversation.'}
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-6 py-5 min-h-0">
            {conversationLoading ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-700" /></div>
            ) : conversation?.messages.length ? (
              <>
                {conversation.messages.map((message) => {
                  const isAdminMessage = message.senderUserId === user?.id;
                  return (
                    <div key={message.id} className={`flex ${isAdminMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${isAdminMessage ? 'bg-[#1f4c45] text-white' : 'bg-white text-slate-800'}`}>
                        <p className="text-sm">{message.body}</p>
                        <p className={`mt-2 text-[11px] ${isAdminMessage ? 'text-white/75' : 'text-slate-400'}`}>{formatDate(message.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {selectedVendorId ? 'No messages in this conversation yet.' : 'Select a vendor from the list to start chatting.'}
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex-shrink-0 border-t border-slate-200 px-6 py-4">
            <div className="flex gap-3">
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedVendorId ? 'Type a message for the vendor...' : 'Select a vendor to start messaging'}
                disabled={!selectedVendorId || sending}
                className="min-h-[54px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#1f4c45]"
              />
              <button
                type="submit"
                disabled={!selectedVendorId || sending || !messageBody.trim()}
                className="flex items-center gap-2 rounded-2xl bg-[#1f4c45] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#173a35] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending' : 'Send'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
