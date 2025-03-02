import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🚀 Starting database migration for appeal notifications...')
    
    // Run the Prisma migration
    console.log('📦 Running Prisma migration...')
    await execAsync('npx prisma migrate deploy')
    
    console.log('✅ Migration completed successfully!')
    
    // Generate new Prisma client
    console.log('🔄 Generating updated Prisma client...')
    await execAsync('npx prisma generate')
    
    console.log('✨ Database migration completed successfully!')
    console.log('👉 You can now use the new ModerationAppealNotification model in your application.')
    
    // Additional information
    console.log('\n🔍 Migration Details:')
    console.log('- Added ModerationAppealNotification model')
    console.log('- Created relationship with ModerationAppeal model')
    console.log('- Added indexes for improved query performance')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('❌ Unhandled error:', error)
    process.exit(1)
  })
