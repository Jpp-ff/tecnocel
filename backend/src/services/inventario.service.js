/**
 * inventario.service.js — Responsabilidad ÚNICA: lógica de negocio del
 * inventario de pantallas. No sabe nada de HTTP (eso es del controlador)
 * ni de cómo se guardan los datos en Sheets (eso es del repositorio).
 */
const sheetsRepo = require('../repositories/sheets.repository');

const HOJA_INVENTARIO = 'Inventario';
const HOJA_MOVIMIENTOS = 'Movimientos';

class InventarioService {
  async listar() {
    return sheetsRepo.getAllComoObjetos(HOJA_INVENTARIO);
  }

  async agregar(datos) {
    const nuevaPieza = {
      id: 'TC-' + Date.now(),
      marca: datos.marca,
      calidad: datos.calidad,
      modelo: datos.modelo,
      precio: datos.precio,
      stock: datos.stock || 0,
      stock_minimo: datos.stockMinimo || datos.stock_minimo || 3,
      fecha_alta: new Date().toISOString(),
    };
    await sheetsRepo.append(HOJA_INVENTARIO, [
      nuevaPieza.id, nuevaPieza.marca, nuevaPieza.calidad, nuevaPieza.modelo,
      nuevaPieza.precio, nuevaPieza.stock, nuevaPieza.stock_minimo, nuevaPieza.fecha_alta,
    ]);
    return nuevaPieza;
  }

  async actualizar(id, datos) {
    const { numeroFila, fila, encabezado } = await sheetsRepo.encontrarFilaPorId(HOJA_INVENTARIO, 'id', id);
    if (numeroFila === -1) {
      const error = new Error('Referencia no encontrada en el inventario.');
      error.status = 404;
      throw error;
    }

    const filaActualizada = [...fila];
    const mapaCampos = { marca: 'marca', calidad: 'calidad', modelo: 'modelo', precio: 'precio', stock_minimo: 'stock_minimo' };
    for (const [campoEntrada, campoSheet] of Object.entries(mapaCampos)) {
      const valor = datos[campoEntrada] ?? datos[campoSheet];
      if (valor !== undefined) {
        const idx = encabezado.indexOf(campoSheet);
        if (idx !== -1) filaActualizada[idx] = valor;
      }
    }
    await sheetsRepo.updateRow(HOJA_INVENTARIO, numeroFila, filaActualizada);
    return { id, actualizado: true };
  }

  async eliminar(id) {
    const { numeroFila } = await sheetsRepo.encontrarFilaPorId(HOJA_INVENTARIO, 'id', id);
    if (numeroFila === -1) {
      const error = new Error('Referencia no encontrada en el inventario.');
      error.status = 404;
      throw error;
    }
    await sheetsRepo.deleteRow(HOJA_INVENTARIO, numeroFila);
    return { id, eliminado: true };
  }

  async ajustarStock(id, cantidad, motivo) {
    const { numeroFila, fila, encabezado } = await sheetsRepo.encontrarFilaPorId(HOJA_INVENTARIO, 'id', id);
    if (numeroFila === -1) {
      const error = new Error('Referencia no encontrada en el inventario.');
      error.status = 404;
      throw error;
    }

    const idxStock = encabezado.indexOf('stock');
    const stockActual = Number(fila[idxStock]) || 0;
    const nuevoStock = stockActual + cantidad;

    if (nuevoStock < 0) {
      const error = new Error('No hay suficiente stock disponible para esta operación.');
      error.status = 400;
      throw error;
    }

    const filaActualizada = [...fila];
    filaActualizada[idxStock] = nuevoStock;
    await sheetsRepo.updateRow(HOJA_INVENTARIO, numeroFila, filaActualizada);

    const idxModelo = encabezado.indexOf('modelo');
    const idxMarca = encabezado.indexOf('marca');
    await sheetsRepo.append(HOJA_MOVIMIENTOS, [
      'MOV-' + Date.now(),
      id,
      fila[idxMarca],
      fila[idxModelo],
      cantidad < 0 ? 'salida' : 'entrada',
      cantidad,
      nuevoStock,
      new Date().toISOString(),
      motivo || (cantidad < 0 ? 'reparacion' : 'reabastecimiento'),
    ]);

    return { id, modelo: fila[idxModelo], stock: nuevoStock };
  }

  /** Descuenta 1 unidad — usado por el escáner PWA al leer un código QR. */
  async descontarStock(id, motivo) {
    return this.ajustarStock(id, -1, motivo || 'reparacion');
  }

  async listarMovimientos() {
    const movimientos = await sheetsRepo.getAllComoObjetos(HOJA_MOVIMIENTOS);
    return movimientos.slice(-80).reverse(); // los más recientes primero
  }
}

module.exports = new InventarioService();