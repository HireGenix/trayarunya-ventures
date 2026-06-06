// Trayarunya Content Engine — Azure infrastructure (Container Apps)
// Deploys: Log Analytics, Container Apps Environment, PostgreSQL Flexible Server,
// Azure Cache for Redis, and three Container Apps (api, worker, web).
//
// Deploy:
//   az group create -n rg-content-engine -l centralindia
//   az deployment group create -g rg-content-engine -f main.bicep \
//     -p namePrefix=trayce pgAdminPassword=<pwd> jwtSecret=<secret> \
//        azureAnthropicKey=<key> apiImage=<acr>/ce-api:tag \
//        workerImage=<acr>/ce-api:tag webImage=<acr>/ce-web:tag

@description('Short prefix for resource names (lowercase, 3-12 chars).')
@minLength(3)
@maxLength(12)
param namePrefix string = 'trayce'

@description('Location for all resources.')
param location string = resourceGroup().location

@description('PostgreSQL administrator login.')
param pgAdminUser string = 'ceadmin'

@secure()
@description('PostgreSQL administrator password.')
param pgAdminPassword string

@secure()
@description('JWT signing secret.')
param jwtSecret string

@description('Azure OpenAI (GPT-5.5) endpoint. Leave blank to disable.')
param azureGpt5Endpoint string = ''

@secure()
@description('Azure OpenAI (GPT-5.5) API key.')
param azureGpt5Key string = ''

@description('Azure Anthropic (Claude) Messages endpoint.')
param azureAnthropicEndpoint string = 'https://hiregenix-resource.services.ai.azure.com/anthropic/v1/messages'

@secure()
@description('Azure Anthropic (Claude) API key.')
param azureAnthropicKey string = ''

@description('Container image for the API app (e.g. myacr.azurecr.io/ce-api:latest).')
param apiImage string

@description('Container image for the worker (usually same image as API).')
param workerImage string

@description('Container image for the web app.')
param webImage string

@description('ACR login server, e.g. myacr.azurecr.io.')
param acrLoginServer string

@description('ACR admin username.')
param acrUsername string

@secure()
@description('ACR admin password.')
param acrPassword string

@description('Public base URL of the API, used by the web container.')
param apiPublicUrl string = ''

var pgDatabase = 'content_engine'
var tags = { product: 'content-engine', managedBy: 'bicep' }

// ---------------- Observability ----------------
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// ---------------- PostgreSQL Flexible Server ----------------
resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${namePrefix}-pg'
  location: location
  tags: tags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: pgAdminUser
    administratorLoginPassword: pgAdminPassword
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
  }
}

resource pgDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: pg
  name: pgDatabase
}

// Allow other Azure services (Container Apps) to reach Postgres.
resource pgFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: pg
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ---------------- Azure Managed Redis (redisEnterprise) ----------------
resource redis 'Microsoft.Cache/redisEnterprise@2024-10-01' = {
  name: '${namePrefix}-redis'
  location: location
  tags: tags
  sku: { name: 'Balanced_B0' }
}

resource redisDb 'Microsoft.Cache/redisEnterprise/databases@2024-10-01' = {
  parent: redis
  name: 'default'
  properties: {
    clientProtocol: 'Encrypted'
    port: 10000
    clusteringPolicy: 'EnterpriseCluster'
    evictionPolicy: 'NoEviction'
  }
}

// ---------------- Storage (Blob: media / generated assets) ----------------
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: toLower('${take(namePrefix, 8)}st${uniqueString(resourceGroup().id)}')
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource assetsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'content-assets'
  properties: { publicAccess: 'Blob' }
}

// ---------------- Container Apps Environment ----------------
resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${namePrefix}-env'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

var databaseUrl = 'postgresql+asyncpg://${pgAdminUser}:${pgAdminPassword}@${pg.properties.fullyQualifiedDomainName}:5432/${pgDatabase}'
var redisUrl = 'rediss://:${redisDb.listKeys().primaryKey}@${redis.properties.hostName}:10000/0'
var storageKey = storage.listKeys().keys[0].value
var blobConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'

var commonSecrets = [
  { name: 'database-url', value: databaseUrl }
  { name: 'redis-url', value: redisUrl }
  { name: 'jwt-secret', value: jwtSecret }
  { name: 'gpt5-key', value: azureGpt5Key }
  { name: 'anthropic-key', value: azureAnthropicKey }
  { name: 'blob-conn', value: blobConnectionString }
  { name: 'acr-pwd', value: acrPassword }
]

var registries = [
  { server: acrLoginServer, username: acrUsername, passwordSecretRef: 'acr-pwd' }
]

var commonEnv = [
  { name: 'ENVIRONMENT', value: 'production' }
  { name: 'DEBUG', value: 'false' }
  { name: 'DATABASE_URL', secretRef: 'database-url' }
  { name: 'REDIS_URL', secretRef: 'redis-url' }
  { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
  { name: 'AZURE_GPT5_ENDPOINT', value: azureGpt5Endpoint }
  { name: 'AZURE_GPT5_KEY', secretRef: 'gpt5-key' }
  { name: 'AZURE_ANTHROPIC_ENDPOINT', value: azureAnthropicEndpoint }
  { name: 'AZURE_ANTHROPIC_KEY', secretRef: 'anthropic-key' }
  { name: 'AZURE_BLOB_CONNECTION_STRING', secretRef: 'blob-conn' }
  { name: 'AZURE_BLOB_CONTAINER', value: 'content-assets' }
]

// ---------------- API Container App ----------------
resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-api'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
      }
      secrets: commonSecrets
      registries: registries
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: { cpu: json('1.0'), memory: '2Gi' }
          env: concat(commonEnv, [
            { name: 'CORS_ORIGINS', value: 'https://${namePrefix}-web.${env.properties.defaultDomain}' }
          ])
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
}

// ---------------- Worker Container App (no ingress) ----------------
resource workerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-worker'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: commonSecrets
      registries: registries
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: workerImage
          command: [ 'python', '-m', 'app.worker.run_worker' ]
          resources: { cpu: json('1.0'), memory: '2Gi' }
          env: commonEnv
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 2 }
    }
  }
}

// ---------------- Web Container App ----------------
resource webApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-web'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
      secrets: [
        { name: 'acr-pwd', value: acrPassword }
      ]
      registries: registries
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            {
              name: 'NEXT_PUBLIC_API_URL'
              value: empty(apiPublicUrl) ? 'https://${apiApp.properties.configuration.ingress.fqdn}' : apiPublicUrl
            }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
}

output apiUrl string = 'https://${apiApp.properties.configuration.ingress.fqdn}'
output webUrl string = 'https://${webApp.properties.configuration.ingress.fqdn}'
output postgresHost string = pg.properties.fullyQualifiedDomainName
output storageAccount string = storage.name
