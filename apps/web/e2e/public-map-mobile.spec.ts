import { test, expect } from './fixtures'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test('public map fills the mobile viewport after resize and rotation', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/map$/)
  await expect(page).toHaveTitle('Kalongan WebGIS')
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/)
  await expect(page.getByRole('heading', { name: 'WebGIS', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Masuk', exact: true })).toHaveAttribute('href', '/auth/login')
  await expect(page.getByRole('link', { name: 'Buat Laporan', exact: true })).toBeVisible()
  await page.screenshot({ path: `../../.local/verification/disaster-map/webgis-mobile-${test.info().project.name}-portrait.png` })
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 390, height: 600 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport)
    await expect
      .poll(async () =>
        page.locator('.leaflet-container').evaluate((element) => {
          const bounds = element.getBoundingClientRect()
          return {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            viewportWidth: innerWidth,
            viewportHeight: innerHeight,
            coversViewport: Math.round(bounds.width) >= innerWidth && Math.round(bounds.height) >= innerHeight,
          }
        })
      )
      .toEqual(expect.objectContaining({ x: 0, y: 0, coversViewport: true }))
    await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeInViewport({ ratio: 0.99 })
  }
  await page.screenshot({ path: `../../.local/verification/disaster-map/webgis-mobile-${test.info().project.name}.png` })
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeInViewport({ ratio: 0.99 })
})
