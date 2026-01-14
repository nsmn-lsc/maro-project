// src/lib/store/maroStore.ts

/* ============================
   TIPOS BASE
============================ */

export type NivelAtencion = "Primer Nivel" | "Segundo Nivel" | "Tercer Nivel";

export type EstatusCaso =
  | "SOLICITADO_A_COLEGIACION"
  | "EN_ESPERA_DE_INFORMACION"
  | "RECHAZADO_POR_COORDINACION"
  | "ACEPTADO_PARA_COLEGIACION"
  | "CON_RECOMENDACION"
  | "CERRADO";

export type RolActor = "Médico" | "Coordinación" | "Experto";

/* ============================
   BITÁCORA LEGAL
============================ */

export interface EventoBitacora {
  fechaHora: string;
  actorRol: RolActor;
  actorNombre: string;
  accion:
    | "CREA_CASO"
    | "SOLICITA_COLEGIACION"
    | "SOLICITA_INFO_ADICIONAL"
    | "ATIENDE_INFO_ADICIONAL"
    | "ACEPTA"
    | "RECHAZA"
    | "SESIONA"
    | "EMITE_RECOMENDACION"
    | "CIERRA";
  descripcion: string;
  fundamento?: string;
}

/* ============================
   EXPLICACIONES AUTOMÁTICAS
============================ */

export interface ExplicacionAutomatica {
  dato: string; // ej. IMC
  interpretacion: string;
  fuentes: {
    organismo: string; // OMS, ACOG, FIGO
    referencia: string;
    enlace?: string;
  }[];
}

/* ============================
   SOLICITUD DE DATOS ADICIONALES
============================ */

export interface SolicitudAdicional {
  solicitante: "Coordinación" | "Experto";
  fechaHora: string;
  camposSolicitados: string[];
  motivo: string;
  estatus: "PENDIENTE" | "ATENDIDA";
}

/* ============================
   RECOMENDACIÓN DE EXPERTOS
============================ */

export interface RecomendacionExperto {
  conducta: string;
  nivelAtencion: NivelAtencion;
  urgencia: string;
  observaciones?: string;
  fecha: string;
}

/* ============================
   CASO MARO (MODELO CENTRAL)
============================ */

export interface CasoMARO {
  id: string;

  paciente: {
    iniciales: string;
    sdg: number;
    trimestre: 1 | 2 | 3;
  };

  clinicos: {
    pesoKg?: number;
    fondoUterinoCm?: number;
    imc?: number;
  };

  origen: {
    unidadReporta: string;
    nivelAtencion: NivelAtencion;
    programaPreventivo?: string;
  };

  reportante: {
    nombre: string;
    rol: RolActor;
  };

  gobernanza: {
    nivelOrigen: NivelAtencion;
    nivelQueDebeActuar: "Segundo Nivel" | "Tercer Nivel";
    requiereVoBoMultidisciplinario: boolean;
  };

  estatus: EstatusCaso;

  controlAvance: {
    fechaCreacion: string;
    fechaAceptacionCoordinacion?: string;
    fechaSesionExpertos?: string;
    responsableActual: RolActor;
  };

  resumen: string;

  explicacionesAutomaticas?: ExplicacionAutomatica[];

  solicitudesAdicionales?: SolicitudAdicional[];

  recomendacion?: RecomendacionExperto;

  bitacora: EventoBitacora[];
}

/* ============================
   STORAGE
============================ */

const STORAGE_KEY = "casos_maro";

/* ============================
   UTILIDADES
============================ */

function leerCasos(): CasoMARO[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed)
    ? parsed.map(normalizarCaso)
    : [];
}

function guardarCasos(casos: CasoMARO[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(casos));
}

function calcularTrimestre(sdg: number): 1 | 2 | 3 {
  if (sdg <= 13) return 1;
  if (sdg <= 27) return 2;
  return 3;
}
function normalizarCaso(c: any): CasoMARO {
  return {
    ...c,
    bitacora: Array.isArray(c.bitacora) ? c.bitacora : [],
    solicitudesAdicionales: Array.isArray(c.solicitudesAdicionales)
      ? c.solicitudesAdicionales
      : [],
    controlAvance: c.controlAvance || {
      fechaCreacion: new Date().toISOString(),
      responsableActual: "Coordinación",
    },
  };
}


/* ============================
   API DEL STORE
============================ */

