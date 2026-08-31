Pod::Spec.new do |s|
  s.name           = 'NomadicVideoRenderer'
  s.version        = '1.0.0'
  s.summary        = 'Private on-device video compositor for Nomadic Paws.'
  s.description    = 'Renders the Nomadic Paws editable overlay timeline with AVFoundation.'
  s.author         = 'Nomadic Paws Co LLC'
  s.homepage       = 'https://nomadicpaws.co'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'UIKit', 'CoreMedia', 'QuartzCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
