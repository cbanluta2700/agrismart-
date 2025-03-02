#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.production') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function exec(command) {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`${colors.red}Command failed: ${command}${colors.reset}`);
    throw error;
  }
}

function checkEnvironmentVariables() {
  const requiredVars = [
    'MONGODB_URI',
    'MONGODB_DB_NAME',
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`${colors.red}ERROR: The following required environment variables are missing:${colors.reset}`);
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error(`${colors.yellow}Please ensure all required variables are set in .env.production${colors.reset}`);
    process.exit(1);
  }
}

function deployToVercel() {
  console.log(`\n${colors.cyan}=== Deploying to Vercel ===${colors.reset}\n`);
  
  // Check if VERCEL_TOKEN is set (for CI/CD deployment)
  if (process.env.VERCEL_TOKEN) {
    console.log(`${colors.green}Using VERCEL_TOKEN for authenticated deployment${colors.reset}`);
    exec(`vercel --token ${process.env.VERCEL_TOKEN} --prod`);
  } else {
    // For manual deployment
    console.log(`${colors.yellow}No VERCEL_TOKEN found, proceeding with interactive deployment${colors.reset}`);
    exec('vercel --prod');
  }
}

try {
  console.log(`\n${colors.magenta}🚀 Starting deployment process for AgriSmart platform${colors.reset}\n`);
  
  // Step 1: Check environment variables
  console.log(`${colors.cyan}=== Checking environment variables ===${colors.reset}`);
  checkEnvironmentVariables();
  console.log(`${colors.green}✅ All required environment variables found${colors.reset}`);
  
  // Step 2: Generate Prisma client
  console.log(`\n${colors.cyan}=== Generating Prisma client ===${colors.reset}`);
  exec('npx prisma generate');
  console.log(`${colors.green}✅ Prisma client generated${colors.reset}`);
  
  // Step 3: Build the application
  console.log(`\n${colors.cyan}=== Building application ===${colors.reset}`);
  exec('npm run build');
  console.log(`${colors.green}✅ Build completed successfully${colors.reset}`);
  
  // Step 4: Deploy to Vercel
  deployToVercel();
  
  console.log(`\n${colors.green}🎉 Deployment process completed successfully!${colors.reset}`);
} catch (error) {
  console.error(`\n${colors.red}❌ Deployment failed${colors.reset}`);
  process.exit(1);
}
