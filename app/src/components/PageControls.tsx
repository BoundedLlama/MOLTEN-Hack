import type { PageNavigation } from '../poster/types'

export default function PageControls({ navigation, label }: {
  navigation: PageNavigation
  label: string
}) {
  const { page, pageCount, loading, error, navigate } = navigation
  if (!pageCount) return null

  return <nav className="page-controls" aria-label={label}>
    <button type="button" onClick={() => navigate(-1)} disabled={page <= 1}>Previous</button>
    <span role="status" aria-live="polite" aria-atomic="true">
      {loading ? 'Rendering page' : 'Page'} {page} of {pageCount}{loading ? '…' : ''}
    </span>
    <button type="button" onClick={() => navigate(1)} disabled={page >= pageCount}>Next</button>
    {error && <button type="button" onClick={() => navigate(0)}>Retry page</button>}
  </nav>
}
