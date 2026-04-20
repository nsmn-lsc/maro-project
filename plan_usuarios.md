# Plan Para Sistema Real De Autenticacion De Usuarios

## Objetivo

Implementar un sistema real de autenticacion basado en la tabla `usuarios`, usando `cat_unidades` como catalogo maestro para asociar cuentas de unidad por `clues`, y dejar el proceso listo para desplegarse despues en otro servidor de forma clara y reproducible.

## Estado Actual

- El acceso de unidad no autentica contra `usuarios`.
- El login actual toma el valor capturado como si fuera una `CLUES` y lo consulta directamente en `cat_unidades`.
- La tabla `usuarios` existe en el script `scripts/seed-unidades-usuarios.ts`, pero hoy no gobierna el flujo real de acceso de unidad.
- El alta de pacientes tambien depende de `cat_unidades`, por lo que ese catalogo debe mantenerse como fuente canonica de relacion entre unidad, region, municipio y nivel.

## Resultado Esperado

Al finalizar la implementacion:

- Cada usuario iniciara sesion con `username` y `password`.
- La aplicacion validara el hash de la contraseña en la tabla `usuarios`.
- Los usuarios de nivel unidad se vincularan con `cat_unidades` a traves de `usuarios.clues_id`.
- Los usuarios regionales y estatales tendran permisos diferenciados por `nivel` y, cuando aplique, por `region`.
- El sistema podra recrearse desde cero en otro servidor con pasos repetibles.

## Decisiones Tecnicas Recomendadas

### 1. Mantener `cat_unidades` como catalogo maestro

No se debe duplicar informacion operativa de unidad en `usuarios` mas alla de la llave de relacion.

Recomendacion:

- `cat_unidades` conserva `clues`, `unidad`, `region`, `municipio`, `nivel`.
- `usuarios` guarda identidad, hash de contraseña, nivel de acceso y referencia a `clues_id` o `region`.

### 2. Migrar el login de unidad a autenticacion real

Se debe eliminar el comportamiento actual donde escribir una CLUES valida permite entrar sin consultar la tabla `usuarios`.

Nuevo flujo:

1. El usuario captura `username` y `password`.
2. El backend consulta `usuarios` por `username`.
3. Valida el hash de la contraseña.
4. Si `nivel = 'CLUES'`, obtiene datos de la unidad desde `cat_unidades` usando `clues_id`.
5. Si `nivel = 'REGION'`, arma la sesion con `region`.
6. Si `nivel = 'ESTADO'` o `ADMIN`, arma sesion de alcance estatal.

### 3. Sustituir SHA-256 simple por hash robusto para contraseñas

El script actual usa SHA-256 directo. Eso no es suficiente para autenticacion real.

Se recomienda usar una de estas opciones:

- `bcrypt` con costo 12 como base.
- `argon2id` si el despliegue lo permite.

Recomendacion practica para este proyecto:

- usar `bcrypt` por compatibilidad y simplicidad operativa.

### 4. No guardar contraseñas deterministicas por CLUES en produccion

El patron actual `Maro-<CLUES>-2026` solo sirve como bootstrap temporal o ambiente controlado. En produccion debe reemplazarse por una contraseña aleatoria fuerte y un proceso de rotacion o reseteo.

## Modelo De Datos Recomendado

## Tabla `cat_unidades`

Campos clave:

- `clues` `VARCHAR(20)` PK
- `unidad` `VARCHAR(255)`
- `region` `VARCHAR(100)`
- `municipio` `VARCHAR(150)`
- `nivel` `TINYINT`

## Tabla `usuarios`

Campos recomendados:

