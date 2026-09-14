# Diagrama Entidad-Relación — Mi Valecito

> Las entidades `users`, `roles` y `modules` viven en archivos CSV en modo desarrollo.  
> Las entidades `tiendas`, `tienda_usuarios`, `vales` y `abonos` viven en Azure SQL (también disponibles en CSV en modo dev).

## Diagrama ER

```mermaid
erDiagram
    USERS {
        string id PK "UUID"
        string email UK
        string name
        string password_hash
        string salt
        string role FK "→ roles.name"
        string photo "URL opcional"
        boolean active
        datetime created_at
    }

    ROLES {
        string id PK
        string name UK
        string description
        string permissions "pipe-separated"
        string can_manage "pipe-separated roles"
        string modules "moduleId:level|..."
    }

    MODULES {
        int id PK
        string name
        string description
        string button_label
        string href
        string icon "emoji"
        boolean show_in_nav
        string perm_read "pipe-separated perms"
        string perm_write "pipe-separated perms"
        string perm_full "pipe-separated perms"
    }

    TIENDAS {
        string id PK "UUID"
        string nombre
        string descripcion
        boolean activa
        string created_by FK "→ users.id"
        datetime created_at
    }

    TIENDA_USUARIOS {
        string id PK "UUID"
        string tienda_id FK
        string user_id FK
        boolean es_propietario
        string assigned_by FK "→ users.id"
        datetime assigned_at
    }

    VALES {
        string id PK "UUID"
        string tienda_id FK
        string cliente_id FK "→ users.id (role=cliente)"
        string descripcion
        decimal monto_total
        decimal saldo_pendiente "calculado"
        string estado "activo|pagado|anulado"
        string notas
        date fecha_vencimiento "opcional"
        string registrado_por FK "→ users.id"
        datetime created_at
    }

    ABONOS {
        string id PK "UUID"
        string vale_id FK
        decimal monto
        string estado "activo|anulado"
        string notas
        string registrado_por FK "→ users.id"
        datetime created_at
    }

    AUDIT_LOGS {
        string id PK
        string action
        string user_id FK "quien realizó la acción"
        string target_id "usuario/entidad afectada"
        string ip_address
        string user_agent
        string details "JSON"
        datetime timestamp
    }

    ROLES     ||--o{ USERS          : "asignado a"
    USERS     ||--o{ TIENDA_USUARIOS : "participa en"
    TIENDAS   ||--o{ TIENDA_USUARIOS : "tiene equipo"
    TIENDAS   ||--o{ VALES           : "gestiona"
    USERS     ||--o{ VALES           : "como cliente"
    USERS     ||--o{ VALES           : "registró"
    VALES     ||--o{ ABONOS          : "recibe abonos"
    USERS     ||--o{ ABONOS          : "registró"
    USERS     ||--o{ AUDIT_LOGS      : "generó evento"
```

## Estados del Vale

```mermaid
stateDiagram-v2
    [*] --> activo : POST /vales (crear)
    activo --> pagado : saldoPendiente == 0\n(automático tras abono)
    activo --> anulado : PATCH /vales/:id/anular
    pagado --> [*]
    anulado --> [*]
```

## Estados del Abono

```mermaid
stateDiagram-v2
    [*] --> activo : POST /vales/:id/abonos
    activo --> anulado : PATCH /vales/:valeId/abonos/:abonoId/anular
    anulado --> [*]
```

## Herencia de Permisos (roles.csv → modules.csv)

```mermaid
flowchart TD
    RC["roles.csv\nmodules: '6:write|7:full'"]
    MC["modules.csv\n6.permWrite: 'vale:crear|vale:ver-tienda'"]
    EP["Permisos Efectivos del Rol\n= propios ∪ heredados de módulos"]
    
    RC -->|"Role.getEffectivePermissions()"| MC
    MC --> EP
```
