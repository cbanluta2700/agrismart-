#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function exec(command, options = {}) {
  try {
    return execSync(command, { stdio: options.silent ? 'pipe' : 'inherit', ...options });
  } catch (error) {
    console.error(`${colors.red}Command failed: ${command}${colors.reset}`);
    if (options.exitOnError !== false) {
      process.exit(1);
    }
    throw error;
  }
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log(`\n${colors.magenta}🚀 Travis CI Setup for AgriSmart${colors.reset}\n`);
  
  // Step 1: Check if Travis CLI is installed
  console.log(`${colors.cyan}=== Checking for Travis CLI ===${colors.reset}`);
  try {
    exec('travis version', { silent: true });
    console.log(`${colors.green}✅ Travis CLI is installed${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}Travis CLI is not installed. You'll need to install it:${colors.reset}`);
    console.log(`Run: ${colors.cyan}gem install travis${colors.reset}`);
    
    const installTravis = await question(`Do you want to try installing Travis CLI now? (y/n): `);
    if (installTravis.toLowerCase() === 'y') {
      try {
        exec('gem install travis');
        console.log(`${colors.green}✅ Travis CLI installed successfully${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}Failed to install Travis CLI. Please install it manually.${colors.reset}`);
        process.exit(1);
      }
    } else {
      console.log(`${colors.yellow}Please install Travis CLI manually and run this script again.${colors.reset}`);
      process.exit(0);
    }
  }

  // Step 2: Login to Travis
  console.log(`\n${colors.cyan}=== Login to Travis CI ===${colors.reset}`);
  console.log(`${colors.yellow}You'll need a GitHub personal access token for this step.${colors.reset}`);
  console.log(`Get one at: ${colors.blue}https://github.com/settings/tokens${colors.reset}`);
  
  const githubToken = await question(`Enter your GitHub token: `);
  if (!githubToken) {
    console.error(`${colors.red}No GitHub token provided. Exiting.${colors.reset}`);
    process.exit(1);
  }
  
  try {
    exec(`travis login --github-token ${githubToken} --com`);
    console.log(`${colors.green}✅ Logged in to Travis CI${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to login to Travis CI. Please check your token and try again.${colors.reset}`);
    process.exit(1);
  }

  // Step 3: Get Vercel token
  console.log(`\n${colors.cyan}=== Set up Vercel Token ===${colors.reset}`);
  console.log(`${colors.yellow}You'll need a Vercel token for deployments.${colors.reset}`);
  console.log(`Get one at: ${colors.blue}https://vercel.com/account/tokens${colors.reset}`);
  
  const vercelToken = await question(`Enter your Vercel token: `);
  if (!vercelToken) {
    console.error(`${colors.red}No Vercel token provided. Exiting.${colors.reset}`);
    process.exit(1);
  }
  
  // Step 4: Encrypt Vercel token for Travis
  console.log(`\n${colors.cyan}=== Set up Travis Encryption ===${colors.reset}`);
  
  const repoSlug = 'cbanluta2700/agrismart-';
  console.log(`Using repository: ${colors.blue}${repoSlug}${colors.reset}`);
  
  try {
    // Check if repo is already activated
    exec(`travis settings --repo ${repoSlug} --com`, { silent: true, exitOnError: false });
    
    // Add the encrypted environment variable
    exec(`travis env set VERCEL_TOKEN ${vercelToken} --repo ${repoSlug} --com`);
    console.log(`${colors.green}✅ Added encrypted VERCEL_TOKEN to Travis CI${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}Need to initialize Travis CI for this repository first${colors.reset}`);
    
    const syncTravis = await question(`Do you want to sync Travis CI with GitHub? (y/n): `);
    if (syncTravis.toLowerCase() === 'y') {
      try {
        exec(`travis sync --com`);
        console.log(`${colors.green}✅ Travis CI synced with GitHub${colors.reset}`);
        
        console.log(`${colors.yellow}Now enabling repository in Travis CI...${colors.reset}`);
        exec(`travis enable --repo ${repoSlug} --com`);
        console.log(`${colors.green}✅ Enabled repository in Travis CI${colors.reset}`);
        
        // Now add the environment variable
        exec(`travis env set VERCEL_TOKEN ${vercelToken} --repo ${repoSlug} --com`);
        console.log(`${colors.green}✅ Added encrypted VERCEL_TOKEN to Travis CI${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}Failed to set up Travis CI for this repository. Please do it manually:${colors.reset}`);
        console.log(`1. Go to ${colors.blue}https://travis-ci.com/account/repositories${colors.reset}`);
        console.log(`2. Find and enable the repository`);
        console.log(`3. Go to repository settings and add VERCEL_TOKEN environment variable`);
        process.exit(1);
      }
    } else {
      console.log(`${colors.yellow}Please set up Travis CI manually:${colors.reset}`);
      console.log(`1. Go to ${colors.blue}https://travis-ci.com/account/repositories${colors.reset}`);
      console.log(`2. Find and enable the repository`);
      console.log(`3. Go to repository settings and add VERCEL_TOKEN environment variable`);
      process.exit(0);
    }
  }

  // Step 5: Finalize
  console.log(`\n${colors.green}🎉 Travis CI setup completed successfully!${colors.reset}`);
  console.log(`\n${colors.cyan}=== Next Steps ===${colors.reset}`);
  console.log(`1. Push your code to GitHub:`);
  console.log(`   ${colors.blue}git add .${colors.reset}`);
  console.log(`   ${colors.blue}git commit -m "Set up Travis CI"${colors.reset}`);
  console.log(`   ${colors.blue}git push${colors.reset}`);
  console.log(`2. Check your build status at: ${colors.blue}https://travis-ci.com/github/${repoSlug}${colors.reset}`);
  console.log(`3. Travis CI will automatically deploy your app to Vercel when you push to the main branch`);

  rl.close();
}

main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
