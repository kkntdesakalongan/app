export function copyToClipboard(value: string) {
  return navigator.clipboard.writeText(value)
}

export function redirect(url: string) {
  if (url.slice(0, 8) !== 'https://' && url.slice(0, 7) !== 'http://') url = `https://${url}`
  window.open(url, '_blank')
}

export function openInMaps(lat: any, lng: any) {
  window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank')
}

export interface PrintHTMLOptions {
  styles?: string
  fontHref?: string
  delayMs?: number
}

export const printHTML = (elementID: string, options: PrintHTMLOptions = {}) => {
  const innerHTML = document.getElementById(elementID)!.innerHTML.replace(/"/g, `'`)
  const fontHref = options.fontHref || 'https://fonts.googleapis.com/css2?family=Roboto+Flex:wght@100;200;300;400;500;600;700;800;900;1000&display=swap'
  const printedHTML = `
  <html>
    <head>
      <meta charset="utf-8">
      <link href="${fontHref}" rel="stylesheet" />
      <style>
        ${options.styles || ''}
      </style>
    </head>
    <body style="-webkit-print-color-adjust: exact !important;">
      ${innerHTML}
    </body>
  </html>
  `
  const frame = document.createElement('iframe')
  frame.setAttribute('id', 'printing-frame')
  frame.setAttribute('name', 'printing-frame')
  frame.setAttribute('src', 'about:blank')
  frame.setAttribute('frameborder', '0')
  frame.setAttribute('scrolling', 'no')
  frame.setAttribute('style', 'position: absolute; top: -100em; left: -100em;')
  document.body.appendChild(frame)
  const frameDoc = frame.contentWindow?.document
  frameDoc!.open()
  frameDoc!.write(printedHTML)
  frameDoc!.close()
  frame.focus()
  setTimeout(() => {
    frame.contentWindow?.print()
    document.body.removeChild(frame)
  }, options.delayMs ?? 500)
}
