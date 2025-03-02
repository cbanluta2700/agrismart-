/**
 * Database Deployment Script for AgriSmart Platform
 * 
 * This script handles database migrations during deployment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting database deployment for AgriSmart platform...');

try {
  // Generate Prisma client
  console.log('Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Deploy database migrations
  console.log('Deploying database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('✅ Database deployment completed successfully!');
} catch (error) {
  console.error('❌ Error during database deployment:', error.message);
  process.exit(1);
}
