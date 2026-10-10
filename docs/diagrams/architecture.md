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

        MODELS["Modelos\nSQL parametrizado"]
        POOL["sqlPool.js\núnico punto de conexión"]
    end

    subgraph Storage["Almacenamiento — SQL Server"]
        SQL["🗄️ SQL Server local (desarrollo)\nAzure SQL (producción)\n\ndbo.users  dbo.roles  dbo.permissions\ndbo.modules  dbo.tokens_granted\ndbo.tokens_revoked  dbo.audit_logs\ndbo.tiendas  dbo.tienda_usuarios\ndbo.vales  dbo.abonos"]
    end

    WEB  -->|"HTTPS · Bearer JWT"| API
    MOB  -->|"HTTPS · Bearer JWT"| API
    API  --> MW
    MW   --> ROUTES
    ROUTES --> MODELS
    MODELS --> POOL
    POOL -->|"DB_* (local) o AZURE_SQL_* (producción)"| SQL
```

El almacenamiento es el mismo esquema en los dos ambientes; solo cambia la forma de conexión,
que se valida al arrancar (una sola forma presente). Las fotos van a la carpeta local
`datos/uploads/` o a Azure Blob Storage si está configurado.

## Flujo de Autenticación

```mermaid
sequenceDiagram
    participant C as Cliente (Web/Mobile)
    participant API as Express API
    participant TM as Token Manager
    participant DB as SQL Server / Azure SQL

    C->>API: POST /auth/login { email, password }
    API->>DB: User.findByEmail()
    DB-->>API: user record
    API->>API: verifyPassword(PBKDF2)
    API->>TM: generateTokenWithId() → JWT
    TM->>DB: INSERT dbo.tokens_granted (tokenId)
    API-->>C: { status:"success", token, user }
    
    C->>API: GET /vales/mis-vales\nAuthorization: Bearer <token>
    API->>TM: validateToken(tokenId)
    TM->>DB: consulta dbo.tokens_granted
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
| API | Express.js + Node.js | SQL en los modelos, vía `sqlPool.js` |
| Auth | JWT + PBKDF2 | 24h / 7d (rememberMe) |
| DB dev | SQL Server local (Developer o Express) | Base `MiValecito_Dev`; se prepara con `npm run db:setup` |
| DB prod | Azure SQL | Mismo esquema: `database/scripts_sql/` |
| Hosting | Azure App Service | Brazil South |