- `id` `INT` PK
- `username` `VARCHAR(100)` UNIQUE
- `password_hash` `VARCHAR(255)`
- `nombre` `VARCHAR(255)`
- `nivel` `ENUM('CLUES','REGION','ESTADO','ADMIN')`
- `clues_id` `VARCHAR(20)` NULL
- `region` `VARCHAR(100)` NULL
- `activo` `BOOLEAN DEFAULT TRUE`
- `must_change_password` `BOOLEAN DEFAULT TRUE`
- `last_login_at` `TIMESTAMP NULL`
- `created_at` `TIMESTAMP`
- `updated_at` `TIMESTAMP`

Cambios recomendados adicionales:

- agregar indice por `username`
- agregar indice compuesto por `nivel, region`
- agregar indice compuesto por `nivel, clues_id`
- `clues_id` como FK a `cat_unidades(clues)`

## Política De Contraseñas Robusta

Para el despliegue real se recomienda la siguiente politica:

- longitud minima de 16 caracteres
- combinar mayusculas, minusculas, numeros y simbolos
- no reutilizar `username`, `clues`, nombre de unidad ni region como parte evidente de la clave
- exigir cambio de contraseña en el primer inicio de sesion
- bloquear contraseñas debiles o comunes

Ejemplo de contraseña bootstrap segura generada por sistema:

```text
M4r0!Q7v#L2x@N9p
```

Regla operativa recomendada:

- las contraseñas iniciales no deben derivarse del `username` ni de la `CLUES`
- deben generarse aleatoriamente y entregarse por canal controlado
- al primer login el usuario debe reemplazarla

## Pasos De Implementacion

## Fase 1. Preparar el esquema base

Objetivo:

- asegurar que cualquier servidor nuevo pueda crear las tablas necesarias desde cero.

Acciones:

1. Incluir `cat_unidades` en `database/schema.sql`.
2. Incluir `usuarios` en `database/schema.sql`.
3. Agregar los campos `activo`, `must_change_password` y `last_login_at`.
4. Cambiar `password_hash CHAR(64)` por `password_hash VARCHAR(255)` para soportar `bcrypt`.
5. Agregar indices y FK definitivos.

Validacion:

- correr `SHOW TABLES;`
- correr `DESCRIBE usuarios;`
- verificar existencia de `cat_unidades` y `usuarios`

## Fase 2. Cambiar el seed de usuarios

Objetivo:

- dejar de generar hashes SHA-256 y pasar a contraseñas reales.

Acciones:

1. Instalar `bcrypt`.
2. Reemplazar `createHash("sha256")` por `bcrypt.hash()`.
3. Generar contraseñas bootstrap aleatorias por usuario.
4. Exportar un archivo seguro de entrega inicial solo para el administrador del despliegue.
5. Marcar todos los usuarios creados con `must_change_password = true`.

Recomendacion de salida del seed:

- generar archivo `.csv` o `.md` temporal con:
  - `username`
  - `nivel`
  - `clues_id` o `region`
  - contraseña temporal

Advertencia:

- ese archivo no debe versionarse en git
- debe eliminarse despues de la entrega controlada

## Fase 3. Implementar endpoint unico de login real

Objetivo:

- centralizar autenticacion en una sola ruta.

Acciones:

1. Crear un endpoint nuevo, por ejemplo `/api/auth/login`.
2. Consultar `usuarios` por `username`.
3. Validar que el usuario este `activo`.
4. Comparar contraseña con `bcrypt.compare()`.
5. Enriquecer sesion con datos de `cat_unidades` si el nivel es `CLUES`.
6. Registrar `last_login_at`.
7. Devolver objeto de sesion normalizado.

Sesion sugerida:

```json
{
  "userId": 1,
  "username": "HGIMB000011",
  "rol": "CLUES",
  "clues": "HGIMB000011",
  "unidad": "Nombre unidad",
  "region": "TULANCINGO",
  "municipio": "...",
  "nivel": 1,
  "mustChangePassword": true
}
```

## Fase 4. Sustituir el flujo actual del frontend

Objetivo:

- dejar de autenticar por busqueda directa de CLUES.

Acciones:

