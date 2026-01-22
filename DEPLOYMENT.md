# 🚀 Guía de Deployment - Bingo Español

## 📋 Preparación Completada

Tu aplicación ya está lista para deployment con las siguientes configuraciones:

✅ URLs dinámicas (funciona en cualquier dominio)  
✅ Variable de entorno `PORT` configurada  
✅ Variable de entorno `BASE_URL` para QR codes  
✅ Configuración de Render incluida  
✅ Engine de Node.js especificado  

---

## 🎯 Opción 1: Render (Recomendado - Gratis)

### Ventajas
- ✅ **100% Gratis** para proyectos pequeños
- ✅ WebSockets soportados
- ✅ SSL automático (HTTPS)
- ✅ Deploy automático desde GitHub
- ✅ Fácil configuración

### Pasos para Deploy

#### 1. Crear repositorio en GitHub

```bash
cd "d:\Proyectos\Bingo clasico"
git init
git add .
git commit -m "Initial commit - Bingo Español"
```

Luego crea un repositorio en GitHub y súbelo:

```bash
git remote add origin https://github.com/TU_USUARIO/bingo-espanol.git
git branch -M main
git push -u origin main
```

#### 2. Crear cuenta en Render

1. Ve a [https://render.com](https://render.com)
2. Regístrate con tu cuenta de GitHub
3. Autoriza el acceso a tus repositorios

#### 3. Crear nuevo Web Service

1. Click en **"New +"** → **"Web Service"**
2. Conecta tu repositorio `bingo-espanol`
3. Configuración:
   - **Name**: `bingo-espanol`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

#### 4. Variables de Entorno

En la sección "Environment", agrega:

```
BASE_URL = https://bingo-espanol.onrender.com
```

(Reemplaza con tu URL de Render)

#### 5. Deploy

1. Click en **"Create Web Service"**
2. Espera 2-3 minutos mientras se despliega
3. ¡Listo! Tu app estará en `https://bingo-espanol.onrender.com`

### ⚠️ Nota Importante de Render (Plan Gratuito)

El plan gratuito de Render tiene una limitación:
- **El servidor se duerme después de 15 minutos de inactividad**
- La primera visita después de dormir tarda ~30 segundos en despertar
- Esto es normal y no afecta la funcionalidad

**Solución**: Si necesitas que esté siempre activo, considera el plan de pago ($7/mes).

---

## 🎯 Opción 2: Railway (Alternativa Gratis)

### Ventajas
- ✅ $5 de crédito gratis al mes
- ✅ No se duerme como Render
- ✅ Deploy muy rápido
- ✅ WebSockets soportados

### Pasos para Deploy

1. Ve a [https://railway.app](https://railway.app)
2. Regístrate con GitHub
3. Click en **"New Project"** → **"Deploy from GitHub repo"**
4. Selecciona tu repositorio
5. Railway detectará automáticamente Node.js
6. Agrega variable de entorno:
   ```
   BASE_URL = https://tu-app.up.railway.app
   ```
7. Deploy automático

**URL final**: `https://bingo-espanol.up.railway.app`

---

## 🎯 Opción 3: Vercel (Solo para testing)

⚠️ **No recomendado para producción** - Vercel tiene limitaciones con WebSockets en el plan gratuito.

Sin embargo, puedes usarlo para testing:

```bash
npm install -g vercel
vercel
```

---

## 🎯 Opción 4: Heroku (Requiere tarjeta)

Heroku ya no ofrece plan gratuito, pero si tienes una cuenta:

```bash
# Instalar Heroku CLI
# Luego:
heroku login
heroku create bingo-espanol
git push heroku main
heroku config:set BASE_URL=https://bingo-espanol.herokuapp.com
```

---

## 🌐 Configuración Post-Deployment

### 1. Actualizar BASE_URL

Una vez que tengas tu URL de producción, actualízala en las variables de entorno:

**Render:**
- Dashboard → Tu servicio → Environment → Edit
- Actualiza `BASE_URL` con tu URL real
- Save Changes (se redesplegará automáticamente)

**Railway:**
- Dashboard → Tu proyecto → Variables
- Actualiza `BASE_URL`
- Redeploy automático

### 2. Probar la Aplicación

Accede a:
- **Moderador**: `https://tu-url.com/moderator`
- **Display**: `https://tu-url.com/display`
- **Player**: `https://tu-url.com/player`

### 3. Verificar QR Code

El QR code debe apuntar a tu URL de producción, no a localhost.

---

## 📱 Uso en Producción

### Para el Moderador

1. Abre `https://tu-url.com/moderator` en tu PC
2. El QR code mostrará la URL de producción
3. Los jugadores escanean el QR con sus móviles

### Para los Jugadores

1. Escanean el QR code
2. Se abre automáticamente en su navegador móvil
3. Reciben su cartón único
4. ¡Listo para jugar!

### Para la Pantalla Pública

1. Abre `https://tu-url.com/display` en una TV/proyector
2. Ponlo en pantalla completa (F11)
3. Se sincroniza automáticamente con el moderador

---

## 🔧 Troubleshooting

### El QR code muestra localhost

**Problema**: La variable `BASE_URL` no está configurada.

**Solución**:
```bash
# En tu plataforma de deployment, agrega:
BASE_URL=https://tu-url-de-produccion.com
```

### WebSockets no funcionan

**Problema**: Algunos proveedores bloquean WebSockets.

**Solución**:
- ✅ Render: Soporta WebSockets
- ✅ Railway: Soporta WebSockets
- ❌ Vercel: Limitado en plan gratuito
- ✅ Heroku: Soporta WebSockets

### El servidor se duerme

**Problema**: Plan gratuito de Render.

**Soluciones**:
1. Acepta el delay de 30s en la primera visita
2. Usa Railway (no se duerme con $5 de crédito)
3. Upgrade a plan de pago en Render ($7/mes)

### Error de CORS

**Problema**: Problemas de origen cruzado.

**Solución**: Ya está configurado en el servidor, pero si persiste:

```javascript
// En server.js, después de crear 'app':
const cors = require('cors');
app.use(cors());
```

---

## 🎨 Personalización del Dominio

### Render

1. Ve a Settings → Custom Domain
2. Agrega tu dominio personalizado
3. Configura DNS según instrucciones
4. Actualiza `BASE_URL` con tu nuevo dominio

### Railway

1. Settings → Domains
2. Add Custom Domain
3. Configura DNS
4. Actualiza `BASE_URL`

---

## 📊 Monitoreo

### Render

- Dashboard → Tu servicio → Logs
- Ver logs en tiempo real
- Métricas de uso

### Railway

- Dashboard → Tu proyecto → Deployments
- Logs en tiempo real
- Uso de recursos

---

## 🚀 Deploy Rápido (Recomendación)

**La forma más rápida de tener tu app online:**

1. **Sube a GitHub** (5 minutos)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # Crear repo en GitHub
   git remote add origin https://github.com/TU_USUARIO/bingo-espanol.git
   git push -u origin main
   ```

2. **Deploy en Render** (3 minutos)
   - Regístrate en render.com
   - New Web Service
   - Conecta GitHub
   - Deploy

3. **Configura BASE_URL** (1 minuto)
   - Copia tu URL de Render
   - Environment → Add `BASE_URL`
   - Save

**Total: ~10 minutos para tener tu app online** ✅

---

## 📝 Checklist Pre-Deploy

- [x] Código actualizado con URLs dinámicas
- [x] `package.json` con engines
- [x] `render.yaml` creado
- [x] `.gitignore` configurado
- [ ] Repositorio en GitHub creado
- [ ] Cuenta en Render/Railway creada
- [ ] Variables de entorno configuradas
- [ ] Primera prueba de deployment realizada

---

## 🎯 Siguiente Paso

**¿Listo para deployar?**

1. Crea tu repositorio en GitHub
2. Elige tu plataforma (Render recomendado)
3. Sigue los pasos de la sección correspondiente
4. ¡Comparte tu URL y juega!

**¿Necesitas ayuda?** Avísame y te guío paso a paso en el proceso de deployment.
