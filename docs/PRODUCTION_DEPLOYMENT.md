# AgriSmart Production Deployment Guide

## Prerequisites

### Infrastructure Requirements
- Kubernetes cluster (minimum 3 nodes)
- Node specifications:
  - CPU: 4 cores
  - Memory: 16GB RAM
  - Storage: 100GB SSD
- Load balancer
- Domain name and SSL certificates

### Environment Variables
Required environment variables must be set in `.env.production`:
```env
# App Configuration
NODE_ENV=production
APP_URL=https://agrismart.example.com
API_URL=https://api.agrismart.example.com

# Infrastructure
CLUSTER_NAME=agrismart-prod
DIGITALOCEAN_ACCESS_TOKEN=<token>
GITHUB_TOKEN=<token>

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Security
JWT_SECRET=<secret>
REFRESH_TOKEN_SECRET=<secret>

# Payment Processing
STRIPE_PUBLIC_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring
SENTRY_DSN=https://...
GRAFANA_ADMIN_PASSWORD=<password>
```

## Deployment Process

### 1. Environment Validation
```bash
# Run validation script
bun run scripts/validate-production.ts

# Expected output:
✅ Environment variables validated
✅ Kubernetes cluster accessible
✅ DNS configured
✅ SSL certificates valid
```

### 2. Infrastructure Setup
```bash
# Deploy infrastructure
bun run scripts/production-deploy.sh

# Verify services
kubectl get services -n production
kubectl get pods -n production
```

### 3. Monitoring Setup
```bash
# Setup monitoring stack
bun run scripts/setup-monitoring.ts

# Verify monitoring
kubectl get pods -n monitoring
```

### 4. Application Deployment
```bash
# Run master deployment
bun run scripts/master-deploy.ts

# Monitor deployment
tail -f logs/deploy-*.log
```

## Post-Deployment Verification

### 1. Health Checks
```bash
# Application health
curl https://agrismart.example.com/api/health

# Monitoring health
curl https://prometheus.agrismart.example.com/-/healthy
```

### 2. Service Verification
- Verify all services are running:
  ```bash
  kubectl get pods --all-namespaces
  ```
- Check logs for errors:
  ```bash
  kubectl logs -n production deploy/agrismart-app
  ```

### 3. Monitoring Checks
1. Access Grafana dashboard
   - URL: https://grafana.agrismart.example.com
   - Verify metrics collection
   - Check alert rules

2. Prometheus metrics
   - Verify target scraping
   - Check recording rules
   - Validate alert conditions

## Rollback Procedure

### 1. Quick Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/agrismart-app -n production

# Verify rollback
kubectl rollout status deployment/agrismart-app -n production
```

### 2. Full Rollback
```bash
# Stop deployment
bun run scripts/master-deploy.ts --abort

# Restore from backup
bun run scripts/restore-backup.ts --version <version>
```

## Monitoring and Alerting

### Dashboard Access
- Grafana: https://grafana.agrismart.example.com
- Prometheus: https://prometheus.agrismart.example.com
- Alertmanager: https://alerts.agrismart.example.com

### Alert Channels
- Slack: #production-alerts
- Email: ops@agrismart.com
- PagerDuty integration

## Troubleshooting

### Common Issues

1. Pod Startup Failures
```bash
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production
```

2. Database Connection Issues
```bash
# Check database connectivity
kubectl exec -it <pod-name> -n production -- pg_isready -h $DATABASE_HOST

# Verify connection pool
kubectl exec -it <pod-name> -n production -- bun run scripts/check-db-pool.ts
```

3. Redis Issues
```bash
# Check Redis connectivity
kubectl exec -it <pod-name> -n production -- redis-cli ping

# Clear Redis cache
kubectl exec -it <pod-name> -n production -- redis-cli FLUSHALL
```

### Performance Issues

1. Check resource usage
```bash
kubectl top pods -n production
kubectl top nodes
```

2. Monitor application metrics
```bash
# CPU/Memory usage
kubectl exec -it <pod-name> -n production -- top

# Network metrics
kubectl exec -it <pod-name> -n production -- netstat -an
```

## Security Considerations

### Regular Checks
1. SSL certificate validation
2. Security headers verification
3. Rate limiting confirmation
4. Access control audit

### Security Best Practices
- Regular security updates
- Audit logging enabled
- Network policies enforced
- RBAC properly configured

## Maintenance

### Regular Tasks
1. Log rotation
2. Backup verification
3. SSL certificate renewal
4. Security patches

### Scaling
- Horizontal scaling:
  ```bash
  kubectl scale deployment agrismart-app --replicas=5 -n production
  ```
- Vertical scaling:
  ```bash
  kubectl edit deployment agrismart-app -n production
  ```

## Support

### Contact Information
- DevOps Team: devops@agrismart.com
- Emergency: +1-xxx-xxx-xxxx
- Slack: #agrismart-ops

### Documentation
- Internal Wiki: https://wiki.agrismart.com/ops
- Runbooks: https://runbooks.agrismart.com
- Architecture Docs: https://docs.agrismart.com/architecture