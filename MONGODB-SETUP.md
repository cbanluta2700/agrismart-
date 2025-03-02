# MongoDB Atlas Setup Guide for AgriSmart

This guide walks you through configuring your existing MongoDB Atlas cluster for use with the AgriSmart platform.

## 1. Database User Setup

1. Go to your MongoDB Atlas dashboard
2. Select your organization "CJ DIVON's Org" and project
3. In the left sidebar, click on "Database Access" under SECURITY
4. Click "Add New Database User"
5. Authentication Method: Password
6. Username: `agrismart_admin` (or your preferred username)
7. Password: Create a secure password (store this safely)
8. User Privileges: "Read and write to any database"
9. Click "Add User"

## 2. Network Access Configuration

1. In the left sidebar, click on "Network Access" under SECURITY
2. Click "Add IP Address"
3. For development: 
   - Click "Allow Access from Anywhere" to add `0.0.0.0/0`
   - This is convenient for testing but less secure
4. For production:
   - Add only specific IPs that need access
   - Vercel's IP ranges can be found in their documentation
5. Click "Confirm"

## 3. Create Database and Collections

1. In the left sidebar, click on "Databases" under DEPLOYMENT
2. Click on "Browse Collections" for Cluster0
3. Click "Create Database"
4. Database Name: `agrismart_chat`
5. Collection Name: `conversations`
6. Click "Create"

7. Create additional collections:
   - Click "Create Collection"
   - Add collections:
     - `conversations`
     - `messages`
     - `metadata`
     - `metrics`

## 4. Get Connection String

1. In the Databases view, click "Connect" on Cluster0
2. Select "Connect your application"
3. Driver: Node.js, Version: latest
4. Copy the connection string (should look like `mongodb+srv://<username>:<password>@cluster0.sqn15.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`)
5. Replace `<username>` and `<password>` with your database user's credentials

## 5. Update Environment Variables

1. Update `.env.production` with your connection string:
   ```
   MONGODB_URI=mongodb+srv://agrismart_admin:<password>@cluster0.sqn15.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   MONGODB_DB_NAME=agrismart_chat
   ```
   
2. Replace `<password>` with your actual password

## 6. Verify Connection

Test your MongoDB Atlas connection:
```
npm run test-atlas yourpassword
```

This command will:
- Connect to your MongoDB Atlas cluster
- Verify the connection using the recommended ServerApi configuration
- List available databases and collections
- Check if your application database exists

## Database Collections

The AgriSmart platform uses the following collections in MongoDB:

1. `conversations`: Stores conversation metadata and participants
2. `messages`: Stores individual chat messages
3. `metadata`: Stores system metadata for the chat service
4. `metrics`: Stores performance metrics and usage statistics

## Need Help?

- MongoDB Atlas Documentation: [https://www.mongodb.com/docs/atlas/](https://www.mongodb.com/docs/atlas/)
- MongoDB Node.js Driver Documentation: [https://www.mongodb.com/docs/drivers/node/current/](https://www.mongodb.com/docs/drivers/node/current/)
- For specific AgriSmart questions, refer to the project's documentation
