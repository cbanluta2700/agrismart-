# Supabase Setup Guide for AgriSmart

This guide will walk you through setting up Supabase for AgriSmart's PostgreSQL database needs.

## 1. Create a Supabase Account

1. Go to [Supabase](https://supabase.com/)
2. Sign up with GitHub (no credit card required)

## 2. Create a New Project

1. Create a new organization (if you don't already have one)
   - Name: "AgriSmart"
   - Click "Create organization"

2. Create a new project
   - Name: "agrismart-prod"
   - Database Password: Create and securely store a strong password
   - Region: Select "Southeast Asia (Singapore)" to match your MongoDB region
   - Pricing Plan: Free tier
   - Click "Create new project"

## 3. Set Up the Database

Once your project is created, you'll need to:

1. Get your connection string:
   - Go to Project Settings > Database
   - Find "Connection string" and select "URI" format
   - Copy the connection string
   - It should look like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres`
   - Replace `[YOUR-PASSWORD]` with your database password

2. Update environment variables:
   - Add the connection string to your `.env.production` file as `DATABASE_URL`

## 4. Initialize Your Schema

1. Initialize Prisma with your database:
   ```
   npm run prisma:generate
   ```

2. Deploy your database migrations:
   ```
   npm run prisma:deploy
   ```

## 5. Verify Connection

Test your database connection:
```
npm run verify-db
```

## Database Tables

The AgriSmart platform uses the following main tables in PostgreSQL:

1. `User`: User profiles and authentication
2. `ChatUsage`: Usage analytics for chat functionality
3. `UserSettings`: User preferences and configurations
4. `ModerationAction`: History of content moderation actions
5. `Appeal`: User appeals for moderation decisions

## Need Help?

- Supabase Documentation: [https://supabase.com/docs](https://supabase.com/docs)
- Prisma Documentation: [https://www.prisma.io/docs](https://www.prisma.io/docs)
- For specific AgriSmart questions, refer to the project's documentation
