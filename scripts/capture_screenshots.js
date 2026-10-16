import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUTPUT_DIR = path.resolve('public/screenshots')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

async function run() {
  console.log('Launching clean Chrome instance (ultra-high 4K retina resolution)...')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--window-size=1920,1080',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2, // 3840x2160 crisp 4K clarity
    },
  })

  const page = await browser.newPage()
  console.log('Loading page at http://localhost:5173/ ...')
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })

  // Wait for initial 3D models and veil fade-out
  await new Promise((r) => setTimeout(r, 4500))

  // 1. Pristine Main Hero Screenshot
  console.log('1. Capturing Main Hero screenshot...')
  const mainHeroPath = path.join(OUTPUT_DIR, 'main_hero_forever_in_bloom.png')
  await page.screenshot({ path: mainHeroPath, type: 'png' })
  fs.copyFileSync(mainHeroPath, path.resolve('main_screenshot.png'))
  console.log('-> Saved main_screenshot.png & public/screenshots/main_hero_forever_in_bloom.png')

  // 2. Act II: Love Awakens & Climbing Rose Plant
  console.log('2. Scrolling to Act II (Love Awakens & Climbing Plant)...')
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight * 0.38, behavior: 'instant' })
  })
  await new Promise((r) => setTimeout(r, 2000))
  const act2Path = path.join(OUTPUT_DIR, 'act2_love_awakens_climbing_plant.png')
  await page.screenshot({ path: act2Path, type: 'png' })
  console.log('-> Saved act2_love_awakens_climbing_plant.png')

  // 3. Act III: Full Bloom with Aristotle Quote & Mid-stem Blossoms
  console.log('3. Scrolling to Act III (Full Bloom)...')
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight * 0.58, behavior: 'instant' })
  })
  await new Promise((r) => setTimeout(r, 2000))
  const bloomPath = path.join(OUTPUT_DIR, 'act3_full_bloom.png')
  await page.screenshot({ path: bloomPath, type: 'png' })
  console.log('-> Saved act3_full_bloom.png')

  // 4. Act V: 16-Rose Decorated Bouquet & Large Waving Jasmine
  console.log('4. Scrolling to 16-Rose Bouquet & Jasmine Decorations...')
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight * 0.93, behavior: 'instant' })
  })
  await new Promise((r) => setTimeout(r, 2200))
  const bouquetPath = path.join(OUTPUT_DIR, 'act5_bouquet_jasmine_decorations.png')
  await page.screenshot({ path: bouquetPath, type: 'png' })
  console.log('-> Saved act5_bouquet_jasmine_decorations.png')

  // 5. Act V: Couple Love Calculator Results & 3D Crystalized Plasma Ball
  console.log('5. Demonstrating Love Calculator & Capturing Plasma Ball Results...')
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight * 0.985, behavior: 'instant' })
  })
  await new Promise((r) => setTimeout(r, 1200))

  const inputs = await page.$$('.calc-input')
  if (inputs.length >= 2) {
    await inputs[0].click()
    await inputs[0].type('Romeo', { delay: 60 })
    await inputs[1].click()
    await inputs[1].type('Juliet', { delay: 60 })
    await new Promise((r) => setTimeout(r, 400))
  }

  // Click Bloom button
  await page.click('.calc-submit-btn')
  console.log('Waiting for confetti blast & OGL plasma ball...')
  await new Promise((r) => setTimeout(r, 3500))

  const calcPath = path.join(OUTPUT_DIR, 'act5_couple_love_calculator_results.png')
  await page.screenshot({ path: calcPath, type: 'png' })
  console.log('-> Saved act5_couple_love_calculator_results.png')

  // 6. Focused Detail of the Rose Plant Scroller
  console.log('6. Capturing high-res detail of the Rose Plant Scroller...')
  const scrollerElement = await page.$('.rose-plant-scroller')
  if (scrollerElement) {
    const scrollerPath = path.join(OUTPUT_DIR, 'rose_plant_scroller_detail.png')
    await scrollerElement.screenshot({ path: scrollerPath, type: 'png' })
    console.log('-> Saved rose_plant_scroller_detail.png')
  }

  await browser.close()
  console.log('All updated screenshots captured successfully in crisp 4K retina clarity!')
}

run().catch((err) => {
  console.error('Error capturing screenshots:', err)
  process.exit(1)
})
