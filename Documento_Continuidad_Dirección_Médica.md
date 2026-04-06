## MARO HUB
Sistema de Seguimiento Clínico y Gestión de Riesgo Prenatal
<br><br>

Documento de Continuidad para Dirección Médica
<br><br>

Versión ejecutiva  
Fecha: 06/04/2026  
Responsable técnico: LSC. Norel Sánchez M. Nájera

<p class="signature-mark">
	NSN_ • Built with 
	<i class="fa-brands fa-linux" aria-hidden="true"></i>
	<i class="fa-brands fa-fedora" aria-hidden="true"></i>
</p>

<br><br><br>

---

## Índice
1. [Objetivo del documento](#1-objetivo-del-documento)
2. [¿Qué es MARO HUB y qué resuelve?](#2-qué-es-maro-hub-y-qué-resuelve)
3. [Flujo general del sistema](#3-flujo-general-del-sistema)
4. [Modelo de datos](#4-modelo-de-datos)
5. [Reglas de negocio clave](#5-reglas-de-negocio-clave)
6. [Estado actual del sistema](#6-estado-actual-del-sistema)
7. [Arquitectura del sistema](#7-arquitectura-del-sistema-explicación-para-dirección-médica)
8. [¿Por qué separar la aplicación y la base de datos?](#8-por-qué-separar-la-aplicación-y-la-base-de-datos-justificación-para-médicos-y-directivos)
9. [Qué se necesita para mantener el sistema funcionando](#9-qué-se-necesita-para-mantener-el-sistema-funcionando)
10. [Próximos pasos sugeridos](#10-próximos-pasos-sugeridos)
11. [Contacto para continuidad](#11-contacto-para-continuidad)

## 1. Objetivo del documento
Este documento resume el estado actual del sistema MARO HUB, su funcionamiento general y los elementos necesarios para garantizar su continuidad operativa.

Incluye:
- Qué hace el sistema y cómo fluye la información.
- Cómo se registran y evalúan los riesgos clínicos.
- Cómo funciona el proceso de colegiación.
- Cómo se generan alertas y notificaciones.
- Por qué la arquitectura está separada en dos nodos (aplicación y base de datos).
- Qué se requiere para mantener el sistema funcionando de forma segura.

## 2. ¿Qué es MARO HUB y qué resuelve?
MARO HUB es una plataforma diseñada para:
- Registrar consultas prenatales.
- Calcular automáticamente el riesgo clínico de cada paciente.
- Identificar casos que requieren escalamiento estatal (colegiados).
- Llevar un seguimiento ordenado de los casos de alto riesgo.
- Enviar alertas automáticas al personal correspondiente cuando un caso supera el umbral crítico.
- Proveer un dashboard con indicadores actualizados para toma de decisiones.

El objetivo es estandarizar el seguimiento, reducir omisiones y mejorar la respuesta ante casos críticos.

## 3. Flujo general del sistema
### 3.1 Registro clínico
El personal captura signos vitales y datos relevantes de la consulta.

### 3.2 Cálculo automático de riesgo
El sistema combina:
- Antecedentes clínicos del paciente.
- Factores de tamizaje.
- Signos de la consulta actual.

Si el puntaje total es 25 o más, el sistema marca el caso como riesgo crítico.

### 3.3 Escalamiento estatal (colegiación)
Cuando un caso es crítico:
- La plataforma muestra una alerta al personal.
- Se puede colegiar el caso con un solo clic.
- El sistema registra la fecha y evita duplicados (solo un caso activo por paciente).

### 3.4 Alertas automáticas
Si las alertas están activadas:
- El sistema genera un registro interno del evento.
- Un módulo especializado envía la notificación al canal de Telegram correspondiente.
- Si Telegram falla, el sistema reintenta sin afectar la consulta clínica.

### 3.5 Dashboard
La dirección médica puede ver:
- Último puntaje de cada paciente.
- Casos colegiados.
- Tendencias y acumulados.
- Exportación a Excel.

## 4. Modelo de datos
El sistema utiliza cinco tablas principales:

### 4.1 Consultas prenatales
Cada consulta registrada, con signos vitales, puntajes y si fue colegiada.

### 4.2 Pacientes
Información general, antecedentes y factores de riesgo base.

### 4.3 Planes de colegiados
Seguimiento estructurado de los casos escalados.

### 4.4 Alertas
Registro de eventos críticos que deben notificarse.

### 4.5 Historial de riesgo
Bitácora que permite revisar cómo ha evolucionado el riesgo de cada paciente.

## 5. Reglas de negocio clave
- Un paciente no puede tener dos casos colegiados activos.
- El riesgo crítico se marca cuando el puntaje total es 25 o más.
- Algunos antecedentes graves fuerzan automáticamente el riesgo a 25.
- Las alertas solo se envían si están habilitadas y configuradas.
- El dashboard siempre muestra la última consulta de cada paciente.

## 6. Estado actual del sistema
El sistema está operativo para uso diario en sus funciones principales, pero aún tiene pendientes relevantes antes de considerarse completamente robusto a nivel institucional.

### Semaforización ejecutiva
- Verde (estable): operación clínica diaria (registro de consultas, cálculo de riesgo, colegiación y dashboard).
- Amarillo (atención prioritaria): fortalecimiento de seguridad y cierre de pendientes de control de accesos.
- Rojo (crítico a resolver): retiro de contraseñas temporales, eliminación de bitácoras sensibles y rotación inmediata de credenciales críticas.

### Funcionalidades disponibles hoy
- Registro de consultas prenatales.
- Cálculo de riesgo y detección de casos críticos.
- Escalamiento estatal (colegiación).
- Dashboard con información consolidada.
- Alertas automáticas (cuando están habilitadas y configuradas).

### Pendientes prioritarios de continuidad y seguridad
- Retirar contraseñas temporales de respaldo que aún existen en algunos accesos.
- Eliminar registros de autenticación que hoy exponen información sensible en bitácoras.
- Actualizar y rotar credenciales críticas (base de datos, accesos y Telegram).
- Fortalecer el control del módulo interno de alertas para asegurar acceso restringido en todo momento.
- Completar pruebas integrales de punta a punta para validar estabilidad en escenarios reales.

### Riesgos operativos vigentes
- Si faltan migraciones de base de datos, algunas funciones pueden degradarse sin detener completamente el sistema.
- El flujo de colegiación depende de consistencia en la consulta más reciente por paciente.
- El envío de alertas depende de configuración correcta de entorno y conectividad del canal de notificación.

## 7. Arquitectura del sistema 
### ¿Cómo está organizado MARO HUB?
La plataforma está dividida en dos nodos independientes:

### Nodo 1 - Aplicación (Frontend + API)
Aquí vive:
- La interfaz que usa el personal.
- La lógica que calcula riesgo.
- El módulo que gestiona colegiados.
- El sistema que genera alertas.

Este nodo no almacena datos clínicos. Solo procesa información y la envía al nodo de base de datos.

### Nodo 2 - Base de datos (MySQL en red privada)
Aquí se guarda:
- Información de pacientes.
- Consultas prenatales.
- Historial de riesgo.
- Alertas.
- Planes de colegiados.

Este nodo está aislado en una red privada, sin acceso público.

## 8. ¿Por qué separar la aplicación y la base de datos? (Justificación de la arquitectura original)
Nota para continuidad: este diseño de separación de nodos corresponde a mi arquitectura original.
No implica que todos los equipos deban usar exactamente el mismo esquema, pero sí explica por qué se implementó así en este despliegue.

### 8.1 Seguridad clínica
Los datos sensibles (pacientes, signos vitales, riesgo) nunca están expuestos a internet. Solo la aplicación puede acceder a la base de datos mediante una red privada.

Esto reduce riesgos de:
- Accesos no autorizados.
- Robo de información.
- Ataques externos.

### 8.2 Estabilidad y continuidad
Si la aplicación falla o se actualiza:
- La base de datos permanece intacta.
- No se pierde información clínica.
- Se puede levantar una nueva versión sin afectar los registros.

### 8.3 Escalabilidad
Permite crecer sin rehacer el sistema:
- Se puede mejorar la aplicación sin tocar la base de datos.
- Se puede migrar la base de datos a un servidor más robusto sin cambiar la aplicación.
- Se pueden agregar módulos nuevos sin comprometer la información existente.

### 8.4 Auditoría y trazabilidad
La base de datos aislada permite:
- Revisar historial de riesgo.
- Auditar consultas.
- Validar colegiados.
- Mantener integridad de la información.

### 8.5 Buenas prácticas en salud digital
En sistemas clínicos, separar nodos es un estándar internacional porque:
- Protege datos sensibles.
- Reduce superficie de ataque.
- Facilita certificaciones.
- Permite control estricto de accesos.

En resumen: la separación de nodos se adoptó aquí por seguridad, continuidad operativa y control de acceso en un entorno con datos clínicos sensibles.

## 9. Qué se necesita para mantener el sistema funcionando
- Mantener la base de datos accesible desde la aplicación.
- Mantener configuradas las credenciales de acceso.
- Mantener actualizados los secretos (contraseñas internas).
- Ejecutar migraciones cuando se actualice el sistema.
- Verificar que las alertas estén configuradas si se desean usar.

## 10. Próximos pasos sugeridos
- Reforzar seguridad eliminando contraseñas temporales.
- Actualizar el sistema de autenticación.
- Revisar el módulo de alertas y su configuración.
- Realizar pruebas completas de flujo clínico.
- Mantener documentación actualizada.

## 11. Contacto para continuidad
El documento técnico completo (para ingeniería) está disponible en un archivo separado.

Este documento es la versión ejecutiva para dirección médica.