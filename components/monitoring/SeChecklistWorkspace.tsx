"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Plus } from "lucide-react";
import {
  api,
  ApiError,
  type EffectiveMonitoringChecklistItem,
  type MonitoringCategory,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { seCreateHref, seWorkspaceHref } from "@/lib/se-workspace-nav";
import {
  Button,
  ErrorState,
  LoadingState,
  TextInput,
} from "@/components/ui";

type CategoryRow = {
  category: MonitoringCategory;
  items: EffectiveMonitoringChecklistItem[];
  canCustomize: boolean;
  loading: boolean;
  error: string | null;
  loaded: boolean;
};

type Props = {
  profileId: string;
  profileName: string;
  teamName?: string;
  teamLeadName?: string | null;
  commandoName?: string | null;
  statusLabel?: string | null;
  activeIntervention?: boolean;
};

function itemKey(item: EffectiveMonitoringChecklistItem) {
  return item.seChecklistItemId ?? item.checklistItemId ?? item.id;
}

/**
 * SE Checklist workspace — left category nav, right items (SaaS split).
 */
export function SeChecklistWorkspace({
  profileId,
  profileName,
  teamName,
  teamLeadName,
  commandoName,
  statusLabel,
  activeIntervention = false,
}: Props) {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileShowItems, setMobileShowItems] = useState(false);

  const [adding, setAdding] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [menuItemId, setMenuItemId] = useState<string | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);

  const canMonitor = hasPermission("MONITORING_CREATE");

  const selected = useMemo(
    () => rows.find((r) => r.category.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const metaLine = useMemo(() => {
    const parts: string[] = [];
    if (teamName) parts.push(teamName);
    if (teamLeadName) parts.push(`Team Lead: ${teamLeadName}`);
    if (commandoName) parts.push(`Commando: ${commandoName}`);
    return parts.join(" · ");
  }, [teamName, teamLeadName, commandoName]);

  const setCategoryInUrl = useCallback(
    (categoryId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (categoryId) params.set("category", categoryId);
      else params.delete("category");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const loadCategory = useCallback(
    async (categoryId: string) => {
      if (!token) return;
      setRows((prev) =>
        prev.map((r) =>
          r.category.id === categoryId
            ? { ...r, loading: true, error: null }
            : r,
        ),
      );
      try {
        const res = await api.getEffectiveMonitoringChecklist(
          token,
          profileId,
          categoryId,
        );
        setRows((prev) =>
          prev.map((r) =>
            r.category.id === categoryId
              ? {
                  ...r,
                  items: res.data.items,
                  canCustomize: res.data.canCustomize,
                  loading: false,
                  loaded: true,
                  error: null,
                }
              : r,
          ),
        );
      } catch (err) {
        setRows((prev) =>
          prev.map((r) =>
            r.category.id === categoryId
              ? {
                  ...r,
                  loading: false,
                  error:
                    err instanceof Error
                      ? err.message
                      : "Couldn't load checklist",
                }
              : r,
          ),
        );
      }
    },
    [token, profileId],
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await api.getMonitoringCategories(token);
        if (cancelled) return;
        const cats = res.data.categories.filter((c) => c.isActive);
        const base: CategoryRow[] = cats.map((category) => ({
          category,
          items: [],
          canCustomize: false,
          loading: true,
          error: null,
          loaded: false,
        }));
        setRows(base);
        setError(null);

        const fromUrl = searchParams.get("category");
        const initialId =
          (fromUrl && cats.some((c) => c.id === fromUrl || c.code === fromUrl)
            ? cats.find((c) => c.id === fromUrl || c.code === fromUrl)?.id
            : null) ??
          cats[0]?.id ??
          null;
        setSelectedId(initialId);
        if (initialId && fromUrl !== initialId) {
          // normalize code → id in URL without fighting first paint
          const params = new URLSearchParams(searchParams.toString());
          params.set("category", initialId);
          const q = params.toString();
          router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
        }

        const results = await Promise.all(
          cats.map(async (cat) => {
            try {
              const checklist = await api.getEffectiveMonitoringChecklist(
                token,
                profileId,
                cat.id,
              );
              return {
                id: cat.id,
                items: checklist.data.items,
                canCustomize: checklist.data.canCustomize,
                error: null as string | null,
              };
            } catch (err) {
              return {
                id: cat.id,
                items: [] as EffectiveMonitoringChecklistItem[],
                canCustomize: false,
                error:
                  err instanceof Error
                    ? err.message
                    : "Couldn't load checklist",
              };
            }
          }),
        );
        if (cancelled) return;
        setRows((prev) =>
          prev.map((r) => {
            const hit = results.find((x) => x.id === r.category.id);
            if (!hit) return { ...r, loading: false };
            return {
              ...r,
              items: hit.items,
              canCustomize: hit.canCustomize,
              loading: false,
              loaded: !hit.error,
              error: hit.error,
            };
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't load categories",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // intentionally omit searchParams to avoid reload loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, profileId]);

  useEffect(() => {
    const fromUrl = searchParams.get("category");
    if (!fromUrl || rows.length === 0) return;
    const match = rows.find(
      (r) => r.category.id === fromUrl || r.category.code === fromUrl,
    );
    if (match && match.category.id !== selectedId) {
      setSelectedId(match.category.id);
      setMobileShowItems(true);
    }
  }, [searchParams, rows, selectedId]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t)) {
        setMenuItemId(null);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(t)) {
        setCategoryMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectCategory(categoryId: string) {
    setAdding(false);
    setAddLabel("");
    setMenuItemId(null);
    setCategoryMenuOpen(false);
    setSelectedId(categoryId);
    setCategoryInUrl(categoryId);
    setMobileShowItems(true);
    const row = rows.find((r) => r.category.id === categoryId);
    if (row && !row.loaded && !row.loading) {
      void loadCategory(categoryId);
    }
  }

  async function addItem() {
    if (!token || !selectedId || !addLabel.trim()) return;
    setAddBusy(true);
    try {
      await api.addSeMonitoringChecklistItem(token, profileId, {
        categoryId: selectedId,
        label: addLabel.trim(),
        scope: "SE",
      });
      setAddLabel("");
      setAdding(false);
      await loadCategory(selectedId);
      pushToast("Checklist item added", "success");
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not add item",
        "error",
      );
    } finally {
      setAddBusy(false);
    }
  }

  async function removeItem(item: EffectiveMonitoringChecklistItem) {
    if (!token || !selectedId) return;
    const key = itemKey(item);
    setBusyItemId(key);
    setMenuItemId(null);
    try {
      if (item.sourceType === "CUSTOM" && item.seChecklistItemId) {
        await api.removeSeMonitoringChecklistItem(
          token,
          profileId,
          item.seChecklistItemId,
        );
      } else if (item.sourceType === "TEMPLATE" && item.checklistItemId) {
        await api.removeMonitoringTemplateItemFromSe(token, profileId, {
          categoryId: selectedId,
          templateItemId: item.checklistItemId,
        });
      }
      await loadCategory(selectedId);
      pushToast("Removed from this SE's checklist", "success");
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not remove item",
        "error",
      );
    } finally {
      setBusyItemId(null);
    }
  }

  if (loading) return <LoadingState label="Loading checklist…" />;
  if (error) return <ErrorState message={error} />;

  const hasTemplateItems =
    selected?.items.some((i) => i.sourceType === "TEMPLATE") ?? false;

  return (
    <div className="ck-page">
      <header className="ck-header">
        <div className="ck-header-copy">
          <h1 className="ck-page-title">Checklist</h1>
          <p className="ck-profile-name">{profileName}</p>
          {metaLine ? <p className="ck-meta">{metaLine}</p> : null}
          {statusLabel ? (
            <p className="ck-status">
              <span
                className={`ck-status-dot${activeIntervention ? " is-active" : ""}`}
                aria-hidden
              />
              {statusLabel}
            </p>
          ) : null}
        </div>
        <div className="ck-header-actions">
          {canMonitor ? (
            <Link
              href={seCreateHref(profileId, "monitoring")}
              className="btn btn-primary btn-sm"
            >
              Start Monitoring
            </Link>
          ) : null}
          <Link
            href={seWorkspaceHref(profileId, "monitoring")}
            className="ck-link-secondary"
          >
            View sessions →
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="ck-empty-page">
          <p className="ck-empty-title">No checklist categories</p>
          <p className="ck-empty-desc">
            Super Admin can add templates under Configuration → Monitoring
            checklists.
          </p>
        </div>
      ) : (
        <div
          className={`ck-workspace${mobileShowItems ? " is-detail" : " is-list"}`}
        >
          <aside className="ck-sidebar" aria-label="Checklist categories">
            <div className="ck-sidebar-head">
              <p className="ck-sidebar-title">Checklist</p>
              <p className="ck-sidebar-sub">What to monitor</p>
            </div>
            <nav className="ck-nav">
              <ul className="ck-nav-list">
                {rows.map((row) => {
                  const active = row.category.id === selectedId;
                  const count = row.loaded ? row.items.length : null;
                  return (
                    <li key={row.category.id}>
                      <button
                        type="button"
                        className={`ck-nav-item${active ? " is-active" : ""}`}
                        onClick={() => selectCategory(row.category.id)}
                        aria-current={active ? "true" : undefined}
                      >
                        <span className="ck-nav-label">
                          {row.category.name}
                        </span>
                        <span className="ck-nav-count">
                          {count === null ? "…" : count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <p className="ck-sidebar-foot">
              Customized for {profileName}
            </p>
          </aside>

          <section className="ck-content" aria-live="polite">
            {!selected ? (
              <div className="ck-content-empty">
                <p>Select a category</p>
              </div>
            ) : (
              <>
                <div className="ck-content-head">
                  <button
                    type="button"
                    className="ck-back"
                    onClick={() => setMobileShowItems(false)}
                  >
                    <ArrowLeft size={14} strokeWidth={2} aria-hidden />
                    Checklist
                  </button>
                  <div className="ck-content-title-row">
                    <div className="min-w-0">
                      <h2 className="ck-content-title">
                        {selected.category.name}
                      </h2>
                      {selected.category.description ? (
                        <p className="ck-content-desc">
                          {selected.category.description}
                        </p>
                      ) : null}
                    </div>
                    {selected.canCustomize ? (
                      <div className="ck-menu" ref={categoryMenuRef}>
                        <button
                          type="button"
                          className="ck-icon-btn"
                          aria-label="Category actions"
                          aria-expanded={categoryMenuOpen}
                          onClick={() =>
                            setCategoryMenuOpen((v) => !v)
                          }
                        >
                          <MoreHorizontal size={16} strokeWidth={2} />
                        </button>
                        {categoryMenuOpen ? (
                          <div className="ck-menu-panel" role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              className="ck-menu-item"
                              onClick={() => {
                                setCategoryMenuOpen(false);
                                setAdding(true);
                              }}
                            >
                              Add item
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {hasTemplateItems ? (
                    <p className="ck-template-note">
                      Based on monitoring template · changes apply to this SE
                      only
                    </p>
                  ) : null}
                  {selected.loaded && !selected.loading ? (
                    <p className="ck-item-count">
                      {selected.items.length} item
                      {selected.items.length === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>

                <div className="ck-content-body">
                  {selected.loading ? (
                    <p className="ck-muted">Loading…</p>
                  ) : selected.error ? (
                    <div className="ck-error">
                      <p>{selected.error}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void loadCategory(selected.category.id)}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : selected.items.length === 0 ? (
                    <div className="ck-empty-items">
                      <p className="ck-empty-title">No checklist items yet.</p>
                      <p className="ck-empty-desc">
                        Add the behaviors you want to monitor.
                      </p>
                    </div>
                  ) : (
                    <ul className="ck-items">
                      {selected.items.map((item) => {
                        const key = itemKey(item);
                        const isCustom = item.sourceType === "CUSTOM";
                        return (
                          <li
                            key={key}
                            className={`ck-item${isCustom ? " is-custom" : " is-template"}`}
                          >
                            <span className="ck-item-bullet" aria-hidden />
                            <div className="ck-item-main">
                              <p className="ck-item-label">
                                {item.label}
                                <span
                                  className={
                                    isCustom
                                      ? "ck-item-badge is-custom"
                                      : "ck-item-badge is-template"
                                  }
                                >
                                  {isCustom ? "Custom" : "Template"}
                                </span>
                              </p>
                              {item.description ? (
                                <p className="ck-item-desc">
                                  {item.description}
                                </p>
                              ) : null}
                            </div>
                            {selected.canCustomize ? (
                              <div
                                className="ck-menu"
                                ref={menuItemId === key ? menuRef : undefined}
                              >
                                <button
                                  type="button"
                                  className="ck-icon-btn"
                                  aria-label={`Actions for ${item.label}`}
                                  disabled={busyItemId === key}
                                  onClick={() =>
                                    setMenuItemId((cur) =>
                                      cur === key ? null : key,
                                    )
                                  }
                                >
                                  {busyItemId === key ? (
                                    "…"
                                  ) : (
                                    <MoreHorizontal
                                      size={16}
                                      strokeWidth={2}
                                    />
                                  )}
                                </button>
                                {menuItemId === key ? (
                                  <div className="ck-menu-panel" role="menu">
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="ck-menu-item is-danger"
                                      onClick={() => void removeItem(item)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="ck-content-foot">
                  {selected.canCustomize ? (
                    adding ? (
                      <div className="ck-add-form">
                        <TextInput
                          label="New checklist item"
                          value={addLabel}
                          onChange={(e) => setAddLabel(e.target.value)}
                          placeholder="Describe what should be monitored…"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void addItem();
                            }
                            if (e.key === "Escape") {
                              setAdding(false);
                              setAddLabel("");
                            }
                          }}
                        />
                        <div className="ck-add-actions">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={addBusy}
                            onClick={() => {
                              setAdding(false);
                              setAddLabel("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={addBusy || !addLabel.trim()}
                            onClick={() => void addItem()}
                          >
                            {addBusy ? "Adding…" : "Add item"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="ck-add-link"
                        onClick={() => {
                          setAdding(true);
                          setAddLabel("");
                        }}
                      >
                        <Plus size={14} strokeWidth={2.25} aria-hidden />
                        Add checklist item
                      </button>
                    )
                  ) : (
                    <p className="ck-muted">
                      You can view this checklist but not edit it.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
