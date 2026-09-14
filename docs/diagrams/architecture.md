# Arquitectura del Sistema — Mi Valecito

## Diagrama General

```mermaid
graph TB
    subgraph Clientes["Clientes"]
        WEB["🌐 Frontend\nNext.js 14\nAzure App Service"]
        MOB["📱 Mobile App\nExpo SDK 57\niOS / Android"]
    end

    subgraph Backend["Backend — Azure App Service"]
        API["⚡ Express.js API\n:3001"]
        MW["Middleware\n• JWT Auth\n• requirePermission()\n• Audit Logger\n• Rate Limiter"]
        ROUTES["Rutas\n/auth  /users  /vales\n/tiendas  /modules\n/roles-config  /docs"]
    end

    subgraph Storage["Almacenamiento"]
        CSV["📄 CSV Files\nusers.csv  roles.csv\nmodules.csv\ntokens_granted.csv"]
        SQL["☁️ Azure SQL\ndbo.tiendas\ndbo.tienda_usuarios\ndbo.vales\ndbo.abonos"]
    end

    WEB  -->|"HTTPS · Bearer JWT"| API
    MOB  -->|"HTTPS · Bearer JWT"| API
    API  --> MW
    MW   --> ROUTES
    ROUTES -->|"DATA_PROVIDER=csv"| CSV
    ROUTES -->|"DATA_PROVIDER=sql"| SQL
```

## Flujo de Autenticación

```mermaid
sequenceDiagram
    participant C as Cliente (Web/Mobile)
    participant API as Express API
    participant TM as Token Manager
    participant DB as CSV / Azure SQL

    C->>API: POST /auth/login { email, password }
    API->>DB: User.findByEmail()
    DB-->>API: user record
    API->>API: verifyPassword(PBKDF2)
    API->>TM: generateTokenWithId() → JWT
    TM->>CSV: tokens_granted.csv.append(tokenId)
    API-->>C: { status:"success", token, user }
    
    C->>API: GET /vales/mis-vales\nAuthorization: Bearer <token>
    API->>TM: validateToken(tokenId)
    TM->>CSV: check tokens_granted / revoked
    API->>API: requirePermission("vale:ver-propio")
    API->>DB: Vale.getByCliente(userId)
    DB-->>API: vales[]
    API-->>C: { status:"success", data:{ vales } }
```

## Flujo de Permisos

```mermaid
flowchart LR
    REQ["Request\n/vales/mis-vales"] --> AUTH["authMiddleware\nverifica JWT"]
    AUTH --> PERM["requirePermission\n('vale:ver-propio')"]
    PERM --> CHECK{"user tiene\npermiso?"}
    CHECK -->|"Sí"| HANDLER["Route Handler\nVale.getByCliente()"]
    CHECK -->|"No"| F403["403 Forbidden"]
    HANDLER --> RESP["200 OK\n{ status:'success', data }"]
    
    style F403 fill:#fca5a5,color:#111
    style RESP fill:#bbf7d0,color:#111
```

## Stack por Capa

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Mobile | Expo SDK 57 + React Native | Zustand + SecureStore |
| Frontend | Next.js 14 App Router | SCSS + React Bootstrap |
| API | Express.js + Node.js | Dual-mode CSV/SQL |
| Auth | JWT + PBKDF2 | 24h / 30d (rememberMe) |
| DB dev | CSV files | Sin setup adicional |
| DB prod | Azure SQL | Requiere migración SQL |
| Hosting | Azure App Service | Brazil South |
