# 🎰 Bingo Español - Web App

Aplicación web de Bingo Español (90 bolas) con sincronización en tiempo real usando WebSockets.

## 📋 Características

- **Panel del Moderador**: Control completo del juego, validación de cartones y generación de QR
- **Pantalla Pública**: Display para TV/proyector con el último número y tablero general
- **Cartón del Jugador**: Interfaz móvil con marcado manual de números
- **Tiempo Real**: Sincronización instantánea entre todos los dispositivos usando Socket.io
- **Generación de Cartones**: Algoritmo que respeta las reglas del bingo español (3x9, 5 números por fila)

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start
```

El servidor se ejecutará en `http://localhost:3000`

## 🎮 Uso

### 1. Panel del Moderador
Accede a `http://localhost:3000/moderator`

**Funcionalidades:**
- **Sacar Bola**: Extrae un número aleatorio del 1 al 90
- **Reiniciar Juego**: Limpia el juego y genera un nuevo QR
- **Validador de Cartón**: Ingresa el número de serie para verificar un cartón
- **Código QR**: Los jugadores escanean este código para unirse

### 2. Pantalla Pública
Accede a `http://localhost:3000/display`

**Muestra:**
- Último número extraído (grande y animado)
- Tablero general del 1 al 90 con números iluminados
- Animaciones visuales para cada nueva bola

### 3. Cartón del Jugador
Accede a `http://localhost:3000/player` o escanea el QR

**Funcionalidades:**
- Cartón único asignado automáticamente
- Toca los números para marcar con fichas virtuales
- Toca nuevamente para quitar la ficha
- Los números marcados se guardan en la sesión
- Número de serie visible para validación

## 🏗️ Arquitectura

```
Bingo Clásico/
├── server.js              # Servidor Express + Socket.io
├── package.json           # Dependencias
├── public/                # Archivos estáticos
│   ├── moderator.html     # Panel del moderador
│   ├── display.html       # Pantalla pública
│   ├── player.html        # Cartón del jugador
│   └── styles.css         # Estilos y animaciones
└── README.md              # Este archivo
```

## 🎲 Lógica del Cartón Español

Cada cartón cumple con las siguientes reglas:
- Matriz de **3 filas x 9 columnas**
- **5 números** y **4 espacios vacíos** por fila
- Columnas respetan rangos:
  - Col 1: 1-9
  - Col 2: 10-19
  - Col 3: 20-29
  - ...
  - Col 9: 80-90
- Sin números repetidos en el mismo cartón
- Números ordenados de menor a mayor en cada columna

## 🔧 Tecnologías

- **Backend**: Node.js + Express
- **Tiempo Real**: Socket.io
- **Frontend**: HTML + Tailwind CSS
- **QR Codes**: qrcode library
- **Persistencia**: Memoria volátil (se limpia al reiniciar el servidor)

## 📱 Responsive Design

- **Moderador**: Optimizado para PC (escritorio)
- **Display**: Optimizado para pantallas grandes (TV/proyector)
- **Player**: Optimizado para móviles (touch-friendly)

## 🎨 Características Visuales

- Diseño moderno con glassmorphism
- Gradientes vibrantes
- Animaciones suaves
- Modo oscuro por defecto
- Efectos de pulso y escala para nuevas bolas
- Feedback visual en todas las interacciones

## 🔐 Validación de Cartones

El moderador puede validar un cartón ingresando su número de serie. El sistema muestra:
- La matriz completa del cartón
- Números que coinciden con las bolas extraídas (resaltados en verde)
- Contador de aciertos

## 🔄 Reinicio de Juego

Al reiniciar el juego:
- Se genera un nuevo ID de juego
- Se limpia el historial de bolas
- Se invalidan todos los cartones anteriores
- Se genera un nuevo código QR
- Los jugadores deben recargar para obtener nuevos cartones

## 📝 Notas

- **MVP**: Usa memoria volátil. Si el servidor se reinicia, se pierde todo el estado del juego.
- **Localhost**: Para uso en red local, cambia `localhost` por la IP del servidor en el código QR.
- **Puerto**: Por defecto usa el puerto 3000. Configurable con la variable de entorno `PORT`.

## 🎯 Próximas Mejoras (Futuras)

- Persistencia con base de datos
- Detección automática de línea/bingo
- Múltiples salas de juego simultáneas
- Historial de ganadores
- Sonidos y efectos de audio
- Modo de juego automático

## 👨‍💻 Desarrollo

```bash
# Modo desarrollo (con auto-reload)
npm install -g nodemon
nodemon server.js
```

---

**¡Buena suerte y que gane el mejor!** 🍀
