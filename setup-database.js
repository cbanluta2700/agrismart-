/**
 * Database Setup Script for AgriSmart
 * 
 * This script helps configure the database for the AgriSmart platform.
 * Run this script using: node setup-database.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to environment files
const envExamplePath = path.join(__dirname, '.env.example');
const envPath = path.join(__dirname, '.env');

/**
 * Promisified version of exec
 */
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`Command stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

/**
 * Ask for database configuration
 */
async function configureDatabase() {
  return new Promise((resolve) => {
    console.log('\n===== Database Configuration =====');
    rl.question('PostgreSQL Host (default: localhost): ', (host) => {
      host = host || 'localhost';
      
      rl.question('PostgreSQL Port (default: 5432): ', (port) => {
        port = port || '5432';
        
        rl.question('PostgreSQL User (default: postgres): ', (user) => {
          user = user || 'postgres';
          
          rl.question('PostgreSQL Password: ', (password) => {
            
            rl.question('PostgreSQL Database Name (default: agrismart): ', (dbname) => {
              dbname = dbname || 'agrismart';
              
              const config = {
                host,
                port,
                user,
                password,
                dbname
              };
              
              resolve(config);
            });
          });
        });
      });
    });
  });
}

/**
 * Update or create .env file with database configuration
 */
async function updateEnvFile(dbConfig) {
  try {
    // Read the example env file
    let envContent = fs.existsSync(envExamplePath) 
      ? fs.readFileSync(envExamplePath, 'utf8')
      : '';
    
    // Read existing .env file if it exists
    let currentEnvContent = '';
    if (fs.existsSync(envPath)) {
      currentEnvContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Construct the database URL
    const dbUrl = `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.dbname}?schema=public`;
    
    // If .env exists, update the DATABASE_URL
    if (currentEnvContent) {
      // Check if DATABASE_URL already exists in the file
      if (currentEnvContent.includes('DATABASE_URL=')) {
        // Replace the existing DATABASE_URL
        currentEnvContent = currentEnvContent.replace(
          /DATABASE_URL=.*(\r?\n|$)/,
          `DATABASE_URL="${dbUrl}"$1`
        );
      } else {
        // Add DATABASE_URL if it doesn't exist
        currentEnvContent += `\n# Database\nDATABASE_URL="${dbUrl}"\n`;
      }
      
      // Write the updated content back to .env
      fs.writeFileSync(envPath, currentEnvContent);
    } else {
      // Create a new .env file from the example
      envContent = envContent.replace(
        /DATABASE_URL=.*(\r?\n|$)/,
        `DATABASE_URL="${dbUrl}"$1`
      );
      
      if (!envContent.includes('DATABASE_URL=')) {
        // Add DATABASE_URL if it's not in the example
        envContent += `\n# Database\nDATABASE_URL="${dbUrl}"\n`;
      }
      
      // Write the new .env file
      fs.writeFileSync(envPath, envContent);
    }
    
    console.log('\n✅ Database configuration updated in .env file');
    return true;
  } catch (error) {
    console.error('Error updating .env file:', error.message);
    return false;
  }
}

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    console.log('\n===== Running Database Migrations =====');
    console.log('Running prisma migrate dev...');
    
    await execPromise('npx prisma migrate dev --name add_analytics_model');
    
    console.log('\n✅ Database migrations completed successfully');
    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    return false;
  }
}

/**
 * Generate Prisma client
 */
async function generatePrismaClient() {
  try {
    console.log('\n===== Generating Prisma Client =====');
    console.log('Running prisma generate...');
    
    await execPromise('npx prisma generate');
    
    console.log('\n✅ Prisma client generated successfully');
    return true;
  } catch (error) {
    console.error('Error generating Prisma client:', error);
    return false;
  }
}

/**
 * Main function to run the setup process
 */
async function main() {
  console.log('=================================================');
  console.log('            AgriSmart Database Setup             ');
  console.log('=================================================');
  
  // Get database configuration
  const dbConfig = await configureDatabase();
  
  // Update .env file
  const envUpdated = await updateEnvFile(dbConfig);
  
  if (envUpdated) {
    // Run migrations
    const migrationsSuccessful = await runMigrations();
    
    if (migrationsSuccessful) {
      // Generate Prisma client
      await generatePrismaClient();
    }
  }
  
  console.log('\n=================================================');
  console.log('             Setup Process Completed              ');
  console.log('=================================================');
  
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error('Setup failed:', error);
  rl.close();
});
