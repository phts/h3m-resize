export function getSize(buffer) {
  return buffer[0x26]
}
export function getSizeLabel(buffer) {
  const SIZES = {
    0x24: 'S',
    0x48: 'M',
    0x6c: 'L',
    0x90: 'XL',
    0xb4: 'H',
    0xd8: 'XH',
    0xfc: 'G',
  }
  return SIZES[getSize(buffer)]
}

export function getType(buffer) {
  const TYPES = {
    0x0e: 'RoE',
    0x15: 'AB',
    0x1c: 'SoD',
    0x20: 'HotA',
  }
  return TYPES[buffer[0x0]]
}

export function hasUnderground(buffer) {
  return !!buffer[0x2a]
}
