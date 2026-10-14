import type { PrivateSuccessStory, PublicSuccessStory } from '../types/story'

const base = ''

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
  return res.json() as Promise<T>
}

export async function fetchStoriesDataVersion(): Promise<{ version: string | null; count: number }> {
  return parseJson(await fetch(`${base}/api/stories/version`))
}

export async function fetchPublishedStories(): Promise<PublicSuccessStory[]> {
  return parseJson(await fetch(`${base}/api/stories`))
}

export async function fetchPublishedStory(slug: string): Promise<PublicSuccessStory> {
  return parseJson(await fetch(`${base}/api/stories/${encodeURIComponent(slug)}`))
}

export async function adminLogin(email: string, password: string): Promise<void> {
  await parseJson(
    await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    }),
  )
}

export async function adminLogout(): Promise<void> {
  await parseJson(
    await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }),
  )
}

export async function fetchAdminSession(): Promise<{ email: string } | null> {
  const res = await fetch(`${base}/api/auth/me`, { credentials: 'include' })
  if (res.status === 401) return null
  return parseJson(res)
}

export async function fetchAdminStories(): Promise<PrivateSuccessStory[]> {
  return parseJson(
    await fetch(`${base}/api/admin/stories`, { credentials: 'include' }),
  )
}

export async function uploadAdminStoryPhoto(
  id: string,
  file: File,
): Promise<PrivateSuccessStory> {
  const form = new FormData()
  form.append('photo', file)
  const res = await fetch(`${base}/api/admin/stories/${encodeURIComponent(id)}/photo`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  return parseJson(res)
}

export async function updateAdminStory(
  id: string,
  story: Partial<PrivateSuccessStory>,
): Promise<PrivateSuccessStory> {
  return parseJson(
    await fetch(`${base}/api/admin/stories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(story),
    }),
  )
}
