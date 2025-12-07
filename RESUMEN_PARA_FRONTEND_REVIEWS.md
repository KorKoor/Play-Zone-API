Hola,

He verificado el problema del `404 Not Found` para el endpoint `GET /api/v1/games/:gameId/reviews`.

El error se debía a un conflicto en cómo se montaban las rutas de reseñas. La ruta estaba configurada internamente como `/api/v1/reviews/games/:gameId/reviews` en lugar de la esperada `/api/v1/games/:gameId/reviews`.

He corregido esto realizando dos cambios:
1.  En `src/routes/reviewRoutes.js`, cambié la definición de la ruta de `router.route('/games/:gameId/reviews')` a `router.route('/:gameId/reviews')`.
2.  En `src/app.js`, cambié la integración de `reviewRoutes` de `app.use('/api/v1/reviews', reviewRoutes);` a `app.use('/api/v1/games', reviewRoutes);`.

Con estos cambios, el endpoint `GET /api/v1/games/:gameId/reviews` debería ser accesible correctamente. Por favor, reinicien el servidor y vuelvan a probar desde el frontend.

Gracias.