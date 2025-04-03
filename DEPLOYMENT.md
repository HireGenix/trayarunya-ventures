# Deployment Guide for Trayarunya Ventures Website

This guide provides instructions for deploying the Trayarunya Ventures website to Vercel.

## Prerequisites

- A Vercel account
- Git repository with the project code
- Node.js 18.x or later

## Deployment Steps

### 1. Prepare Your Project

The project has already been configured for Vercel deployment with:

- `next.config.ts` - Optimized for production builds
- `vercel.json` - Vercel-specific configuration
- File-based database setup that works in serverless environments

### 2. Deploy to Vercel

#### Option 1: Deploy via Vercel Dashboard

1. Log in to your Vercel account
2. Click "New Project"
3. Import your Git repository
4. Configure the project:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
5. Add environment variables if needed
6. Click "Deploy"

#### Option 2: Deploy via Vercel CLI

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Log in to Vercel:
   ```bash
   vercel login
   ```

3. Navigate to your project directory and deploy:
   ```bash
   cd trayarunya-ventures
   vercel
   ```

4. Follow the CLI prompts to complete the deployment

### 3. Database Considerations

The website uses a file-based database system for storing leads and other data. In a serverless environment like Vercel:

- The `/data` directory structure is preserved in the repository
- The application will create necessary data files at runtime
- Data persistence between deployments is not guaranteed with the file-based approach

For production use with persistent data, consider:
- Using Vercel KV or another database service
- Implementing a database adapter in the `db.ts` file

### 4. Post-Deployment Verification

After deployment:

1. Test the website functionality
2. Verify that the admin panel works correctly
3. Test the lead submission form
4. Check that the leads management system is working

## Troubleshooting

- **Build Errors**: Check the Vercel build logs for specific errors
- **Runtime Errors**: Use the Vercel Function Logs to debug serverless function issues
- **Database Issues**: Verify that the data directory has proper permissions

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
