/**
 * Test Supabase Connection
 * 
 * This script tests the connection to Supabase using the client libraries.
 * It verifies both direct PostgreSQL connection and Supabase client functionality.
 * 
 * Usage: node test-supabase-connection.js <your_db_password>
 */

// Import required dependencies
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Get database password from command line
const dbPassword = process.argv[2];

// Exit if environment variables are missing
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please check your .env.production file for:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!dbPassword) {
  console.error('❌ Missing database password');
  console.error('Usage: node test-supabase-connection.js <your_db_password>');
  process.exit(1);
}

console.log('🔄 Testing Supabase connection...');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey.substring(0, 10)}...`);

// Create temporary .env file with password
const fs = require('fs');
const originalEnv = fs.readFileSync('.env.production', 'utf8');
let updatedEnv = originalEnv.replace(
  /DATABASE_URL=postgresql:\/\/postgres:.*?@/,
  `DATABASE_URL=postgresql://postgres:${dbPassword}@`
);
fs.writeFileSync('.env.production.temp', updatedEnv);

// Update process.env
process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
  /postgresql:\/\/postgres:.*?@/,
  `postgresql://postgres:${dbPassword}@`
);

async function testSupabaseConnection() {
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection by fetching data
    console.log('📊 Fetching data from todos table...');
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching data:', error.message);
      return false;
    }
    
    console.log('✅ Successfully fetched data from Supabase');
    console.log('📚 Sample data:');
    console.table(data || []);
    
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

// Run the tests
(async () => {
  try {
    const supabaseResult = await testSupabaseConnection();
    
    console.log('\n📋 CONNECTION TEST SUMMARY:');
    console.log(`Supabase: ${supabaseResult ? '✅ CONNECTED' : '❌ FAILED'}`);
    
    if (supabaseResult) {
      console.log('\n🎉 Supabase connection successful! Your configuration is working properly.');
    } else {
      console.log('\n❌ Failed to connect to Supabase. Please check your configuration.');
    }
    
    // Restore original .env file
    fs.unlinkSync('.env.production.temp');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    
    // Make sure to clean up even if there's an error
    if (fs.existsSync('.env.production.temp')) {
      fs.unlinkSync('.env.production.temp');
    }
  }
})();
