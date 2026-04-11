export function parseArgs() {
  const args = {}
  const supportedArgs = ['src-file', 'tmpl-file', 'out-file', 'src-file-tiles-offset']

  process.argv.forEach((x) => {
    for (const arg of supportedArgs) {
      const [key, value] = x.split('=', 2)
      if (key === `--${arg}`) {
        args[arg] = value
      }
    }
  })

  if (Object.keys(args).length !== supportedArgs.length) {
    throw new Error('Wrong number of arguments')
  }

  args['src-file-tiles-offset'] = parseInt(args['src-file-tiles-offset'], 16)
  if (!args['src-file-tiles-offset']) {
    throw new Error('Wrong format of --src-file-tiles-offset')
  }

  return args
}
