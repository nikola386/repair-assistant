/**
 * Script to create a new user for the ticketing system
 * 
 * Usage: 
 *   npx tsx scripts/create-user.ts <email> <password> [name]
 * 
 * Example:
 *   npx tsx scripts/create-user.ts admin@example.com mypassword123 "Admin User"
 * 
 * Note: Requires tsx to be installed: npm install -g tsx
 */

import { userStorage } from '../lib/userStorage'

async function createUser() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.error('Usage: npx ts-node scripts/create-user.ts <email> <password> [name]')
    process.exit(1)
  }

  const [email, password, name] = args

  try {
    // Check if user already exists
    const existingUser = await userStorage.findByEmail(email)
    if (existingUser) {
      console.error(`User with email ${email} already exists`)
      process.exit(1)
    }

    // Create user
    const user = await userStorage.create({
      email,
      password,
      name: name || undefined,
    })

    console.log(`User created successfully!`)
    console.log(`ID: ${user.id}`)
    console.log(`Email: ${user.email}`)
    console.log(`Name: ${user.name || 'N/A'}`)
  } catch (error) {
    console.error('Error creating user:', error)
    process.exit(1)
  }
}

createUser()

