# AgriSmart Platform Deployment Guide

This document guides you through deploying the AgriSmart platform using Vercel, MongoDB Atlas, and Supabase.

## Prerequisites

- GitHub account with Student Developer Pack activated
- Vercel account (connected to GitHub)
- MongoDB Atlas account
- Supabase or Railway account

## Step 1: Set Up Databases

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free M0 cluster
3. Set up database access with a username and password
4. Add your IP to the IP Access List or use `0.0.0.0/0` for development
5. Get your connection string from the "Connect" button

### Supabase (PostgreSQL) Setup

1. Create a Supabase account at [Supabase](https://supabase.com/)
2. Create a new project with a secure database password
3. Get your connection string from Settings > Database > Connection Pooling

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
   - `MONGODB_URI`: Your MongoDB Atlas connection string
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
