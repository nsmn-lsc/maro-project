<style>
	:root {
		--maro-ink: #15344b;
		--maro-accent: #007a7c;
		--maro-soft: #eaf6f8;
		--ok: #1b8f4b;
		--warn: #c27a00;
		--danger: #b42318;
		--surface: #ffffff;
		--line: #d5e3ea;
	}

	.cover {
		border: 1px solid var(--line);
		background: linear-gradient(145deg, #f6fbfc 0%, #eef7fb 45%, #ffffff 100%);
		border-radius: 14px;
		padding: 20px 24px;
		margin-bottom: 18px;
	}

	.cover h1 {
		margin: 0;
		font-size: 2rem;
		color: var(--maro-ink);
		letter-spacing: 0.4px;
	}

	.cover .subtitle {
		margin-top: 8px;
		color: #24516e;
		font-weight: 600;
	}

	.cover .meta {
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid var(--line);
		color: #2b475a;
	}

	.section-chip {
		display: inline-block;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.8px;
		font-weight: 700;
		color: var(--maro-accent);
		background: var(--maro-soft);
		border: 1px solid #bee3e5;
		border-radius: 999px;
		padding: 4px 10px;
		margin-bottom: 8px;
	}

	.signal-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
		margin-top: 8px;
	}

	.signal {
		border-radius: 10px;
		padding: 10px 12px;
		border: 1px solid var(--line);
		background: var(--surface);
	}

	.signal strong {
		display: block;
		margin-bottom: 4px;
	}

	.signal.ok { border-left: 6px solid var(--ok); }
	.signal.warn { border-left: 6px solid var(--warn); }
	.signal.danger { border-left: 6px solid var(--danger); }

	.note-box {
		border: 1px dashed #9cc8d2;
		background: #f4fbfd;
		border-radius: 10px;
		padding: 10px 12px;
		margin: 8px 0 16px;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 10px;
		margin: 8px 0 14px;
	}

	.info-card {
		border: 1px solid var(--line);
		border-left: 6px solid #5b8db3;
		background: #f9fcfe;
		border-radius: 10px;
		padding: 12px 14px;
	}

	.info-card h4 {
		margin: 0 0 6px;
		font-size: 1rem;
		color: #1f4058;
	}

	.info-card p {
		margin: 0;
	}

	.info-card ul {
		margin: 0;
		padding-left: 18px;
	}

	.info-card.teal { border-left-color: #007a7c; }
	.info-card.blue { border-left-color: #2b6cb0; }
	.info-card.gold { border-left-color: #b7791f; }
	.info-card.green { border-left-color: #1b8f4b; }

	.checklist {
		list-style: none;
		padding-left: 0;
		margin: 0;
	}

	.checklist li {
		position: relative;
		padding-left: 24px;
		margin: 6px 0;
	}

	.checklist li::before {
		content: "\2713";
		position: absolute;
		left: 0;
		top: 0;
		color: var(--maro-accent);
		font-weight: 700;
	}

	.icon-label {
		margin-left: 6px;
		color: #466274;
		font-size: 0.85rem;
	}
</style>

<div class="cover">
	<h1>MARO HUB</h1>
	<div class="subtitle">Sistema de Seguimiento Clínico y Gestión de Riesgo Prenatal</div>
	<div class="meta">
		<strong>Documento de Continuidad para Dirección Médica</strong><br>
		Versión ejecutiva<br>
		Fecha: 06/04/2026<br>
		LSC. Norel Sánchez M. Nájera
	</div>
</div>

<p class="signature-mark">
	NSN_ • Built with 
	<i class="fa-brands fa-linux" aria-hidden="true"></i>
	<i class="fa-brands fa-fedora" aria-hidden="true"></i>
	<span class="icon-label">Linux + Fedora</span>
</p>

<br><br>
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
<div class="section-chip">Ruta operativa</div>
<div class="cards-grid">
	<div class="info-card teal">
		<h4>3.1 Registro clínico</h4>
		<p>El personal captura signos vitales y datos relevantes de la consulta.</p>
	</div>
	<div class="info-card blue">
		<h4>3.2 Cálculo automático de riesgo</h4>
		<ul>
			<li>Antecedentes clínicos del paciente.</li>
			<li>Factores de tamizaje.</li>
			<li>Signos de la consulta actual.</li>
		</ul>
		<p>Si el puntaje total es 25 o más, el sistema marca el caso como riesgo crítico.</p>
	</div>
	<div class="info-card gold">
		<h4>3.3 Escalamiento estatal (colegiación)</h4>
		<ul>
			<li>La plataforma muestra una alerta al personal.</li>
			<li>Se puede colegiar el caso con un solo clic.</li>
			<li>Se registra la fecha y se evitan duplicados (solo un caso activo por paciente).</li>
		</ul>
	</div>
	<div class="info-card teal">
		<h4>3.4 Alertas automáticas</h4>
		<ul>
			<li>Se genera un registro interno del evento.</li>
			<li>Se envía la notificación al canal de Telegram correspondiente.</li>
			<li>Si Telegram falla, se reintenta sin afectar la consulta clínica.</li>
		</ul>
	</div>
	<div class="info-card green">
		<h4>3.5 Dashboard</h4>
		<ul>
			<li>Último puntaje de cada paciente.</li>
			<li>Casos colegiados.</li>
			<li>Tendencias y acumulados.</li>
			<li>Exportación a Excel.</li>
		</ul>
	</div>
</div>

## 4. Modelo de datos
El sistema utiliza cinco tablas principales:
<div class="section-chip">Componentes de información</div>
<div class="cards-grid">
	<div class="info-card blue">
		<h4>4.1 Consultas prenatales</h4>
		<p>Cada consulta registrada, con signos vitales, puntajes y si fue colegiada.</p>
	</div>
	<div class="info-card teal">
		<h4>4.2 Pacientes</h4>
		<p>Información general, antecedentes y factores de riesgo base.</p>
	</div>
	<div class="info-card gold">
		<h4>4.3 Planes de colegiados</h4>
		<p>Seguimiento estructurado de los casos escalados.</p>
	</div>
	<div class="info-card blue">
		<h4>4.4 Alertas</h4>
		<p>Registro de eventos críticos que deben notificarse.</p>
	</div>
	<div class="info-card green">
		<h4>4.5 Historial de riesgo</h4>
		<p>Bitácora que permite revisar cómo ha evolucionado el riesgo de cada paciente.</p>
	</div>
</div>

## 5. Reglas de negocio clave
- Un paciente no puede tener dos casos colegiados activos.
- El riesgo crítico se marca cuando el puntaje total es 25 o más.
- Algunos criterios mayores fuerzan automáticamente el riesgo a 25 (por ejemplo: cardiopatía, nefropatía, hepatopatía, coagulopatías, edad materna de 10 a 14 años o IMC inicial igual o mayor a 31).
- Las alertas solo se envían si están habilitadas y configuradas.
- El dashboard siempre muestra la última consulta de cada paciente.

## 6. Estado actual del sistema
El sistema está operativo para uso diario en sus funciones principales, pero aún tiene pendientes relevantes antes de considerarse completamente robusto a nivel institucional.

### Semaforización ejecutiva
<div class="section-chip">Resumen rápido</div>
<div class="signal-grid">
	<div class="signal ok">
		<strong>Verde (estable)</strong>
		Operación clínica diaria: registro de consultas, cálculo de riesgo, colegiación, dashboard(regional y estatal) envio de alertas via Telegram, alertas en dashboardas de nuevos casos (regional y estatal).
	</div>
	<div class="signal warn">
		<strong>Amarillo (atención prioritaria)</strong>
		Fortalecimiento de seguridad y cierre de pendientes de control de accesos.
	</div>
	<div class="signal danger">
		<strong>Rojo (crítico a resolver)</strong>
		Retiro de contraseñas temporales, eliminación de bitácoras sensibles y rotación inmediata de credenciales críticas.
	</div>
</div>

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
No implica que el sistema en despiegue deba usar exactamente el mismo esquema, pero sí explica por qué se implementó así en este despliegue.

<div class="note-box">
	<strong>Punto clave para Dirección:</strong> separar aplicación y base de datos reduce exposición de datos clínicos y permite continuidad operativa incluso durante actualizaciones del sistema.
</div>

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
La separación entre aplicación y base de datos está alineada con principios de seguridad recomendados en marcos de referencia internacionales (HIPAA Security Rule, ISO/IEC 27001, OWASP ASVS y NIST SP 800-53).

En términos prácticos, esta decisión ayuda a:

- Proteger datos clínicos sensibles mediante segmentación de red.
- Reducir superficie de ataque al evitar exposición directa de la base de datos.
- Aplicar principio de mínimo privilegio en accesos técnicos y operativos.
- Mejorar auditoría y trazabilidad de eventos críticos.

En resumen: la separación de nodos se adoptó por seguridad, continuidad operativa y control de acceso en un entorno con datos clínicos sensibles.

## 9. Qué se necesita para mantener el sistema funcionando
<div class="section-chip">Checklist de continuidad</div>
<div class="info-card teal">
	<ul class="checklist">
		<li>Mantener la base de datos accesible desde la aplicación.</li>
		<li>Mantener configuradas las credenciales de acceso.</li>
		<li>Mantener actualizados los secretos (contraseñas internas).</li>
		<li>Ejecutar migraciones cuando se actualice el sistema.</li>
		<li>Verificar que las alertas estén configuradas si se desean usar.</li>
	</ul>
</div>

## 10. Próximos pasos sugeridos
- Reforzar seguridad eliminando contraseñas temporales.
- Actualizar el sistema de autenticación.
- Revisar el módulo de alertas y su configuración.
- Realizar pruebas completas de flujo clínico.
- Mantener documentación actualizada.

## 11. Contacto para continuidad

El documento técnico completo (para ingeniería) está disponible en un archivo separado.

Para mantener una comunicación clara y ordenada respecto al sistema MARO HUB, cualquier consulta o comentario podrá canalizarse mediante el siguiente medio:

📧 marohub_legacy@filenode.dev

Este canal nos permitirá dar seguimiento adecuado a las solicitudes y facilitar la transición hacia el despliegue del proyecto.  

