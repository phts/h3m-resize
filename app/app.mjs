import {execSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import {getSize, getSizeByLabel, getSizeLabel, getType, hasUnderground} from './utils/h3m.mjs'
import {allocPattern, offsetOf} from './utils/buffer.mjs'

export function app(args) {
  const srcFileBuffer = execSync(`gzip --decompress --to-stdout --suffix=.h3m ${args['src-file']}`)

  if (getType(srcFileBuffer) !== 'HotA') {
    throw new Error(`Unsupported source map format: ${getType(srcFileBuffer)}`)
  }

  const srcSize = getSize(srcFileBuffer)
  const newSize = getSizeByLabel(args['new-size'])

  console.info(`Source map size: ${getSizeLabel(srcFileBuffer)}`)
  console.info(`${srcSize < newSize ? 'Extending' : 'Decreasing'} to: ${args['new-size']}`)

  if (srcSize !== 72 && newSize !== 108 && !hasUnderground(srcFileBuffer)) {
    throw new Error('Currently supported very limited cases')
  }

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
  const srcFileLandSegmentsOffset = offsetOf(srcFileBuffer, seq)
  if (srcFileLandSegmentsOffset === null) {
    throw new Error('Special sequence not found. Check README')
  }
  console.info(`First land segment found at offset: ${srcFileLandSegmentsOffset.toString(16)}`)

  const overgroundSegmentsBuffer = allocPattern(
    newSize * newSize,
    Buffer.from([0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00])
  )
  for (let line = 0; line < srcSize; line++) {
    srcFileBuffer.copy(
      overgroundSegmentsBuffer,
      line * newSize * 7,
      srcFileLandSegmentsOffset + line * srcSize * 7,
      srcFileLandSegmentsOffset + line * srcSize * 7 + srcSize * 7
    )
  }

  const undergroundSegmentsBuffer = allocPattern(
    newSize * newSize,
    Buffer.from([0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00])
  )
  for (let line = 0; line < srcSize; line++) {
    srcFileBuffer.copy(
      undergroundSegmentsBuffer,
      line * newSize * 7,
      srcFileLandSegmentsOffset + srcSize * srcSize * 7 + line * srcSize * 7,
      srcFileLandSegmentsOffset + srcSize * srcSize * 7 + line * srcSize * 7 + srcSize * 7
    )
  }

  const srcFileLandSegmentsEndOffset = srcFileLandSegmentsOffset + srcSize * srcSize * 7 + srcSize * srcSize * 7
  const targetBuffer = Buffer.concat([
    srcFileBuffer.subarray(0, 0x26),
    Buffer.from([newSize]),
    srcFileBuffer.subarray(0x26 + 1, srcFileLandSegmentsOffset),
    overgroundSegmentsBuffer,
    undergroundSegmentsBuffer,
    srcFileBuffer.subarray(srcFileLandSegmentsEndOffset),
  ])

  const uncompressedFile = args['out-file'] + '.unpacked'
  writeFileSync(uncompressedFile, targetBuffer, {encoding: 'hex'})
  execSync(`gzip --force ${uncompressedFile}`)
  execSync(`mv ${uncompressedFile}.gz ${args['out-file']}`)
}
