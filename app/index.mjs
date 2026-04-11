import {app} from './app.mjs'
import {parseArgs} from './parseArgs.mjs'

try {
  const args = parseArgs()
  app(args)
} catch (e) {
  console.error(e.message)
}
