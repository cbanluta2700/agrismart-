#!/bin/bash
set -e

# Configuration
CLUSTER_NAME="agrismart-prod"
NAMESPACE="production"
REGISTRY="ghcr.io"
APP_NAME="agrismart"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check required tools
check_dependencies() {
    log "Checking dependencies..."
    command -v kubectl >/dev/null 2>&1 || error "kubectl is required"
    command -v helm >/dev/null 2>&1 || error "helm is required"
    command -v docker >/dev/null 2>&1 || error "docker is required"
}

# Validate environment variables
validate_env() {
    log "Validating environment variables..."
    [[ -z "${DIGITALOCEAN_ACCESS_TOKEN}" ]] && error "DIGITALOCEAN_ACCESS_TOKEN is required"
    [[ -z "${GITHUB_TOKEN}" ]] && error "GITHUB_TOKEN is required"
    [[ -z "${DOCKER_USERNAME}" ]] && error "DOCKER_USERNAME is required"
    [[ -z "${DOCKER_PASSWORD}" ]] && error "DOCKER_PASSWORD is required"
}

# Setup Kubernetes context
setup_kubernetes() {
    log "Setting up Kubernetes context..."
    doctl kubernetes cluster kubeconfig save ${CLUSTER_NAME}
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
}

# Deploy monitoring stack
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    # Deploy Prometheus Operator
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --set grafana.enabled=true \
        --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
        
    # Deploy Elasticsearch operator
    helm repo add elastic https://helm.elastic.co
    helm repo update
    
    helm upgrade --install elasticsearch elastic/elasticsearch \
        --namespace logging \
        --create-namespace \
        --set replicas=3
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Create secrets
    kubectl create secret generic app-secrets \
        --namespace=${NAMESPACE} \
        --from-literal=DATABASE_URL=${DATABASE_URL} \
        --from-literal=REDIS_URL=${REDIS_URL} \
        --from-literal=JWT_SECRET=${JWT_SECRET} \
        --from-literal=STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY} \
        --dry-run=client -o yaml | kubectl apply -f -

    # Apply Kubernetes manifests
    kubectl apply -f k8s/base/ -n ${NAMESPACE}
    
    # Wait for deployment
    kubectl rollout status deployment/agrismart-app -n ${NAMESPACE}
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check pods status
    kubectl get pods -n ${NAMESPACE}
    
    # Check services
    kubectl get services -n ${NAMESPACE}
    
    # Check ingress
    kubectl get ingress -n ${NAMESPACE}
    
    # Check monitoring
    kubectl get servicemonitors -n ${NAMESPACE}
}

# Main deployment flow
main() {
    log "Starting production deployment..."
    
    check_dependencies
    validate_env
    setup_kubernetes
    deploy_monitoring
    deploy_application
    verify_deployment
    
    log "Deployment completed successfully!"
}

# Error handling
trap 'error "An error occurred during deployment"' ERR

# Execute main function
main