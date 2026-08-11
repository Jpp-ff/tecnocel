"""
reportes.py — Responsabilidad ÚNICA: tomar los resultados ya calculados por
los modelos y entregarlos de vuelta al sistema: a tres hojas separadas y
limpias de Google Sheets ("Predicciones_Demanda", "Predicciones_Merma",
"Predicciones_Conversion") cuando esté disponible, o a CSV local mientras
tanto, más un resumen visual en PNG para revisión rápida.

Se usan tres hojas separadas (en vez de una sola con todo mezclado) para que
el backend de Node.js pueda leerlas de forma sencilla y generar el archivo
descargable de un clic desde el panel, sin tener que interpretar texto suelto.
"""
import os
import json
from pathlib import Path
from datetime import datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

CARPETA_REPORTES = Path(__file__).resolve().parent.parent / 'reportes'
CARPETA_DATOS = Path(__file__).resolve().parent.parent / 'datos'

PINK = '#e91e8c'
DARK = '#111111'


def _hay_credenciales_sheets():
    tiene_ruta = bool(os.getenv('GOOGLE_CREDENTIALS_PATH'))
    tiene_json = bool(os.getenv('GOOGLE_CREDENTIALS_JSON'))
    return bool(os.getenv('SHEETS_ID')) and (tiene_ruta or tiene_json)


def _cargar_credenciales_dict():
    ruta_credenciales = os.getenv('GOOGLE_CREDENTIALS_PATH')
    if ruta_credenciales:
        ruta = Path(ruta_credenciales)
        if not ruta.exists():
            raise FileNotFoundError(f'GOOGLE_CREDENTIALS_PATH apunta a "{ruta}" pero ese archivo no existe.')
        with open(ruta, 'r', encoding='utf-8') as f:
            return json.load(f)
    return json.loads(os.environ.get('GOOGLE_CREDENTIALS_JSON', '{}'))


def guardar_predicciones(df_alertas_demanda, df_merma, df_conversion):
    """Escribe los resultados en Sheets (si está conectado) o en CSV local."""
    CARPETA_REPORTES.mkdir(exist_ok=True)
    CARPETA_DATOS.mkdir(exist_ok=True)

    if _hay_credenciales_sheets():
        _guardar_en_sheets(df_alertas_demanda, df_merma, df_conversion)
    else:
        fecha = datetime.now().strftime('%Y%m%d_%H%M')
        if not df_alertas_demanda.empty:
            df_alertas_demanda.to_csv(CARPETA_DATOS / f'predicciones_demanda_{fecha}.csv', index=False)
        if not df_merma.empty:
            df_merma.to_csv(CARPETA_DATOS / f'predicciones_merma_{fecha}.csv', index=False)
        if not df_conversion.empty:
            df_conversion.to_csv(CARPETA_DATOS / f'predicciones_conversion_{fecha}.csv', index=False)
        print('\nResultados guardados en analytics/datos/ (modo local, sin Sheets conectado aún).')


def _obtener_o_crear_hoja(libro, nombre):
    import gspread
    try:
        hoja = libro.worksheet(nombre)
        hoja.clear()
    except gspread.WorksheetNotFound:
        hoja = libro.add_worksheet(title=nombre, rows=200, cols=10)
    return hoja


def _escribir_tabla(hoja, df):
    if df.empty:
        hoja.update('A1', [['Sin datos suficientes todavía']])
        return
    df_texto = df.copy()
    df_texto.insert(0, 'generado', datetime.now().strftime('%d/%m/%Y %H:%M'))
    hoja.update('A1', [df_texto.columns.tolist()] + df_texto.astype(str).values.tolist())


def _guardar_en_sheets(df_alertas_demanda, df_merma, df_conversion):
    import gspread
    from google.oauth2.service_account import Credentials

    creds_dict = _cargar_credenciales_dict()
    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    credenciales = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    cliente = gspread.authorize(credenciales)
    libro = cliente.open_by_key(os.environ['SHEETS_ID'])

    _escribir_tabla(_obtener_o_crear_hoja(libro, 'Predicciones_Demanda'), df_alertas_demanda)
    _escribir_tabla(_obtener_o_crear_hoja(libro, 'Predicciones_Merma'), df_merma)
    _escribir_tabla(_obtener_o_crear_hoja(libro, 'Predicciones_Conversion'), df_conversion)

    print('Resultados escritos en las hojas Predicciones_Demanda, Predicciones_Merma y Predicciones_Conversion.')


def generar_resumen_visual(df_alertas_demanda, df_merma):
    """Genera un PNG de resumen para revisión rápida sin abrir Sheets."""
    CARPETA_REPORTES.mkdir(exist_ok=True)
    fig, axes = plt.subplots(1, 2, figsize=(13, 5.5), facecolor='white')
    fig.suptitle('Tecnocel — Resumen de análisis de inventario', fontsize=14, fontweight='bold', color=DARK)

    if not df_alertas_demanda.empty:
        top = df_alertas_demanda.nlargest(8, 'unidades_predichas_proxima_semana')
        axes[0].barh(top['modelo'], top['unidades_predichas_proxima_semana'], color=PINK)
        axes[0].set_title('Demanda esperada — próxima semana', fontsize=11)
        axes[0].invert_yaxis()
    else:
        axes[0].text(0.5, 0.5, 'Sin datos suficientes\ntodavía', ha='center', va='center', fontsize=11)
        axes[0].axis('off')

    if not df_merma.empty:
        top_merma = df_merma.nlargest(8, 'pct_merma')
        axes[1].barh(top_merma['modelo'], top_merma['pct_merma'], color='#7c3aed')
        axes[1].set_title('% de merma por modelo (garantía + error humano)', fontsize=11)
        axes[1].invert_yaxis()
    else:
        axes[1].text(0.5, 0.5, 'Sin datos suficientes\ntodavía', ha='center', va='center', fontsize=11)
        axes[1].axis('off')

    plt.tight_layout()
    ruta = CARPETA_REPORTES / f'resumen_{datetime.now().strftime("%Y%m%d_%H%M")}.png'
    plt.savefig(ruta, dpi=150, bbox_inches='tight')
    plt.close()
    print(f'Resumen visual guardado en: {ruta}')