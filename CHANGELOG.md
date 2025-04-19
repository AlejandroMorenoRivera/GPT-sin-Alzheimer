# 📜 CHANGELOG – GPT sin Alzheimer

Todas las modificaciones importantes de este proyecto estarán documentadas aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto sigue [SemVer](https://semver.org/lang/es/) para control de versiones.

---

## 🧠 v0.6.0 - Primer build EXE funcional y optimizaciones generales

### 🚀 Nuevas características

- Empaquetado funcional de la app como `.exe` con `electron-builder`
- Carpeta `builds/` generada automáticamente con versiones independientes
- Integración de túnel con `localtunnel` para exposición externa (WIP)

### 🛠️ Mejoras técnicas

- `fs-extra` agregado correctamente a `dependencies` para empaquetado funcional
- El script `build-demo.js` ahora detecta procesos bloqueados y errores comunes
- Alineación total del `package.json` con buenas prácticas de producción
- Versión cambiada a `0.6.0` para marcar la primera versión funcional como ejecutable

### 🧼 Mantenimiento

- Carpeta `/builds` excluida del repositorio mediante `.gitignore`
- Limpiado código redundante y garantizado flujo de logs desde el ejecutable

---

## [v0.4.1] - 2025-04-19

### Añadido

- Archivo `PRIVACY.md` con política de privacidad detallada.
- Enlace a la política en el `README.md`.

### Aviso

- El proyecto sigue en estado alfa. No se recomienda almacenar información sensible.

---

## [v0.3.1] - 2025-04-19

### Añadido

- Interfaz gráfica pulida para crear usuarios desde bandeja
- Detección automática de modo oscuro/claro en HTML
- Botones "Crear" y "Cancelar" con diseño centrado

### Corregido

- Validación de nombres de usuario según reglas de Windows
- Error que cerraba la app al mostrar errores
- Margen visual que causaba descuadre en el prompt

---

## [v0.3.0] - 2025-04-18

### Añadido

- Sistema de bandeja con control de servidor (encender/apagar/reiniciar)
- Cambio de usuario y creación desde menú contextual
- Auto-lanzamiento del backend y tunnel desde Electron

---

## [v0.2.0] - 2025-04-17

### Añadido

- Backend funcional multiusuario
- Endpoints REST para notas y configuración
- Integración con GPT personalizado y validación de funciones

---

## [v0.1.0] - 2025-04-16

### Inicial

- Estructura base del proyecto
- Sistema de notas locales por usuario
- Icono e identidad visual definidos
