# GitHub Repository Setup Guide for HausOfToots

## Step 1: Initialize Git Repository (if not already done)

```bash
git init
git add .
git commit -m "Initial commit: Haus of Toots website"
```

## Step 2: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Repository name: `HausOfToots` (or `hausoftoots`)
3. Description: "Custom Needlepoint Canvases - Interactive website for Haus of Toots"
4. Make it **Public** or **Private** (your choice)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 3: Link Local Repository to GitHub

After creating the repo, GitHub will show you commands. Use these:

```bash
git remote add origin https://github.com/YOUR_USERNAME/HausOfToots.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 4: Configure GitHub Secrets for Deployment

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these three secrets:

### Secret 1: SFTP_SERVER
- **Name:** `SFTP_SERVER`
- **Value:** `chawil155.dreamhosters.com`

### Secret 2: SFTP_USERNAME
- **Name:** `SFTP_USERNAME`
- **Value:** `jessieToots`

### Secret 3: SFTP_PASSWORD
- **Name:** `SFTP_PASSWORD`
- **Value:** [Your SFTP password that you set for the jessieToots user in DreamHost]

## Step 5: Test the Deployment

Once secrets are configured:

1. Make a small change to any file (or just test with this setup)
2. Commit and push:
   ```bash
   git add .
   git commit -m "Test deployment workflow"
   git push
   ```
3. Go to **Actions** tab in your GitHub repository
4. You should see the "Deploy to DreamHost" workflow running
5. Once it completes (green checkmark), your site should be live!

## Step 6: Manual Deployment (Optional)

You can also trigger deployment manually:

1. Go to **Actions** tab
2. Click on "Deploy to DreamHost" workflow
3. Click "Run workflow" button
4. Select branch (main) and click "Run workflow"

## Troubleshooting

### If deployment fails:

1. Check that all three secrets are correctly set
2. Verify your SFTP password is correct
3. Check the workflow logs in the Actions tab for specific errors
4. Make sure your DreamHost site is fully set up and active

### If you need to update secrets:

1. Go to Settings → Secrets and variables → Actions
2. Click on the secret name
3. Click "Update secret"
4. Enter new value and save

## DreamHost Configuration Summary

- **Domain:** hausoftoots.com
- **Server:** Web Hosting Launch (iad1-shared-b8-12) / US - East (Ashburn, Virginia)
- **SFTP Host:** chawil155.dreamhosters.com
- **SFTP Username:** jessieToots
- **Remote Directory:** /home/jessieToots/hausoftoots.com/
- **PHP Version:** 8.3 (Recommended)

## Next Steps After Setup

1. Verify your site is live at https://hausoftoots.com
2. Test all interactive features work correctly
3. Set up SSL certificate in DreamHost (Settings → Security)
4. Add custom domain if not already configured
5. Delete this SETUP_GUIDE.md file once setup is complete

---

Happy deploying! 🚀🧵

