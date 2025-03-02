# AgriSmart Platform Deployment Guide

This document guides you through deploying the AgriSmart platform using Vercel, MongoDB Atlas, and Supabase.

## Prerequisites

- GitHub account with Student Developer Pack activated
- Vercel account (connected to GitHub)
- MongoDB Atlas account
- Supabase or Railway account

## Step 1: Set Up Databases

### Database Configuration

#### MongoDB Configuration

For the AgriSmart platform, you have two options for MongoDB:

#### Option 1: Use Local MongoDB (Recommended for Development)

If you have MongoDB installed locally (as shown in MongoDB Compass), you can use your local instance:

1. Ensure MongoDB is running locally on port 27017
2. Set the following environment variables:
   ```
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB_NAME=agrismart_chat
   ```
3. Verify your local database with:
   ```
   npm run verify-db
   ```

#### Option 2: Use MongoDB Atlas (Recommended for Production)

For production deployment, you may want to use MongoDB Atlas:

1. Create a MongoDB Atlas account (available through GitHub Student Developer Pack)
2. Create a new cluster
3. Set up a database user with appropriate permissions
4. Configure network access (whitelist your IP or allow access from anywhere for testing)
5. Get your connection string from MongoDB Atlas Dashboard
6. Set the environment variables:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
   MONGODB_DB_NAME=agrismart_chat
   ```

### PostgreSQL Configuration (via Supabase)

The project uses Supabase for PostgreSQL database hosting:

1. The Supabase project is already set up at:
   - Project URL: `https://eexsqnsutjkaypilduwy.supabase.co`
   - Project name: `nano`

2. Supabase Connection Options:

   a. **Transaction Pooler** (recommended for serverless/Vercel):
   ```
   DATABASE_URL=postgresql://postgres.eexsqnsutjkaypilduwy:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
   - Ideal for serverless functions where each database interaction is brief
   - Pre-warmed connection pool to PostgreSQL
   - IPv4 compatible
   - Does not support PREPARE statements

   b. **Direct Connection** (for persistent applications):
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.eexsqnsutjkaypilduwy.supabase.co:5432/postgres
   ```
   - Suitable for long-lived, persistent connections
   - Each client has a dedicated connection to PostgreSQL
   - Not IPv4 compatible by default (requires IPv4 add-on)

   c. **Session Pooler** (alternative for IPv4 networks):
   ```
   DATABASE_URL=postgresql://postgres.eexsqnsutjkaypilduwy:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
   - IPv4 compatible
   - Only recommended as an alternative to Direct Connection when on IPv4 networks

3. Additional Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://eexsqnsutjkaypilduwy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleHNxbnN1dGprYXlwaWxkdXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2MDM4NTIsImV4cCI6MjA1NjE3OTg1Mn0.5u7nEaFkPkFXeRTR95T8NFvVzQTBgka3VPd_Lku2kI0
   ```

4. **Prisma Configuration**:
   - For Transaction Pooler connections, Prisma might require additional configuration
   - Add the following to your Prisma schema if needed:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL") // Optional direct connection for migrations
   }
   ```

5. You can manage your database through the Supabase dashboard:
   - Table Editor: For creating and managing tables directly
   - SQL Editor: For more advanced database operations

## Step 2: Deploy to Vercel

1. Push your code to GitHub
2. Log in to [Vercel](https://vercel.com/) and connect your repository
3. Configure your project with the following settings:
   - Framework Preset: Next.js
   - Build Command: `npm run vercel-build`
   - Install Command: `npm install`
   - Output Directory: `.next`
4. Add the following environment variables:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - `MONGODB_URI`: Your MongoDB connection string (either local or MongoDB Atlas)
   - `MONGODB_DB_NAME`: `agrismart_chat`
   - `NEXT_PUBLIC_MOCK_API_ENABLED`: `true` or `false` depending on if you want mock mode
   - `NEXT_PUBLIC_MOCK_API_URL`: URL of your mock API (if applicable)
   - Add all other variables from your `.env.example` file
5. Deploy!

## Step 3: Set Up Custom Domain

### Using Namecheap (GitHub Student Pack)

1. In your GitHub Student Pack, redeem your free .me domain from Namecheap
2. In Vercel, go to your project settings > Domains
3. Add your custom domain
4. Follow Vercel's instructions to update your DNS settings in Namecheap

## Step 4: Run Database Migrations

After deployment is complete:

1. Go to Vercel project > Settings > Functions > Console
2. Run the migration command:
   ```
   npx prisma migrate deploy
   ```

## Testing Database Connections

To ensure your database connections are properly configured, use the following commands:

### Testing MongoDB Connection

```bash
# Test all database connections (MongoDB and PostgreSQL)
npm run verify-db

# Test MongoDB Atlas connection (if using Atlas instead of local MongoDB)
npm run test-atlas <your_mongodb_password>
```

### Testing Supabase Connection

```bash
# Test Supabase connection (requires database password)
npm run test-supabase <your_supabase_password>
```

If all tests pass, your database connections are correctly configured and you're ready to deploy the application.

## Demo Mode Setup

To enable the mock API for demonstration:

1. Set `NEXT_PUBLIC_MOCK_API_ENABLED=true` in your Vercel environment variables
2. Deploy a separate instance of the mock API server or run it locally

## Monitoring

- Check your database connection status at `/api/admin/database-status`
- View database metrics at `/api/admin/database-metrics`
- Monitor migration progress at `/admin/database/migrate`

## Troubleshooting

- **Database Connection Issues**: Verify your connection strings and ensure IP access is properly configured
- **Migration Errors**: Check Vercel logs and run migrations manually if needed
- **Mock API Problems**: Ensure the mock API server is running and accessible from your deployed application

Need additional help? Contact the AgriSmart development team.
