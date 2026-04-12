import {execSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import * as h3m from './utils/h3m.mjs'
import {allocPattern, offsetOf} from './utils/buffer.mjs'

export function app(args) {
  const srcFileBuffer = execSync(`gzip --decompress --to-stdout --suffix=.h3m ${args['src-file']}`)

  if (h3m.getType(srcFileBuffer) !== 'HotA') {
    throw new Error(`Unsupported source map format: ${h3m.getType(srcFileBuffer)}`)
  }

  const srcSize = h3m.getSize(srcFileBuffer)
  const newSize = h3m.getSizeByLabel(args['new-size'])
  const hasUnderground = h3m.hasUnderground(srcFileBuffer)

  console.info(`Source map size: ${h3m.getSizeLabel(srcFileBuffer)}`)
  console.info(`Underground: ${hasUnderground ? 'yes' : 'no'}`)
  console.info(`${srcSize < newSize ? 'Extending' : 'Decreasing'} to: ${args['new-size']}`)

  // Find first land segment
  // Sequence from README
  // 03 ?? 04 (0B|0C) 01 0F ?? ; 03 ?? 04 (0B|0C) 01 (0C|0D) ?? ; 07 ?? 04 (0B|0C) 01 (0C|0D) ??
  const seq = [
    0x03,
    {any: true},
    0x04,
    {anyOf: [0x0b, 0x0c]},
    0x01,
    0x0f,
    {any: true},
    0x03,
    {any: true},
    0x04,
    {anyOf: [0x0b, 0x0c]},
    0x01,
    {anyOf: [0x0c, 0x0d]},
    {any: true},
    0x07,
    {any: true},
    0x04,
    {anyOf: [0x0b, 0x0c]},
    0x01,
    {anyOf: [0x0c, 0x0d]},
    {any: true},
  ]
  const srcSegmentsOffset = offsetOf(srcFileBuffer, seq)
  if (srcSegmentsOffset === null) {
    throw new Error('Special sequence not found. Check README')
  }
  console.info(`First land segment found at offset: ${srcSegmentsOffset.toString(16).padStart(8, '0')}`)

  const srcSegmentsLineSize = srcSize * 7
  const srcSegmentsBlockSize = srcSize * srcSegmentsLineSize

  const overgroundSegmentsBuffer = allocPattern(
    newSize * newSize,
    Buffer.from([0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00])
  )
  for (let line = 0; line < srcSize; line++) {
    srcFileBuffer.copy(
      overgroundSegmentsBuffer,
      line * newSize * 7,
      srcSegmentsOffset + line * srcSegmentsLineSize,
      srcSegmentsOffset + line * srcSegmentsLineSize + srcSegmentsLineSize
    )
  }

  let undergroundSegmentsBuffer = Buffer.from([])
  if (hasUnderground) {
    undergroundSegmentsBuffer = allocPattern(newSize * newSize, Buffer.from([0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]))
    for (let line = 0; line < srcSize; line++) {
      srcFileBuffer.copy(
        undergroundSegmentsBuffer,
        line * newSize * 7,
        srcSegmentsOffset + srcSegmentsBlockSize + line * srcSegmentsLineSize,
        srcSegmentsOffset + srcSegmentsBlockSize + line * srcSegmentsLineSize + srcSegmentsLineSize
      )
    }
  }

  const srcSegmentsEnd = srcSegmentsOffset + srcSegmentsBlockSize + (hasUnderground ? srcSegmentsBlockSize : 0)
  const targetBuffer = Buffer.concat([
    srcFileBuffer.subarray(0, 0x26),
    Buffer.from([newSize]),
    srcFileBuffer.subarray(0x26 + 1, srcSegmentsOffset),
    overgroundSegmentsBuffer,
    undergroundSegmentsBuffer,
    srcFileBuffer.subarray(srcSegmentsEnd),
  ])

  const uncompressedFile = args['out-file'] + '.unpacked'
  writeFileSync(uncompressedFile, targetBuffer, {encoding: 'hex'})
  execSync(`gzip --force ${uncompressedFile}`)
  execSync(`mv ${uncompressedFile}.gz ${args['out-file']}`)
  console.info('Done!')
}
