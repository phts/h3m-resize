import {execSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import {parseArgs} from './parseArgs.mjs'
import {getSize, getSizeLabel, getType, hasUnderground} from './utils/h3m.mjs'

const args = parseArgs()

const srcFileBuffer = execSync(`gzip --decompress --to-stdout --suffix=.h3m ${args['src-file']}`)
const tmplFileBuffer = execSync(`gzip --decompress --to-stdout --suffix=.h3m ${args['tmpl-file']}`)

if (getType(srcFileBuffer) !== 'HotA') {
  throw new Error(`Unsupported source map format: ${getType(srcFileBuffer)}`)
}
if (getType(tmplFileBuffer) !== 'HotA') {
  throw new Error(`Unsupported template map format: ${getType(tmplFileBuffer)}`)
}

console.info(`Source map size: ${getSizeLabel(srcFileBuffer)}`)
console.info(`Target map size: ${getSizeLabel(tmplFileBuffer)}`)

const srcSize = getSize(srcFileBuffer)
const tmplSize = getSize(tmplFileBuffer)

if (srcSize === tmplSize) {
  throw new Error('Sizes of source map and template map are equal')
}
if (srcSize > tmplSize) {
  throw new Error('Moving tiles from larger map to smaller map is not supported')
}

if (srcSize !== 72 && tmplSize !== 108 && !hasUnderground(srcFileBuffer) && !hasUnderground(tmplFileBuffer)) {
  throw new Error('Currently supported very limited cases')
}

const TMPL_OFFSET = 0x719
// offset=0x833

const overgroundTilesBuffer = srcFileBuffer.subarray(
  args['src-file-tiles-offset'],
  args['src-file-tiles-offset'] + srcSize * srcSize * 7 + 1
)

const undergroundTilesBuffer = srcFileBuffer.subarray(
  args['src-file-tiles-offset'] + srcSize * srcSize * 7,
  args['src-file-tiles-offset'] + srcSize * srcSize * 7 + srcSize * srcSize * 7 + 1
)

let tmplOffset = TMPL_OFFSET

// overground tiles
for (let line = 0; line < srcSize; line++) {
  overgroundTilesBuffer.copy(tmplFileBuffer, tmplOffset, line * srcSize * 7, line * srcSize * 7 + srcSize * 7)
  tmplOffset += tmplSize * 7
}

// skip rest of the map
tmplOffset += (tmplSize - srcSize) * tmplSize * 7

// underground tiles
for (let line = 0; line < srcSize; line++) {
  undergroundTilesBuffer.copy(tmplFileBuffer, tmplOffset, line * srcSize * 7, line * srcSize * 7 + srcSize * 7)
  tmplOffset += tmplSize * 7
}

// skip rest of the map
tmplOffset += (tmplSize - srcSize) * tmplSize * 7

// objects
const srcOffset = args['src-file-tiles-offset'] + srcSize * srcSize * 7 + srcSize * srcSize * 7
const targetBuffer = Buffer.concat([
  srcFileBuffer.subarray(0, 0x26),
  tmplFileBuffer.subarray(0x26, 0x26 + 1),
  srcFileBuffer.subarray(0x26 + 1, args['src-file-tiles-offset']),
  tmplFileBuffer.subarray(TMPL_OFFSET, tmplOffset),
  srcFileBuffer.subarray(srcOffset),
])

const uncompressedFile = args['out-file'] + '-unpacked'
writeFileSync(uncompressedFile, targetBuffer, {encoding: 'hex'})
execSync(`gzip --force --keep ${uncompressedFile}`)
execSync(`mv ${uncompressedFile}.gz ${args['out-file']}`)
