# Setting Up CI/CD with Travis CI and Vercel

This guide explains how to set up continuous integration and deployment for the AgriSmart platform using Travis CI and Vercel.

## Prerequisites

- GitHub repository with your AgriSmart code
- Vercel account (using GitHub Student Pack)
- Travis CI account

## Automated Setup

We've created a setup script to automate the Travis CI configuration process:

1. **Get Required Tokens**:
   - GitHub personal access token: Create one at https://github.com/settings/tokens
     - Needed scopes: `repo`, `read:org`, `user:email`, `write:repo_hook`
   - Vercel token: Create one at https://vercel.com/account/tokens

2. **Run the Setup Script**:
   ```bash
   npm run setup-travis
   ```

3. **Follow the Interactive Prompts**:
   - Enter your GitHub token when prompted
   - Enter your Vercel token when prompted
   - The script will:
     - Check if Travis CLI is installed (and offer to install it)
     - Log in to Travis CI
     - Sync your GitHub repositories with Travis CI
     - Enable the AgriSmart repository in Travis CI
     - Set up the encrypted VERCEL_TOKEN environment variable

4. **Push to GitHub to Trigger Your First Build**:
   ```bash
   git add .
   git commit -m "Set up Travis CI"
   git push
   ```

## Manual Setup

If you prefer to set up Travis CI manually:

## Step 1: Connect GitHub Repository to Vercel

1. Log in to Vercel at https://vercel.com
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure your project settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add Environment Variables:
   - Add all variables from your `.env.production` file
   - Ensure all sensitive information (passwords, API keys) is properly set
6. Click "Deploy"

## Step 2: Get Vercel API Token

1. Go to your Vercel account settings
2. Navigate to "Tokens" section
3. Click "Create" to generate a new token
4. Name it something like "Travis CI Deployment"
5. Set the scope to "Full Access" (or limit to specific teams/projects if needed)
6. Copy the generated token - you'll need it for Travis CI

## Step 3: Set Up Travis CI

1. Go to https://travis-ci.com and sign in with your GitHub account
2. Activate Travis CI for your repository
3. In your repository settings on Travis CI, add environment variables:
   - `VERCEL_TOKEN`: Your Vercel API token from Step 2

## Step 4: Push Code to Trigger Deployment

1. Make changes to your codebase
2. Commit and push to your main branch
3. Travis CI will automatically:
   - Run your tests and build process
   - Deploy to Vercel if all tests pass

## Understanding the Workflow

1. **Development Workflow**:
   - Develop and test locally
   - Push changes to GitHub
   - Travis CI runs tests and verifies build
   - If successful, Travis CI deploys to Vercel
   - Your live site is updated automatically

2. **Monitoring Deployments**:
   - Check Travis CI dashboard for build status
   - Check Vercel dashboard for deployment status and logs
   - Set up notifications to alert you of failures

## Database Migrations

When making database schema changes:

1. Create your migrations locally using Prisma:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

2. Commit the migration files to your repository

3. During CI/CD deployment, Travis CI will:
   - Build your application
   - Deploy to Vercel
   - Vercel will run the `postinstall` script which applies migrations to production database

4. Monitor the deployment logs to ensure migrations run successfully

## Rollback Strategy

If a deployment causes issues:

1. **Quick Rollback**: Use Vercel dashboard to revert to a previous deployment
2. **Database Rollback**: For database issues, you may need to manually revert migrations

## Best Practices

1. **Environment Variables**: Never commit sensitive data to your repository
2. **Testing**: Always write tests for new features and run them before deployment
3. **Database Backups**: Regularly back up your MongoDB and Supabase databases
4. **Monitoring**: Set up performance monitoring for your deployed application
5. **Staged Deployments**: Consider setting up staging environments for testing before production

## Troubleshooting

- **Build Failures**: Check Travis CI logs for error details
- **Deployment Failures**: Check Vercel deployment logs
- **Database Issues**: Verify connection strings and access permissions
- **Environment Variables**: Ensure all required variables are properly set in Vercel
