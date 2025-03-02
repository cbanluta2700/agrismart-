/**
 * Setup Demo Environment for AgriSmart Platform
 * 
 * This script installs necessary dependencies and sets up the environment
 * for demonstrating the AgriSmart platform with mock data.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up demo environment for AgriSmart platform...');

// Check if package.json exists and modify it
const packageJsonPath = path.join(__dirname, '..', 'package.json');
let packageJson = {};

if (fs.existsSync(packageJsonPath)) {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} else {
  console.log('Creating package.json...');
  packageJson = {
    name: 'agrismart-demo',
    version: '1.0.0',
    description: 'Demo for AgriSmart platform with mock data',
    scripts: {},
    dependencies: {},
    devDependencies: {}
  };
}

// Add demo-related scripts
packageJson.scripts = {
  ...packageJson.scripts,
  'generate-mock-data': 'node scripts/generate-mock-data.js',
  'start-mock-api': 'node scripts/mock-api-server.js',
  'demo': 'npm run generate-mock-data && npm run start-mock-api'
};

// Add required dependencies if not already present
const requiredDependencies = {
  express: '^4.18.2',
  cors: '^2.8.5',
  uuid: '^9.0.0'
};

packageJson.dependencies = {
  ...packageJson.dependencies,
  ...requiredDependencies
};

// Write the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json with demo scripts and dependencies');

// Install dependencies
try {
  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
}

// Update .env.local file with mock API URL
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Add or update the NEXT_PUBLIC_API_URL variable
if (!envContent.includes('NEXT_PUBLIC_MOCK_API_URL')) {
  envContent += '\n# Mock API for demo purposes\nNEXT_PUBLIC_MOCK_API_URL=http://localhost:3001\n';
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env.local with mock API URL');
}

// Create a demo.md file with instructions
const demoInstructionsPath = path.join(__dirname, '..', 'DEMO.md');
const demoInstructions = `# AgriSmart Platform Demo

This document provides instructions for running a demonstration of the AgriSmart platform with mock data.

## Setup

1. Run the setup script:
   \`\`\`
   node scripts/setup-demo.js
   \`\`\`

2. Generate mock data:
   \`\`\`
   npm run generate-mock-data
   \`\`\`

3. Start the mock API server:
   \`\`\`
   npm run start-mock-api
   \`\`\`

   Or run both steps 2 and 3 together:
   \`\`\`
   npm run demo
   \`\`\`

4. In a separate terminal, start the Next.js application:
   \`\`\`
   npm run dev
   \`\`\`

## Demo Pages

### Database Dashboard
- **URL**: http://localhost:3000/admin/database
- **Description**: Overview of database health, metrics, and access to migration tools

### Migration Control Page
- **URL**: http://localhost:3000/admin/database/migrate
- **Description**: Interface for managing and monitoring the migration of conversations from Vercel KV to MongoDB
- **Demo Features**:
  - Start migration with configurable parameters
  - Monitor real-time progress with live logs
  - View error summaries and failed conversations
  - Retry failed conversations
  - Cancel in-progress migrations

### MongoDB Connection Pooling
- Implemented in the backend with the following configuration:
  - maxPoolSize: 10 connections
  - minPoolSize: 5 connections  
  - maxIdleTimeMS: 30000 ms (connections auto-closed after 30s of inactivity)
  - connectTimeoutMS: 5000 ms
  - socketTimeoutMS: 30000 ms

### Database Performance Monitoring
- View real-time metrics on database operations
- Monitor connection health for all database systems
- Track slow queries and response times

## Interactive Demo Scenarios

1. **Start a Database Migration**:
   - Navigate to the Migration Control Page
   - Configure batch size and other options
   - Click "Start Migration"
   - Watch the real-time progress and logs

2. **Handle Migration Errors**:
   - If a migration fails, view the error summary
   - Click "Retry Failed Conversations" to attempt recovery
   - Monitor the retry progress

3. **Cancel a Migration**:
   - During an active migration, click "Cancel Migration"
   - Observe the cancellation process and final state

4. **View Database Metrics**:
   - Navigate to the Database Dashboard
   - Check connection health for MongoDB and PostgreSQL
   - Review operation counts and slow queries

## Implementation Notes

This demo uses mock data to simulate the behavior of the database migration system. In a production environment, the system would interact with actual Vercel KV and MongoDB instances.

The mock API server simulates the following endpoints:
- \`/api/admin/migration-status\`: Get current migration status
- \`/api/admin/start-migration\`: Start a new migration
- \`/api/admin/cancel-migration\`: Cancel an in-progress migration
- \`/api/admin/retry-failed-conversations\`: Retry previously failed conversations
- \`/api/admin/database-metrics\`: Get database performance metrics
- \`/api/admin/database-status\`: Get database connection status
`;

fs.writeFileSync(demoInstructionsPath, demoInstructions);
console.log('✅ Created DEMO.md with instructions');

// Create README
const readmePath = path.join(__dirname, '..', 'README.md');
if (!fs.existsSync(readmePath)) {
  const readme = `# AgriSmart Platform

AgriSmart is a comprehensive platform for the agricultural industry, providing marketplace, chat, and forum features to connect farmers, suppliers, and consumers.

## Architecture

The platform uses a hybrid database architecture:
- MongoDB for chat conversations and high-volume data
- PostgreSQL for user identity, marketplace data, and analytics

## Key Features

1. **Marketplace**
   - Product listings with search and filtering
   - Order management and checkout
   - Rating and review system

2. **Chat System**
   - Real-time messaging between users
   - AI-assisted responses
   - Conversation history with MongoDB storage

3. **Forum**
   - Discussion groups by topic
   - Post creation and commenting
   - Moderation tools

4. **Admin Dashboard**
   - Database monitoring and migration tools
   - User management
   - Content moderation
   - Analytics and reporting

## Development

For local development:

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Set up environment variables:
   Copy .env.example to .env.local and fill in required values

3. Run the development server:
   \`\`\`
   npm run dev
   \`\`\`

## Demo

For demonstration purposes, see [DEMO.md](./DEMO.md) for instructions on setting up and running the demo environment with mock data.
`;

  fs.writeFileSync(readmePath, readme);
  console.log('✅ Created README.md');
}

console.log('\n✅ Demo environment setup complete!');
console.log('\nTo run the demo:');
console.log('1. Generate mock data: npm run generate-mock-data');
console.log('2. Start mock API server: npm run start-mock-api');
console.log('3. Or run both together: npm run demo');
console.log('\nSee DEMO.md for detailed instructions and demo scenarios');
