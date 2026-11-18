# Servicio de avisos push

Escucha Firestore con una cuenta de servicio y envía Web Push (VAPID) a los dispositivos suscritos desde la pantalla **Avisos** de la app. La instalación está en el [README principal](../README.md#avisos-en-el-móvil-opcional); aquí, cómo funciona y cómo ajustarlo.

## Avisos y reglas

| Aviso | Cuándo | Texto |
|---|---|---|
| Elemento gastado | un ingrediente pasa a agotado; agrupa lo que llegue seguido (60 s) | «Se ha gastado Leche» / «Se han gastado 3: …» |
| Lista de la compra | se añaden **varios** elementos: uno solo no avisa; un aviso por tanda, con 15 min de enfriamiento que se renuevan con cada añadido | «Se están añadiendo elementos a la lista» |
| Compra hecha | se confirma la compra | «12 productos añadidos a la despensa» |
| Receta nueva | entra una receta (2 s; una importación en lote sale como un solo aviso) | título, o «3 recetas nuevas en el recetario» |
| Usuario nuevo | el admin añade a alguien | «*correo* se ha unido» |
| Nota | llega la hora de una nota con aviso (se revisa cada 30 s); solo a las personas elegidas en la nota, sin ventana horaria | el texto de la nota |
| Caducidad | un ingrediente entra en «caduca en 3 días o menos»; revisión cada hora, solo de 8:00 a 22:00 | «Leche caduca mañana» / «6 ingredientes caducan pronto: Leche (hoy), …» |

- Solo se envía a **miembros**: se escucha la colección `users` y se descartan las suscripciones de quien ya no tiene acceso.
- Durante una **restauración de copia** (la app escribe `meta/restoring`) los avisos se pausan hasta 45 s después de terminar, para no avisar de cada receta o compra restaurada.
- No se avisa a quien provoca el cambio (los documentos llevan el campo `by` con su uid).
- La caducidad avisa una vez por ingrediente y fecha; si cambias la fecha, se rearma. La primera vez que arranca no avisa de lo que ya estaba en aviso.
- Los ingredientes con la modalidad «desde que se compró» o congelados nunca avisan, igual que en la app.

## Ajustes

Los tiempos y textos están en `index.mjs` (esperas de cada aviso, hora de revisión) y `lib.mjs` (reglas y mensajes; con pruebas en `tests/unit/notifier.test.ts`). Tras cambiarlos, `./instalar.sh [usuario@host]` los vuelve a instalar.

## Aviso de prueba

El botón «Enviarme un aviso de prueba» de **Avisos** crea un documento en `pushTests`; el servicio lo atiende, envía la notificación a ese dispositivo y anota `status` (`sent` o `no-device`). Si el servicio está apagado, la app avisa a los 15 s.

## Zona horaria

`instalar.sh` detecta la de la máquina y la guarda como `TZ=` en `notifier/.env` (por defecto, Europe/Madrid). Marca la ventana de 8:00 a 22:00 y los días de caducidad.

## Notas

- Registro: `docker logs -f cocinin-notifier`. Estado de caducidad: `notifier/data/expiry-state.json`.
- Si la máquina está apagada o sin internet, los avisos de ese rato se pierden; no se acumulan. Excepción: una nota con aviso cuya hora pasó se envía al arrancar, aunque sea tarde.
- Una suscripción que el servicio de push da por inexistente (404/410) se borra sola.
- Para quitarlo: `docker compose down` en `notifier/`, y borra la clave de la cuenta de servicio en la consola de Firebase si ya no la usas.
- Privacidad: `secrets/` (clave de servicio y VAPID), `data/` y `.env` están en `.gitignore`. La clave de servicio da acceso amplio al proyecto: déjala solo en esa máquina.
