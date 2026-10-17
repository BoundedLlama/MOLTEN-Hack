export type PosterFrame = {
  canvas: HTMLCanvasElement
  aspectRatio: number
  page: number
  pageCount: number
}

export type OnPosterReady = (frame: PosterFrame) => void

export type PageNavigation = {
  page: number
  pageCount: number
  loading: boolean
  error: string
  navigate: (delta: number) => void
}
