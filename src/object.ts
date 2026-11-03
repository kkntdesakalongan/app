export function groupBy(xs: any[], key: string) {
  return xs.reduce((rv, x) => {
    ;(rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {} as Record<string, any[]>)
}

export const MIME_TYPE_NAMES: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPG',
}

export function getFileExtension(fileName: string) {
  return fileName?.split('.').pop()?.toLowerCase() || ''
}

export function isPreviewableExtension(ext: string) {
  return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
}

export function dataURItoBlob(dataURI: string) {
  const byteString = atob(dataURI.split(',')[1])
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeString })
}

export const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}

export function getObjectValue(o: any, s: string): any {
  s = s.replace(/\[(\w+)\]/g, '.$1')
  s = s.replace(/^\./, '')
  const a = s.split('.')
  for (let i = 0; i < a.length; i++) {
    const k = a[i]
    if (k in o) o = o[k]
    else return undefined
  }
  return o
}

export function sumArray(numbers: any[]): number {
  return numbers.reduce((sum, num) => sum + num, 0)
}

export function indexCompare(mode: 'moreThan' | 'lessThan' | 'moreThanOrEqual' | 'lessThanOrEqual', arr: any[], value: any, isMoreThan: any) {
  switch (mode) {
    case 'moreThan':
      return arr.findIndex((item: any) => item === value) > arr.findIndex((item: any) => item === isMoreThan)
    case 'lessThan':
      return arr.findIndex((item: any) => item === value) < arr.findIndex((item: any) => item === isMoreThan)
    case 'moreThanOrEqual':
      return arr.findIndex((item: any) => item === value) >= arr.findIndex((item: any) => item === isMoreThan)
    case 'lessThanOrEqual':
      return arr.findIndex((item: any) => item === value) <= arr.findIndex((item: any) => item === isMoreThan)
  }
}