1. Modificar `src/app/inicial/page.tsx`.
2. Sustituir la logica actual de deteccion estatal, regional y unidad por una sola llamada al endpoint de login real.
3. Redirigir segun el `rol` devuelto por backend.
4. Si `mustChangePassword = true`, redirigir a pantalla obligatoria de cambio de contraseña.

Resultado esperado:

- ningun usuario entra solo por conocer una CLUES valida.

## Fase 5. Implementar cambio de contraseña

Objetivo:

- cerrar el riesgo de credenciales bootstrap permanentes.

Acciones:

1. Crear endpoint `/api/auth/change-password`.
2. Exigir contraseña actual o token de primer acceso.
3. Validar politica de robustez.
4. Guardar nuevo hash `bcrypt`.
5. Marcar `must_change_password = false`.

## Fase 6. Proteger rutas y acciones sensibles

Objetivo:

- asegurar que el rol controle el alcance real de los datos.

Acciones:

1. En endpoints de pacientes, limitar por `clues_id` para usuarios `CLUES`.
2. En vistas regionales, limitar por `region` para usuarios `REGION`.
3. En vistas estatales, permitir alcance global solo a `ESTADO` y `ADMIN`.
4. No confiar en filtros enviados por frontend sin cruzarlos con la sesion del usuario.

## Fase 7. Despliegue reproducible en otro servidor

Objetivo:

- garantizar que el proceso pueda repetirse sin depender de memoria operativa.

Secuencia recomendada:

```bash
npm install
npm run db:setup
npm run db:seed-unidades-usuarios
npm run build
npm run start
```

Checklist de validacion posterior:

```sql
SHOW TABLES;
SELECT COUNT(*) AS total_unidades FROM cat_unidades;
SELECT COUNT(*) AS total_usuarios FROM usuarios;
SELECT username, nivel, clues_id, region, activo, must_change_password FROM usuarios LIMIT 10;
```

Validaciones funcionales:

1. Login con usuario de unidad.
2. Login con usuario regional.
3. Login con usuario estatal.
4. Cambio obligatorio de contraseña en primer acceso.
5. Restriccion correcta de pacientes por `clues_id`.
6. Restriccion correcta de panel por `region`.

## Cambios De Codigo Concretos Recomendados

Archivos a tocar despues:

- `database/schema.sql`
- `scripts/seed-unidades-usuarios.ts`
- `package.json`
- `src/app/inicial/page.tsx`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/change-password/route.ts`
- `src/lib/auth.ts` o modulo equivalente para centralizar:
  - busqueda de usuario
  - validacion de hash
  - armado de sesion
  - reglas por rol

Dependencias probables:

- `bcrypt`
- opcionalmente `zod` para validar payloads de login y cambio de contraseña

## Riesgos Si No Se Hace Esta Migracion

- acceso por conocimiento de una CLUES valida sin autenticar contra usuario real
- contraseñas predecibles o derivadas de datos operativos
- imposibilidad de auditar ultimo acceso y estado de usuario
- despliegues inconsistentes entre servidores
- dificultad para revocar accesos por persona o unidad

## Plan De Ejecucion Recomendado

Orden sugerido:

1. Actualizar esquema.
2. Actualizar seed con `bcrypt` y bootstrap seguro.
3. Crear endpoint real de login.
4. Adaptar frontend de acceso.
5. Agregar cambio obligatorio de contraseña.
6. Reforzar autorizacion por rol en APIs.
7. Probar en entorno nuevo con base desde cero.

## Criterio De Aceptacion

El trabajo puede considerarse completo cuando:

- un servidor nuevo recrea estructura y datos sin pasos ocultos
- el login de unidad ya no depende de consultar `cat_unidades` como mecanismo de autenticacion directa
- toda contraseña almacenada usa hash robusto
- existe flujo de cambio de contraseña inicial
- los roles `CLUES`, `REGION`, `ESTADO` y `ADMIN` limitan correctamente el acceso
- el procedimiento de despliegue queda documentado y repetible