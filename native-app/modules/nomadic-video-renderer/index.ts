import { requireNativeModule } from 'expo'

export type NativeVideoOverlay = {
  text: string
  fontName: string
  textColor: string
  accentColor: string
  startAt: number
  endAt: number
  animation: string
  boxed: boolean
  uppercase: boolean
}

type RenderProgress = { progress: number; stage: string }

const NativeRenderer = requireNativeModule('NomadicVideoRenderer')

export function renderNomadicVideo(source: string, destination: string, overlays: NativeVideoOverlay[]) {
  return NativeRenderer.render(source, destination, overlays) as Promise<string>
}

export function listenForRenderProgress(listener: (event: RenderProgress) => void) {
  return NativeRenderer.addListener('onRenderProgress', listener)
}
