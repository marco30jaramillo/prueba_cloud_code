#!/bin/bash

BASE_URL="http://localhost:3000"

echo "📝 Pruebas de API de Autenticación"
echo "=================================="

echo -e "\n1️⃣  Registrar usuario"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "Juan Pérez"
  }')
echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | head -1
TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"//')
echo "Token: $TOKEN"

echo -e "\n2️⃣  Login con credenciales correctas"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }' | grep -o '"message":"[^"]*"'

echo -e "\n3️⃣  Validar sesión (con token)"
curl -s -X GET "$BASE_URL/auth/validate" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"message":"[^"]*"'

echo -e "\n4️⃣  Login con credenciales incorrectas"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "wrongpassword"
  }' | grep -o '"error":"[^"]*"'

echo -e "\n5️⃣  Solicitar recuperación de contraseña"
curl -s -X POST "$BASE_URL/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }' | grep -o '"message":"[^"]*"'

echo -e "\n✅ Pruebas completadas"
