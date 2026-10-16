import puppeteer from 'puppeteer-core'
import { spawn } from 'child_process'
import ffmpegStatic from 'ffmpeg-static'
import path from 'path'
import fs from 'fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUTPUT_VIDEO = path.resolve('bloom_of_love_cinematic.mp4')

async function record() {
  console.log('Testing video recording pipeline...')
  console.log('FFmpeg binary:', ffmpegStatic)

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
  console.log('Navigating to http://localhost:5173/ ...')
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 3500))

  // Set up FFmpeg process to receive mjpeg stream via stdin and output high-quality H.264 MP4
  const ffmpeg = spawn(ffmpegStatic, [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUTPUT_VIDEO,
  ])

  ffmpeg.stderr.on('data', (d) => {
    // console.log('FFmpeg:', d.toString());
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
      // Stream closing
    }
  })

  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1,
  })

  console.log('Screencast started. Recording 3 seconds test...')
  await new Promise((r) => setTimeout(r, 3000))

  console.log('Stopping screencast...')
  await client.send('Page.stopScreencast')
  ffmpeg.stdin.end()

  await new Promise((resolve) => {
    ffmpeg.on('close', resolve)
  })

  await browser.close()
  console.log(`Test complete! Output: ${OUTPUT_VIDEO}, Frames: ${frameCount}`)
  console.log(`File size: ${fs.statSync(OUTPUT_VIDEO).size} bytes`)
}

record().catch((err) => {
  console.error('Error recording test:', err)
  process.exit(1)
})
