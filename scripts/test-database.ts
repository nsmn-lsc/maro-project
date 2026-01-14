// Script para verificar el funcionamiento de la base de datos MySQL
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { getPool, query } from '../src/lib/db';

interface TestResult {
  name: string;
  status: 'OK' | 'ERROR';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function testConnection() {
  console.log('🔍 Probando conexión a la base de datos...\n');
  
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    results.push({
      name: 'Conexión a MySQL',
      status: 'OK',
      message: 'Conexión establecida correctamente'
    });
  } catch (error: any) {
    results.push({
      name: 'Conexión a MySQL',
      status: 'ERROR',
      message: error.message
    });
    throw error;
  }
}

async function testTables() {
  console.log('📋 Verificando tablas existentes...\n');
  
  try {
    const tables = await query<any[]>('SHOW TABLES');
    const tableNames = tables.map((t: any) => Object.values(t)[0]);
    
    const expectedTables = ['sesiones', 'casos', 'evaluaciones_clinicas', 'diagnosticos', 'estudios', 'bitacora', 'recomendaciones'];
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length === 0) {
      results.push({
        name: 'Verificación de Tablas',
        status: 'OK',
        message: `Todas las tablas necesarias están presentes`,
        details: tableNames
      });
    } else {
      results.push({
        name: 'Verificación de Tablas',
        status: 'ERROR',
        message: `Faltan tablas: ${missingTables.join(', ')}`,
        details: { encontradas: tableNames, faltantes: missingTables }
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Verificación de Tablas',
      status: 'ERROR',
      message: error.message
    });
  }
}

async function testTableStructure() {
  console.log('🔨 Verificando estructura de tablas...\n');
  
  const tables = ['sesiones', 'casos', 'evaluaciones_clinicas'];
  
  for (const table of tables) {
    try {
      const columns = await query<any[]>(`DESCRIBE ${table}`);
      results.push({
        name: `Estructura de tabla: ${table}`,
        status: 'OK',
        message: `${columns.length} columnas encontradas`,
        details: columns.map((c: any) => `${c.Field} (${c.Type})`)
      });
    } catch (error: any) {
      results.push({
        name: `Estructura de tabla: ${table}`,
        status: 'ERROR',
        message: error.message
      });
    }
  }
}

async function testInsertAndSelect() {
  console.log('✍️  Probando operaciones CRUD...\n');
  
  try {
    // Test INSERT en sesiones
    const insertResult = await query(
      'INSERT INTO sesiones (region, municipio, unidad, clues) VALUES (?, ?, ?, ?)',
      ['Test Region', 'Test Municipio', 'Test Unidad', 'TEST001']
    );
    
    results.push({
      name: 'Inserción de datos',
      status: 'OK',
      message: 'Registro insertado correctamente',
      details: insertResult
    });
    
    // Test SELECT
    const selectResult = await query<any[]>(
      'SELECT * FROM sesiones WHERE clues = ?',
      ['TEST001']
    );
    
    if (selectResult.length > 0) {
      results.push({
        name: 'Lectura de datos',
        status: 'OK',
        message: 'Registro recuperado correctamente',
        details: selectResult[0]
      });
    } else {
      results.push({
        name: 'Lectura de datos',
        status: 'ERROR',
        message: 'No se pudo recuperar el registro insertado'
      });
    }
    
    // Test UPDATE
    await query(
      'UPDATE sesiones SET municipio = ? WHERE clues = ?',
      ['Municipio Actualizado', 'TEST001']
    );
    
    const updated = await query<any[]>(
      'SELECT municipio FROM sesiones WHERE clues = ?',
      ['TEST001']
    );
    
    if (updated[0].municipio === 'Municipio Actualizado') {
      results.push({
        name: 'Actualización de datos',
        status: 'OK',
        message: 'Registro actualizado correctamente'
      });
    } else {
      results.push({
        name: 'Actualización de datos',
        status: 'ERROR',
        message: 'El registro no se actualizó correctamente'
      });
    }
    
    // Test DELETE (limpiar datos de prueba)
    await query('DELETE FROM sesiones WHERE clues = ?', ['TEST001']);
    
    const deleted = await query<any[]>(
      'SELECT * FROM sesiones WHERE clues = ?',
      ['TEST001']
    );
    
    if (deleted.length === 0) {
      results.push({
        name: 'Eliminación de datos',
        status: 'OK',
        message: 'Registro eliminado correctamente'
      });
    } else {
      results.push({
        name: 'Eliminación de datos',
        status: 'ERROR',
        message: 'El registro no se eliminó correctamente'
      });
    }
    
  } catch (error: any) {
    results.push({
      name: 'Operaciones CRUD',
      status: 'ERROR',
      message: error.message
    });
  }
}

async function testDataCount() {
  console.log('📊 Verificando datos existentes...\n');
  
  const tables = ['sesiones', 'casos', 'evaluaciones_clinicas'];
  
  for (const table of tables) {
    try {
      const count = await query<any[]>(`SELECT COUNT(*) as total FROM ${table}`);
      results.push({
        name: `Conteo de registros: ${table}`,
        status: 'OK',
        message: `${count[0].total} registros encontrados`,
        details: count[0]
      });
    } catch (error: any) {
      results.push({
        name: `Conteo de registros: ${table}`,
        status: 'ERROR',
        message: error.message
      });
    }
  }
}

async function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📝 REPORTE DE VERIFICACIÓN DE BASE DE DATOS');
  console.log('='.repeat(60) + '\n');
  
  const okCount = results.filter(r => r.status === 'OK').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;
  
  results.forEach((result, index) => {
    const icon = result.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);
    
    if (result.details && result.status === 'OK') {
      if (Array.isArray(result.details)) {
        console.log(`   Detalles: ${result.details.slice(0, 3).join(', ')}${result.details.length > 3 ? '...' : ''}`);
      } else if (typeof result.details === 'object') {
        console.log(`   Detalles: ${JSON.stringify(result.details, null, 2).split('\n').slice(0, 3).join('\n   ')}`);
      }
    }
    console.log('');
  });
  
  console.log('='.repeat(60));
  console.log(`✅ Pruebas exitosas: ${okCount}`);
  console.log(`❌ Pruebas fallidas: ${errorCount}`);
  console.log('='.repeat(60) + '\n');
  
  if (errorCount === 0) {
    console.log('🎉 ¡Todas las pruebas pasaron! La base de datos está funcionando correctamente.\n');
  } else {
    console.log('⚠️  Algunas pruebas fallaron. Revisa la configuración de tu base de datos.\n');
    process.exit(1);
  }
}

async function main() {
  console.log('\n🚀 Iniciando verificación de base de datos MARO Hub...\n');
  
  try {
    await testConnection();
    await testTables();
    await testTableStructure();
    await testInsertAndSelect();
    await testDataCount();
    
    await printResults();
    
    // Cerrar el pool de conexiones
    const pool = getPool();
    await pool.end();
    
  } catch (error: any) {
    console.error('\n❌ Error fatal durante la verificación:', error.message);
    console.error('\nRevisa tu configuración en .env.local y asegúrate de que:');
    console.error('1. MySQL está corriendo');
    console.error('2. Las credenciales son correctas');
    console.error('3. La base de datos "maro_hub" existe');
    console.error('4. Has ejecutado el script database/schema.sql\n');
    process.exit(1);
  }
}

main();
