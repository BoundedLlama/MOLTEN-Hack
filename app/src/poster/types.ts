export type PosterFrame = {
  canvas: HTMLCanvasElement
  aspectRatio: number
  page: number
  pageCount: number
}

export type OnPosterReady = (frame: PosterFrame) => void
