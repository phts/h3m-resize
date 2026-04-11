export function offsetOf(buffer, sequence) {
  function checkSequence(from) {
    for (let i = 0; i < sequence.length; i++) {
      const offset = from + i
      if (offset >= buffer.length) {
        return false
      }
      if (sequence[i].any) {
        continue
      }
      if (sequence[i].anyOf && sequence[i].anyOf.indexOf(buffer[offset]) !== -1) {
        continue
      }
      if (sequence[i] !== buffer[offset]) {
        return false
      }
    }
    return true
  }

  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] !== sequence[0]) {
      continue
    }
    if (checkSequence(i)) {
      return i
    }
  }
  return null
}

export function allocPattern(size, pattern) {
  const buf = Buffer.alloc(size * pattern.length)
  for (let i = 0; i < size; i++) {
    pattern.copy(buf, i * pattern.length)
  }
  return buf
}
