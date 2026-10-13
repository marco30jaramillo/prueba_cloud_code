#!/bin/bash

BASE_URL="http://localhost:3000"

echo "🧪 Prueba de Headers y Autenticación"
echo "===================================="

# 1. Registrar
echo -e "\n1️⃣ Registrando usuario..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Pass1234",
    "name": "Test User"
  }')

echo "Respuesta:"
echo "$RESPONSE" | grep -o '"token":"[^"]*"'

# Extraer token
TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"//')
echo "Token extraído: ${TOKEN:0:50}..."

# 2. Validar sesión
echo -e "\n2️⃣ Validando sesión..."
curl -s -X GET "$BASE_URL/auth/validate" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"message":"[^"]*"'

# 3. Ver estadísticas: requiere sesión de superusuario o administrador.
# Exportar ADMIN_TOKEN con un token de esa sesión; el token del paso 1 es de cliente y daría 403.
if [ -n "$ADMIN_TOKEN" ]; then
  echo -e "\n3️⃣ Ver estadísticas de tokens (sesión administrativa)..."
  curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/tokens/stats" | grep -o '"stats":{[^}]*}'
else
  echo -e "\n3️⃣ /tokens/stats omitido: define ADMIN_TOKEN (superusuario o administrador)"
fi

echo -e "\n✅ Pruebas completadas"
