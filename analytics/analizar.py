"""
analizar.py — Punto de entrada único del análisis de minería de datos e IA.
Responsabilidad: orquestar los módulos (cargar datos, limpiar, entrenar
modelos, generar reportes) sin contener él mismo ninguna lógica de negocio
— esa vive en cada módulo especializado dentro de src/.

Uso:
    python analizar.py

Funciona igual con o sin Google Sheets conectado (ver src/carga_datos.py).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / 'backend' / '.env')  # reutiliza el .env del backend

from src import carga_datos
from src import preprocesamiento as prep
from src import modelo_demanda
from src import modelo_anomalias
from src import modelo_conversion
from src import modelo_pln
from src import reportes


def linea(titulo):
    print('\n' + '═' * 60)
    print(titulo)
    print('═' * 60)


def main():
    print('TECNOCEL — Análisis de minería de datos e inteligencia artificial')
    print('Iniciando...\n')

    # ── 1. CARGA DE DATOS ─────────────────────────────────────────────
    linea('1. Cargando datos')
    inventario_crudo = carga_datos.cargar_inventario()
    movimientos_crudo = carga_datos.cargar_movimientos()
    ordenes_crudo = carga_datos.cargar_ordenes()
    print(f'  Inventario: {len(inventario_crudo)} referencias')
    print(f'  Movimientos: {len(movimientos_crudo)} registros')
    print(f'  Órdenes de servicio: {len(ordenes_crudo)} registros')

    # ── 2. PREPROCESAMIENTO ───────────────────────────────────────────
    linea('2. Preprocesando datos')
    inventario = prep.limpiar_inventario(inventario_crudo)
    movimientos = prep.limpiar_movimientos(movimientos_crudo)
    ordenes = prep.limpiar_ordenes(ordenes_crudo)
    consumo_semanal = prep.agregar_consumo_semanal_por_modelo(movimientos)
    print(f'  Semanas de consumo agregadas: {consumo_semanal["semana"].nunique() if not consumo_semanal.empty else 0}')

    # ── 3. MODELO DE PREDICCIÓN DE DEMANDA (regresión) ────────────────
    linea('3. Prediciendo demanda de pantallas (regresión)')
    prediccion_demanda = modelo_demanda.predecir_demanda_por_modelo(consumo_semanal)
    alertas = modelo_demanda.generar_alertas_reabastecimiento(prediccion_demanda, inventario)
    if not alertas.empty:
        print(alertas.to_string(index=False))
    else:
        print('  Aún no hay suficiente historial de movimientos para generar predicciones.')
        print('  Sigue registrando entradas y salidas en el panel — este análisis mejora con cada semana de uso.')

    # ── 4. DETECCIÓN DE ANOMALÍAS / MERMA (outliers) ──────────────────
    linea('4. Detectando patrones de pérdida y merma (Isolation Forest)')
    resumen_merma = modelo_anomalias.calcular_merma_por_modelo(movimientos)
    anomalias = modelo_anomalias.detectar_modelos_anomalos(resumen_merma)
    if not resumen_merma.empty:
        print(resumen_merma.to_string(index=False))
        print()
        print(anomalias.to_string(index=False))
    else:
        print('  Aún no hay movimientos de salida registrados para calcular merma.')

    # ── 5. MODELO DE CONVERSIÓN DE COTIZACIONES (clasificación) ───────
    linea('5. Estimando conversión de cotizaciones (clasificación)')
    modelo_conv, encoders_conv, mensaje_conv = modelo_conversion.entrenar_modelo_conversion(ordenes)
    print(f'  {mensaje_conv}')
    prediccion_conversion = modelo_conversion.predecir_conversion_ordenes_pendientes(modelo_conv, encoders_conv, ordenes)
    if not prediccion_conversion.empty:
        print(prediccion_conversion.to_string(index=False))

    # ── 6. PROCESAMIENTO DE LENGUAJE NATURAL PARA EL BOT ──────────────
    linea('6. Entrenando clasificador de intención (PLN) para el bot')
    clasificador_pln = modelo_pln.entrenar_clasificador_intencion()
    print('  Clasificador entrenado con el corpus base. Ejemplos de prueba:')
    ejemplos_prueba = [
        'se me quebró toda la pantalla',
        'no carga nada la batería',
        'se puso lento después de la actualización',
    ]
    for texto in ejemplos_prueba:
        categoria, confianza = modelo_pln.clasificar_mensaje(clasificador_pln, texto)
        print(f'    "{texto}" → {categoria} ({confianza}% de confianza)')

    # ── 7. GUARDAR RESULTADOS Y RESUMEN VISUAL ────────────────────────
    linea('7. Guardando resultados')
    reportes.guardar_predicciones(alertas, resumen_merma, prediccion_conversion)
    reportes.generar_resumen_visual(alertas, resumen_merma)

    linea('Análisis completo')
    print('Corre este script cuando quieras, o automatízalo con GitHub Actions')
    print('para que se ejecute solo cada noche (ver PROYECTO_COMPLETO.md).')


if __name__ == '__main__':
    main()
