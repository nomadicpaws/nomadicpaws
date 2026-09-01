import ExpoModulesCore
import AVFoundation
import UIKit

struct NomadicVideoOverlay: Record {
  @Field var text: String = ""
  @Field var fontName: String = ""
  @Field var textColor: String = "#ffffff"
  @Field var accentColor: String = "#111111"
  @Field var startAt: Double = 0
  @Field var endAt: Double = 5
  @Field var animation: String = "Fade"
  @Field var boxed: Bool = false
  @Field var uppercase: Bool = false
}

public final class NomadicVideoRendererModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NomadicVideoRenderer")
    Events("onRenderProgress")

    AsyncFunction("render") { (source: String, destination: String, overlays: [NomadicVideoOverlay], promise: Promise) in
      self.render(source: source, destination: destination, overlays: overlays, promise: promise)
    }
  }

  private func render(source: String, destination: String, overlays: [NomadicVideoOverlay], promise: Promise) {
    let sourceURL = localURL(source)
    let destinationURL = localURL(destination)
    let asset = AVURLAsset(url: sourceURL)
    guard let sourceVideo = asset.tracks(withMediaType: .video).first else {
      promise.reject("VIDEO_TRACK_MISSING", "This clip does not contain a readable video track.")
      return
    }

    let composition = AVMutableComposition()
    guard let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
      promise.reject("VIDEO_COMPOSITION_FAILED", "The iPhone could not prepare this video.")
      return
    }
    do {
      try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: sourceVideo, at: .zero)
      if let sourceAudio = asset.tracks(withMediaType: .audio).first,
         let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
        try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: sourceAudio, at: .zero)
      }
    } catch {
      promise.reject("VIDEO_READ_FAILED", "The selected video could not be prepared: \(error.localizedDescription)")
      return
    }

    let outputSize = CGSize(width: 1080, height: 1920)
    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = outputSize
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(start: .zero, duration: composition.duration)
    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
    layerInstruction.setTransform(aspectFillTransform(track: sourceVideo, outputSize: outputSize), at: .zero)
    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]

    let parent = CALayer()
    parent.frame = CGRect(origin: .zero, size: outputSize)
    parent.isGeometryFlipped = true
    let videoLayer = CALayer()
    videoLayer.frame = parent.frame
    parent.addSublayer(videoLayer)
    overlays.forEach { addOverlay($0, to: parent, duration: composition.duration.seconds, outputSize: outputSize) }
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parent)

    try? FileManager.default.removeItem(at: destinationURL)
    guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPreset1920x1080) else {
      promise.reject("VIDEO_EXPORT_UNAVAILABLE", "The iPhone could not start the finished video.")
      return
    }
    exporter.outputURL = destinationURL
    exporter.outputFileType = .mp4
    exporter.shouldOptimizeForNetworkUse = true
    exporter.videoComposition = videoComposition
    sendEvent("onRenderProgress", ["progress": 0.08, "stage": "Preparing your video"])

    let timer = DispatchSource.makeTimerSource(queue: .main)
    timer.schedule(deadline: .now() + 0.2, repeating: 0.25)
    timer.setEventHandler { [weak self, weak exporter] in
      guard let self, let exporter else { return }
      self.sendEvent("onRenderProgress", ["progress": Double(exporter.progress), "stage": "Rendering overlays"])
    }
    timer.resume()
    exporter.exportAsynchronously { [weak self] in
      timer.cancel()
      DispatchQueue.main.async {
        switch exporter.status {
        case .completed:
          self?.sendEvent("onRenderProgress", ["progress": 1.0, "stage": "Finished"])
          promise.resolve(destinationURL.absoluteString)
        case .cancelled:
          promise.reject("VIDEO_EXPORT_CANCELLED", "The video export was cancelled.")
        default:
          let detail = exporter.error?.localizedDescription ?? "Unknown export error"
          promise.reject("VIDEO_EXPORT_FAILED", "The finished video could not be created: \(detail)")
        }
      }
    }
  }

  private func localURL(_ value: String) -> URL {
    if value.hasPrefix("file://"), let url = URL(string: value) { return url }
    return URL(fileURLWithPath: value)
  }

  private func aspectFillTransform(track: AVAssetTrack, outputSize: CGSize) -> CGAffineTransform {
    let transformed = CGRect(origin: .zero, size: track.naturalSize).applying(track.preferredTransform)
    let orientedSize = CGSize(width: abs(transformed.width), height: abs(transformed.height))
    let scale = max(outputSize.width / orientedSize.width, outputSize.height / orientedSize.height)
    let scaled = CGSize(width: orientedSize.width * scale, height: orientedSize.height * scale)
    let offsetX = (outputSize.width - scaled.width) / 2
    let offsetY = (outputSize.height - scaled.height) / 2
    return track.preferredTransform
      .concatenating(CGAffineTransform(translationX: -transformed.origin.x, y: -transformed.origin.y))
      .concatenating(CGAffineTransform(scaleX: scale, y: scale))
      .concatenating(CGAffineTransform(translationX: offsetX / scale, y: offsetY / scale))
  }

  private func addOverlay(_ overlay: NomadicVideoOverlay, to parent: CALayer, duration: Double, outputSize: CGSize) {
    let start = max(0, overlay.startAt)
    let end = min(max(start + 0.1, overlay.endAt), max(duration, start + 0.1))
    let visibleDuration = end - start
    let frame = CGRect(x: 76, y: outputSize.height * 0.62, width: outputSize.width - 152, height: 360)
    let container = CALayer()
    container.frame = frame
    container.opacity = 0
    container.cornerRadius = 28
    if overlay.boxed { container.backgroundColor = color(overlay.accentColor).withAlphaComponent(0.9).cgColor }
    parent.addSublayer(container)

    let fullText = overlay.uppercase ? overlay.text.uppercased() : overlay.text
    let textLayer = CATextLayer()
    textLayer.frame = CGRect(x: 24, y: 22, width: frame.width - 48, height: frame.height - 44)
    textLayer.alignmentMode = .center
    textLayer.isWrapped = true
    textLayer.contentsScale = 3
    let font = UIFont(name: overlay.fontName, size: 68) ?? UIFont.systemFont(ofSize: 68, weight: .heavy)
    let strokeWidth = overlay.boxed ? 0 : -3.0
    func attributed(_ value: String) -> NSAttributedString {
      NSAttributedString(string: value, attributes: [
        .font: font,
        .foregroundColor: color(overlay.textColor),
        .strokeColor: color(overlay.accentColor),
        .strokeWidth: strokeWidth,
      ])
    }
    textLayer.string = attributed(fullText)
    container.addSublayer(textLayer)

    let visibility = CAKeyframeAnimation(keyPath: "opacity")
    visibility.values = [0, 1, 1, 0]
    visibility.keyTimes = [0, NSNumber(value: start / max(duration, 0.1)), NSNumber(value: end / max(duration, 0.1)), 1]
    visibility.duration = max(duration, 0.1)
    visibility.isRemovedOnCompletion = false
    visibility.fillMode = .both
    container.add(visibility, forKey: "visibility")

    if overlay.animation == "Fade" {
      let fade = CABasicAnimation(keyPath: "opacity")
      fade.fromValue = 0
      fade.toValue = 1
      fade.beginTime = AVCoreAnimationBeginTimeAtZero + start
      fade.duration = min(0.8, visibleDuration)
      fade.fillMode = .both
      fade.isRemovedOnCompletion = false
      textLayer.add(fade, forKey: "entrance")
    } else if overlay.animation == "Pop" {
      let pop = CAKeyframeAnimation(keyPath: "transform.scale")
      pop.values = [0.55, 1.08, 1]
      pop.keyTimes = [0, 0.72, 1]
      pop.beginTime = AVCoreAnimationBeginTimeAtZero + start
      pop.duration = min(0.55, visibleDuration)
      pop.fillMode = .both
      pop.isRemovedOnCompletion = false
      container.add(pop, forKey: "entrance")
    } else if overlay.animation == "Flicker" {
      let flicker = CAKeyframeAnimation(keyPath: "opacity")
      flicker.values = [0, 1, 0.15, 1, 0.3, 1]
      flicker.beginTime = AVCoreAnimationBeginTimeAtZero + start
      flicker.duration = min(0.75, visibleDuration)
      flicker.fillMode = .both
      flicker.isRemovedOnCompletion = false
      textLayer.add(flicker, forKey: "entrance")
    } else if overlay.animation == "Typewriter" || overlay.animation == "Word by word" {
      let pieces = overlay.animation == "Word by word" ? fullText.split(separator: " ").map(String.init) : fullText.map(String.init)
      let strings: [NSAttributedString] = pieces.indices.map { index in
        attributed(overlay.animation == "Word by word" ? pieces[0...index].joined(separator: " ") : pieces[0...index].joined())
      }
      let reveal = CAKeyframeAnimation(keyPath: "string")
      reveal.values = strings
      reveal.calculationMode = .discrete
      reveal.beginTime = AVCoreAnimationBeginTimeAtZero + start
      reveal.duration = min(max(0.45, visibleDuration * 0.55), visibleDuration)
      reveal.fillMode = .both
      reveal.isRemovedOnCompletion = false
      textLayer.add(reveal, forKey: "reveal")
    }
  }

  private func color(_ hex: String) -> UIColor {
    let clean = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var value: UInt64 = 0
    Scanner(string: clean).scanHexInt64(&value)
    guard clean.count == 6 else { return .white }
    return UIColor(red: CGFloat((value >> 16) & 0xff) / 255, green: CGFloat((value >> 8) & 0xff) / 255, blue: CGFloat(value & 0xff) / 255, alpha: 1)
  }
}
