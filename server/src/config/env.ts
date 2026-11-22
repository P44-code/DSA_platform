import dotenv from 'dotenv'

const envFile = process.env.ENV_FILE?.trim()

dotenv.config({
  path: envFile ? envFile : new URL('../../.env', import.meta.url),
})
