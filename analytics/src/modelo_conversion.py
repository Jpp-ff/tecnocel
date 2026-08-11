"""
modelo_conversion.py — Responsabilidad ÚNICA: estimar la probabilidad de que
una cotización se convierta en una reparación real, para priorizar el
seguimiento comercial.

Requiere datos de la hoja "Ordenes_Servicio" (aún no existen en tus
primeros días de uso). El módulo detecta automáticamente si hay suficiente
historial para entrenar, y si no, lo indica con claridad en vez de fingir
una predicción sin base real.
"""
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

MINIMO_ORDENES_PARA_ENTRENAR = 25


def entrenar_modelo_conversion(df_ordenes):
    """
    Devuelve (modelo_entrenado, encoders, mensaje). Si no hay datos
    suficientes, modelo_entrenado es None y el mensaje lo explica.
    """
    if df_ordenes.empty or 'convertida' not in df_ordenes.columns:
        return None, None, (
            'Aún no hay datos en "Ordenes_Servicio". Este modelo se activará solo cuando '
            'el bot de WhatsApp empiece a registrar cotizaciones reales (Sprint 3).'
        )

    datos = df_ordenes.dropna(subset=['dispositivo', 'convertida']).copy()
    if len(datos) < MINIMO_ORDENES_PARA_ENTRENAR:
        return None, None, (
            f'Solo hay {len(datos)} orden(es) registradas — se necesitan al menos '
            f'{MINIMO_ORDENES_PARA_ENTRENAR} para entrenar un modelo de clasificación confiable. '
            f'Sigue capturando cotizaciones y este modelo se activará solo más adelante.'
        )

    encoder_dispositivo = LabelEncoder()
    datos['dispositivo_cod'] = encoder_dispositivo.fit_transform(datos['dispositivo'].astype(str))
    datos['longitud_problema'] = datos['problema'].astype(str).str.len()

    X = datos[['dispositivo_cod', 'longitud_problema']]
    y = datos['convertida']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)
    modelo = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5)
    modelo.fit(X_train, y_train)
    precision = modelo.score(X_test, y_test)

    encoders = {'dispositivo': encoder_dispositivo}
    mensaje = f'Modelo entrenado con {len(datos)} órdenes. Precisión en datos de prueba: {precision:.0%}.'
    return modelo, encoders, mensaje


def predecir_conversion_ordenes_pendientes(modelo, encoders, df_ordenes):
    """Aplica el modelo entrenado a las órdenes con estado 'pendiente' para priorizar seguimiento."""
    if modelo is None:
        return pd.DataFrame(columns=['id_orden', 'nombre_cliente', 'probabilidad_conversion'])

    pendientes = df_ordenes[df_ordenes['estado'] == 'pendiente'].copy()
    if pendientes.empty:
        return pd.DataFrame(columns=['id_orden', 'nombre_cliente', 'probabilidad_conversion'])

    # Dispositivos nunca vistos en el entrenamiento se marcan como categoría "desconocida"
    conocidos = set(encoders['dispositivo'].classes_)
    pendientes['dispositivo_valido'] = pendientes['dispositivo'].apply(lambda d: d if d in conocidos else encoders['dispositivo'].classes_[0])
    pendientes['dispositivo_cod'] = encoders['dispositivo'].transform(pendientes['dispositivo_valido'].astype(str))
    pendientes['longitud_problema'] = pendientes['problema'].astype(str).str.len()

    X = pendientes[['dispositivo_cod', 'longitud_problema']]
    probabilidades = modelo.predict_proba(X)[:, 1]
    pendientes['probabilidad_conversion'] = (probabilidades * 100).round(1)

    return pendientes[['id_orden', 'nombre_cliente', 'probabilidad_conversion']].sort_values(
        'probabilidad_conversion', ascending=False)
