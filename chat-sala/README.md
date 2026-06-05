# Sala de chat

Chat web simple con salas por enlace, mensajes en vivo y sin dependencias externas.

## Ejecutar localmente

```bash
node server.js
```

Luego abre:

```text
http://localhost:3000
```

## Usar una sala

1. Escribe tu nombre.
2. Escribe el nombre de la sala, por ejemplo `amigos`.
3. Presiona `Entrar`.
4. Copia el enlace y compartelo con otras personas.

## Subir a internet

Este proyecto funciona en cualquier hosting que ejecute Node.js y soporte conexiones HTTP largas, por ejemplo Render, Railway, Fly.io o un VPS.

Comando de inicio:

```bash
node server.js
```

Puerto:

```text
PORT
```

El servidor usa la variable `PORT` si el hosting la proporciona.

## Nota

Los mensajes se guardan solo en memoria. Si el servidor se reinicia, se borra el historial.
