import { exec } from 'child_process'
import util from 'util'
import fs from 'fs'
const execAsync = util.promisify(exec)

export default defineEventHandler(async () => {
  const filename = `/tmp/db-dump-${Date.now()}.sql.gz`

  try {
    // example using Drush to dump DB inside Acquia or a local clone
    await execAsync(`drush sql-dump --gzip --result-file=${filename}`)

    const stats = fs.statSync(filename)
    return {
      message: 'Database dump complete',
      filename,
      lastPulled: stats.mtime,
    }
  } catch (err) {
    console.error(err)
    throw createError({ statusCode: 500, statusMessage: 'Database dump failed' })
  }
})
