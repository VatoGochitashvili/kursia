"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Card, Input } from "@/components/ui/primitives";
import { Icon, categoryIcon } from "@/components/ui/Icon";
import type { Locale } from "@/lib/enums";

export interface CategoryNodeView {
  id: string;
  slug: string;
  nameKa: string;
  nameEn: string;
  icon: string | null;
  colorHex: string | null;
  isActive: boolean;
  courseCount: number;
  children: CategoryNodeView[];
}

/**
 * Category CRUD.
 *
 * Deletion is refused server-side while courses still reference a category —
 * the UI surfaces that as a message rather than pretending it worked.
 */
export function CategoryManager({
  categories,
  locale,
  labels,
}: {
  categories: CategoryNodeView[];
  locale: Locale;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [creatingUnder, setCreatingUnder] = useState<string | "root" | null>(null);

  async function create(parentId: string | null, form: FormData) {
    setPending("create");
    setError(null);
    try {
      await api.post("/api/admin/categories", {
        nameKa: String(form.get("nameKa") ?? ""),
        nameEn: String(form.get("nameEn") ?? ""),
        icon: String(form.get("icon") ?? "") || undefined,
        colorHex: String(form.get("colorHex") ?? "") || undefined,
        ...(parentId ? { parentId } : {}),
      });
      setCreatingUnder(null);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(null);
    }
  }

  async function update(id: string, form: FormData) {
    setPending(id);
    setError(null);
    try {
      await api.patch(`/api/admin/categories?id=${encodeURIComponent(id)}`, {
        nameKa: String(form.get("nameKa") ?? ""),
        nameEn: String(form.get("nameEn") ?? ""),
        icon: String(form.get("icon") ?? ""),
        colorHex: String(form.get("colorHex") ?? ""),
      });
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(null);
    }
  }

  async function remove(id: string) {
    if (!confirm(labels.confirmDelete)) return;
    setPending(id);
    setError(null);
    try {
      await api.delete(`/api/admin/categories?id=${encodeURIComponent(id)}`);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      setPending(null);
    }
  }

  const renderForm = (
    onSubmit: (form: FormData) => void,
    initial?: CategoryNodeView,
    onCancel?: () => void,
  ) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
      className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem_6rem_auto]"
    >
      <Input name="nameKa" placeholder={labels.nameKa} defaultValue={initial?.nameKa} required />
      <Input
        name="nameEn"
        placeholder={labels.nameEn}
        defaultValue={initial?.nameEn}
        required
        dir="ltr"
      />
      <Input name="icon" placeholder={labels.icon} defaultValue={initial?.icon ?? ""} dir="ltr" />
      <Input
        name="colorHex"
        type="color"
        defaultValue={initial?.colorHex ?? "#3559f0"}
        className="h-11 p-1"
      />
      <div className="flex gap-1.5">
        <Button type="submit" size="sm" loading={pending === (initial?.id ?? "create")}>
          {labels.save}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {labels.cancel}
          </Button>
        )}
      </div>
    </form>
  );

  return (
    <div className="max-w-4xl space-y-4">
      {error != null && <Alert tone="danger">{errorMessage(error)}</Alert>}

      <ul className="space-y-3">
        {categories.map((category) => (
          <li key={category.id}>
            <Card className="p-4">
              {editing === category.id ? (
                renderForm((form) => update(category.id, form), category, () => setEditing(null))
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${category.colorHex ?? "#3559f0"}18`,
                      color: category.colorHex ?? "#3559f0",
                    }}
                  >
                    <Icon name={categoryIcon(category.icon)} size={17} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink">
                      {locale === "en" ? category.nameEn : category.nameKa}
                    </p>
                    <p className="font-mono text-[11px] text-ink-subtle">
                      /category/{category.slug} · {category.courseCount} {labels.courses}
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCreatingUnder(category.id)}
                    >
                      <Icon name="plus" size={14} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(category.id)}>
                      <Icon name="edit" size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={pending === category.id}
                      onClick={() => remove(category.id)}
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </div>
                </div>
              )}

              {(category.children.length > 0 || creatingUnder === category.id) && (
                <ul className="mt-3 space-y-2 border-s border-line ps-4">
                  {category.children.map((child) => (
                    <li key={child.id}>
                      {editing === child.id ? (
                        renderForm((form) => update(child.id, form), child, () => setEditing(null))
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-ink">
                              {locale === "en" ? child.nameEn : child.nameKa}
                            </p>
                            <p className="font-mono text-[11px] text-ink-subtle">
                              /category/{child.slug} · {child.courseCount} {labels.courses}
                            </p>
                          </div>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => setEditing(child.id)}>
                              <Icon name="edit" size={13} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={pending === child.id}
                              onClick={() => remove(child.id)}
                            >
                              <Icon name="trash" size={13} />
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}

                  {creatingUnder === category.id && (
                    <li>
                      {renderForm(
                        (form) => create(category.id, form),
                        undefined,
                        () => setCreatingUnder(null),
                      )}
                    </li>
                  )}
                </ul>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <Card className="p-4">
        {creatingUnder === "root" ? (
          renderForm((form) => create(null, form), undefined, () => setCreatingUnder(null))
        ) : (
          <Button variant="outline" onClick={() => setCreatingUnder("root")}>
            <Icon name="plus" size={15} />
            {labels.add}
          </Button>
        )}
      </Card>

      <p className="text-[12px] text-ink-subtle">{labels.inUse}</p>
    </div>
  );
}
