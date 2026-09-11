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

# 2. Verificar headers
echo -e "\n2️⃣ Probando /debug/headers SIN Authorization..."
curl -s "$BASE_URL/debug/headers" | grep -o '"authHeader":"[^"]*"'

echo -e "\n3️⃣ Probando /debug/headers CON Authorization..."
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/debug/headers" | grep -o '"authHeader":"[^"]*"'

# 3. Validar sesión
echo -e "\n4️⃣ Validando sesión..."
curl -s -X GET "$BASE_URL/auth/validate" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"message":"[^"]*"'

# 4. Ver estadísticas
echo -e "\n5️⃣ Ver estadísticas de tokens..."
curl -s "$BASE_URL/tokens/stats" | grep -o '"totalGranted":[0-9]*'

echo -e "\n✅ Pruebas completadas"
