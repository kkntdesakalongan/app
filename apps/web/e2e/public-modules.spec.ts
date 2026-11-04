import { test, expect } from './fixtures'

test.use({ fastAuth: true })

test('places a pin and shows it on both full-area maps', async ({ authenticatedPage: page }) => {
  const name = `Map proof ${Date.now()}`
  let pinId: string | undefined
  try {
    await page.goto('/map-pins/create')
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
    await page.locator('.leaflet-container').click({ position: { x: 160, y: 160 } })
    const saved = page.waitForResponse((response) => response.url().endsWith('/api/map-pins/create') && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    const response = await saved
    expect(response.status()).toBe(201)
    pinId = (await response.json()).data.id
    await page.goto('/disaster-reports')
    await expect(page.getByRole('heading', { name: 'Disaster reports', exact: true })).toBeVisible()
    const paddingDuringTransition = page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const samples: string[] = []
          const start = performance.now()
          function sample() {
            const main = document.querySelector('main')
            if (main) samples.push(getComputedStyle(main).paddingLeft)
            if (performance.now() - start < 700) requestAnimationFrame(sample)
            else resolve(samples)
          }
          sample()
        })
    )
    await page.getByRole('link', { name: /Dashboard$/ }).click()
    expect(await paddingDuringTransition).not.toContain('0px')
    const dashboardMap = page.locator('.leaflet-container')
    await expect(dashboardMap).toBeVisible()
    const mapBounds = await dashboardMap.boundingBox()
    const mainBounds = await page.locator('main').boundingBox()
    expect(mapBounds).not.toBeNull()
    expect(mainBounds).not.toBeNull()
    expect(Math.abs(mapBounds!.width - mainBounds!.width)).toBeLessThan(3)
    expect(Math.abs(mapBounds!.height - mainBounds!.height)).toBeLessThan(3)
    await page.getByRole('button', { name, exact: true }).click()
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await expect(dashboardMap.locator('.leaflet-map-pane')).toHaveClass(/leaflet-zoom-anim/)
    await expect(dashboardMap.locator('.leaflet-map-pane')).not.toHaveClass(/leaflet-zoom-anim/)
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
    await expect(dashboardMap.locator('.leaflet-map-pane')).toHaveClass(/leaflet-zoom-anim/)
    await expect(dashboardMap.locator('.leaflet-map-pane')).not.toHaveClass(/leaflet-zoom-anim/)
    await page.screenshot({ path: '../../.local/verification/disaster-map/dashboard-polish.png' })
    await page.goto('/map')
    const publicMap = page.locator('.leaflet-container')
    await expect(publicMap).toBeVisible()
    const bounds = await publicMap.boundingBox()
    expect(bounds!.width).toBe(page.viewportSize()!.width)
    expect(bounds!.height).toBe(page.viewportSize()!.height)
    await page.getByRole('button', { name, exact: true }).click()
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible()
    await page.screenshot({ path: '../../.local/verification/disaster-map/public-map.png' })
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(publicMap).toBeVisible()
    expect((await publicMap.boundingBox())?.width).toBe(390)
    expect((await publicMap.boundingBox())?.height).toBe(844)
    await page.screenshot({ path: '../../.local/verification/disaster-map/public-map-mobile.png' })
  } finally {
    if (pinId) {
      const response = await page.request.delete(`${process.env.E2E_API_URL}/map-pins/delete/${pinId}`)
      expect(response.ok()).toBe(true)
    }
  }
})

test('submits an anonymous report with a local image', async ({ browser, authenticatedPage }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  let reportId: string | undefined
  try {
    await page.goto(`${process.env.E2E_WEB_URL}/disaster-reports/new`)
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(`Flood proof ${Date.now()}`)
    await page
      .locator('input[type=file]')
      .setInputFiles({ name: 'flood.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64') })
    const saved = page.waitForResponse((response) => response.url().endsWith('/api/public/disaster-reports/create') && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    reportId = (await (await saved).json()).data.id
    await expect(page.getByRole('heading', { name: 'Report submitted' })).toBeVisible()
    await authenticatedPage.goto(`/disaster-reports/${reportId}/detail`)
    await expect(authenticatedPage.getByRole('img', { name: 'Disaster report attachment' })).toBeVisible()
    await authenticatedPage.goto(`/disaster-reports/${reportId}/edit`)
    await authenticatedPage.getByRole('textbox', { name: 'Title', exact: true }).fill('Updated flood report')
    await authenticatedPage.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(authenticatedPage.getByRole('img', { name: 'Disaster report attachment' })).toBeVisible()
    await authenticatedPage.goto(`/disaster-reports/${reportId}/edit`)
    await authenticatedPage.getByRole('checkbox', { name: 'Remove saved image' }).check()
    await authenticatedPage.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(authenticatedPage).toHaveURL(new RegExp(`/disaster-reports/${reportId}/detail`))
    await expect(authenticatedPage.getByRole('img', { name: 'Disaster report attachment' })).toHaveCount(0)
  } finally {
    if (reportId) expect((await authenticatedPage.request.delete(`${process.env.E2E_API_URL}/disaster-reports/delete/${reportId}`)).ok()).toBe(true)
    await context.close()
  }
})
