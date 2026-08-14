// src/lib/api-client.ts
// Helper para llamadas a la API
// NOTA: Los clientes de `casos`, `sesiones` y `evaluaciones` están deprecados.

export class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new APIError(
      response.status,
      data.error || 'Error en la petición'
    );
  }

  return data;
}

/**
 * @deprecated API de Sesiones legada. Migrar a /api/colegiados
 */
export const sesionesAPI = {
  crear: async (datos: {
    region: string;
    municipio: string;
    unidad: string;
    clues?: string;
  }) => {
    return fetchAPI<{ success: boolean; sesionId: number; data: any }>(
      '/api/sesiones',
      {
        method: 'POST',
        body: JSON.stringify(datos),
      }
    );
  },

  obtener: async (id: number) => {
    return fetchAPI<{ success: boolean; data: any }>(
      `/api/sesiones?id=${id}`
    );
  },

  listar: async () => {
    return fetchAPI<{ success: boolean; data: any[] }>('/api/sesiones');
  },
};

/**
 * @deprecated API de Casos legada. Migrar a /api/pacientes
 */
export const casosAPI = {
  crear: async (datos: {
    folio: string;
    sesionId?: number;
    region: string;
    municipio: string;
    unidad: string;
    clues?: string;
    nivelAtencion?: string;
    pacienteIniciales: string;
    edad?: number;
    semanasGestacion?: number;
    trimestre?: number;
    gesta?: number;
    partos?: number;
    cesareasPrevias?: number;
    estatus?: string;
    nivelRiesgo?: string;
    scoreRiesgo?: number;
    resumenClinico?: string;
  }) => {
    return fetchAPI<{ success: boolean; casoId: number; folio: string }>(
      '/api/casos',
      {
        method: 'POST',
        body: JSON.stringify(datos),
      }
    );
  },

  obtener: async (id: number) => {
    return fetchAPI<{ success: boolean; data: any }>(
      `/api/casos?id=${id}`
    );
  },

  obtenerPorFolio: async (folio: string) => {
    return fetchAPI<{ success: boolean; data: any }>(
      `/api/casos?folio=${folio}`
    );
  },

  listar: async () => {
    return fetchAPI<{ success: boolean; data: any[] }>('/api/casos');
  },

  actualizar: async (datos: {
    id: number;
    estatus?: string;
    nivelRiesgo?: string;
    scoreRiesgo?: number;
    resumenClinico?: string;
  }) => {
    return fetchAPI<{ success: boolean }>('/api/casos', {
      method: 'PUT',
      body: JSON.stringify(datos),
    });
  },
};

/**
 * @deprecated API de Evaluaciones Clínicas legada. Migrar a /api/consultas
 */
export const evaluacionesAPI = {
  crear: async (datos: {
    casoId: number;
    [key: string]: any;
  }) => {
    return fetchAPI<{ success: boolean; evaluacionId: number }>(
      '/api/evaluaciones',
      {
        method: 'POST',
        body: JSON.stringify(datos),
      }
    );
  },

  obtener: async (casoId: number) => {
    return fetchAPI<{ success: boolean; data: any }>(
      `/api/evaluaciones?casoId=${casoId}`
    );
  },
};

/**
 * @deprecated API de Factor de Riesgo para Casos. Usar @/lib/riesgoFactores y /api/pacientes/guardar-factor-riesgo
 */
export const factorRiesgoAPI = {
  calcular: async (casoId: number) => {
    return fetchAPI<{
      success: boolean;
      casoId: number;
      resultado: {
        puntajeTotal: number;
        detalles: Array<{
          campo: string;
          valor: string;
          puntos: number;
          criterio: string;
        }>;
        categoria: "BAJO" | "MODERADO" | "ALTO";
        sugerencias: string[];
      };
    }>('/api/casos/calcular-factor-riesgo', {
      method: 'POST',
      body: JSON.stringify({ casoId }),
    });
  },

  obtener: async (casoId: number) => {
    return fetchAPI<{
      success: boolean;
      casoId: number;
      resultado: any;
    }>(`/api/casos/calcular-factor-riesgo?casoId=${casoId}`);
  },

  obtenerHistorial: async (casoId: number) => {
    return fetchAPI<{
      success: boolean;
      data: Array<{
        id: number;
        puntajeTotal: number;
        categoria: string;
        detalles: any;
        sugerencias: any;
        createdAt: string;
      }>;
    }>(`/api/casos/calcular-factor-riesgo/historial?casoId=${casoId}`);
  },
};

export function manejarErrorAPI(error: unknown): string {
  if (error instanceof APIError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Error desconocido';
}
