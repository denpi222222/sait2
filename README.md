# CrazyCube CRAA Token Project

A Next.js Web3 application for the CrazyCube CRAA token ecosystem.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔒 Security Features

This project includes comprehensive security checks and optimizations:

### Automated Security Checks

- **npm audit** - Dependency vulnerability scanning
- **ESLint Security** - Code security pattern detection
- **Console Log Removal** - Automatic cleanup of debug statements
- **SWC Optimization** - Production build optimizations

### Security Scripts

```bash
# Run comprehensive security check
npm run security:check

# Check for vulnerabilities in dependencies
npm run check:security

# Fix security issues automatically
npm run security:fix

# Remove console.log statements
npm run clean:logs
```

### Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck

# Format code
npm run format
```

## 🚀 Deployment

### GitHub Actions CI/CD

The project includes automated CI/CD pipeline with:

- Security audits on every push
- Automatic dependency updates via Dependabot
- Build and deployment to Vercel/Netlify
- Code quality checks

### Manual Deployment

```bash
# Build and deploy
npm run build

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod
```

## 📁 Project Structure

```
├── app/                 # Next.js App Router pages
├── components/          # React components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── config/             # Configuration files
├── scripts/            # Build and security scripts
├── .github/            # GitHub Actions workflows
└── public/             # Static assets
```

## 🔧 Configuration

### Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
```

### Security Headers

The application includes comprehensive security headers:

- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm run security:check` - Security audit
- `npm run clean:logs` - Remove console.log statements

### Code Quality

- ESLint with security plugins
- Prettier for code formatting
- TypeScript for type safety
- Automated security scanning

## 🔄 Dependencies

### Automatic Updates

Dependabot is configured to:

- Check for updates weekly
- Create PRs for security updates
- Ignore major version updates for critical packages

### Security Monitoring

- npm audit integration
- Snyk security scanning
- Automated vulnerability detection

## 📊 Performance

### Build Optimizations

- SWC minification
- Console.log removal in production
- Bundle analysis with `npm run analyze`
- Image optimization disabled for IPFS

### Monitoring

- Performance mode toggle
- Bundle size analysis
- Runtime performance tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run security checks: `npm run security:check`
5. Run linting: `npm run lint`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Live Demo](https://your-domain.com)
- [Documentation](https://docs.your-domain.com)
- [Security Policy](https://github.com/your-repo/security/policy)
