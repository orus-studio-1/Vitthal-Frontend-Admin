"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Wrench,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Building2,
  Package,
  FileText,
  ExternalLink,
  ShieldCheck,
  Send,
  UserCheck,
  Key,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import { extractApiError, serviceHubAPI } from "@/lib/api";
import type { ServiceTicket } from "@/lib/types";

export default function ServiceTicketDetailPage() {
  const params = useParams();
  const ticketId = String(params?.id || "");
  const router = useRouter();

  const [ticket, setTicket] = useState<ServiceTicket | null>(null);
  const [loading, setLoading] = useState(true);

  // Status transition state
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  async function loadTicket() {
    try {
      setLoading(true);
      const res = await serviceHubAPI.getTicketById(ticketId);
      if (res.data.success) {
        setTicket(res.data.ticket);
        setNewStatus(res.data.ticket.status);
      }
    } catch (err) {
      console.error("Failed to load ticket:", extractApiError(err, "Failed to load ticket"));
      toast.error("Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus || newStatus === ticket?.status) return;

    try {
      setUpdatingStatus(true);
      const res = await serviceHubAPI.updateTicketStatus(ticketId, newStatus, statusNote.trim() || undefined);
      if (res.data.success) {
        toast.success(res.data.message || "Status updated.");
        setStatusNote("");
        loadTicket();
      }
    } catch (err) {
      toast.error(extractApiError(err, "Failed to update status."));
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center gap-3 text-zinc-400">
          <RefreshCw className="h-8 w-8 animate-spin text-[#ccb27a]" />
          <p className="text-xs">Loading service ticket details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!ticket) {
    return (
      <DashboardLayout>
        <div className="mx-auto my-20 max-w-md rounded-2xl border border-zinc-800 bg-[#172222] p-8 text-center">
          <p className="text-sm font-semibold text-white">Ticket Not Found</p>
          <Link
            href="/dashboard/service-hub"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ccb27a] px-4 py-2 text-xs font-semibold text-[#172222]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Tickets
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Link & Header */}
        <div>
          <Link
            href="/dashboard/service-hub"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-[#ccb27a]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Service Hub Control Room
          </Link>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-white">
                  Ticket #{ticket.ticket_number}
                </h1>
                <span className="rounded-full bg-zinc-800 px-3 py-0.5 text-xs font-semibold text-[#ccb27a]">
                  {ticket.product_category?.label || "Service"}
                </span>
                {ticket.priority === "emergency_breakdown" && (
                  <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-0.5 text-xs font-bold text-rose-300 animate-pulse">
                    🚨 Emergency Breakdown
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Created on {new Date(ticket.created_at).toLocaleString()} by {ticket.client_user?.name}
              </p>
            </div>

            {/* OTP Badge */}
            {ticket.completion_otp && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300">
                <Key className="h-4 w-4" />
                Completion OTP: <span className="font-mono text-sm tracking-widest text-white">{ticket.completion_otp}</span>
                {ticket.otp_verified_at && (
                  <span className="ml-2 text-[11px] text-emerald-400 font-normal">
                    (Verified {new Date(ticket.otp_verified_at).toLocaleDateString()})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2 Cols: Details, Payload, Assets, Quotes */}
          <div className="space-y-6 lg:col-span-2">
            {/* Dynamic Ticket Payload */}
            <div className="rounded-2xl border border-zinc-800 bg-[#172222] p-6">
              <h2 className="font-heading text-base font-bold text-white">Service Request Specifications</h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Dynamic attributes submitted by client for {ticket.product_category?.label}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(ticket.ticket_payload || {}).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {key.replace(/_/g, " ")}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-zinc-200">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Client Asset */}
            {ticket.client_asset && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
                <div className="flex items-center gap-2.5">
                  <Package className="h-5 w-5 text-[#ccb27a]" />
                  <h2 className="font-heading text-base font-bold text-white">
                    Registered Asset: {ticket.client_asset.asset_name}
                  </h2>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                  <div className="rounded-xl bg-zinc-900/70 p-3">
                    <span className="text-[10px] text-zinc-500 uppercase">Make / Brand</span>
                    <p className="font-semibold text-zinc-200">{ticket.client_asset.brand || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/70 p-3">
                    <span className="text-[10px] text-zinc-500 uppercase">Model #</span>
                    <p className="font-semibold text-zinc-200">{ticket.client_asset.model_number || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/70 p-3">
                    <span className="text-[10px] text-zinc-500 uppercase">Serial #</span>
                    <p className="font-semibold text-zinc-200">{ticket.client_asset.serial_number || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/70 p-3">
                    <span className="text-[10px] text-zinc-500 uppercase">Year</span>
                    <p className="font-semibold text-zinc-200">{ticket.client_asset.installation_year || "—"}</p>
                  </div>
                </div>

                {ticket.client_asset.specs && Object.keys(ticket.client_asset.specs).length > 0 && (
                  <div className="mt-3 rounded-xl bg-zinc-900/50 p-3">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase">Technical Specs</span>
                    <pre className="mt-1 text-[11px] text-zinc-300 font-mono overflow-x-auto">
                      {JSON.stringify(ticket.client_asset.specs, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Vendor Quotations */}
            <div className="rounded-2xl border border-zinc-800 bg-[#172222] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-base font-bold text-white">
                    Vendor Quotations ({ticket.service_ticket_quotations?.length || 0})
                  </h2>
                  <p className="text-xs text-zinc-400">Competitive bids from certified vendors</p>
                </div>
              </div>

              {ticket.service_ticket_quotations && ticket.service_ticket_quotations.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {ticket.service_ticket_quotations.map((q) => (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 transition ${
                        q.status === "accepted"
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-zinc-800 bg-zinc-900/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-zinc-400" />
                          <span className="font-semibold text-white">{q.vendors?.company_name || "Vendor"}</span>
                          {q.status === "accepted" && (
                            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                              ✓ Accepted
                            </span>
                          )}
                        </div>
                        <span className="font-heading text-base font-bold text-white">
                          ₹{Number(q.total_price).toLocaleString("en-IN")}
                        </span>
                      </div>

                      {q.quote_breakdown && Object.keys(q.quote_breakdown).length > 0 && (
                        <div className="mt-2 text-xs text-zinc-400 border-t border-zinc-800/60 pt-2">
                          {q.quote_breakdown.notes && <p className="italic">"{q.quote_breakdown.notes}"</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-zinc-500">No vendor quotations submitted yet.</p>
              )}
            </div>

            {/* Document Attachments (CAD, Photos, Inspection reports) */}
            {ticket.service_ticket_documents && ticket.service_ticket_documents.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-[#172222] p-6">
                <h2 className="font-heading text-base font-bold text-white">
                  Attached Technical Documents & Media ({ticket.service_ticket_documents.length})
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ticket.service_ticket_documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="h-4 w-4 shrink-0 text-[#ccb27a]" />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-zinc-200 truncate">
                            {doc.doc_name || doc.doc_type}
                          </p>
                          <p className="text-[10px] text-zinc-500 uppercase">{doc.doc_type}</p>
                        </div>
                      </div>
                      <a
                        href={doc.doc_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-zinc-800 p-2 text-zinc-300 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Status Control & Timeline */}
          <div className="space-y-6">
            {/* Status Control Form */}
            <div className="rounded-2xl border border-zinc-800 bg-[#172222] p-6">
              <h2 className="font-heading text-base font-bold text-white">Status & Workflow</h2>
              <p className="mt-0.5 text-xs text-zinc-400">Update ticket state and log notes</p>

              <form onSubmit={handleStatusChange} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400">Ticket Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-[#ccb27a] focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="broadcasted">Broadcasted (Open RFQ)</option>
                    <option value="quote_pending">Quote Pending</option>
                    <option value="quoted">Quoted</option>
                    <option value="accepted">Accepted</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400">Action Note (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Reason or update details..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-xs text-white focus:border-[#ccb27a] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingStatus || newStatus === ticket.status}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ccb27a] py-2.5 text-xs font-semibold text-[#172222] shadow-xs hover:bg-[#dfc793] disabled:opacity-40"
                >
                  {updatingStatus ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Update Status
                </button>
              </form>
            </div>

            {/* Stakeholder Details */}
            <div className="rounded-2xl border border-zinc-800 bg-[#172222] p-6 space-y-4 text-xs">
              <h2 className="font-heading text-base font-bold text-white">Stakeholders</h2>

              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Client / Plant User</span>
                <p className="font-bold text-white mt-0.5">{ticket.client_user?.name}</p>
                <p className="text-zinc-400 text-[11px]">{ticket.client_user?.email}</p>
              </div>

              <div className="border-t border-zinc-800/80 pt-3">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Assigned Vendor</span>
                <p className="font-bold text-white mt-0.5">{ticket.vendors?.company_name || "Unassigned"}</p>
                {ticket.vendors?.phone && <p className="text-zinc-400 text-[11px]">{ticket.vendors.phone}</p>}
              </div>

              <div className="border-t border-zinc-800/80 pt-3">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Assigned Agent / Driver</span>
                <p className="font-bold text-white mt-0.5">{ticket.assigned_agent?.name || "Unassigned"}</p>
              </div>
            </div>

            {/* Audit Timeline */}
            <div className="rounded-2xl border border-zinc-800 bg-[#172222] p-6">
              <h2 className="font-heading text-base font-bold text-white">Activity Timeline</h2>
              <div className="mt-4 space-y-4 border-l border-zinc-800 pl-4">
                {ticket.timeline_logs && ticket.timeline_logs.length > 0 ? (
                  ticket.timeline_logs.map((log, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#ccb27a]" />
                      <p className="text-xs font-semibold text-white capitalize">{log.status}</p>
                      <p className="text-xs text-zinc-400">{log.note}</p>
                      <span className="text-[10px] text-zinc-500">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500">No activity logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
