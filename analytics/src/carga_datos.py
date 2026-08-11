"""
carga_datos.py — Responsabilidad ÚNICA: obtener los datos crudos del sistema,
sin importar de dónde vengan.

Funciona en dos modos, de forma automática:
  1) MODO SHEETS: si existen credenciales de Google configuradas, lee directo
     de las hojas "Inventario" y "Movimientos" del Google Sheets real.
     Las credenciales se pueden dar de DOS formas (se prueban en este orden):
       a) GOOGLE_CREDENTIALS_PATH en el .env → ruta a tu archivo .json descargado
          (RECOMENDADO: evita cualquier problema de copiar/pegar la clave privada)
       b) GOOGLE_CREDENTIALS_JSON en el .env → el JSON completo pegado en una línea
  2) MODO LOCAL (respaldo): si no hay credenciales configuradas todavía,
     busca los archivos CSV que el panel administrativo ya sabe exportar
     dentro de analytics/datos/.
"""
import os
import json
import pandas as pd
from pathlib import Path

CARPETA_DATOS_LOCAL = Path(__file__).resolve().parent.parent / 'datos'

COLUMNAS_INVENTARIO = ['id', 'marca', 'calidad', 'modelo', 'precio', 'stock', 'stock_minimo', 'fecha_alta']
COLUMNAS_MOVIMIENTOS = ['id_movimiento', 'id_pieza', 'marca', 'modelo', 'tipo', 'cantidad',
                        'stock_resultante', 'fecha', 'motivo']
COLUMNAS_ORDENES = ['id_orden', 'nombre_cliente', 'telefono', 'dispositivo', 'modelo_especifico',
                    'problema', 'estado', 'fecha_cotizacion', 'fecha_listo', 'fecha_entrega', 'notas_entrega']


def _hay_credenciales_sheets():
    tiene_ruta = bool(os.getenv('GOOGLE_CREDENTIALS_PATH'))
    tiene_json = bool(os.getenv('GOOGLE_CREDENTIALS_JSON'))
    tiene_id = bool(os.getenv('SHEETS_ID'))
    return tiene_id and (tiene_ruta or tiene_json)


def _cargar_credenciales_dict():
    """
    Obtiene el diccionario de credenciales, ya sea desde un archivo .json
    en disco (opción recomendada, evita problemas de escape de la clave
    privada) o desde la variable de entorno GOOGLE_CREDENTIALS_JSON.
    """
    ruta_credenciales = os.getenv('GOOGLE_CREDENTIALS_PATH')
    if ruta_credenciales:
        ruta = Path(ruta_credenciales)
        if not ruta.exists():
            raise FileNotFoundError(
                f'GOOGLE_CREDENTIALS_PATH apunta a "{ruta}" pero ese archivo no existe. '
                f'Verifica la ruta en tu .env.'
            )
        with open(ruta, 'r', encoding='utf-8') as f:
            return json.load(f)

    texto_json = os.environ.get('GOOGLE_CREDENTIALS_JSON', '')
    return json.loads(texto_json)


def _leer_hoja_sheets(nombre_hoja):
    import gspread
    from google.oauth2.service_account import Credentials

    creds_dict = _cargar_credenciales_dict()
    scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']
    credenciales = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    cliente = gspread.authorize(credenciales)
    hoja = cliente.open_by_key(os.environ['SHEETS_ID']).worksheet(nombre_hoja)
    registros = hoja.get_all_records()
    return pd.DataFrame(registros)


def _leer_csv_local(nombre_archivo, columnas_esperadas):
    ruta = CARPETA_DATOS_LOCAL / nombre_archivo
    if not ruta.exists():
        print(f'  Aviso: no se encontró {ruta.name}. Exporta el CSV desde el panel y colócalo en analytics/datos/.')
        return pd.DataFrame(columns=columnas_esperadas)
    return pd.read_csv(ruta)


def cargar_inventario():
    if _hay_credenciales_sheets():
        print('Conectando a Google Sheets — hoja "Inventario"...')
        return _leer_hoja_sheets('Inventario')
    print('Sin credenciales de Sheets todavía — usando CSV local (analytics/datos/inventario_tecnocel.csv)')
    return _leer_csv_local('inventario_tecnocel.csv', COLUMNAS_INVENTARIO)


def cargar_movimientos():
    if _hay_credenciales_sheets():
        print('Conectando a Google Sheets — hoja "Movimientos"...')
        return _leer_hoja_sheets('Movimientos')
    print('Sin credenciales de Sheets todavía — usando CSV local (analytics/datos/movimientos_tecnocel.csv)')
    return _leer_csv_local('movimientos_tecnocel.csv', COLUMNAS_MOVIMIENTOS)


def cargar_ordenes():
    if _hay_credenciales_sheets():
        print('Conectando a Google Sheets — hoja "Ordenes_Servicio"...')
        return _leer_hoja_sheets('Ordenes_Servicio')
    print('Sin credenciales de Sheets todavía — usando CSV local (analytics/datos/ordenes_tecnocel.csv), si existe')
    return _leer_csv_local('ordenes_tecnocel.csv', COLUMNAS_ORDENES)