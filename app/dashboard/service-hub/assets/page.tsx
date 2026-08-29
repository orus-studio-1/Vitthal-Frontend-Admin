"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  RefreshCw,
  User,
  ArrowLeft,
  Calendar,
  Layers,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import { extractApiError, serviceHubAPI } from "@/lib/api";
import type { ClientAsset } from "@/lib/types";

export default function ClientAssetsAdminPage() {
  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadAssets();
  }, [page]);

  async function loadAssets() {
    try {
      setLoading(true);
      const res = await serviceHubAPI.getAllAssets({
        search: search.trim() || undefined,
        page,
        limit: 20,
      });
      if (res.data.success) {
        setAssets(res.data.assets);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalCount(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error("Failed to load assets:", extractApiError(err, "Failed to load assets"));
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAssets();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/service-hub"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-[#ccb27a]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Service Hub Control
          </Link>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-white">
                Client Assets Registry
              </h1>
              <p className="mt-1 text-xs text-zinc-400">
                Registered machinery, CNC units, tooling, and plant equipment across all manufacturing clients.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-zinc-800 bg-[#172222] p-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by asset name, brand, model, serial # or client name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:border-[#ccb27a] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#ccb27a] px-5 py-2 text-xs font-semibold text-[#172222] hover:bg-[#dfc793]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Assets Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#172222]">
          {loading ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 text-zinc-400">
              <RefreshCw className="h-6 w-6 animate-spin text-[#ccb27a]" />
              <p className="text-xs">Loading registered machinery & equipment...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">
              <Package className="mx-auto h-10 w-10 text-zinc-600" />
              <p className="mt-3 text-sm font-semibold text-zinc-300">No client assets registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-900/40 text-[11px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3.5">Asset Name & Tag</th>
                    <th className="px-5 py-3.5">Make & Model</th>
                    <th className="px-5 py-3.5">Client / Owner</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Installation</th>
                    <th className="px-5 py-3.5">Service Tickets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="transition hover:bg-zinc-800/30">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{asset.asset_name}</p>
                        {asset.asset_code && (
                          <span className="font-mono text-[10px] text-[#ccb27a]">Tag: {asset.asset_code}</span>
                        )}
                        {asset.serial_number && (
                          <p className="text-[10px] text-zinc-500">S/N: {asset.serial_number}</p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-zinc-200">{asset.brand || "—"}</p>
                        <p className="text-[10px] text-zinc-500">{asset.model_number || ""}</p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-zinc-400" />
                          <div>
                            <p className="font-medium text-zinc-200">{asset.users?.name || "Client"}</p>
                            <p className="text-[10px] text-zinc-500">{asset.users?.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                          {asset.product_category?.label || "General Equipment"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-zinc-300">
                        {asset.installation_year ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-zinc-500" /> {asset.installation_year}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                          {asset._count?.service_tickets || 0} Tickets
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && assets.length > 0 && (
            <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3 text-xs text-zinc-400">
              <span>
                Showing {assets.length} of {totalCount} assets
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
