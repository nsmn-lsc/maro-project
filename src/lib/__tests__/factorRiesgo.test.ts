// src/lib/__tests__/factorRiesgo.test.ts
/**
 * Tests unitarios para el motor de cálculo de factor de riesgo
 * Validar que los criterios funcionan correctamente
 */

import { calcularFactorRiesgo, DatosFactorRiesgo } from '../factorRiesgo';

describe('factorRiesgo - Cálculo de Factor de Riesgo Obstétrico', () => {
  describe('Antecedentes Obstétricos', () => {
    test('Debe dar 1 punto por 2-4 gestaciones', () => {
      const resultado = calcularFactorRiesgo({ gesta: 3 });
      expect(resultado.puntajeTotal).toBe(1);
      expect(resultado.detalles).toHaveLength(1);
      expect(resultado.detalles[0].campo).toBe('Gestaciones previas');
      expect(resultado.detalles[0].puntos).toBe(1);
    });

    test('Debe dar 4 puntos por ≥5 gestaciones', () => {
      const resultado = calcularFactorRiesgo({ gesta: 5 });
      expect(resultado.puntajeTotal).toBe(4);
    });

    test('No debe dar puntos por 1 gestación', () => {
      const resultado = calcularFactorRiesgo({ gesta: 1 });
      expect(resultado.puntajeTotal).toBe(0);
    });

    test('Debe dar 2 puntos por 1 cesárea', () => {
      const resultado = calcularFactorRiesgo({ cesareasPrevias: 1 });
      expect(resultado.puntajeTotal).toBe(2);
    });

    test('Debe dar 4 puntos por ≥2 cesáreas', () => {
      const resultado = calcularFactorRiesgo({ cesareasPrevias: 2 });
      expect(resultado.puntajeTotal).toBe(4);
    });

    test('Debe sumar gestaciones + cesáreas', () => {
      const resultado = calcularFactorRiesgo({
        gesta: 3,
        cesareasPrevias: 1,
      });
      expect(resultado.puntajeTotal).toBe(3); // 1 + 2
    });

    test('Debe dar 3 puntos por ≥3 abortos', () => {
      const resultado = calcularFactorRiesgo({ abortos: 3 });
      expect(resultado.puntajeTotal).toBe(3);
    });
  });

  describe('Factores Demográficos', () => {
    test('Debe dar 2 puntos por edad ≤19 años', () => {
      const resultado = calcularFactorRiesgo({ edad: 18 });
      expect(resultado.puntajeTotal).toBe(2);
    });

    test('Debe dar 3 puntos por edad ≥35 años', () => {
      const resultado = calcularFactorRiesgo({ edad: 35 });
      expect(resultado.puntajeTotal).toBe(3);
    });

    test('No debe dar puntos por edad normal (20-34)', () => {
      const resultado = calcularFactorRiesgo({ edad: 28 });
      expect(resultado.puntajeTotal).toBe(0);
    });

    test('Debe dar 1 punto por IMC bajo (<18.5)', () => {
      const resultado = calcularFactorRiesgo({ imc: 18 });
      expect(resultado.puntajeTotal).toBe(1);
    });

    test('Debe dar 2 puntos por obesidad (30-39.9)', () => {
      const resultado = calcularFactorRiesgo({ imc: 32 });
      expect(resultado.puntajeTotal).toBe(2);
    });

    test('Debe dar 4 puntos por obesidad severa (≥40)', () => {
      const resultado = calcularFactorRiesgo({ imc: 42 });
      expect(resultado.puntajeTotal).toBe(4);
    });
  });

  describe('Condiciones Médicas Previas', () => {
    test('Debe dar 4 puntos por embarazo múltiple', () => {
      const resultado = calcularFactorRiesgo({ embarazoMultiple: true });
      expect(resultado.puntajeTotal).toBe(4);
    });

    test('Debe dar 4 puntos por antecedente de preeclampsia', () => {
      const resultado = calcularFactorRiesgo({
        antecedentePreeclampsia: true,
      });
      expect(resultado.puntajeTotal).toBe(4);
    });

    test('Debe dar 3 puntos por diabetes previa', () => {
      const resultado = calcularFactorRiesgo({ diabetesPrevia: true });
      expect(resultado.puntajeTotal).toBe(3);
    });

    test('Debe dar 4 puntos por cardiopatía', () => {
      const resultado = calcularFactorRiesgo({ cardiopatia: true });
      expect(resultado.puntajeTotal).toBe(4);
    });

    test('Debe sumar múltiples condiciones', () => {
      const resultado = calcularFactorRiesgo({
        diabetesPrevia: true,
        hipertensionCronica: true,
        nefropatia: true,
      });
      expect(resultado.puntajeTotal).toBe(9); // 3 + 3 + 3
    });
  });

  describe('Signos y Síntomas de Alarma', () => {
    test('Debe dar 3 puntos por sangrado vaginal', () => {
      const resultado = calcularFactorRiesgo({ sangradoVaginal: true });
      expect(resultado.puntajeTotal).toBe(3);
    });

    test('Debe dar 4 puntos por fosfenos', () => {
      const resultado = calcularFactorRiesgo({ fosfenos: true });
      expect(resultado.puntajeTotal).toBe(4);
    });

    test('Debe sumar múltiples síntomas', () => {
      const resultado = calcularFactorRiesgo({
        sangradoVaginal: true,
        dolorAbdominalIntenso: true,
        disnea: true,
      });
      expect(resultado.puntajeTotal).toBe(9); // 3 + 3 + 3
    });
  });

  describe('Signos Vitales Anormales', () => {
    test('Debe dar 2 puntos por TA sistólica 140-149', () => {
      const resultado = calcularFactorRiesgo({ sistolica: 145 });
      expect(resultado.puntajeTotal).toBe(2);
    });

    test('Debe dar 3 puntos por TA sistólica ≥150', () => {
      const resultado = calcularFactorRiesgo({ sistolica: 160 });
      expect(resultado.puntajeTotal).toBe(3);
    });

    test('Debe dar 2 puntos por TA diastólica 90-99', () => {
      const resultado = calcularFactorRiesgo({ diastolica: 95 });
      expect(resultado.puntajeTotal).toBe(2);
    });

    test('Debe dar 2 puntos por FR ≥25', () => {
      const resultado = calcularFactorRiesgo({
        frecuenciaRespiratoria: 26,
      });
      expect(resultado.puntajeTotal).toBe(2);
    });

    test('Debe dar 2 puntos por SatO2 <95', () => {
      const resultado = calcularFactorRiesgo({ saturacionO2: 93 });
      expect(resultado.puntajeTotal).toBe(2);
    });

    test('Debe dar 1 punto por temperatura 38.0-38.4', () => {
      const resultado = calcularFactorRiesgo({ temperatura: 38.2 });
      expect(resultado.puntajeTotal).toBe(1);
    });

    test('Debe dar 2 puntos por temperatura ≥38.5', () => {
      const resultado = calcularFactorRiesgo({ temperatura: 39 });
      expect(resultado.puntajeTotal).toBe(2);
    });
  });

  describe('Laboratorios', () => {
    test('Debe dar 1 punto por plaquetas 100-149', () => {
      const resultado = calcularFactorRiesgo({ plaquetas: 120000 });
      expect(resultado.puntajeTotal).toBe(1);
    });

    test('Debe dar 3 puntos por plaquetas <100', () => {
      const resultado = calcularFactorRiesgo({ plaquetas: 80000 });
      expect(resultado.puntajeTotal).toBe(3);
    });

    test('Debe dar 2 puntos por creatinina >1.2', () => {
      const resultado = calcularFactorRiesgo({ creatinina: 1.5 });
      expect(resultado.puntajeTotal).toBe(2);
    });

    test('Debe dar 2 puntos por AST >70', () => {
      const resultado = calcularFactorRiesgo({ ast: 100 });
      expect(resultado.puntajeTotal).toBe(2);
    });

    test('Debe dar puntos progresivos por proteinuria', () => {
      const r1 = calcularFactorRiesgo({ proteinuriaTira: '1+' });
      const r2 = calcularFactorRiesgo({ proteinuriaTira: '2+' });
      const r4 = calcularFactorRiesgo({ proteinuriaTira: '4+' });

      expect(r1.puntajeTotal).toBe(1);
      expect(r2.puntajeTotal).toBe(2);
      expect(r4.puntajeTotal).toBe(4);
    });
  });

  describe('Categorización', () => {
    test('Debe categorizar como BAJO (0-9 puntos)', () => {
      const resultado = calcularFactorRiesgo({ edad: 25 });
      expect(resultado.categoria).toBe('BAJO');
    });

    test('Debe categorizar como MODERADO (10-19 puntos)', () => {
      const resultado = calcularFactorRiesgo({
        gesta: 5,
        edad: 37,
        imc: 32,
      });
      expect(resultado.categoria).toBe('MODERADO');
    });

    test('Debe categorizar como ALTO (≥20 puntos)', () => {
      const resultado = calcularFactorRiesgo({
        embarazoMultiple: true,
        antecedentePreeclampsia: true,
        cardiopatia: true,
        sangradoVaginal: true,
      });
      expect(resultado.categoria).toBe('ALTO');
      expect(resultado.puntajeTotal).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Caso Complejo Real', () => {
    test('Debe calcular correctamente un caso complejo', () => {
      const datos: DatosFactorRiesgo = {
        // Antecedentes
        gesta: 3,
        cesareasPrevias: 1,
        abortos: 1,
        // Demográficos
        edad: 38,
        imc: 35,
        // Condiciones
        hipertensionCronica: true,
        diabetesGestacional: true,
        // Síntomas
        sangradoVaginal: false,
        cefalea: false,
        // Signos vitales
        sistolica: 145,
        diastolica: 92,
        // Laboratorios
        plaquetas: 140000,
        proteinuriaTira: '1+',
      };

      const resultado = calcularFactorRiesgo(datos);

      // Verificar que tiene detalles
      expect(resultado.detalles.length).toBeGreaterThan(0);

      // Verificar que tiene sugerencias
      expect(resultado.sugerencias.length).toBeGreaterThan(0);

      // Verificar rango de puntuación esperado
      expect(resultado.puntajeTotal).toBeGreaterThan(0);
      expect(resultado.puntajeTotal).toBeLessThan(100);

      // Debería ser MODERADO o ALTO
      expect(['MODERADO', 'ALTO']).toContain(resultado.categoria);
    });
  });

  describe('Manejo de Valores Nulos/Undefined', () => {
    test('Debe ignorar campos undefined', () => {
      const resultado = calcularFactorRiesgo({
        edad: undefined,
        gesta: 3,
      });
      expect(resultado.puntajeTotal).toBe(1); // Solo por gesta
    });

    test('Debe ignorar campos null', () => {
      const resultado = calcularFactorRiesgo({
        edad: null as any,
        cesareasPrevias: 1,
      });
      expect(resultado.puntajeTotal).toBe(2); // Solo por cesáreas
    });

    test('Debe retornar 0 puntos cuando no hay datos', () => {
      const resultado = calcularFactorRiesgo({});
      expect(resultado.puntajeTotal).toBe(0);
      expect(resultado.detalles).toHaveLength(0);
      expect(resultado.categoria).toBe('BAJO');
    });
  });
});
