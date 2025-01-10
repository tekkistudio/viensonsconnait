const { PrismaClient } = require('@prisma/client')
const { Client } = require('pg')

async function testConnections() {
  // Test direct PostgreSQL connection first
  const pgClient = new Client({
    connectionString: process.env.DIRECT_URL
  })

  try {
    console.log('Testing direct PostgreSQL connection...')
    await pgClient.connect()
    console.log('PostgreSQL connection successful!')
    const result = await pgClient.query('SELECT version()')
    console.log('PostgreSQL version:', result.rows[0].version)
  } catch (error) {
    console.error('PostgreSQL connection failed:', error)
  } finally {
    await pgClient.end()
  }

  // Test Prisma connection
  const prisma = new PrismaClient()
  try {
    console.log('\nTesting Prisma connection...')
    await prisma.$connect()
    console.log('Prisma connection successful!')
  } catch (error) {
    console.error('Prisma connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnections().catch(console.error)