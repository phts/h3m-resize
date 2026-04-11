import {SIZE_LABELS} from './utils/h3m.mjs'

const SUPPORTED_ARGS = ['src-file', 'out-file', 'new-size']
const SUPPORTED_SIZES = Object.values(SIZE_LABELS)

export function parseArgs() {
  const args = {}

  process.argv.forEach((x) => {
    for (const arg of SUPPORTED_ARGS) {
      const [key, value] = x.split('=', 2)
      if (key === `--${arg}`) {
        args[arg] = value
      }
    }
  })

  if (Object.keys(args).length !== SUPPORTED_ARGS.length) {
    throw new Error('Wrong number of arguments')
  }

  if (!SUPPORTED_SIZES.includes(args['new-size'])) {
    throw new Error('Wrong value of --new-size')
  }

  return args
}
