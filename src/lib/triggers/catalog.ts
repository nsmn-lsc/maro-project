// src/lib/triggers/catalog.ts

export type FuenteTipo =
  | "NOM"
  | "GPC"
  | "INSTITUCIONAL"
  | "INTERNACIONAL";

export interface FuenteNormativa {
  tipo: FuenteTipo;
  titulo: string;
  anio: number;
  referencia: string;
}

export interface TriggerClinico {
  id: string;
  nombre: string;
  nivel: "ROJO" | "AMBAR";
  condicion: (datos: any) => boolean;
  explicacion: string;
  colegiar: boolean;
  fuentes: FuenteNormativa[];
}

// ============================
// CATÁLOGO OFICIAL MARO v1.0
// ============================

export const TRIGGERS_MARO: TriggerClinico[] = [
  {
    id: "HTA_SEVERA",
    nombre: "Hipertensión arterial severa en embarazo",
    nivel: "ROJO",
    condicion: (datos) => {
      if (!datos.presion.includes("/")) return false;
      const sistolica = parseInt(datos.presion.split("/")[0]);
      const diastolica = parseInt(datos.presion.split("/")[1]);
      return sistolica >= 160 || diastolica >= 110;
    },
    explicacion:
      "Presión arterial sistólica ≥160 mmHg o diastólica ≥110 mmHg, criterio de severidad con alto riesgo materno.",
    colegiar: true,
    fuentes: [
      {
        tipo: "NOM",
        titulo: "Atención de la mujer durante el embarazo, parto y puerperio",
        anio: 2016,
        referencia: "NOM-007-SSA2-2016",
      },
      {
        tipo: "GPC",
        titulo: "Diagnóstico y tratamiento de la preeclampsia",
        anio: 2023,
        referencia: "CENETEC-GPC",
      },
      {
        tipo: "INTERNACIONAL",
        titulo: "ACOG Practice Bulletin: Gestational Hypertension and Preeclampsia",
        anio: 2020,
        referencia: "ACOG PB No. 222",
      },
    ],
  },

  {
    id: "PREECLAMPSIA_MENOR_34",
    nombre: "Preeclampsia antes de 34 semanas",
    nivel: "ROJO",
    condicion: (datos) => {
      const semanas = parseFloat(datos.semanas);
      return (
        datos.diagnostico.toLowerCase().includes("preeclampsia") &&
        semanas > 0 &&
        semanas < 34
      );
    },
    explicacion:
      "Preeclampsia con edad gestacional menor a 34 semanas, asociada a alto riesgo materno-fetal y necesidad de manejo especializado.",
    colegiar: true,
    fuentes: [
      {
        tipo: "NOM",
        titulo: "Atención de la mujer durante el embarazo, parto y puerperio",
        anio: 2016,
        referencia: "NOM-007-SSA2-2016",
      },
      {
        tipo: "INTERNACIONAL",
        titulo: "WHO recommendations for prevention and treatment of pre-eclampsia",
        anio: 2011,
        referencia: "WHO",
      },
    ],
  },

  {
    id: "HTA_NO_SEVERA",
    nombre: "Trastorno hipertensivo del embarazo sin criterios de severidad",
    nivel: "AMBAR",
    condicion: (datos) =>
      datos.diagnostico.toLowerCase().includes("hipertension"),
    explicacion:
      "Trastorno hipertensivo del embarazo sin criterios actuales de severidad. Requiere vigilancia estrecha.",
    colegiar: false,
    fuentes: [
      {
        tipo: "GPC",
        titulo: "Diagnóstico y tratamiento de la hipertensión en el embarazo",
        anio: 2023,
        referencia: "CENETEC-GPC",
      },
    ],
  },
];

export const VERSION_CRITERIOS = "MARO v1.0 – 2025-12-17";
