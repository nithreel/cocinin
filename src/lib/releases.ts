export interface LatestRelease {
  /** etiqueta tal cual, p. ej. «v1.2.0» */
  tag: string
  url: string
}

/** Compara «v1.10.0» con «1.9.2»: positivo si a es posterior a b. Ignora sufijos (-beta) y lo que no sea numérico. */
export function compareVersions(a: string, b: string) {
  const parts = (v: string) => v.replace(/^v/i, '').split('-')[0].split('.').map((n) => Number.parseInt(n, 10) || 0)
  const pa = parts(a)
  const pb = parts(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** Última release publicada en GitHub (la API pública, sin clave); null si no hay o falla. */
export async function fetchLatestRelease(repo: string): Promise<LatestRelease | null> {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { tag_name?: string; html_url?: string }
  return data.tag_name && data.html_url ? { tag: data.tag_name, url: data.html_url } : null
}
