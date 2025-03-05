#!/usr/bin/env node

/**
 * Manual Travis CI Setup Script
 * 
 * This script helps set up Travis CI integration without requiring the Travis CLI.
 * It provides guidance on how to manually configure Travis CI with your GitHub repository.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log(`\n${colors.magenta}🚀 Manual Travis CI Setup for AgriSmart${colors.reset}\n`);
  
  // Step 1: Check if .travis.yml exists
  const travisYmlPath = path.resolve(process.cwd(), '.travis.yml');
  if (fs.existsSync(travisYmlPath)) {
    console.log(`${colors.green}✅ .travis.yml file found${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ .travis.yml file not found. Creating a template...${colors.reset}`);
    
    const template = `language: node_js
node_js:
  - 18

cache:
  npm: true
  directories:
    - .next/cache

branches:
  only:
    - main

before_install:
  - npm i -g vercel

script:
  - npm run lint
  - npm run test:frontend
  - npm run test:backend
  - npm run build

deploy:
  provider: script
  script: vercel --token $VERCEL_TOKEN --prod --scope banlutas-projects --confirm
  skip_cleanup: true
  on:
    branch: main

env:
  global:
    - secure: "YOUR_ENCRYPTED_VERCEL_TOKEN"
    - VERCEL_PROJECT_ID=prj_kfV8M6X7bG6dSZgYOOjmVAgAepr8
    - VERCEL_ORG_ID=banlutas-projects
`;
    
    fs.writeFileSync(travisYmlPath, template);
    console.log(`${colors.green}✅ Created .travis.yml template${colors.reset}`);
  }

  // Step 2: Get Vercel token
  console.log(`\n${colors.cyan}=== Set up Vercel Token ===${colors.reset}`);
  console.log(`${colors.yellow}You'll need a Vercel token for deployments.${colors.reset}`);
  console.log(`Get one at: ${colors.blue}https://vercel.com/account/tokens${colors.reset}`);
  
  const vercelToken = await question(`Enter your Vercel token (or press Enter to skip): `);
  if (vercelToken) {
    console.log(`\n${colors.cyan}=== Manual Encryption Instructions ===${colors.reset}`);
    console.log(`${colors.yellow}Since we're not using the Travis CLI, you'll need to manually add your Vercel token to Travis CI:${colors.reset}`);
    console.log(`\n1. Go to ${colors.blue}https://travis-ci.com/github/cbanluta2700/agrismart-/settings${colors.reset}`);
    console.log(`2. Scroll down to "Environment Variables" section`);
    console.log(`3. Add a new variable:`);
    console.log(`   - Name: ${colors.cyan}VERCEL_TOKEN${colors.reset}`);
    console.log(`   - Value: ${colors.cyan}${vercelToken}${colors.reset}`);
    console.log(`   - Make sure "Display value in build log" is OFF`);
    console.log(`4. Click "Add"`);
    
    console.log(`\n${colors.green}When you've done this, update your .travis.yml file to remove the 'secure' line and just use the environment variable directly.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}Skipping Vercel token configuration${colors.reset}`);
  }

  // Step 3: Configure GitHub repository on Travis CI
  console.log(`\n${colors.cyan}=== Configure Travis CI with GitHub ===${colors.reset}`);
  console.log(`${colors.yellow}Follow these steps to connect Travis CI to your GitHub repository:${colors.reset}`);
  console.log(`\n1. Go to ${colors.blue}https://travis-ci.com/account/repositories${colors.reset}`);
  console.log(`2. Click "Manage repositories on GitHub"`);
  console.log(`3. Install Travis CI on your GitHub account or select the specific repository`);
  console.log(`4. Find "cbanluta2700/agrismart-" in the list`);
  console.log(`5. Toggle the switch to enable Travis CI for this repository`);
  console.log(`6. Click "Approve & Install"`);

  // Step 4: Trigger a build
  console.log(`\n${colors.cyan}=== Trigger Your First Build ===${colors.reset}`);
  console.log(`${colors.yellow}To trigger your first build, push a commit to your GitHub repository:${colors.reset}`);
  console.log(`\n1. Make some changes (like updating the .travis.yml file)`);
  console.log(`2. Commit and push the changes:`);
  console.log(`   ${colors.cyan}git add .travis.yml${colors.reset}`);
  console.log(`   ${colors.cyan}git commit -m "Configure Travis CI"${colors.reset}`);
  console.log(`   ${colors.cyan}git push origin main${colors.reset}`);
  console.log(`3. Go to ${colors.blue}https://travis-ci.com/github/cbanluta2700/agrismart-${colors.reset} to see your build`);

  console.log(`\n${colors.green}✅ Travis CI setup guide completed${colors.reset}`);
  console.log(`${colors.green}Follow the instructions above to complete the setup process manually.${colors.reset}`);

  rl.close();
}

main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
