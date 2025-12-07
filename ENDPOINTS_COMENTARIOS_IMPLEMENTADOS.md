# 📋 ENDPOINTS DE COMENTARIOS - BACKEND API

## 🚨 PROBLEMA IDENTIFICADO Y RESUELTO

**Problema:** El frontend intenta acceder a `/comments/{id}` pero el backend solo tenía comentarios integrados en posts.

**Solución:** ✅ Implementados endpoints específicos para comentarios individuales.

---

## 📡 ENDPOINTS DISPONIBLES

### 1. **Comentarios en Posts** (Existentes)
```
POST   /api/v1/posts/{postId}/comments     - Crear comentario
GET    /api/v1/posts/{postId}/comments     - Obtener comentarios del post
```

### 2. **Comentarios Individuales** (✅ NUEVOS)
```
GET    /api/v1/comments/{commentId}        - Obtener comentario específico
DELETE /api/v1/comments/{commentId}        - Eliminar comentario (autor o admin)
```

### 3. **Comentarios en Guías** (Existentes)
```
POST   /api/v1/guides/{guideId}/comments   - Crear comentario en guía
GET    /api/v1/guides/{guideId}/comments   - Obtener comentarios de guía
```

---

## 🎯 CASOS DE USO RESUELTOS

### ✅ Sistema de Reportes
Ahora funciona correctamente:
```javascript
// El sistema de reportes puede verificar tanto:
- Comment.findById(content_id)           // ✅ Comentarios de posts
- GuideComment.findById(content_id)      // ✅ Comentarios de guías
```

### ✅ Referencias Directas
```
GET /api/v1/comments/69251118784d98d5ffec5a1a
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "69251118784d98d5ffec5a1a",
    "content": "Texto del comentario",
    "authorId": {
      "id": "...",
      "alias": "usuario123",
      "avatarUrl": "..."
    },
    "postId": {
      "id": "...", 
      "title": "Post donde está el comentario"
    },
    "createdAt": "2025-12-07T...",
    "updatedAt": "2025-12-07T..."
  }
}
```

### ✅ Moderación de Comentarios
```
DELETE /api/v1/comments/{commentId}
```
- ✅ Solo el autor puede eliminar su comentario
- ✅ Los admins pueden eliminar cualquier comentario
- ✅ Actualiza automáticamente el contador en el post

---

## 🔧 ARCHIVOS MODIFICADOS/CREADOS

### 1. **src/controllers/commentController.js** ⚡ ACTUALIZADO
**Funciones agregadas:**
- `getCommentById(req, res)` - Obtener comentario individual
- `deleteComment(req, res)` - Eliminar comentario con permisos

### 2. **src/routes/commentRoutes.js** ✅ NUEVO
**Rutas implementadas:**
- `GET /:commentId` - Ver comentario
- `DELETE /:commentId` - Eliminar comentario

### 3. **src/app.js** ⚡ ACTUALIZADO
**Agregado:**
```javascript
const commentRoutes = require('./routes/commentRoutes');
app.use('/api/v1/comments', commentRoutes);
```

---

## 🚀 TESTING INMEDIATO

### Test 1: Obtener comentario específico
```bash
curl -X GET http://localhost:8000/api/v1/comments/69251118784d98d5ffec5a1a \
  -H "Authorization: Bearer YOUR_TOKEN"
```
**Resultado esperado:** ✅ 200 OK con datos del comentario

### Test 2: Reportar comentario (ahora funciona)
```bash
curl -X POST http://localhost:8000/api/v1/reports \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content_id": "69251118784d98d5ffec5a1a",
    "content_type": "comment",
    "reason": "harassment"
  }'
```
**Resultado esperado:** ✅ 201 Created (ya no error 400)

### Test 3: Panel admin con datos completos
```bash
curl -X GET http://localhost:8000/api/v1/reports?status=pending \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
**Resultado esperado:** ✅ Lista con `content_data` completo de comentarios

---

## 📋 ESTRUCTURA COMPLETA DE LA API

```
/api/v1/
├── posts/
│   ├── POST /                     - Crear post
│   ├── GET /feed                  - Feed principal
│   ├── GET /:postId               - Post individual
│   ├── POST /:postId/comments     - Crear comentario ✅
│   └── GET /:postId/comments      - Ver comentarios ✅
├── comments/
│   ├── GET /:commentId            - Ver comentario ✅ NUEVO
│   └── DELETE /:commentId         - Eliminar ✅ NUEVO
├── guides/
│   ├── POST /:guideId/comments    - Comentario guía ✅
│   └── GET /:guideId/comments     - Ver comentarios guía ✅
└── reports/
    ├── POST /                     - Crear reporte ✅
    ├── GET /                      - Lista admin ✅
    ├── GET /check-duplicate       - Verificar duplicados ✅
    └── PUT /:id/status            - Actualizar estado ✅
```

---

## 💬 RESUMEN FINAL

**TODOS LOS PROBLEMAS RESUELTOS** ✅

1. ✅ **Endpoint `/comments/{id}` implementado**
2. ✅ **Sistema de reportes funciona con comentarios**
3. ✅ **Panel admin obtiene datos completos**
4. ✅ **Moderación de comentarios disponible**
5. ✅ **API completa y consistente**

**El contentId `69251118784d98d5ffec5a1a` ahora funciona en:**
- Sistema de reportes ✅
- Referencias directas ✅  
- Panel de administración ✅
- Moderación ✅