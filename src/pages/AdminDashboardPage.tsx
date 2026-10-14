import { Eye, LogOut, Save, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  adminLogout,
  fetchAdminSession,
  fetchAdminStories,
  updateAdminStory,
  uploadAdminStoryPhoto,
} from '../lib/api'
import { Avatar } from '../components/Avatar'
import { ADMIN_SIGN_IN_PATH } from '../lib/adminRoutes'
import type { PrivateSuccessStory, PublicationStatus } from '../types/story'

const emptyDraft = (): Partial<PrivateSuccessStory> => ({})

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stories, setStories] = useState<PrivateSuccessStory[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<PrivateSuccessStory>>(emptyDraft())
  const [preview, setPreview] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const load = useCallback(async () => {
    const session = await fetchAdminSession()
    if (!session) {
      navigate({ to: ADMIN_SIGN_IN_PATH })
      return
    }
    const data = await fetchAdminStories()
    setStories(data)
    setLoading(false)
  }, [navigate])

  useEffect(() => {
    load().catch(() => navigate({ to: ADMIN_SIGN_IN_PATH }))
  }, [load, navigate])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return stories
    return stories.filter((s) =>
      [s.name, s.email, s.jobRole, s.achievementTitle, s.domain]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [stories, query])

  const selected = stories.find((s) => s.id === selectedId) ?? null

  function selectStory(s: PrivateSuccessStory) {
    setSelectedId(s.id)
    setDraft({ ...s })
    setPreview(false)
    setMessage(null)
  }

  function cancelEdit() {
    if (selected) setDraft({ ...selected })
    else {
      setSelectedId(null)
      setDraft(emptyDraft())
    }
    setPreview(false)
  }

  async function save(publish?: PublicationStatus) {
    if (!selectedId || !draft.id) return
    const payload = {
      ...draft,
      publicationStatus: publish ?? (draft.publicationStatus as PublicationStatus),
    }
    const updated = await updateAdminStory(selectedId, payload)
    setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    setDraft({ ...updated })
    setMessage('Changes saved.')
  }

  async function logout() {
    await adminLogout()
    navigate({ to: ADMIN_SIGN_IN_PATH })
  }

  if (loading) {
    return <p className="p-8 text-center text-white/60">Loading admin…</p>
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Story Administration</h1>
          <p className="text-sm text-white/60">{stories.length} records · local preview API</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-4 py-2 text-sm hover:border-white/30"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <input
            type="search"
            placeholder="Search records…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 text-sm"
          />
          <ul className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto rounded-xl border border-brand-border p-2">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => selectStory(s)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedId === s.id ? 'bg-brand-blue/20 text-white' : 'hover:bg-white/5'
                  }`}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-white/50">
                    {s.publicationStatus} · {s.sourceSheet} row {s.sourceRow}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-8">
          {!selected ? (
            <p className="rounded-xl border border-dashed border-brand-border p-12 text-center text-white/50">
              Select a learner record to edit.
            </p>
          ) : preview ? (
            <div className="rounded-2xl border border-brand-border bg-brand-surface/50 p-6">
              <h2 className="font-display text-xl font-bold">Preview (draft values)</h2>
              <p className="mt-4 text-sm text-white/60">Public URL when published:</p>
              <Link
                to={`/success-stories/${draft.slug}`}
                className="text-brand-blue hover:underline"
                target="_blank"
              >
                /success-stories/{draft.slug}
              </Link>
              <p className="mt-6 font-display text-2xl font-bold">{draft.name}</p>
              <p className="text-white/70">{draft.jobRole}</p>
              <p className="mt-4 font-semibold">{draft.achievementTitle}</p>
              <p className="mt-2 text-white/80">{draft.quantifiedResult}</p>
              <button
                type="button"
                className="mt-6 text-sm text-brand-blue"
                onClick={() => setPreview(false)}
              >
                ← Back to editor
              </button>
            </div>
          ) : (
            <form
              className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface/30 p-6"
              onSubmit={(e) => {
                e.preventDefault()
                save()
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" value={draft.name ?? ''} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
                <Field label="Job role" value={draft.jobRole ?? ''} onChange={(v) => setDraft((d) => ({ ...d, jobRole: v }))} />
                <Field label="Domain" value={draft.domain ?? ''} onChange={(v) => setDraft((d) => ({ ...d, domain: v }))} />
                <Field
                  label="Domain category"
                  value={draft.domainCategory ?? ''}
                  onChange={(v) => setDraft((d) => ({ ...d, domainCategory: v }))}
                />
                <Field
                  label="Email (private)"
                  type="email"
                  value={draft.email ?? ''}
                  onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
                />
              </div>
              <div className="rounded-xl border border-brand-border bg-brand-black/40 p-4">
                <p className="text-sm font-medium text-white/80">Learner photo</p>
                <div className="mt-3 flex flex-wrap items-start gap-4">
                  <Avatar
                    name={draft.name ?? 'Learner'}
                    photoUrl={draft.photoUrl}
                    photoVersion={draft.updatedAt}
                    className="h-24 w-24 shrink-0 rounded-xl text-2xl"
                  />
                  <div className="flex min-w-[200px] flex-1 flex-col gap-3">
                    <Field
                      label="Photo URL (optional)"
                      value={draft.photoUrl ?? ''}
                      onChange={(v) => setDraft((d) => ({ ...d, photoUrl: v || null }))}
                    />
                    <label className="block text-sm">
                      <span className="font-medium text-white/80">Upload image file</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="mt-1 block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file || !selectedId) return
                          setUploadingPhoto(true)
                          setMessage(null)
                          try {
                            const updated = await uploadAdminStoryPhoto(selectedId, file)
                            setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
                            setDraft({ ...updated })
                            setMessage('Photo uploaded.')
                          } catch (err) {
                            setMessage(err instanceof Error ? err.message : 'Photo upload failed')
                          } finally {
                            setUploadingPhoto(false)
                            e.target.value = ''
                          }
                        }}
                      />
                    </label>
                    {uploadingPhoto && <p className="text-xs text-white/50">Uploading…</p>}
                  </div>
                </div>
              </div>
              <Field
                label="Achievement title"
                value={draft.achievementTitle ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, achievementTitle: v }))}
              />
              <TextArea
                label="Quantified result"
                value={draft.quantifiedResult ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, quantifiedResult: v }))}
              />
              <TextArea
                label="Story summary (70–100 words)"
                value={draft.storySummary ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, storySummary: v }))}
              />
              <TextArea
                label="Testimonial quote"
                value={draft.testimonialQuote ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, testimonialQuote: v }))}
              />
              <Field
                label="YouTube URL"
                value={draft.youtubeVideoUrl ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, youtubeVideoUrl: v }))}
              />
              <Field
                label="LinkedIn URL"
                value={draft.linkedInUrl ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, linkedInUrl: v }))}
              />
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.featured)}
                    onChange={(e) => setDraft((d) => ({ ...d, featured: e.target.checked }))}
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  Display order
                  <input
                    type="number"
                    className="w-20 rounded border border-brand-border bg-brand-black px-2 py-1"
                    value={draft.displayOrder ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        displayOrder: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </label>
              </div>

              {message && <p className="text-sm text-green-400">{message}</p>}

              <div className="flex flex-wrap gap-3 border-t border-brand-border pt-4">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
                >
                  <Save className="h-4 w-4" /> Save
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-4 py-2 text-sm"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-4 py-2 text-sm"
                >
                  <Eye className="h-4 w-4" /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => save('published')}
                  className="rounded-lg border border-green-500/50 px-4 py-2 text-sm text-green-400"
                >
                  Publish
                </button>
                <button
                  type="button"
                  onClick={() => save('draft')}
                  className="rounded-lg border border-amber-500/50 px-4 py-2 text-sm text-amber-300"
                >
                  Unpublish
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-white/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-brand-border bg-brand-black px-3 py-2 text-sm"
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-white/80">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-brand-border bg-brand-black px-3 py-2 text-sm"
      />
    </label>
  )
}
