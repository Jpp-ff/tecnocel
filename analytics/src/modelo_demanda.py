"""
modelo_demanda.py — Responsabilidad ÚNICA: predecir cuántas unidades de cada
modelo de pantalla se consumirán en las próximas semanas.

Usa regresión lineal (scikit-learn) cuando ya existe suficiente histórico
por modelo. Si un modelo apenas tiene pocos movimientos registrados (algo
normal al principio del proyecto), recurre honestamente a un promedio móvil
simple en vez de forzar un modelo de IA sin datos suficientes para ser
confiable — mejor una estimación simple y honesta que una predicción de IA
que aparente rigor sin tenerlo.
"""
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

MINIMO_SEMANAS_PARA_REGRESION = 6  # por debajo de esto, se usa promedio móvil


def predecir_demanda_por_modelo(consumo_semanal, semanas_a_futuro=2):
    """
    consumo_semanal: DataFrame con columnas [modelo, semana, unidades_consumidas]
    Devuelve un DataFrame: [modelo, unidades_predichas_proxima_semana, metodo_usado]
    """
    resultados = []

    if consumo_semanal.empty:
        return pd.DataFrame(columns=['modelo', 'unidades_predichas', 'metodo'])

    for modelo, grupo in consumo_semanal.groupby('modelo'):
        grupo = grupo.sort_values('semana')
        n_semanas = len(grupo)

        if n_semanas >= MINIMO_SEMANAS_PARA_REGRESION:
            # Suficiente histórico: entrenar regresión lineal simple sobre el tiempo
            X = np.arange(n_semanas).reshape(-1, 1)
            y = grupo['unidades_consumidas'].values
            modelo_ml = LinearRegression()
            modelo_ml.fit(X, y)
            prediccion = modelo_ml.predict([[n_semanas + semanas_a_futuro - 1]])[0]
            prediccion = max(0, round(prediccion, 1))
            metodo = 'regresión lineal (scikit-learn)'
        else:
            # Poco histórico todavía: promedio móvil, honesto y simple
            prediccion = round(grupo['unidades_consumidas'].mean(), 1)
            metodo = f'promedio móvil (solo {n_semanas} semana(s) de historial, aún insuficiente para regresión)'

        resultados.append({
            'modelo': modelo,
            'unidades_predichas_proxima_semana': prediccion,
            'metodo': metodo,
        })

    return pd.DataFrame(resultados).sort_values('unidades_predichas_proxima_semana', ascending=False)


def generar_alertas_reabastecimiento(prediccion_demanda, inventario_actual):
    """
    Cruza la predicción de demanda contra el stock actual para decidir
    qué modelos deben reabastecerse antes de la próxima semana.
    """
    if prediccion_demanda.empty or inventario_actual.empty:
        return pd.DataFrame(columns=['modelo', 'stock_actual', 'demanda_esperada', 'alerta'])

    inv = inventario_actual.groupby('modelo')['stock'].sum().reset_index()
    cruce = prediccion_demanda.merge(inv, on='modelo', how='left')
    cruce['stock'] = cruce['stock'].fillna(0)

    def evaluar(row):
        if row['stock'] < row['unidades_predichas_proxima_semana']:
            return 'Reabastecer pronto: la demanda esperada supera el stock actual'
        elif row['stock'] < row['unidades_predichas_proxima_semana'] * 1.5:
            return 'Vigilar: stock ajustado frente a la demanda esperada'
        return 'Stock suficiente'

    cruce['alerta'] = cruce.apply(evaluar, axis=1)
    return cruce[['modelo', 'stock', 'unidades_predichas_proxima_semana', 'alerta']]
