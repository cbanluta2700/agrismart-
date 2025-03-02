# AgriSmart Deployment with GitHub Student Developer Pack

This guide provides a detailed walkthrough for deploying the AgriSmart platform using free resources available through the GitHub Student Developer Pack.

## Prerequisites

- GitHub account with active Student Developer Pack benefits
- Git installed on your computer
- Node.js and npm installed
- Access to your MongoDB Atlas account
- Access to your Supabase account

## Step 1: Prepare Your Local Environment

1. Run the setup-deployment script to configure your database connections:
   ```
   npm run setup-deployment
   ```

2. Verify your database connections:
   ```
   npm run verify-db
   ```

## Step 2: GitHub Repository Setup

1. Ensure your repository is up to date:
   ```
   git add .
   git commit -m "Prepare for deployment with student resources"
   git push origin main
   ```

## Step 3: Get Free Domain from Namecheap (Student Pack Benefit)

1. Go to [GitHub Student Developer Pack](https://education.github.com/pack)
2. Find the Namecheap offer
3. Click "Get access" to redeem your free .me domain
4. Follow Namecheap's instructions to register your domain
5. Note: You can also explore other free domain options in the pack

## Step 4: Deploy on Vercel (Student Pack Benefit)

GitHub Student Developer Pack includes Vercel Pro benefits:

1. Go to [Vercel](https://vercel.com/) and sign up with GitHub
2. Claim your Student Pack Pro plan:
   - In your Vercel account, look for "Redeem Student Pack" or similar option
   - Connect your GitHub account that has Student Developer Pack
   - Verify your student status if required

3. Import your GitHub repository:
   - Click "Add New..." > "Project"
   - Select your "cbanluta2700/agrismart-" repository
   - Configure project:
     - Framework Preset: Next.js
     - Build Command: `npm run vercel-build`
     - Output Directory: `.next`
     - Install Command: `npm install`

4. Add environment variables:
   - Click "Environment Variables" section
   - Add all variables from your `.env.production` file
   - Make sure to update any placeholders with actual values

5. Deploy:
   - Click "Deploy"

## Step 5: Configure Custom Domain

1. In Vercel dashboard, go to your project
2. Navigate to "Settings" > "Domains"
3. Add your custom domain from Namecheap
4. Follow Vercel's instructions for configuring DNS:
   - Go to Namecheap dashboard
   - Select your domain
   - Go to "Domain" > "Domain List" > "Manage"
   - Click on "Advanced DNS"
   - Add the DNS records as instructed by Vercel

## Step 6: Additional Student Pack Benefits for Your Project

Consider using these additional GitHub Student Pack benefits:

1. **MongoDB Atlas** (Student Pack Benefits):
   - Additional credits beyond free tier
   - Access to additional features

2. **Themesberg** (UI templates):
   - Free UI templates for enhancing your application

3. **Bootstrap Studio**:
   - Professional UI development tool 

4. **Sentry**:
   - Error monitoring for your application

5. **JetBrains** (Development tools):
   - Professional IDEs for development

## Step 7: Post-Deployment Steps

1. Run migrations on Vercel:
   - Go to Vercel dashboard > your project
   - Go to "Settings" > "Functions" > "Console"
   - Run: `npx prisma migrate deploy`

2. Set up the demo mode:
   - Set environment variable `NEXT_PUBLIC_MOCK_API_ENABLED=true`
   - Deploy your mock API server if needed

3. Test your application:
   - Visit your custom domain
   - Check admin dashboard at `/admin`
   - Test migration features at `/admin/database/migrate`

## Troubleshooting

1. **Database Connection Issues**:
   - Verify connection strings in Vercel environment variables
   - Check network access settings in MongoDB Atlas
   - Ensure database user has correct permissions

2. **Deployment Failures**:
   - Check Vercel build logs for errors
   - Verify that all required environment variables are set
   - Test locally with production environment variables

3. **Domain Configuration Issues**:
   - Allow 24-48 hours for DNS changes to propagate
   - Verify DNS records match Vercel's instructions exactly

4. **Mock API Issues**:
   - Ensure environment variables are correctly set
   - Deploy mock API server separately if needed

## Cost Management

Even with Student Pack benefits, monitor usage to avoid unexpected charges:

1. Set up MongoDB Atlas alerts for approaching free tier limits
2. Monitor Supabase database usage
3. Be aware of Vercel deployment limits
4. Track domain renewal dates (free for 1 year with Student Pack)

Need additional support? Refer to the specific documentation for each service or reach out to their support teams.
