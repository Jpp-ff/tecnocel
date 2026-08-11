"""
modelo_pln.py — Responsabilidad ÚNICA: interpretar mensajes libres que los
clientes escriben al bot de WhatsApp, y clasificarlos en una categoría de
intención (pantalla, batería, no enciende, software, otro).

A diferencia de los demás modelos, este NO depende de que ya existan
cientos de mensajes reales — se entrena con un conjunto base de frases
típicas de un taller de reparación de celulares (definido abajo), así que
funciona desde el primer día. Cuando el bot lleve más tiempo operando,
esas frases reales se pueden agregar a CORPUS_BASE para que el modelo
aprenda el vocabulario específico de tus clientes.
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

# ── Conjunto de entrenamiento base (semilla) ──────────────────────────────
# Amplía esta lista con frases reales de tus clientes conforme el bot opere;
# entre más ejemplos representativos, mejor clasifica el modelo.
CORPUS_BASE = [
    ("se me rompió la pantalla", "pantalla"),
    ("se me cayó y se estrelló el vidrio", "pantalla"),
    ("la pantalla no prende bien tiene rayas", "pantalla"),
    ("se ve la pantalla toda quebrada", "pantalla"),
    ("tiene la pantalla negra pero prende", "pantalla"),
    ("la batería se descarga muy rápido", "bateria"),
    ("no aguanta carga el celular", "bateria"),
    ("no carga nada la batería", "bateria"),
    ("no quiere cargar el teléfono", "bateria"),
    ("se apaga solo aunque tenga batería", "bateria"),
    ("la batería está inflada", "bateria"),
    ("dura muy poco la pila", "bateria"),
    ("no enciende para nada el teléfono", "no_enciende"),
    ("se quedó en la manzana no prende", "no_enciende"),
    ("se mojó y ya no prende", "no_enciende"),
    ("no reacciona a nada, pantalla negra total", "no_enciende"),
    ("está muy lento el celular", "software"),
    ("se puso lento después de la actualización", "software"),
    ("se traba mucho y no responde", "software"),
    ("quiero que le hagan formateo", "software"),
    ("no le entran las actualizaciones", "software"),
    ("se actualizó y ya no funciona bien", "software"),
    ("las apps se cierran solas", "software"),
    ("cuánto cuesta reparar mi consola", "otro"),
    ("hacen servicio a laptops", "otro"),
    ("qué horario tienen", "otro"),
    ("dónde están ubicados", "otro"),
]

MINIMO_EJEMPLOS_POR_CLASE = 2


def entrenar_clasificador_intencion(mensajes_reales_adicionales=None):
    """
    Entrena un clasificador TF-IDF + Naive Bayes sobre el corpus base,
    combinado opcionalmente con mensajes reales ya etiquetados (lista de
    tuplas (texto, categoria)) capturados por el bot con el tiempo.
    """
    datos = list(CORPUS_BASE)
    if mensajes_reales_adicionales:
        datos.extend(mensajes_reales_adicionales)

    textos = [t for t, _ in datos]
    categorias = [c for _, c in datos]

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
        ('clasificador', MultinomialNB()),
    ])
    pipeline.fit(textos, categorias)
    return pipeline


def clasificar_mensaje(pipeline, texto):
    """Devuelve la categoría más probable y la confianza del modelo."""
    prediccion = pipeline.predict([texto])[0]
    probabilidades = pipeline.predict_proba([texto])[0]
    confianza = max(probabilidades)
    return prediccion, round(confianza * 100, 1)
