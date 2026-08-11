"""
preprocesamiento.py — Responsabilidad ÚNICA: limpiar y preparar los datos
crudos para que los modelos puedan consumirlos. Ninguna otra parte del
sistema debe encargarse de convertir tipos, rellenar nulos o crear
columnas derivadas — eso vive únicamente aquí (principio SRP).
"""
import pandas as pd


def limpiar_movimientos(df):
    """Normaliza tipos y crea columnas derivadas útiles para minería de datos."""
    if df.empty:
        return df

    df = df.copy()
    df['fecha'] = pd.to_datetime(df['fecha'], errors='coerce')
    df['cantidad'] = pd.to_numeric(df['cantidad'], errors='coerce').fillna(0)
    df['stock_resultante'] = pd.to_numeric(df['stock_resultante'], errors='coerce').fillna(0)
    df = df.dropna(subset=['fecha'])

    # Variables derivadas — muy usadas en minería de datos temporal
    df['dia_semana'] = df['fecha'].dt.dayofweek       # 0=lunes ... 6=domingo
    df['semana'] = df['fecha'].dt.to_period('W').apply(lambda p: p.start_time)
    df['es_salida'] = df['tipo'] == 'salida'
    df['es_perdida'] = df['motivo'].isin(['garantia', 'merma_error'])

    return df


def limpiar_inventario(df):
    if df.empty:
        return df
    df = df.copy()
    df['precio'] = pd.to_numeric(df['precio'], errors='coerce').fillna(0)
    df['stock'] = pd.to_numeric(df['stock'], errors='coerce').fillna(0)
    df['stock_minimo'] = pd.to_numeric(df['stock_minimo'], errors='coerce').fillna(3)
    return df


def limpiar_ordenes(df):
    if df.empty:
        return df
    df = df.copy()
    for col in ['fecha_cotizacion', 'fecha_listo', 'fecha_entrega']:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
    # Etiqueta de conversión: se considera "convertida" si llegó a listo o entregado
    if 'estado' in df.columns:
        df['convertida'] = df['estado'].isin(['listo', 'entregado']).astype(int)
    return df


def agregar_consumo_semanal_por_modelo(df_movimientos):
    """
    Agrupa las SALIDAS (uso real de pantallas) por modelo y semana.
    Esta tabla agregada es la que alimenta al modelo de predicción de demanda.
    """
    if df_movimientos.empty:
        return pd.DataFrame(columns=['modelo', 'semana', 'unidades_consumidas'])

    salidas = df_movimientos[df_movimientos['es_salida'] & ~df_movimientos['es_perdida']]
    if salidas.empty:
        return pd.DataFrame(columns=['modelo', 'semana', 'unidades_consumidas'])

    agrupado = (
        salidas.assign(unidades=lambda d: d['cantidad'].abs())
        .groupby(['modelo', 'semana'])['unidades']
        .sum()
        .reset_index()
        .rename(columns={'unidades': 'unidades_consumidas'})
    )
    return agrupado
