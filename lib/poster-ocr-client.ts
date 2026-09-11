'use client'

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')) }
    img.src = url
  })
}

function regionCanvas(img: HTMLImageElement, fromY: number, toY: number) {
  const sy = Math.max(0, Math.floor(img.height * fromY))
  const sh = Math.max(1, Math.floor(img.height * (toY - fromY)))
  const scale = Math.max(1.5, Math.min(2.5, 1800 / img.width))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(sh * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.filter = 'grayscale(1) contrast(1.9) brightness(1.12)'
  ctx.drawImage(img, 0, sy, img.width, sh, 0, 0, canvas.width, canvas.height)
  return canvas
}

function englishQuality(text: string) {
  const words = text.match(/\b[A-Za-z]{3,}\b/g) || []
  const useful = /(october|november|september|friday|saturday|sunday|am|pm|auckland|street|centre|center|hall|show|festival|celebration|watch)/i.test(text)
  return words.length >= 10 && useful
}

export async function readPosterText(file: File) {
  const img = await loadImage(file)
  const titleRegion = regionCanvas(img, 0.05, 0.46)
  const detailsRegion = regionCanvas(img, 0.38, 0.78)
  const fullRegion = regionCanvas(img, 0, 1)

  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  await worker.setParameters({ preserve_interword_spaces: '1' })
  const title = (await worker.recognize(titleRegion)).data.text.trim()
  const details = (await worker.recognize(detailsRegion)).data.text.trim()
  const full = (await worker.recognize(fullRegion)).data.text.trim()
  await worker.terminate()

  let combined = [title, details, full].filter(Boolean).join('\n')
  if (englishQuality(combined)) return combined

  const mixedWorker = await createWorker(['eng', 'hin'])
  const mixed = (await mixedWorker.recognize(fullRegion)).data.text.trim()
  await mixedWorker.terminate()
  if (mixed.length > combined.length) combined += `\n${mixed}`
  return combined
}
