// scripts/migrate-localStorage-to-mysql.ts
// Script para migrar datos existentes de localStorage a MySQL
// Ejecutar desde la consola del navegador

/**
 * INSTRUCCIONES DE USO:
 * 
 * 1. Abre la consola del navegador (F12)
 * 2. Ve a la pestaña "Console"
 * 3. Copia y pega este código completo
 * 4. Ejecuta: migrateToMySQL()
 * 5. Verifica en MySQL que los datos se hayan guardado
 */

interface CasoLocalStorage {
  id: string;
  folio?: string;
  paciente: {
    iniciales: string;
    sdg: number;
    trimestre: 1 | 2 | 3;
  };
  origen: {
    unidadReporta: string;
    nivelAtencion: string;
  };
  estatus: string;
  resumen: string;
  bitacora: any[];
  // ... más campos
}

async function migrateToMySQL() {
  console.log('🚀 Iniciando migración de localStorage a MySQL...');
  
  // Leer datos de localStorage
  const casosRaw = localStorage.getItem('casos_maro');
  if (!casosRaw) {
    console.log('⚠️ No hay datos en localStorage para migrar');
    return;
  }

  let casos: CasoLocalStorage[];
  try {
    casos = JSON.parse(casosRaw);
  } catch (error) {
    console.error('❌ Error al parsear datos de localStorage:', error);
    return;
  }

  console.log(`📊 Encontrados ${casos.length} casos para migrar`);

  let exitosos = 0;
  let fallidos = 0;

  for (const caso of casos) {
    try {
      // Convertir formato de localStorage a formato de API
      const datosCaso = {
        folio: caso.folio || `MIG-${caso.id}`,
        region: 'Migrado',
        municipio: 'Migrado',
        unidad: caso.origen.unidadReporta,
        nivelAtencion: caso.origen.nivelAtencion,
        pacienteIniciales: caso.paciente.iniciales,
        semanasGestacion: caso.paciente.sdg,
        trimestre: caso.paciente.trimestre,
        estatus: caso.estatus || 'BORRADOR',
        resumenClinico: caso.resumen,
      };

      // Llamar a la API
      const response = await fetch('/api/casos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosCaso),
      });

      const resultado = await response.json();

      if (resultado.success) {
        console.log(`✅ Caso migrado: ${datosCaso.folio}`);
        exitosos++;
      } else {
        console.error(`❌ Error al migrar caso ${datosCaso.folio}:`, resultado.error);
        fallidos++;
      }

      // Pausa pequeña para no saturar el servidor
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Error al migrar caso ${caso.id}:`, error);
      fallidos++;
    }
  }

  console.log('\n📈 RESUMEN DE MIGRACIÓN:');
  console.log(`  ✅ Exitosos: ${exitosos}`);
  console.log(`  ❌ Fallidos: ${fallidos}`);
  console.log(`  📊 Total: ${casos.length}`);

  if (exitosos > 0) {
    console.log('\n💾 Los datos han sido migrados a MySQL.');
    console.log('⚠️ IMPORTANTE: Verifica los datos en MySQL antes de eliminar el localStorage');
    console.log('   Para eliminar localStorage ejecuta: localStorage.removeItem("casos_maro")');
  }
}

// Exportar función para uso global
(window as any).migrateToMySQL = migrateToMySQL;

console.log('✨ Script de migración cargado.');
console.log('📝 Para ejecutar la migración, escribe: migrateToMySQL()');
