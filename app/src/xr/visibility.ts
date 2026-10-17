// An immersive session has its own visibility; its owning page may be hidden.
export function shouldSuspendPage(hidden: boolean, immersive: boolean, entering: boolean): boolean {
  return hidden && !immersive && !entering
}
