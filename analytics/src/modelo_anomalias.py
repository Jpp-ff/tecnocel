"""
modelo_anomalias.py — Responsabilidad ÚNICA: detectar patrones inusuales de
pérdida de inventario (garantías reclamadas y errores humanos), y calcular
el porcentaje de merma real del taller.

Usa Isolation Forest (scikit-learn) para señalar modelos cuya tasa de
pérdida se sale del comportamiento típico del resto del inventario —
información imposible de obtener antes, cuando la pérdida no se registraba
en absoluto.
"""
import pandas as pd
from sklearn.ensemble import IsolationForest

MINIMO_REGISTROS_PARA_ISOLATION_FOREST = 10


def calcular_merma_por_modelo(df_movimientos):
    """
    Calcula, por modelo, cuántas unidades se perdieron por garantía/error
    humano frente al total de salidas — el "porcentaje de merma" real.
    """
    if df_movimientos.empty:
        return pd.DataFrame(columns=['modelo', 'total_salidas', 'total_perdidas', 'pct_merma'])

    salidas = df_movimientos[df_movimientos['es_salida']].copy()
    if salidas.empty:
        return pd.DataFrame(columns=['modelo', 'total_salidas', 'total_perdidas', 'pct_merma'])

    salidas['unidades'] = salidas['cantidad'].abs()
    resumen = salidas.groupby('modelo').agg(
        total_salidas=('unidades', 'sum'),
        total_perdidas=('unidades', lambda s: s[salidas.loc[s.index, 'es_perdida']].sum()),
    ).reset_index()

    resumen['pct_merma'] = (resumen['total_perdidas'] / resumen['total_salidas'] * 100).round(1).fillna(0)
    return resumen.sort_values('pct_merma', ascending=False)


def detectar_modelos_anomalos(resumen_merma):
    """
    Aplica Isolation Forest sobre el porcentaje de merma por modelo para
    señalar cuáles se salen claramente del comportamiento normal del resto
    del inventario (no solo "el más alto", sino estadísticamente atípico).
    """
    if len(resumen_merma) < MINIMO_REGISTROS_PARA_ISOLATION_FOREST:
        mensaje = (
            f'Aún no hay suficientes modelos distintos ({len(resumen_merma)}) '
            f'para un análisis de anomalías confiable (mínimo {MINIMO_REGISTROS_PARA_ISOLATION_FOREST}). '
            f'Mientras tanto, revisa manualmente la Tabla de merma por modelo.'
        )
        return pd.DataFrame([{'modelo': 'N/A', 'pct_merma': 0, 'es_anomalo': mensaje}])

    X = resumen_merma[['pct_merma']].values
    detector = IsolationForest(contamination=0.15, random_state=42)
    resumen_merma = resumen_merma.copy()
    resumen_merma['es_anomalo'] = detector.fit_predict(X)
    resumen_merma['es_anomalo'] = resumen_merma['es_anomalo'].map({-1: 'Sí — revisar', 1: 'Normal'})
    return resumen_merma[['modelo', 'pct_merma', 'es_anomalo']]
