/**
 * MongoDB Atlas Connection Test
 * 
 * This script uses the official MongoDB Atlas connection code
 * to test connectivity to your MongoDB Atlas cluster.
 */

const { MongoClient, ServerApiVersion } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.production') });

// Get connection string from environment variables
// Replace <db_password> placeholder with actual password from command line args
let uri = process.env.MONGODB_URI;
const password = process.argv[2] || '<your_password>';
uri = uri.replace('<db_password>', password);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  console.log("Connecting to MongoDB Atlas...");
  console.log(`Connection string: ${uri.replace(password, '********')}`);
  
  try {
    // Connect the client to the server
    await client.connect();
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
    // List all available databases
    const dbList = await client.db().admin().listDatabases();
    console.log("\nAvailable databases:");
    dbList.databases.forEach(db => {
      console.log(` - ${db.name}`);
    });
    
    // Check if our application database exists
    const appDbName = process.env.MONGODB_DB_NAME;
    console.log(`\nChecking for application database '${appDbName}'...`);
    
    const dbExists = dbList.databases.some(db => db.name === appDbName);
    if (dbExists) {
      console.log(`✅ Database '${appDbName}' exists!`);
      
      // List collections in the application database
      const collections = await client.db(appDbName).listCollections().toArray();
      if (collections.length > 0) {
        console.log(`\nCollections in '${appDbName}':`);
        collections.forEach(collection => {
          console.log(` - ${collection.name}`);
        });
      } else {
        console.log(`\nNo collections found in '${appDbName}'. This is normal for a new database.`);
        console.log("Collections will be created automatically when you first use them.");
      }
    } else {
      console.log(`⚠️ Database '${appDbName}' does not exist yet.`);
      console.log("It will be created automatically when you first use it.");
    }
    
    console.log("\n✅ MongoDB Atlas connection verified successfully!");
    
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
    console.log("Connection closed.");
  }
}

// Check if password was provided
if (process.argv.length < 3) {
  console.log("\n⚠️ Usage: node test-atlas-connection.js <your_password>");
  console.log("Please provide your MongoDB Atlas password as a command-line argument.");
  process.exit(1);
}

// Run the connection test
run().catch(error => {
  console.error("❌ Connection failed:", error);
  process.exit(1);
});
