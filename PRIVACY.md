# 🛡️ Política de Privacidad – GPT sin Alzheimer

> Última actualización: 2025-04-19  
> Esta política aplica a todas las instancias de uso de GPT sin Alzheimer a través de su aplicación de escritorio o servidor local.

---

## 📌 ¿Qué es GPT sin Alzheimer?

GPT sin Alzheimer es una herramienta local desarrollada en entorno experimental, que extiende la funcionalidad de modelos conversacionales (como ChatGPT) mediante un sistema de almacenamiento de notas, preferencias y archivos en carpetas locales del usuario.

El objetivo principal de este proyecto es servir como **prueba de concepto**, asistente narrativo, o compendio personal gestionado mediante comandos personalizados, **sin garantías de seguridad ni privacidad**.

---

## 🧠 ¿Qué datos se almacenan?

- Notas, archivos o textos que tú mismo introduzcas al sistema.
- Preferencias locales como el usuario activo, reglas, configuración de arranque o confirmaciones.
- Estructura de carpetas bajo `/data/usuarios/` con acceso abierto desde el sistema.

---

## ❗ Limitaciones importantes de seguridad

Este software **NO garantiza ninguna forma de protección de datos**, ni mediante cifrado, autenticación ni control de acceso.

- El sistema funciona leyendo y escribiendo directamente en **carpetas locales sin ningún tipo de cifrado**.
- Toda la información es susceptible de ser revisada, modificada o eliminada por:
  - El autor de la instancia
  - Cualquier usuario con acceso a los archivos locales
- En modo servidor, si se abre un túnel público (como localtunnel), el endpoint queda **públicamente expuesto en la red**, salvo que se configure una protección adicional **por parte del usuario**.

⚠️ **No debe usarse para almacenar información personal, privada, sensible o confidencial**.

---

## 📤 ¿Se envía información a terceros?

**No.**  
Esta aplicación no recopila, analiza ni reenvía datos a ningún servicio externo, salvo que explícitamente tú actives integraciones (como GPTs personalizados de OpenAI).

Sin embargo, cualquier archivo subido desde un GPT personalizado se almacena **sin cifrado** en tu máquina, por lo que se debe asumir que está **en texto plano**.

---

## 🔄 Modificaciones o eliminación de contenido

La información almacenada es considerada **temporal y no protegida**.  
Como autor del software, me reservo el derecho de:

- Cambiar la estructura de archivos en nuevas versiones
- Limpiar contenido incompatible
- Eliminar, mover o reescribir datos como parte del desarrollo de nuevas funciones

---

## ⚠️ Este software es una alfa experimental

- No está pensado para producción ni uso generalizado
- Puede contener errores, comportamientos inesperados o riesgos de pérdida de datos
- Su uso es bajo tu total responsabilidad

---

## 👤 Contacto del autor

Desarrollado por **Alejandro Moreno Rivera**  
Repositorio del proyecto: [GitHub](https://github.com/AlejandroMorenoRivera/GPT-sin-Alzheimer)

---

> Al usar esta herramienta, reconoces que entiendes y aceptas estos riesgos y limitaciones.
