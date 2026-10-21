"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Organization } from "@/lib/api";
import {
  Building,
  Plus,
  CheckCircle2,
  Users,
  Shield,
  ArrowRight,
  Loader2,
  Calendar,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export default function OrganizationsPage() {
  const { organizations, currentOrg, selectOrganization, createOrganization, deleteOrganization } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsSubmitting(true);
    try {
      const org = await createOrganization(newOrgName.trim());
      toastSuccess(`Created organization '${org.name}'`);
      setNewOrgName("");
      setIsCreating(false);
    } catch (err: any) {
      toastError(err?.message || "Failed to create organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!orgToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOrganization(orgToDelete.id);
      toastSuccess(`Organization '${orgToDelete.name}' has been permanently deleted`);
      setOrgToDelete(null);
    } catch (err: any) {
      toastError(err?.message || "Failed to delete organization");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-8 animate-slideUp">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Platform
            </span>
            <span className="text-content-muted">/</span>
            <span className="text-xs text-content-muted">Tenancy & Orgs</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            Client Organizations
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Manage multi-tenant client boundaries, subscription plans, and workspace switches.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Organization</span>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4 max-w-lg animate-slideUp">
          <h3 className="text-sm font-bold text-content-primary">Create New Organization</h3>
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Organization Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Legal Partners"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create Organization"}
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-content-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {organizations.map((org) => {
          const isSelected = currentOrg?.id === org.id;
          return (
            <div
              key={org.id}
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? "border-indigo-600/50 bg-surface shadow-md ring-1 ring-indigo-500/20"
                  : "border-surface-border bg-surface hover:border-surface-borderHover shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-surface-raised flex items-center justify-center font-bold text-sm text-indigo-600 dark:text-indigo-400 border border-surface-border">
                      {org.name[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-content-primary leading-snug">{org.name}</h3>
                      <span className="text-[11px] font-mono text-content-muted">/{org.slug}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      Active
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-3 border-t border-surface-border text-xs mb-4">
                  <div className="flex items-center justify-between text-content-muted">
                    <span>Plan:</span>
                    <span className="capitalize font-semibold text-content-primary">{org.plan}</span>
                  </div>
                  <div className="flex items-center justify-between text-content-muted">
                    <span>Status:</span>
                    <span className="capitalize font-semibold text-emerald-600 dark:text-emerald-400">{org.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-content-muted">
                    <span>Created:</span>
                    <span className="text-[11px] text-content-secondary">
                      {new Date(org.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                {isSelected ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 py-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Current Workspace</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      selectOrganization(org.id);
                      toastSuccess(`Switched active organization to ${org.name}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-subtle text-xs font-medium text-content-primary transition-colors border border-surface-border"
                  >
                    <span>Switch workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOrgToDelete(org)}
                  title={`Delete organization ${org.name}`}
                  className="p-1.5 rounded-xl text-content-muted hover:text-rose-600 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-content-primary">Delete Organization</h3>
                <p className="text-xs text-content-muted">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-content-secondary leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-content-primary font-semibold">{orgToDelete.name}</strong>?
              All associated AI assistants, conversation histories, and settings will be permanently removed.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrgToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-content-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{isDeleting ? "Deleting..." : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

