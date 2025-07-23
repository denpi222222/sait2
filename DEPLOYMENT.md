# Deployment Guide

## Netlify Deployment Setup

### 1. GitHub Repository Setup

1. Push your code to GitHub repository: `https://github.com/denpi222222/sait2`
2. Ensure the repository is public or you have proper access

### 2. Netlify Setup

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "New site from Git"
3. Choose GitHub as your Git provider
4. Select your repository: `denpi222222/sait2`
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: `18`

### 3. Environment Variables

Add these environment variables in Netlify dashboard:

```
NODE_ENV=production
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=your_contract_address
NEXT_PUBLIC_CRAA_TOKEN_ADDRESS=your_token_address
NEXT_PUBLIC_CHAIN_ID=your_chain_id
```

### 4. GitHub Secrets (for GitHub Actions)

If you want to use GitHub Actions for deployment, add these secrets:

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
   - `NETLIFY_SITE_ID`: Your Netlify site ID

### 5. Netlify Configuration

The `netlify.toml` file is already configured with:

- Next.js plugin for proper API route handling
- Security headers
- Caching rules
- Redirects

### 6. Automatic Deployment

Once configured:

- Every push to `main` branch will trigger automatic deployment
- Pull requests will create preview deployments
- Build logs will be available in Netlify dashboard

### 7. Custom Domain (Optional)

1. In Netlify dashboard, go to Site settings → Domain management
2. Add your custom domain
3. Configure DNS settings as instructed

### 8. Monitoring

- Check build logs in Netlify dashboard
- Monitor function logs for API routes
- Set up notifications for failed deployments

## Troubleshooting

### Common Issues

1. **Build fails**: Check Node.js version and dependencies
2. **API routes not working**: Ensure Next.js plugin is installed
3. **Environment variables**: Verify all required variables are set
4. **CORS issues**: Check security headers in netlify.toml

### Support

- Netlify documentation: https://docs.netlify.com
- Next.js deployment guide: https://nextjs.org/docs/deployment
- GitHub Actions documentation: https://docs.github.com/en/actions
