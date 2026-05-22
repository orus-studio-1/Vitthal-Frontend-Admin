"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, FileText, CheckCircle2, User, Building2, Eye, Send, ShieldCheck, Clock, XCircle } from "lucide-react";
import { clientQuotationAPI } from "@/lib/api";
import Link from "next/link";
import DashboardLayout from "../../../components/dashboard-layout";

export default function ClientQuotationsAdminPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Send Confirmation state
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      const res = await clientQuotationAPI.getAll();
      setQuotations(res.data?.data || []);
    } catch (error) {
      alert("Failed to load client quotations");
    } finally {
      setLoading(false);
    }
  };

  const handleSendConfirmation = async (id: string) => {
    if (!message.trim()) {
      alert("Please enter a confirmation message");
      return;
    }

    setSubmitting(true);
    try {
      await clientQuotationAPI.sendConfirmation(id, message);
      alert("Confirmation message sent to client!");
      setConfirmingId(null);
      setMessage("");
      loadQuotations(); // Refresh the list
    } catch (error: any) {
      alert(error?.response?.data?.message || "Failed to send confirmation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#ccb27a]" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Client Quotations</h1>
          <p className="mt-2 text-slate-500">
            Monitor accepted client quotations and send admin confirmations to finalize orders.
          </p>
        </div>

        {quotations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-24 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">No active quotations</h2>
            <p className="text-slate-500 mt-1">There are currently no quotations waiting for admin review.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {quotations.map((quote) => {
              const isPendingAdmin = quote.status === "client_accepted" && !quote.admin_confirmation_status;
              const isWaitingClientResponse = quote.admin_confirmation_status === "pending";
              const isConfirmed = quote.admin_confirmation_status === "confirmed";
              const isRejected = quote.admin_confirmation_status === "rejected";

              return (
                <div key={quote.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">

                    {/* Info Column */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-slate-900">{quote.product_name}</h3>
                          {isPendingAdmin && <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800"><AlertCircle size={12} /> Action Required</span>}
                          {isWaitingClientResponse && <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800"><Clock size={12} /> Awaiting Client Response</span>}
                          {isConfirmed && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"><CheckCircle2 size={12} /> Fully Confirmed</span>}
                          {isRejected && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800"><XCircle size={12} /> Client Rejected</span>}
                        </div>
                        <p className="text-sm text-slate-500">Quotation ID: {quote.id}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <User className="text-slate-400" size={18} />
                          <div>
                            <p className="text-xs font-medium text-slate-500">Client</p>
                            <p className="text-sm font-semibold text-slate-900">{quote.client_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <Building2 className="text-slate-400" size={18} />
                          <div>
                            <p className="text-xs font-medium text-slate-500">Vendor</p>
                            <p className="text-sm font-semibold text-slate-900">{quote.vendor_name}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 pt-2">
                        <div className="rounded-lg bg-emerald-50 px-4 py-2 border border-emerald-100">
                          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Agreed Terms</p>
                          <p className="mt-1 text-lg font-bold text-emerald-900">₹{quote.accepted_price} <span className="text-sm font-medium text-emerald-700">× {quote.accepted_quantity} units</span></p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-4 py-2 border border-slate-100">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Initial Request</p>
                          <p className="mt-1 text-lg font-bold text-slate-900">{quote.requested_quantity} <span className="text-sm font-medium text-slate-600">units</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Action Column */}
                    <div className="lg:w-80 shrink-0">
                      {isPendingAdmin ? (
                        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-5 shadow-sm">
                          <h4 className="text-sm font-bold text-orange-900 flex items-center gap-2 mb-3">
                            <ShieldCheck size={16} className="text-orange-600" />
                            Send Admin Confirmation
                          </h4>

                          {confirmingId === quote.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Message to client (e.g., 'We have reviewed the terms and approved the order...')"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 min-h-[100px] resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setConfirmingId(null)}
                                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSendConfirmation(quote.id)}
                                  disabled={submitting || !message.trim()}
                                  className="flex-1 rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                  Send
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmingId(quote.id)}
                              className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-700 transition-colors"
                            >
                              Review & Confirm
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className={`rounded-xl border p-5 ${isWaitingClientResponse
                            ? "border-blue-200 bg-blue-50/50"
                            : isConfirmed
                              ? "border-emerald-200 bg-emerald-50/50"
                              : "border-rose-200 bg-rose-50/50"
                          }`}>
                          <h4 className="text-sm font-bold text-slate-900 mb-2">Admin Status</h4>

                          {quote.admin_confirmation_message && (
                            <div className="mb-3 rounded-lg bg-white p-3 border border-slate-100 text-sm text-slate-700">
                              <span className="text-xs font-semibold text-slate-400 block mb-1">Your message to client:</span>
                              "{quote.admin_confirmation_message}"
                            </div>
                          )}

                          <p className="text-xs font-medium text-slate-500">
                            {isWaitingClientResponse
                              ? "Waiting for the client to accept your confirmation."
                              : isConfirmed
                                ? `Client confirmed on ${new Date(quote.admin_confirmed_at).toLocaleDateString()}`
                                : "Client rejected the confirmation."
                            }
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
