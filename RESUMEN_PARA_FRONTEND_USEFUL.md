Hola,

He revisado el problema del `404 Not Found` para el endpoint `PUT /api/v1/guides/:guideId/useful`.

La funcionalidad para "marcar como útil" ya existía en el controlador (`guideController.toggleUseful`). El problema era que el endpoint estaba configurado como `POST` en lugar de `PUT`.

He realizado los siguientes cambios:
1.  En `src/routes/guideRoutes.js`, cambié el método HTTP de `POST` a `PUT` para la ruta `/:guideId/useful`.
2.  En `src/controllers/guideController.js`, actualicé el comentario de la función `toggleUseful` para reflejar el cambio a `PUT`.

Ahora el endpoint `PUT /api/v1/guides/:guideId/useful` debería estar correctamente configurado y activo. Por favor, reinicien el servidor y vuelvan a probar desde el frontend.

Gracias.