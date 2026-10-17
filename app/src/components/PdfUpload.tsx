import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { OnPosterReady } from '../poster/types'

GlobalWorkerOptions.workerSrc = workerUrl
const MAX_BYTES = 20 * 1024 * 1024
const MAX_CANVAS_EDGE = 2048

type Selection = { name: string; size: number; pages?: number }

export default function PdfUpload({ onPosterReady, onPosterClear }: {
  onPosterReady?: OnPosterReady
  onPosterClear?: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const generation = useRef(0)
  const loadingTask = useRef<PDFDocumentLoadingTask | null>(null)
  const document = useRef<PDFDocumentProxy | null>(null)
  const renderGeneration = useRef(0)
  const requestedPage = useRef(1)
  const renderTask = useRef<RenderTask | null>(null)
  const preview = useRef<HTMLDivElement>(null)
  const dragDepth = useRef(0)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [ready, setReady] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [displayedPage, setDisplayedPage] = useState<number | null>(null)

  function dispose() {
    generation.current++
    renderGeneration.current++
    document.current = null
    renderTask.current?.cancel()
    renderTask.current = null
    if (loadingTask.current) void loadingTask.current.destroy().catch(() => {})
    loadingTask.current = null
    preview.current?.replaceChildren()
  }

  useEffect(() => () => dispose(), [])

  function clear() {
    dispose()
    onPosterClear?.()
    setSelection(null)
    setLoading(false)
    setError('')
    setReady(false)
    requestedPage.current = 1
    setPageNumber(1)
    setDisplayedPage(null)
    if (input.current) input.current.value = ''
  }

  async function renderPage(pdf: PDFDocumentProxy, pageNumber: number, fileName: string) {
    const attempt = ++renderGeneration.current
    const fileGeneration = generation.current
    renderTask.current?.cancel()
    renderTask.current = null
    requestedPage.current = pageNumber
    setPageNumber(pageNumber)
    setLoading(true)
    setError('')
    const isCurrent = () => attempt === renderGeneration.current && fileGeneration === generation.current
    try {
      const page = await pdf.getPage(pageNumber)
      if (!isCurrent()) return
      const natural = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({
        scale: MAX_CANVAS_EDGE / Math.max(natural.width, natural.height),
      })
      // Each request owns its canvas; cancellation cannot mutate a published frame.
      const canvas = window.document.createElement('canvas')
      canvas.width = Math.max(1, Math.floor(viewport.width))
      canvas.height = Math.max(1, Math.floor(viewport.height))
      canvas.style.aspectRatio = `${natural.width} / ${natural.height}`
      canvas.setAttribute('role', 'img')
      canvas.setAttribute('aria-label', `Page ${pageNumber} of ${pdf.numPages}: ${fileName}`)
      const job = page.render({ canvas, viewport })
      renderTask.current = job
      await job.promise
      if (!isCurrent()) return
      renderTask.current = null
      preview.current?.replaceChildren(canvas)
      setDisplayedPage(pageNumber)
      setReady(true)
      onPosterReady?.({ canvas, aspectRatio: natural.width / natural.height, page: pageNumber, pageCount: pdf.numPages })
    } catch {
      if (!isCurrent()) return
      renderTask.current = null
      setError(`We couldn’t render page ${pageNumber}. Try again or choose another page.`)
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }

  function navigate(delta: number) {
    const pdf = document.current
    if (!pdf || !selection) return
    const next = Math.max(1, Math.min(pdf.numPages, requestedPage.current + delta))
    void renderPage(pdf, next, selection.name)
  }

  async function select(files: File[]) {
    if (!files.length) return
    clear()
    if (files.length !== 1) {
      setError('Please choose one PDF at a time.')
      return
    }
    const file = files[0]
    if (!/\.pdf$/i.test(file.name)) {
      setError('This file type isn’t supported. Choose a PDF (.pdf).')
      return
    }
    if (!file.size) {
      setError('This PDF is empty. Choose a file with content.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('This file is too large. Choose a PDF of 20 MB or less.')
      return
    }
    const attempt = generation.current
    setSelection({ name: file.name, size: file.size })
    setLoading(true)
    let reading = true
    try {
      const data = await file.arrayBuffer()
      if (attempt !== generation.current) return
      reading = false
      const task = getDocument({ data })
      loadingTask.current = task
      const pdf = await task.promise
      if (attempt !== generation.current) return
      document.current = pdf
      setSelection({ name: file.name, size: file.size, pages: pdf.numPages })
      // Loading the document and rendering pages have separate generations.
      // Navigation cancels a render without destroying the reusable PDF document.
      void renderPage(pdf, 1, file.name)
    } catch (cause) {
      if (attempt !== generation.current) return
      const name = cause instanceof Error ? cause.name : ''
      setError(reading
        ? 'We couldn’t read this file. Try selecting it again.'
        : name === 'PasswordException'
          ? 'This PDF is password-protected. Save an unlocked copy and try again.'
          : 'We couldn’t open this PDF. It may be damaged or not a valid PDF. Try exporting it again.')
      setSelection(null)
      setReady(false)
      dispose()
      setLoading(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="upload-title">
      <div className="panel-heading">
        <div><h2 id="upload-title">Upload your presentation</h2><p>Choose the PDF you’d like to practice with.</p></div>
        <span className="step">STEP 01</span>
      </div>
      <div className={`dropzone${dragging ? ' drag' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); dragDepth.current++; setDragging(true) }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
        onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) }}
        onDrop={(event) => {
          event.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          void select(Array.from(event.dataTransfer.files))
        }}>
        <div className="doc-icon" aria-hidden="true">
          <svg width="35" height="42" viewBox="0 0 35 42" fill="none"><path d="M6 1h16l12 12v25a3 3 0 0 1-3 3H6a5 5 0 0 1-5-5V6a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.6"/><path d="M22 1v12h12M9 24h17M9 30h12" stroke="currentColor" strokeWidth="1.6"/></svg><span>PDF</span>
        </div>
        <h3>Drop your PDF here</h3>
        <p>or choose a file from your computer</p>
        <button className="primary" type="button" onClick={() => input.current?.click()}>
          <span aria-hidden="true">＋</span> {selection ? 'Change PDF' : 'Choose PDF'}
        </button>
        <input ref={input} type="file" accept=".pdf,application/pdf" aria-label="Choose PDF" hidden
          onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void select(files) }} />
        <small>PDF only <span>·</span> Up to 20 MB <span>·</span> One file at a time</small>
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      {selection && <div className="selected">
        <div className="file-badge" aria-hidden="true">PDF</div>
        <div className="file-info"><strong>{selection.name}</strong><span>{(selection.size / 1024 / 1024).toFixed(2)} MB{selection.pages !== undefined && ` · ${selection.pages} ${selection.pages === 1 ? 'page' : 'pages'}`}</span></div>
        <button className="remove" type="button" aria-label="Remove selected PDF" onClick={clear}>×</button>
      </div>}
      <div className={`upload-status${loading ? ' loading' : ''}`} role="status" aria-live="polite">
        {loading ? selection?.pages ? `Rendering page ${pageNumber}…` : 'Opening your PDF…' : ready ? `✓ Page ${displayedPage} is shown below.` : ''}
      </div>
      {selection?.pages !== undefined && <nav className="page-controls" aria-label="PDF pages">
        <button type="button" onClick={() => navigate(-1)} disabled={pageNumber <= 1}>Previous</button>
        <span aria-live="polite" aria-atomic="true">Page {pageNumber} of {selection.pages}</span>
        <button type="button" onClick={() => navigate(1)} disabled={pageNumber >= selection.pages}>Next</button>
        {error && <button type="button" onClick={() => navigate(0)}>Retry page</button>}
      </nav>}
      <div className="pdf-preview" hidden={!ready} aria-busy={loading}>
        <div className="preview-heading"><h3>PDF preview</h3><span>Showing page {displayedPage} of {selection?.pages}</span></div>
        <div className="preview-canvas" ref={preview} />
      </div>
      <div className="privacy"><span aria-hidden="true">♧</span><span>Your file stays in this browser. Nothing is uploaded to a server.</span></div>
    </section>
  )
}
