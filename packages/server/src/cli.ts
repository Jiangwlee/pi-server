#!/usr/bin/env node
import { initDb } from './db.js'
import { UserStore } from './stores/user-store.js'
import bcrypt from 'bcrypt'
import path from 'node:path'

const args = process.argv.slice(2)
const command = args[0]

function getFlag(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : undefined
}

const dataDir = process.env.PI_SERVER_DATA ?? './data'
const dbPath = path.join(dataDir, 'pi-server.db')

async function main() {
  if (!command) {
    printUsage()
    process.exit(1)
  }

  const db = initDb(dbPath)
  const userStore = new UserStore(db)

  switch (command) {
    case 'add-user': {
      const email = getFlag('--email')
      const password = getFlag('--password')
      const login = getFlag('--login')
      if (!email || !password || !login) {
        console.error('Usage: pi-server add-user --email <email> --password <password> --login <displayName>')
        process.exit(1)
      }
      const existing = userStore.findByEmail(email)
      if (existing) {
        console.error(`User with email ${email} already exists`)
        process.exit(1)
      }
      const hash = await bcrypt.hash(password, 10)
      const user = userStore.createUser({
        email,
        authProvider: 'email',
        authProviderId: email,
        displayName: login,
        passwordHash: hash,
      })
      console.log(`Created user: ${user.id} (${user.displayName})`)
      break
    }

    case 'list-users': {
      const users = userStore.listAll()
      if (users.length === 0) {
        console.log('No users found')
        break
      }
      console.log('ID\tProvider\tEmail\tDisplay Name\tCreated')
      for (const u of users) {
        console.log(`${u.id}\t${u.authProvider}\t${u.email ?? '-'}\t${u.displayName}\t${u.createdAt}`)
      }
      break
    }

    case 'reset-password': {
      const email = getFlag('--email')
      const password = getFlag('--password')
      if (!email || !password) {
        console.error('Usage: pi-server reset-password --email <email> --password <newPassword>')
        process.exit(1)
      }
      const user = userStore.findByEmail(email)
      if (!user) {
        console.error(`User with email ${email} not found`)
        process.exit(1)
      }
      const hash = await bcrypt.hash(password, 10)
      userStore.updatePasswordHash(user.id, hash)
      console.log(`Password reset for ${email}`)
      break
    }

    default:
      console.error(`Unknown command: ${command}`)
      printUsage()
      process.exit(1)
  }

  db.close()
}

function printUsage() {
  console.log(`
Usage: pi-server <command>

Commands:
  add-user      --email <email> --password <password> --login <displayName>
  list-users
  reset-password --email <email> --password <newPassword>
`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