export function crearCasoMARO(params: {
  inicialesPaciente: string;
  sdg: number;
  unidadReporta: string;
  nivelAtencion: NivelAtencion;
  nombreReportante: string;
  rolReportante: RolActor;
  resumen: string;
  clinicos?: {
    pesoKg?: number;
    fondoUterinoCm?: number;
    imc?: number;
  };
  gobernanza: {
    nivelQueDebeActuar: "Segundo Nivel" | "Tercer Nivel";
    requiereVoBoMultidisciplinario: boolean;
  };
  explicacionesAutomaticas?: ExplicacionAutomatica[];
}): CasoMARO {
  const casos = leerCasos();

  const ahora = new Date().toISOString();

  const nuevo: CasoMARO = {
    id: `MARO-${Date.now()}`,
    paciente: {
      iniciales: params.inicialesPaciente,
      sdg: params.sdg,
      trimestre: calcularTrimestre(params.sdg),
    },
    clinicos: params.clinicos || {},
    origen: {
      unidadReporta: params.unidadReporta,
      nivelAtencion: params.nivelAtencion,
    },
    reportante: {
      nombre: params.nombreReportante,
      rol: params.rolReportante,
    },
    gobernanza: {
      nivelOrigen: params.nivelAtencion,
      nivelQueDebeActuar: params.gobernanza.nivelQueDebeActuar,
      requiereVoBoMultidisciplinario:
        params.gobernanza.requiereVoBoMultidisciplinario,
    },
    estatus: "SOLICITADO_A_COLEGIACION",
    controlAvance: {
      fechaCreacion: ahora,
      responsableActual: "Coordinación",
    },
    resumen: params.resumen,
    explicacionesAutomaticas: params.explicacionesAutomaticas,
    solicitudesAdicionales: [],
    bitacora: [
      {
        fechaHora: ahora,
        actorRol: params.rolReportante,
        actorNombre: params.nombreReportante,
        accion: "CREA_CASO",
        descripcion: "Se crea caso MARO y se solicita colegiación.",
      },
    ],
  };

  casos.push(nuevo);
  guardarCasos(casos);

  return nuevo;
}

/* ============================
   EVENTOS CLAVE
============================ */

export function agregarEventoBitacora(
  id: string,
  evento: EventoBitacora
) {
  const casos = leerCasos().map((c) =>
    c.id === id
      ? { ...c, bitacora: [...c.bitacora, evento] }
      : c
  );
  guardarCasos(casos);
}

export function solicitarInfoAdicional(
  id: string,
  solicitud: SolicitudAdicional
) {
  const casos: CasoMARO[] = leerCasos().map(
    (c): CasoMARO => {
      if (c.id !== id) return c;

      return {
        ...c,
        estatus: "EN_ESPERA_DE_INFORMACION" as EstatusCaso,
        controlAvance: {
          ...c.controlAvance,
          responsableActual: "Médico",
        },
        solicitudesAdicionales: [
          ...(c.solicitudesAdicionales || []),
          solicitud,
        ],
        bitacora: [
          ...c.bitacora,
          {
            fechaHora: solicitud.fechaHora,
            actorRol: solicitud.solicitante,
            actorNombre: solicitud.solicitante,
            accion: "SOLICITA_INFO_ADICIONAL",
            descripcion: solicitud.motivo,
          },
        ],
      };
    }
  );

  guardarCasos(casos);
}

/* ============================
   CONSULTAS
============================ */

export function obtenerCasosPorEstatus(estatus: EstatusCaso) {
  return leerCasos().filter((c) => c.estatus === estatus);
}

export function obtenerCasoPorId(id: string) {
  return leerCasos().find((c) => c.id === id);
}
export function actualizarEstatusCaso(
  id: string,
  estatus: EstatusCaso,
  actorRol: RolActor,
  actorNombre: string,
  descripcion: string
) {
  const ahora = new Date().toISOString();

  const casos: CasoMARO[] = leerCasos().map((c): CasoMARO =>
    c.id === id
      ? {
          ...c,
          estatus,
          controlAvance: {
            ...c.controlAvance,
            responsableActual:
              estatus === "EN_ESPERA_DE_INFORMACION"
                ? "Médico"
                : actorRol,
          },
          bitacora: [
            ...c.bitacora,
            {
              fechaHora: ahora,
              actorRol,
              actorNombre,
              accion:
                estatus === "ACEPTADO_PARA_COLEGIACION"
                  ? "ACEPTA"
                  : estatus === "RECHAZADO_POR_COORDINACION"
                  ? "RECHAZA"
                  : "CIERRA",
              descripcion,
            },
          ],
        }
      : c
  );

  guardarCasos(casos);
}
export function guardarRecomendacion(
  id: string,
  recomendacion: RecomendacionExperto,
  actorNombre: string
) {
  const ahora = new Date().toISOString();

  const casos: CasoMARO[] = leerCasos().map(
    (c): CasoMARO => {
      if (c.id !== id) return c;

      return {
        ...c,
        estatus: "CON_RECOMENDACION",
        recomendacion,
        controlAvance: {
          ...c.controlAvance,
          fechaSesionExpertos: ahora,
          responsableActual: "Coordinación",
        },
        bitacora: [
          ...c.bitacora,
          {
            fechaHora: ahora,
            actorRol: "Experto",
            actorNombre,
            accion: "EMITE_RECOMENDACION",
            descripcion: "Se emite recomendación colegiada por expertos.",
          },
        ],
      };
    }
  );

  guardarCasos(casos);
}
