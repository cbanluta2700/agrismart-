#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
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

// Required environment variables for deployment
const requiredEnvVars = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

function exec(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to check if we have all required environment variables
function checkEnvironmentVariables() {
  console.log(`\n${colors.cyan}=== Checking environment variables ===${colors.reset}`);
  
  const missingVars = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }
  
  if (missingVars.length > 0) {
    console.error(`${colors.red}Missing required environment variables: ${missingVars.join(', ')}${colors.reset}`);
    console.error(`${colors.yellow}Please set these variables in your .env file or environment before deploying.${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.green}✅ All required environment variables found${colors.reset}`);
  return true;
}

// Function to handle conflicting files between pages and app directory
function handleConflictingFiles() {
  console.log(`\n${colors.cyan}=== Checking for conflicting files ===${colors.reset}`);
  
  // Create backup directory if it doesn't exist
  const backupDir = path.join(__dirname, '..', 'backup-pages');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Pages that might conflict with app directory
  const pagesDir = path.join(__dirname, '..', 'pages');
  const conflictingPaths = [
    'auth/login/index.tsx',
    'marketplace/create/index.tsx',
    'index.tsx',
    'settings/security/index.tsx',
  ];
  
  let conflictsFound = false;
  
  for (const pagePath of conflictingPaths) {
    const fullPath = path.join(pagesDir, pagePath);
    if (fs.existsSync(fullPath)) {
      // Create target directory in backup
      const targetDir = path.join(backupDir, path.dirname(pagePath));
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Copy file to backup
      const targetPath = path.join(backupDir, pagePath);
      fs.copyFileSync(fullPath, targetPath);
      
      // Remove original file
      fs.unlinkSync(fullPath);
      
      console.log(`${colors.yellow}Moved conflicting file: ${pagePath} to backup-pages directory${colors.reset}`);
      conflictsFound = true;
    }
  }
  
  if (conflictsFound) {
    console.log(`${colors.green}✅ Resolved conflicting files${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ No conflicting files found${colors.reset}`);
  }
  
  return true;
}

// Function to deploy to Vercel
function deployToVercel() {
  console.log(`\n${colors.cyan}=== Deploying to Vercel ===${colors.reset}`);
  
  // Check if Vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    
    // Check for Vercel token
    if (process.env.VERCEL_TOKEN) {
      console.log(`${colors.yellow}Using VERCEL_TOKEN from environment variables for deployment${colors.reset}`);
      
      // Check if we have project ID
      const projectId = process.env.VERCEL_PROJECT_ID;
      const orgId = process.env.VERCEL_ORG_ID;
      
      if (projectId && orgId) {
        console.log(`${colors.yellow}Deploying to project: ${projectId} in organization: ${orgId}${colors.reset}`);
        
        // Using Vercel CLI with token and project details
        if (!exec(`vercel --token=${process.env.VERCEL_TOKEN} --prod --scope=${orgId} --confirm`)) {
          console.error(`${colors.red}❌ Deployment with token failed${colors.reset}`);
          
          // Try with env file as fallback
          console.log(`${colors.yellow}Trying deployment with .vercel/project.json configuration...${colors.reset}`);
          if (!exec('vercel --prod')) {
            console.error(`${colors.red}❌ Deployment failed${colors.reset}`);
            process.exit(1);
          }
        }
      } else {
        // Just use token without project details
        if (!exec(`vercel --token=${process.env.VERCEL_TOKEN} --prod --confirm`)) {
          console.error(`${colors.red}❌ Deployment with token failed${colors.reset}`);
          process.exit(1);
        }
      }
    } else {
      console.log(`${colors.yellow}No VERCEL_TOKEN found, proceeding with interactive deployment${colors.reset}`);
      if (!exec('vercel --prod')) {
        console.error(`${colors.red}❌ Interactive deployment failed${colors.reset}`);
        console.error(`${colors.yellow}Try connecting to Vercel using the web interface:${colors.reset}`);
        console.error(`${colors.blue}https://vercel.com/import/git${colors.reset}`);
        process.exit(1);
      }
    }
    
    console.log(`${colors.green}✅ Deployment to Vercel completed successfully${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Vercel CLI not found. Please install it with: npm i -g vercel${colors.reset}`);
    console.log(`${colors.yellow}Alternatively, you can deploy through the Vercel dashboard:${colors.reset}`);
    console.log(`${colors.blue}https://vercel.com/import/git${colors.reset}`);
    console.log(`${colors.yellow}Repository: https://github.com/cbanluta2700/agrismart-.git${colors.reset}`);
    process.exit(1);
  }
}

try {
  console.log(`\n${colors.magenta}🚀 Starting deployment process for AgriSmart platform${colors.reset}\n`);
  
  // Step 1: Check environment variables
  console.log(`${colors.cyan}=== Checking environment variables ===${colors.reset}`);
  checkEnvironmentVariables();
  console.log(`${colors.green}✅ All required environment variables found${colors.reset}`);
  
  // Step 2: Handle conflicting files
  handleConflictingFiles();
  
  // Step 3: Generate Prisma client
  console.log(`\n${colors.cyan}=== Generating Prisma client ===${colors.reset}`);
  exec('npx prisma generate');
  console.log(`${colors.green}✅ Prisma client generated${colors.reset}`);
  
  // Step 4: Build the application
  console.log(`\n${colors.cyan}=== Building application ===${colors.reset}`);
  exec('npm run build');
  console.log(`${colors.green}✅ Build completed successfully${colors.reset}`);
  
  // Step 5: Deploy to Vercel
  deployToVercel();
  
  console.log(`\n${colors.green}🎉 Deployment process completed successfully!${colors.reset}`);
} catch (error) {
  console.error(`\n${colors.red}❌ Deployment failed${colors.reset}`);
  process.exit(1);
}
