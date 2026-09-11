# ✅ Checklist Antes de Hacer `git push`

## 🔐 Seguridad

- [ ] ¿Existe `.env.example` (sin valores reales)?
- [ ] ¿NO existe `.env` en los cambios a subir?
  ```bash
  git status | grep -E "\.env$"  # No debe devolver nada
  ```
- [ ] ¿NO existe `users.csv` en los cambios?
  ```bash
  git status | grep "users.csv"  # No debe devolver nada
  ```
- [ ] ¿NO existe `tokens_*.csv` en los cambios?
  ```bash
  git status | grep "tokens_"  # No debe devolver nada
  ```
- [ ] ¿NO existe `node_modules/` en los cambios?
  ```bash
  git status | grep "node_modules"  # No debe devolver nada
  ```

## 📁 Estructura

- [ ] ¿`.gitignore` está creado?
- [ ] ¿`.env.example` está creado?
- [ ] ¿`package.json` y `package-lock.json` están incluidos?
  ```bash
  git ls-files | grep package.json  # Debe devolver algo
  ```
- [ ] ¿Archivos `src/` y `docs/` están incluidos?

## 📝 Documentación

- [ ] ¿Existe `CLAUDE.md` con guía técnica?
- [ ] ¿Existe `README_REPO.md` con instrucciones de setup?
- [ ] ¿Existe `API_RESPONSE_FORMAT.md`?
- [ ] ¿Todos los `.md` están en español/inglés consistente?

## 🔧 Configuración

- [ ] ¿`package.json` tiene nombre descriptivo?
- [ ] ¿`package.json` tiene descripción clara?
- [ ] ¿`package.json` tiene scripts útiles?
  ```json
  {
    "scripts": {
      "start": "node src/server.js",
      "dev": "node --watch src/server.js"
    }
  }
  ```

## ✨ Código

- [ ] ¿Todo el código está en `src/`?
- [ ] ¿No hay archivos `.js` en raíz (excepto si es el entry point)?
- [ ] ¿No hay credenciales hardcodeadas?
  ```bash
  grep -r "password" src/ | grep -i "hardcoded"
  grep -r "secret" src/ | grep -i "changeme"
  ```
- [ ] ¿Existe `.gitignore` que excluya logs?

## 📦 Dependencias

- [ ] ¿Solo dependencias necesarias en `package.json`?
  ```bash
  npm list  # Revisar que todas sean necesarias
  ```
- [ ] ¿No hay dependencias de desarrollo en producción?

## 🧪 Testing

- [ ] ¿Existen archivos de prueba? (opcional)
- [ ] ¿Scripts de test funcionan?
  ```bash
  npm test  # Si existe
  ```

## 📋 Git History

- [ ] ¿Commits tienen mensajes descriptivos?
  ```bash
  git log --oneline | head -10  # Revisar mensajes
  ```
- [ ] ¿No hay commits con "WIP" o "temp"?
- [ ] ¿Historio está limpio?

## 🚀 Final Check

```bash
# 1. Ver exactamente qué se subirá
git status

# 2. Revisar cambios
git diff --cached

# 3. Asegurar que .gitignore está configurado
cat .gitignore

# 4. Simulación: ¿Podría alguien clonar y usar esto?
# git clone <repo>
# cp .env.example .env
# npm install
# npm start
```

---

## 📤 Pasos de Commit

```bash
# 1. Agregar archivos
git add .

# 2. Crear commit
git commit -m "Initial commit: Auth system with JWT tokens"

# 3. Verificar una última vez
git status  # Debe estar limpio

# 4. Push
git push origin main

# 5. Verificar en GitHub
# Ir a https://github.com/tu-usuario/repo
# Confirmar que se subió correctamente
```

---

## ⚠️ Señales de Alerta

🚨 **NO HACER PUSH SI:**

```bash
❌ git status | grep ".env"           # .env sin .example
❌ git status | grep "users.csv"      # Datos de usuarios
❌ git status | grep "node_modules"   # Dependencias
❌ git status | grep "\.log"          # Logs
❌ git ls-files | grep "password"     # Contraseñas en código
```

---

## 🔄 Cambios Posteriores

Después de hacer push, si necesitas cambiar algo:

```bash
# 1. Hacer cambios locales
# ... editar archivos ...

# 2. Commit
git add .
git commit -m "Fix: description"

# 3. Push
git push origin main
```

---

## 👥 Para Colaboradores

Cuando alguien clona el repo:

```bash
# 1. Clonar
git clone <repo>
cd proyecto_prueba_claude_code

# 2. Setup
npm install
cp .env.example .env

# 3. Editar .env con credenciales
nano .env
# Cambiar JWT_SECRET, etc.

# 4. Iniciar
npm start

# 5. Desarrollo
git checkout -b feature/tu-feature
# ... hacer cambios ...
git push origin feature/tu-feature
# Crear Pull Request en GitHub
```

---

## 📊 Checklist Rápido

```bash
# Todo en uno:
git status && \
git diff --cached && \
echo "---" && \
echo "¿Ves .env, users.csv, o node_modules?" && \
echo "Si SÍ → NO hagas push" && \
echo "Si NO → Puedes hacer push" && \
echo "---" && \
cat .gitignore | grep "\.env"
```

---

## ✅ Cuando TODO está listo

```bash
git push origin main
echo "✅ Código subido correctamente"
```

Felicidades! 🎉 Tu repositorio es seguro y está listo para colaboración.
