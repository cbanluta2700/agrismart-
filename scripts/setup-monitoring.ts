#!/usr/bin/env bun
import { execSync } from 'child_process'
import { join } from 'path'
import { writeFileSync } from 'fs'
import productionConfig from '../config/production.config'

const MONITORING_NAMESPACE = 'monitoring'
const GRAFANA_ADMIN_PASSWORD = process.env.GRAFANA_ADMIN_PASSWORD || 'admin'

interface MonitoringStack {
  prometheus: {
    enabled: boolean
    version: string
    retention: string
    storageSize: string
  }
  grafana: {
    enabled: boolean
    version: string
    adminPassword: string
    persistence: boolean
  }
  alertmanager: {
    enabled: boolean
    receivers: Array<{
      name: string
      slackConfigs?: Array<{
        channel: string
        apiUrl: string
      }>
      emailConfigs?: Array<{
        to: string
        from: string
        smarthost: string
        authUsername: string
        authPassword: string
      }>
    }>
  }
}

const monitoringStack: MonitoringStack = {
  prometheus: {
    enabled: true,
    version: '2.45.0',
    retention: '15d',
    storageSize: '50Gi'
  },
  grafana: {
    enabled: true,
    version: '9.5.5',
    adminPassword: GRAFANA_ADMIN_PASSWORD,
    persistence: true
  },
  alertmanager: {
    enabled: true,
    receivers: [
      {
        name: 'slack-notifications',
        slackConfigs: [
          {
            channel: '#production-alerts',
            apiUrl: process.env.SLACK_WEBHOOK_URL || ''
          }
        ]
      },
      {
        name: 'email-notifications',
        emailConfigs: [
          {
            to: 'ops@agrismart.com',
            from: productionConfig.email.from,
            smarthost: productionConfig.email.smtp.host,
            authUsername: productionConfig.email.smtp.auth.user,
            authPassword: productionConfig.email.smtp.auth.pass
          }
        ]
      }
    ]
  }
}

async function setupMonitoring() {
  console.log('Setting up monitoring stack...')

  try {
    // Create monitoring namespace
    execSync(`kubectl create namespace ${MONITORING_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -`)

    // Install Prometheus Operator
    const prometheusValues = {
      prometheus: {
        prometheusSpec: {
          retention: monitoringStack.prometheus.retention,
          resources: {
            requests: {
              cpu: '500m',
              memory: '2Gi'
            },
            limits: {
              cpu: '1000m',
              memory: '4Gi'
            }
          },
          storageSpec: {
            volumeClaimTemplate: {
              spec: {
                storageClassName: 'standard',
                resources: {
                  requests: {
                    storage: monitoringStack.prometheus.storageSize
                  }
                }
              }
            }
          }
        }
      },
      alertmanager: {
        enabled: monitoringStack.alertmanager.enabled,
        config: {
          global: {
            resolve_timeout: '5m'
          },
          route: {
            group_by: ['job', 'alertname', 'severity'],
            group_wait: '30s',
            group_interval: '5m',
            repeat_interval: '12h',
            receiver: 'slack-notifications',
            routes: [
              {
                match: {
                  severity: 'critical'
                },
                receiver: 'slack-notifications'
              }
            ]
          },
          receivers: monitoringStack.alertmanager.receivers
        }
      }
    }

    // Save Prometheus values
    const valuesPath = join(process.cwd(), 'prometheus-values.yaml')
    writeFileSync(valuesPath, JSON.stringify(prometheusValues, null, 2))

    // Install Prometheus stack
    execSync(`
      helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
      helm repo update
      helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace ${MONITORING_NAMESPACE} \
        --values ${valuesPath} \
        --wait
    `)

    // Configure Grafana
    if (monitoringStack.grafana.enabled) {
      const grafanaValues = {
        adminPassword: monitoringStack.grafana.adminPassword,
        persistence: {
          enabled: monitoringStack.grafana.persistence,
          size: '10Gi'
        },
        datasources: {
          'prometheus.yaml': {
            apiVersion: 1,
            datasources: [
              {
                name: 'Prometheus',
                type: 'prometheus',
                url: 'http://prometheus-server',
                access: 'proxy',
                isDefault: true
              }
            ]
          }
        },
        dashboardProviders: {
          'dashboardproviders.yaml': {
            apiVersion: 1,
            providers: [
              {
                name: 'default',
                orgId: 1,
                folder: '',
                type: 'file',
                disableDeletion: false,
                editable: true,
                options: {
                  path: '/var/lib/grafana/dashboards'
                }
              }
            ]
          }
        }
      }

      // Save Grafana values
      const grafanaValuesPath = join(process.cwd(), 'grafana-values.yaml')
      writeFileSync(grafanaValuesPath, JSON.stringify(grafanaValues, null, 2))

      // Update Grafana configuration
      execSync(`
        helm upgrade --install grafana grafana/grafana \
          --namespace ${MONITORING_NAMESPACE} \
          --values ${grafanaValuesPath} \
          --wait
      `)
    }

    console.log('✅ Monitoring stack setup complete!')
    
    // Get access information
    const grafanaPassword = execSync(`
      kubectl get secret --namespace ${MONITORING_NAMESPACE} grafana \
        -o jsonpath="{.data.admin-password}" | base64 --decode
    `).toString()

    console.log('\nAccess Information:')
    console.log('Grafana:')
    console.log('  URL: http://grafana.agrismart.com')
    console.log(`  Username: admin`)
    console.log(`  Password: ${grafanaPassword}`)
    console.log('\nPrometheus:')
    console.log('  URL: http://prometheus.agrismart.com')

  } catch (error) {
    console.error('Failed to setup monitoring stack:', error)
    process.exit(1)
  }
}

setupMonitoring()