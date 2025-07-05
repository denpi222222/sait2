# 🔒 CrazyCube Deployment Security Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are set in Netlify:
- [ ] `NEXT_PUBLIC_ALCHEMY_API_KEY` - Alchemy API key
- [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID (optional)
- [ ] `NEXT_PUBLIC_SITE_URL` - Your production URL

⚠️ **Never commit `.env` files with real values to Git!**

### 2. Security Headers
The following security headers are automatically configured:
- ✅ Content-Security-Policy (CSP)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Strict-Transport-Security (HSTS)
- ✅ Cross-Origin-Opener-Policy
- ✅ Cross-Origin-Embedder-Policy
- ✅ Permissions-Policy

### 3. Web3 Security
- ✅ Auto network switching to ApeChain
- ✅ Chain validation before transactions
- ✅ Account/chain change detection
- ✅ No private keys in code
- ✅ HTTPS-only RPC endpoints

### 4. Performance Optimizations
- ✅ Dynamic imports for heavy animations
- ✅ Image optimization in production
- ✅ Bundle size monitoring
- ✅ Reduced animations on mobile

### 5. Code Quality
- ✅ TypeScript strict mode
- ✅ ESLint security rules
- ✅ No console.log in production
- ✅ Unused imports removed

## Deployment Steps

### 1. Run Pre-Deployment Checks
```bash
node scripts/pre-deploy-check.js
```

### 2. Test Build Locally
```bash
npm run build
npm run start
```

### 3. Netlify Deployment

#### Option A: Git Push (Recommended)
```bash
git add .
git commit -m "Deploy: [description]"
git push origin main
```

#### Option B: Manual Deploy
```bash
npm run build
netlify deploy --prod --dir=.next
```

### 4. Post-Deployment Verification

1. **Check Security Headers**
   ```bash
   curl -I https://your-site.netlify.app
   ```

2. **Test Wallet Connection**
   - Connect MetaMask
   - Verify auto-switch to ApeChain
   - Test a transaction

3. **Mobile Testing**
   - Test on real devices
   - Check Telegram WebView
   - Verify responsive design

4. **Performance Check**
   - Run Lighthouse audit
   - Check bundle sizes
   - Verify image loading

## Security Best Practices

### 1. API Keys
- Use environment variables
- Restrict API keys by domain
- Monitor usage regularly

### 2. Smart Contract Interaction
- Always verify chain ID
- Use the `useSafeContractWrite` hook
- Handle wallet events properly

### 3. Content Security
- No inline scripts without nonce
- Trusted Types enabled
- XSS protection active

### 4. Regular Updates
```bash
# Check for vulnerabilities
npm audit

# Update dependencies safely
npm update --save
```

## Monitoring

### 1. Error Tracking
- Check browser console for errors
- Monitor Netlify function logs
- Review build logs

### 2. Performance
- Use Netlify Analytics
- Monitor Core Web Vitals
- Check bundle size trends

### 3. Security
- Regular dependency audits
- Monitor for suspicious activity
- Keep frameworks updated

## Emergency Procedures

### If Compromised:
1. Rotate all API keys immediately
2. Review recent deployments
3. Check for unauthorized changes
4. Contact support if needed

### Rollback:
```bash
# Via Netlify Dashboard
# Go to Deploys > Click on previous deploy > Publish deploy

# Via CLI
netlify rollback
```

## Support

- Netlify Docs: https://docs.netlify.com
- Next.js Security: https://nextjs.org/docs/advanced-features/security-headers
- Web3 Best Practices: https://consensys.github.io/smart-contract-best-practices/

---

**Remember**: Security is an ongoing process. Stay vigilant and keep everything updated! 🛡️ 