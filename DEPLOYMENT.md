# Deployment Guide

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The server will start on http://localhost:3000
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - QUICKBOOKS_REALM_ID=${QUICKBOOKS_REALM_ID}
      - QUICKBOOKS_CLIENT_ID=${QUICKBOOKS_CLIENT_ID}
      - QUICKBOOKS_CLIENT_SECRET=${QUICKBOOKS_CLIENT_SECRET}
      - QUICKBOOKS_ENVIRONMENT=sandbox
    volumes:
      - ./logs:/app/logs
```

## Heroku Deployment

```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set QUICKBOOKS_REALM_ID=your_realm_id
heroku config:set QUICKBOOKS_CLIENT_ID=your_client_id
heroku config:set QUICKBOOKS_CLIENT_SECRET=your_client_secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

## AWS Deployment (Elastic Beanstalk)

```bash
# Install EB CLI
pip install awsebcli

# Initialize EB application
eb init -p node.js-18 quickbooks-payments-flow

# Create environment
eb create production

# Set environment variables
eb setenv QUICKBOOKS_REALM_ID=your_realm_id
eb setenv QUICKBOOKS_CLIENT_ID=your_client_id
eb setenv QUICKBOOKS_CLIENT_SECRET=your_client_secret

# Deploy
eb deploy
```

## Production Checklist

- [ ] Switch to production QuickBooks credentials
- [ ] Update `QUICKBOOKS_ENVIRONMENT` to `production`
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure QuickBooks OAuth redirect URI to production URL
- [ ] Set up database (replace in-memory store)
- [ ] Configure monitoring and alerting
- [ ] Set up automated backups
- [ ] Implement rate limiting
- [ ] Set up API authentication
- [ ] Configure CORS for allowed domains
- [ ] Enable security headers (already done with Helmet)
- [ ] Set up log aggregation
- [ ] Test payment flow end-to-end
- [ ] Set up health checks and auto-recovery

## Scaling Considerations

1. **Database**: Migrate from in-memory store to persistent database
2. **Caching**: Add Redis for token caching
3. **Load Balancing**: Use multiple server instances
4. **Queue System**: Use message queue (RabbitMQ, AWS SQS) for async processing
5. **Monitoring**: Set up application performance monitoring

## Troubleshooting

### 401 Unauthorized
- Check QuickBooks credentials
- Verify access token is valid
- Refresh token if expired

### Payment Processing Timeouts
- Check QuickBooks API status
- Increase `PAYMENT_TIMEOUT_MS`
- Check network connectivity

### High Error Rates
- Review logs for specific error messages
- Check QuickBooks API rate limits
- Verify customer and payment data

## Monitoring

Set up monitoring for:
- Error rates and types
- Payment processing time
- Failed refunds
- API response times
- Token refresh failures

## Backup and Recovery

- Regular backup of payment records
- Document recovery procedures
- Test recovery process quarterly
