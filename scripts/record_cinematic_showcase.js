import puppeteer from 'puppeteer-core'
import { spawn } from 'child_process'
import ffmpegStatic from 'ffmpeg-static'
import path from 'path'
import fs from 'fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUTPUT_VIDEO = path.resolve('forever_in_bloom_cinematic_showcase.mp4')
const PUBLIC_VIDEO = path.resolve('public/forever_in_bloom_cinematic.mp4')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function recordCinematicShowcase() {
  console.log('=====================================================')
  console.log('STARTING CINEMATIC RECORDING OF FOREVER IN BLOOM')
  console.log('=====================================================')

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
    },
  })

  const page = await browser.newPage()
  console.log('1. Loading web application at http://localhost:5173/ ...')
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })

  // Wait for initial GLB load and veil fade-out
  await sleep(4000)

  // Inject smooth programmatic scroller into page
  await page.evaluate(() => {
    window.__smoothScrollTo = function (targetRatio, durationMs) {
      return new Promise((resolve) => {
        const startY = window.scrollY
        const targetY = (document.body.scrollHeight - window.innerHeight) * targetRatio
        const diff = targetY - startY
        const startTime = performance.now()

        function step(now) {
          const elapsed = now - startTime
          const progress = Math.min(elapsed / durationMs, 1)
          // Smooth sinusoidal easeInOut
          const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI)
          window.scrollTo(0, startY + diff * ease)

          if (progress < 1) {
            requestAnimationFrame(step)
          } else {
            resolve()
          }
        }
        requestAnimationFrame(step)
      })
    }
  })

  // Set up FFmpeg to encode 1080p high-bitrate MP4 with pristine H.264
  console.log('2. Initializing FFmpeg encoder...')
  const ffmpeg = spawn(ffmpegStatic, [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '17', // High visual quality
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUTPUT_VIDEO,
  ])

  ffmpeg.stderr.on('data', (d) => {
    // Debug if needed
  })

  const client = await page.target().createCDPSession()
  let frameCount = 0

  client.on('Page.screencastFrame', async ({ data, sessionId }) => {
    try {
      const buffer = Buffer.from(data, 'base64')
      ffmpeg.stdin.write(buffer)
      frameCount++
      await client.send('Page.screencastFrameAck', { sessionId })
    } catch (e) {
      // Ignored during shutdown
    }
  })

  console.log('3. Starting real-time screencast capture...')
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 95,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1,
  })

  // -----------------------------------------------------------------
  // SCENE 1: HERO & AWAKENING (0s - 4s)
  // Closed bud, glowing typography, stardust swirling, gentle parallax
  // -----------------------------------------------------------------
  console.log('-> Scene 1: Hero & Awakening...')
  await page.mouse.move(960, 540)
  await sleep(1000)
  await page.mouse.move(1100, 480, { steps: 25 })
  await sleep(1000)
  await page.mouse.move(820, 580, { steps: 25 })
  await sleep(1500)

  // -----------------------------------------------------------------
  // SCENE 2: SCROLL TO ACT I & ACT II (4s - 8s)
  // Rose turns toward camera, outer petals loosen, burgundy atmosphere
  // -----------------------------------------------------------------
  console.log('-> Scene 2: Scrolling through Act I & Act II (A Seed of Feeling & Love Awakens)...')
  await page.evaluate(() => window.__smoothScrollTo(0.35, 3500))
  await sleep(800)

  // -----------------------------------------------------------------
  // SCENE 3: ACT III - FULL BLOOM (8s - 13s)
  // Petals unwrap in 3D right toward camera, sunlight flare & Aristotle quote
  // -----------------------------------------------------------------
  console.log('-> Scene 3: Scrolling to Full Bloom (Act III & IV)...')
  await page.evaluate(() => window.__smoothScrollTo(0.60, 4000))
  await page.mouse.move(980, 520, { steps: 20 })
  await sleep(2200)

  // -----------------------------------------------------------------
  // SCENE 4: ACT V - 16-ROSE BOUQUET & LARGE JASMINE BLOSSOMS (13s - 18s)
  // Camera pulls back, 16 roses fan out, 3D Jasmine blossoms wave in breeze,
  // eucalyptus collar & satin bow unfurl, petal rain showers down
  // -----------------------------------------------------------------
  console.log('-> Scene 4: Unfurling the 16-Rose Bouquet & Large 3D Jasmine...')
  await page.evaluate(() => window.__smoothScrollTo(0.92, 4500))
  await sleep(1000)
  // Hover over bouquet to demonstrate interactive hover cushion & rose parting
  console.log('Demonstrating interactive rose hover & cushion parting...')
  await page.mouse.move(960, 450, { steps: 15 })
  await sleep(600)
  await page.mouse.move(1080, 420, { steps: 15 })
  await sleep(600)
  await page.mouse.move(840, 430, { steps: 15 })
  await sleep(1200)

  // -----------------------------------------------------------------
  // SCENE 5: COUPLE LOVE CALCULATOR & DESTINY RESULTS (18s - 27s)
  // Scroll to calculator, type Romeo & Juliet, click Bloom,
  // trigger confetti blast & OGL Crystalized Plasma Ball!
  // -----------------------------------------------------------------
  console.log('-> Scene 5: Entering Couple Love Calculator & Revealing Destiny...')
  await page.evaluate(() => window.__smoothScrollTo(0.985, 2500))
  await sleep(1200)

  // Type names with human cadence
  console.log('Typing names: Romeo & Juliet...')
  const inputs = await page.$$('.calc-input')
  if (inputs.length >= 2) {
    await inputs[0].click()
    await inputs[0].type('Romeo', { delay: 90 })
    await sleep(400)

    await inputs[1].click()
    await inputs[1].type('Juliet', { delay: 90 })
    await sleep(600)
  }

  // Click "Bloom Our Love" button
  console.log('Clicking "Bloom Our Love" button...')
  await page.click('.calc-submit-btn')

  // Wait for the confetti explosion, Crystalized Plasma Ball & destiny verse
  console.log('Displaying Confetti Blast, OGL Plasma Ball & Destiny Results...')
  await sleep(5500)

  // -----------------------------------------------------------------
  // FINALIZING VIDEO
  // -----------------------------------------------------------------
  console.log('4. Stopping screencast and finalizing MP4 encoding...')
  await client.send('Page.stopScreencast')
  ffmpeg.stdin.end()

  await new Promise((resolve) => {
    ffmpeg.on('close', resolve)
  })

  await browser.close()

  // Copy to public folder as well
  fs.copyFileSync(OUTPUT_VIDEO, PUBLIC_VIDEO)

  const stats = fs.statSync(OUTPUT_VIDEO)
  console.log('=====================================================')
  console.log('CINEMATIC VIDEO RECORDING COMPLETE!')
  console.log(`Video File: ${OUTPUT_VIDEO}`)
  console.log(`Public URL File: ${PUBLIC_VIDEO}`)
  console.log(`Total Frames: ${frameCount}`)
  console.log(`File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`)
  console.log('=====================================================')
}

recordCinematicShowcase().catch((err) => {
  console.error('Error during cinematic recording:', err)
  process.exit(1)
})
