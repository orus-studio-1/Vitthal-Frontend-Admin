"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  User,
  Building2,
  Package,
  Layers,
  Eye,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import { extractApiError, serviceHubAPI } from "@/lib/api";
import type { ServiceHubStats, ServiceTicket } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "broadcasted", label: "Broadcasted (Open RFQ)" },
  { value: "quote_pending", label: "Quote Pending" },
  { value: "quoted", label: "Quoted" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "emergency_breakdown", label: "🚨 Emergency Breakdown" },
  { value: "high", label: "High Priority" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function ServiceHubTicketsPage() {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [stats, setStats] = useState<ServiceHubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [selectedStatus, selectedPriority, page]);

  async function loadStats() {
    try {
      const res = await serviceHubAPI.getStats();
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to load stats:", extractApiError(err, "Failed to load stats"));
    }
  }

  async function loadTickets() {
    try {
      setLoading(true);
      const res = await serviceHubAPI.getAllTickets({
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        priority: selectedPriority !== "all" ? selectedPriority : undefined,
        search: search.trim() || undefined,
        page,
        limit: 20,
      });

      if (res.data.success) {
        setTickets(res.data.tickets);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalCount(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error("Failed to load tickets:", extractApiError(err, "Failed to load tickets"));
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTickets();
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "emergency_breakdown":
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30 animate-pulse">🚨 Breakdown</span>;
      case "high":
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">High</span>;
      case "medium":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-300 border border-blue-500/30">Medium</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2.5 py-0.5 text-xs font-semibold text-slate-300 border border-slate-500/30">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30"><CheckCircle2 className="h-3 w-3" /> Completed</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-bold text-cyan-400 border border-cyan-500/30"><Clock className="h-3 w-3" /> In Progress</span>;
      case "accepted":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/30">Accepted</span>;
      case "quoted":
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/30">Quoted</span>;
      case "broadcasted":
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">Broadcasted</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/30">Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/15 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 border border-zinc-500/30">{status}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-white">
              Service Hub Control Room
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Oversight of Machinery Maintenance, Industrial Job Work, and Logistics transport bookings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/service-categories"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
            >
              <Layers className="h-3.5 w-3.5" /> Categories & Form Builder
            </Link>
            <Link
              href="/dashboard/service-hub/assets"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
            >
              <Package className="h-3.5 w-3.5" /> Client Assets Registry
            </Link>
          </div>
        </div>

        {/* Stats Strip */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-zinc-800 bg-[#1b2525]/80 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Tickets</span>
              <p className="mt-1 font-heading text-2xl font-bold text-white">{stats.totalTickets}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Open Tickets</span>
              <p className="mt-1 font-heading text-2xl font-bold text-amber-300">{stats.openTickets}</p>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">Breakdowns</span>
              <p className="mt-1 font-heading text-2xl font-bold text-rose-400">{stats.emergencyTickets}</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">Broadcasted</span>
              <p className="mt-1 font-heading text-2xl font-bold text-cyan-300">{stats.broadcastedTickets}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Completed</span>
              <p className="mt-1 font-heading text-2xl font-bold text-emerald-300">{stats.completedTickets}</p>
            </div>
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">Client Assets</span>
              <p className="mt-1 font-heading text-2xl font-bold text-blue-300">{stats.totalAssets}</p>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="rounded-2xl border border-zinc-800 bg-[#172222] p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search ticket # or client name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:border-[#ccb27a] focus:outline-none"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-300 focus:border-[#ccb27a] focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-300 focus:border-[#ccb27a] focus:outline-none"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ccb27a] px-5 py-2 text-xs font-semibold text-[#172222] shadow-xs hover:bg-[#dfc793]"
            >
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
          </form>
        </div>

        {/* Tickets Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#172222]">
          {loading ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 text-zinc-400">
              <RefreshCw className="h-6 w-6 animate-spin text-[#ccb27a]" />
              <p className="text-xs">Loading service tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">
              <Wrench className="mx-auto h-10 w-10 text-zinc-600" />
              <p className="mt-3 text-sm font-semibold text-zinc-300">No service tickets found</p>
              <p className="mt-1 text-xs text-zinc-500">Tickets raised by clients will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-900/40 text-[11px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3.5">Ticket #</th>
                    <th className="px-5 py-3.5">Category & Asset</th>
                    <th className="px-5 py-3.5">Client</th>
                    <th className="px-5 py-3.5">Assigned Vendor</th>
                    <th className="px-5 py-3.5">Priority</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="transition hover:bg-zinc-800/30">
                      <td className="px-5 py-4 font-mono font-bold text-white">
                        <Link
                          href={`/dashboard/service-hub/${ticket.id}`}
                          className="hover:text-[#ccb27a] transition"
                        >
                          {ticket.ticket_number}
                        </Link>
                        <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-zinc-200">
                          {ticket.product_category?.label || "General Service"}
                        </span>
                        {ticket.client_asset && (
                          <p className="mt-0.5 text-[11px] text-amber-300/80 flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {ticket.client_asset.asset_name}
                          </p>
                        )}
                        {ticket.subcategories && !ticket.client_asset && (
                          <p className="mt-0.5 text-[11px] text-zinc-500">{ticket.subcategories.name}</p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-zinc-400" />
                          <div>
                            <p className="font-medium text-zinc-200">{ticket.client_user?.name || "Client"}</p>
                            <p className="text-[10px] text-zinc-500">{ticket.client_user?.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {ticket.vendors ? (
                          <div className="flex items-center gap-1.5 text-zinc-300">
                            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="truncate max-w-[140px]">{ticket.vendors.company_name}</span>
                          </div>
                        ) : (
                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-400 font-medium">
                            Open RFQ ({ticket._count?.service_ticket_quotations || 0} Quotes)
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">{getPriorityBadge(ticket.priority)}</td>
                      <td className="px-5 py-4">{getStatusBadge(ticket.status)}</td>

                      <td className="px-5 py-4 font-semibold text-zinc-200">
                        {ticket.total_amount ? `₹${Number(ticket.total_amount).toLocaleString("en-IN")}` : "—"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/service-hub/${ticket.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#ccb27a] hover:text-[#ccb27a]"
                        >
                          <Eye className="h-3.5 w-3.5" /> Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && tickets.length > 0 && (
            <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3 text-xs text-zinc-400">
              <span>
                Showing {tickets.length} of {totalCount} tickets
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 py-1 font-semibold text-white">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
