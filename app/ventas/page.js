'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { fetchConToken } from '../../lib/fetchConToken'
import { formatearPesos, formatearUSD } from '../../lib/format'

export default function Ventas() {
  const searchParams = useSearchParams()

  const [dni, setDni] = useState('')
  const [paciente, setPaciente] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscoPaciente, setBuscoPaciente] = useState(false)
  const [altaRapida, setAltaRapida] = useState(false)
  const [formAltaRapida, setFormAltaRapida] = useState({ apellido: '', nombre: '', dni: '', telefono: '' })
  const [series, setSeries] = useState([])
  const [seriesAll, setSeriesAll] = useState([])
  const [seriesFiltradas, setSeriesFiltradas] = useState([])
  const [productos, setProductos] = useState([])
  const [obrasSociales, setObrasSociales] = useState([])
  const [obraSocialId, setObraSocialId] = useState('')
  const [modoConSerie, setModoConSerie] = useState(true)
  const [controlaStock, setControlaStock] = useState(false)
  const [stockDisponible, setStockDisponible] = useState(null)
  const [ventaId, setVentaId] = useState(null)
  const [ventaConfirmada, setVentaConfirmada] = useState(false)
  const [items, setItems] = useState([])
  const [ventasPaciente, setVentasPaciente] = useState([])
  const [tab, setTab] = useState('nueva')
  const [modalSinStock, setModalSinStock] = useState(null)
  const [stockACarguar, setStockACargar] = useState('')
  const [derivadores, setDerivadores] = useState([])
  const [derivadorId, setDerivadorId] = useState('')
  const [tipoComision, setTipoComision] = useState('porcentaje')
  const [valorComision, setValorComision] = useState('')
  const [montoCalculado, setMontoCalculado] = useState('')
  const [ventaEditando, setVentaEditando] = useState(null)
  const [itemsEdicion, setItemsEdicion] = useState([])
  const [formEdicion, setFormEdicion] = useState({ producto_id: '', numero_serie_id: '', precio_pesos: '', precio_usd: '' })
  const [modoConSerieEdicion, setModoConSerieEdicion] = useState(true)
  const [seriesFiltradasEdicion, setSeriesFiltradasEdicion] = useState([])
  const [derivadorEdicionId, setDerivadorEdicionId] = useState('')
  const [tipoComisionEdicion, setTipoComisionEdicion] = useState('porcentaje')
  const [valorComisionEdicion, setValorComisionEdicion] = useState('')
  const [montoCalculadoEdicion, setMontoCalculadoEdicion] = useState('')
  const [form, setForm] = useState({ numero_serie_id: '', producto_id: '', precio_pesos: '', precio_usd: '', cantidad: '1' })
  const [modalSalir, setModalSalir] = useState(false)
  const [paramsPendientes, setParamsPendientes] = useState(null)

  useEffect(() => {
  obtenerSeries()
  obtenerProductos()
  obtenerObrasSociales()
  obtenerDerivadores()
    console.log('params:', {
  dni: searchParams.get('dni'),
  producto: searchParams.get('producto'),
  monto_pesos: searchParams.get('monto_pesos'),
})
  const dniParam = searchParams.get('dni')
  if (dniParam) {
    setDni(dniParam)
    setTimeout(() => { buscarPacienteAutomatico(dniParam) }, 300)
  }
  const productoParam = searchParams.get('producto')
  const montoPesosParam = searchParams.get('monto_pesos')
  const montoUSDParam = searchParams.get('monto_usd')
  if (productoParam || montoPesosParam || montoUSDParam) {
    setParamsPendientes({ producto: productoParam, monto_pesos: montoPesosParam, monto_usd: montoUSDParam })
  }
}, [])

useEffect(() => {
  obtenerSeries()
  obtenerProductos()
  obtenerObrasSociales()
  obtenerDerivadores()
  const dniParam = searchParams.get('dni')
  if (dniParam) {
    setDni(dniParam)
    setTimeout(() => { buscarPacienteAutomatico(dniParam) }, 300)
  }
  const productoParam = searchParams.get('producto')
  const montoPesosParam = searchParams.get('monto_pesos')
  const montoUSDParam = searchParams.get('monto_usd')
  if (productoParam || montoPesosParam || montoUSDParam) {
    setParamsPendientes({ producto: productoParam, monto_pesos: montoPesosParam, monto_usd: montoUSDParam })
  }
}, [])
  
  useEffect(() => {
    async function calcularComision() {
      if (!derivadorId || !valorComision) { setMontoCalculado(''); return }
      const totalPesosActual = items.reduce((acc, i) => acc + (Number(i.precio_pesos) * (Number(i.cantidad) || 1) || 0), 0)
      const totalUSDActual = items.reduce((acc, i) => acc + (Number(i.precio_usd) * (Number(i.cantidad) || 1) || 0), 0)
      if (tipoComision === 'monto_fijo') { setMontoCalculado(valorComision); return }
      if (totalUSDActual > 0) {
        const res = await fetchConToken('/api/cotizacion')
        const data = await res.json()
        const cotiz = data?.cotizacion
        if (cotiz) { const baseEnPesos = totalPesosActual + (totalUSDActual * cotiz); const monto = Math.round(baseEnPesos * Number(valorComision) / 100); setMontoCalculado(monto > 0 ? String(monto) : ''); return }
      }
      const monto = Math.round(totalPesosActual * Number(valorComision) / 100)
      setMontoCalculado(monto > 0 ? String(monto) : '')
    }
    calcularComision()
  }, [derivadorId, tipoComision, valorComision, items])

  async function obtenerSeries() {
    const res = await fetchConToken('/api/stock/series')
    const data = await res.json()
    const todas = data.series || []
    setSeriesAll(todas)
    setSeries(todas.filter(s => s.en_stock))
  }

  async function obtenerProductos() {
    const res = await fetchConToken('/api/productos')
    const data = await res.json()
    setProductos(data.productos || [])
  }

  async function obtenerObrasSociales() {
    const res = await fetchConToken('/api/configuracion/obras-sociales')
    const data = await res.json()
    setObrasSociales(data.obras_sociales || [])
  }

  async function obtenerDerivadores() {
    const res = await fetchConToken('/api/derivadores?activos=true')
    const data = await res.json()
    setDerivadores(data.derivadores || [])
  }

  async function verificarStock(productoId) {
    const res = await fetchConToken('/api/stock/productos')
    const data = await res.json()
    const row = (data.stock || []).find(s => s.producto_id === productoId)
    return row?.cantidad || 0
  }

  function seleccionarDerivador(id) {
    setDerivadorId(id)
    if (!id) { setValorComision(''); setTipoComision('porcentaje'); setMontoCalculado(''); return }
    const d = derivadores.find(x => String(x.id) === id)
    if (!d) return
    if (d.porcentaje) { setTipoComision('porcentaje'); setValorComision(String(d.porcentaje)) }
    else if (d.monto_fijo) { setTipoComision('monto_fijo'); setValorComision(String(d.monto_fijo)) }
  }

  function seleccionarDerivadorEdicion(id) {
    setDerivadorEdicionId(id)
    if (!id) { setValorComisionEdicion(''); setTipoComisionEdicion('porcentaje'); setMontoCalculadoEdicion(''); return }
    const d = derivadores.find(x => String(x.id) === id)
    if (!d) return
    if (d.porcentaje) { setTipoComisionEdicion('porcentaje'); setValorComisionEdicion(String(d.porcentaje)) }
    else if (d.monto_fijo) { setTipoComisionEdicion('monto_fijo'); setValorComisionEdicion(String(d.monto_fijo)) }
  }

  async function buscarPacienteAutomatico(dniParam) {
    const res = await fetchConToken(`/api/pacientes?q=${encodeURIComponent(dniParam)}`)
    const data = await res.json()
    const lista = data.pacientes || []
    if (lista.length === 1) { setPaciente(lista[0]); setDni(lista[0].dni); setObraSocialId(lista[0].obra_social_id ? String(lista[0].obra_social_id) : ''); cargarVentasPaciente(lista[0].id) }
    else if (lista.length > 1) setResultados(lista)
  }

  async function cargarVentasPaciente(pacienteId) {
    const res = await fetchConToken(`/api/ventas?paciente_id=${pacienteId}`)
    const data = await res.json()
    const ventasBase = data.ventas || []
    const ventasConSaldo = await Promise.all(ventasBase.map(async v => {
      const resPagos = await fetchConToken(`/api/pagos?venta_id=${v.id}`)
      const dataPagos = await resPagos.json()
      const pagos = dataPagos.pagos || []
      const pagadoP = pagos.reduce((acc, p) => acc + (Number(p.monto_pesos) || 0), 0)
      const pagadoU = pagos.reduce((acc, p) => acc + (Number(p.monto_usd) || 0), 0)
      const resDerivador = await fetchConToken(`/api/ventas/${v.id}/derivador`)
      const dataDerivador = await resDerivador.json()
      return { ...v, pagadoPesos: pagadoP, pagadoUSD: pagadoU, derivador: dataDerivador.derivador || null }
    }))
    setVentasPaciente(ventasConSaldo)
  }

  async function buscarPaciente() {
    const valor = busqueda.trim()
    if (!valor) { alert('Ingresar DNI o apellido'); return }
    const res = await fetchConToken(`/api/pacientes?q=${encodeURIComponent(valor)}`)
    const data = await res.json()
    setResultados(data.pacientes || []); setBuscoPaciente(true)
    if (!data.pacientes || data.pacientes.length === 0) setResultados([])
  }

  async function guardarAltaRapida() {
    if (!formAltaRapida.apellido || !formAltaRapida.nombre || !formAltaRapida.dni || !formAltaRapida.telefono) { alert('Apellido, nombre, DNI y teléfono son obligatorios'); return }
    const res = await fetchConToken('/api/pacientes', { method: 'POST', body: JSON.stringify({ apellido_paciente: formAltaRapida.apellido, nombres_paciente: formAltaRapida.nombre, dni: formAltaRapida.dni, telefono: formAltaRapida.telefono || null }) })
    const data = await res.json()
    if (!res.ok) { alert('Error: ' + data.error); return }
    const nuevo = data.paciente
    setPaciente(nuevo); setDni(nuevo.dni); setObraSocialId('')
    setAltaRapida(false); setFormAltaRapida({ apellido: '', nombre: '', dni: '', telefono: '' })
    setBusqueda(''); setResultados([]); setBuscoPaciente(false)
    cargarVentasPaciente(nuevo.id)
    alert('✅ Paciente creado')
  }

  async function handleChange(e) {
    const { name, value } = e.target
    if (name === 'producto_id') {
      const prod = productos.find(p => p.id === Number(value))
      const requiereSerie = prod?.tipo_producto?.requiere_serie
      const ctrlStock = prod?.controla_stock || false
      setModoConSerie(requiereSerie); setControlaStock(ctrlStock)
      setSeriesFiltradas(series.filter(s => s.producto_id === Number(value)))
      setForm({ ...form, producto_id: value, numero_serie_id: '', cantidad: '1' })
      if (ctrlStock && !requiereSerie) { const stock = await verificarStock(Number(value)); setStockDisponible(stock) }
      else setStockDisponible(null)
      return
    }
    setForm({ ...form, [name]: value })
  }

  async function agregarItem() {
    if (!paciente) return alert('Seleccionar paciente')
    if (!form.precio_pesos && !form.precio_usd) return alert('Ingresar precio')
    if (modoConSerie && !form.numero_serie_id) return alert('Seleccionar serie')
    if (!modoConSerie && !form.producto_id) return alert('Seleccionar producto')
    const cantidad = Number(form.cantidad) || 1
    if (controlaStock && !modoConSerie) { const stockActual = await verificarStock(Number(form.producto_id)); if (stockActual < cantidad) { setModalSinStock({ producto_id: Number(form.producto_id), cantidad }); return } }
    await _agregarItemConfirmado(cantidad)
  }

  async function _agregarItemConfirmado(cantidad) {
    let ventaActualId = ventaId
    if (!ventaActualId) {
      const res = await fetchConToken('/api/ventas', { method: 'POST', body: JSON.stringify({ paciente_id: paciente.id, fecha: new Date().toISOString(), confirmada: false, obra_social_id: obraSocialId ? Number(obraSocialId) : null }) })
      const data = await res.json()
      ventaActualId = data.venta.id
      setVentaId(ventaActualId)
    }
    const resDetalle = await fetchConToken(`/api/ventas/${ventaActualId}/detalle`, { method: 'POST', body: JSON.stringify({ numero_serie_id: modoConSerie ? Number(form.numero_serie_id) : null, producto_id: !modoConSerie ? Number(form.producto_id) : null, precio_venta_pesos: form.precio_pesos || null, precio_venta_usd: form.precio_usd || null, cantidad: modoConSerie ? 1 : cantidad }) })
    const dataDetalle = await resDetalle.json()
    if (modoConSerie) await fetchConToken(`/api/stock/series/${form.numero_serie_id}`, { method: 'PUT', body: JSON.stringify({ en_stock: false, fecha_salida: new Date().toISOString() }) })
    else if (controlaStock) await fetchConToken(`/api/stock/productos/${form.producto_id}/movimiento`, { method: 'POST', body: JSON.stringify({ tipo: 'egreso', cantidad, concepto: `Venta #${ventaActualId}` }) })
    const prod = productos.find(p => p.id == form.producto_id)
    setItems([...items, { id: dataDetalle.detalle.id, numero_serie_id: form.numero_serie_id, producto_id: form.producto_id, producto: modoConSerie ? series.find(s => s.id == form.numero_serie_id)?.productos?.producto : prod?.producto, serie: modoConSerie ? series.find(s => s.id == form.numero_serie_id)?.numero_serie : '-', precio_pesos: form.precio_pesos, precio_usd: form.precio_usd, cantidad: modoConSerie ? 1 : cantidad, controla_stock: controlaStock }])
    setForm({ numero_serie_id: '', producto_id: '', precio_pesos: '', precio_usd: '', cantidad: '1' })
    setStockDisponible(null); setControlaStock(false); obtenerSeries(); setModalSinStock(null)
  }

  async function cargarStockYAgregar() {
    const cantidadCargar = Number(stockACarguar)
    if (!cantidadCargar || cantidadCargar <= 0) { alert('Ingresar cantidad válida'); return }
    await fetchConToken(`/api/stock/productos/${modalSinStock.producto_id}/movimiento`, { method: 'POST', body: JSON.stringify({ tipo: 'ingreso', cantidad: cantidadCargar, concepto: 'Carga manual desde ventas' }) })
    setStockACargar('')
    await _agregarItemConfirmado(modalSinStock.cantidad)
  }

  async function eliminarItem(item) {
  await fetchConToken(`/api/ventas/${ventaId}/detalle/${item.id}`, { method: 'DELETE' })
  if (item.numero_serie_id) await fetchConToken(`/api/stock/series/${item.numero_serie_id}`, { method: 'PUT', body: JSON.stringify({ en_stock: true, fecha_salida: null }) })
  else if (item.producto_id) { const prod = productos.find(p => p.id == item.producto_id); if (prod?.controla_stock) await fetchConToken(`/api/stock/productos/${item.producto_id}/movimiento`, { method: 'POST', body: JSON.stringify({ tipo: 'ingreso', cantidad: item.cantidad || 1, concepto: 'Devolución por eliminación de ítem en venta' }) }) }
  setItems(prev => prev.filter(i => i.id !== item.id))
  obtenerSeries()
}

  async function guardarDerivador(ventaActualId, totalP, totalU) {
    if (!derivadorId || !valorComision) return
    let montoFinal = montoCalculado ? Number(montoCalculado) : null
    if (!montoFinal && tipoComision === 'monto_fijo') montoFinal = Number(valorComision)
    if (!montoFinal && tipoComision === 'porcentaje') {
      const resCotiz = await fetchConToken('/api/cotizacion')
      const dataCotiz = await resCotiz.json()
      const cotiz = dataCotiz?.cotizacion
      const base = totalP + (cotiz ? totalU * cotiz : 0)
      montoFinal = Math.round(base * Number(valorComision) / 100) || null
    }
    await fetchConToken(`/api/ventas/${ventaActualId}/derivador`, { method: 'POST', body: JSON.stringify({ derivador_id: Number(derivadorId), tipo_comision: tipoComision, valor_comision: Number(valorComision), monto_calculado: montoFinal, pagado: false }) })
  }

  async function confirmarVenta() {
    if (!ventaId) return alert('No hay venta')
    const res = await fetchConToken(`/api/ventas/${ventaId}`, { method: 'PUT', body: JSON.stringify({ confirmada: true, total_pesos: totalPesos, total_dolares: totalUSD, obra_social_id: obraSocialId ? Number(obraSocialId) : null }) })
    if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return }
    await guardarDerivador(ventaId, totalPesos, totalUSD)
    setVentaConfirmada(true)
    alert('✅ Venta confirmada')
    if (paciente) cargarVentasPaciente(paciente.id)
  }

  function irAPagos() {
    if (!ventaConfirmada) { alert('Debe confirmar la venta primero'); return }
    window.location.href = `/pagos?venta_id=${ventaId}&dni=${dni}`
  }

  function salir() {
    if (ventaId && !ventaConfirmada) {
      setModalSalir(true)
      return
    }
    limpiarVenta()
  }

  function limpiarVenta() {
    setVentaId(null); setPaciente(null); setDni(''); setItems([])
    setVentaConfirmada(false); setBusqueda(''); setVentasPaciente([])
    setObraSocialId(''); setBuscoPaciente(false); setResultados([])
    setDerivadorId(''); setValorComision(''); setMontoCalculado(''); setTipoComision('porcentaje')
    setModalSalir(false)
  }

  async function confirmarYSalir() {
    if (!ventaId) return
    const res = await fetchConToken(`/api/ventas/${ventaId}`, { method: 'PUT', body: JSON.stringify({ confirmada: true, total_pesos: totalPesos, total_dolares: totalUSD, obra_social_id: obraSocialId ? Number(obraSocialId) : null }) })
    if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return }
    await guardarDerivador(ventaId, totalPesos, totalUSD)
    limpiarVenta()
  }

  function abrirEdicion(venta) {
  const saldoP = (venta.total_pesos || 0) - venta.pagadoPesos
  const saldoU = (venta.total_dolares || 0) - venta.pagadoUSD
  const pagada = saldoP <= 0 && saldoU <= 0
  if (pagada) {
    alert('⚠️ Esta venta está pagada. Para editarla primero dar de baja los pagos desde la sección Pagos.')
    return
  }
  setVentaEditando(venta); setItemsEdicion(venta.venta_detalle || [])
  setFormEdicion({ producto_id: '', numero_serie_id: '', precio_pesos: '', precio_usd: '' })
  if (venta.derivador) { setDerivadorEdicionId(String(venta.derivador.derivador_id || '')); setTipoComisionEdicion(venta.derivador.tipo_comision || 'porcentaje'); setValorComisionEdicion(String(venta.derivador.valor_comision || '')); setMontoCalculadoEdicion(String(venta.derivador.monto_calculado || '')) }
  else { setDerivadorEdicionId(''); setTipoComisionEdicion('porcentaje'); setValorComisionEdicion(''); setMontoCalculadoEdicion('') }
}

  function cerrarEdicion() { setVentaEditando(null); setItemsEdicion([]) }

  function handleChangeEdicion(e) {
    const { name, value } = e.target
    if (name === 'producto_id') { const prod = productos.find(p => p.id === Number(value)); setModoConSerieEdicion(prod?.tipo_producto?.requiere_serie); setSeriesFiltradasEdicion(seriesAll.filter(s => s.producto_id === Number(value) && s.en_stock)); setFormEdicion({ ...formEdicion, producto_id: value, numero_serie_id: '' }); return }
    setFormEdicion({ ...formEdicion, [name]: value })
  }

  async function guardarCambioItem(item, campo, valor) {
    await fetchConToken(`/api/ventas/${ventaEditando.id}/detalle/${item.id}/historial`, { method: 'POST', body: JSON.stringify({ numero_serie_id: item.numero_serie_id, producto_id: item.producto_id, precio_venta_pesos: item.precio_venta_pesos, precio_venta_usd: item.precio_venta_usd }) }).catch(() => {})
    if (campo === 'numero_serie_id') {
      if (item.numero_serie_id) await fetchConToken(`/api/stock/series/${item.numero_serie_id}`, { method: 'PUT', body: JSON.stringify({ en_stock: true, fecha_salida: null }) })
      if (valor) await fetchConToken(`/api/stock/series/${valor}`, { method: 'PUT', body: JSON.stringify({ en_stock: false, fecha_salida: new Date().toISOString() }) })
      const nuevaSerie = seriesAll.find(s => s.id === valor)
      setItemsEdicion(itemsEdicion.map(i => i.id === item.id ? { ...i, numero_serie_id: valor, numeros_serie: nuevaSerie ? { id: nuevaSerie.id, numero_serie: nuevaSerie.numero_serie, productos: nuevaSerie.productos } : null } : i))
    } else { setItemsEdicion(itemsEdicion.map(i => i.id === item.id ? { ...i, [campo]: valor } : i)) }
    await fetchConToken(`/api/ventas/${ventaEditando.id}/detalle/${item.id}`, { method: 'PUT', body: JSON.stringify({ [campo]: valor }) })
    obtenerSeries()
  }

  async function eliminarItemEdicion(item) {
    if (!confirm('¿Eliminar este producto de la venta?')) return
    await fetchConToken(`/api/ventas/${ventaEditando.id}/detalle/${item.id}/historial`, { method: 'POST', body: JSON.stringify({ numero_serie_id: item.numero_serie_id, producto_id: item.producto_id, precio_venta_pesos: item.precio_venta_pesos, precio_venta_usd: item.precio_venta_usd }) }).catch(() => {})
    await fetchConToken(`/api/ventas/${ventaEditando.id}/detalle/${item.id}`, { method: 'DELETE' })
    if (item.numero_serie_id) await fetchConToken(`/api/stock/series/${item.numero_serie_id}`, { method: 'PUT', body: JSON.stringify({ en_stock: true, fecha_salida: null }) })
    setItemsEdicion(itemsEdicion.filter(i => i.id !== item.id)); obtenerSeries()
  }

  async function agregarItemEdicion() {
    if (!formEdicion.precio_pesos && !formEdicion.precio_usd) return alert('Ingresar precio')
    if (modoConSerieEdicion && !formEdicion.numero_serie_id) return alert('Seleccionar serie')
    if (!modoConSerieEdicion && !formEdicion.producto_id) return alert('Seleccionar producto')
    const res = await fetchConToken(`/api/ventas/${ventaEditando.id}/detalle`, { method: 'POST', body: JSON.stringify({ numero_serie_id: modoConSerieEdicion ? Number(formEdicion.numero_serie_id) : null, producto_id: !modoConSerieEdicion ? Number(formEdicion.producto_id) : null, precio_venta_pesos: formEdicion.precio_pesos || null, precio_venta_usd: formEdicion.precio_usd || null, cantidad: 1 }) })
    const data = await res.json()
    if (modoConSerieEdicion) await fetchConToken(`/api/stock/series/${formEdicion.numero_serie_id}`, { method: 'PUT', body: JSON.stringify({ en_stock: false, fecha_salida: new Date().toISOString() }) })
    const nuevaSerieInfo = seriesAll.find(s => s.id == formEdicion.numero_serie_id)
    const nuevoProductoInfo = productos.find(p => p.id == formEdicion.producto_id)
    setItemsEdicion([...itemsEdicion, { id: data.detalle.id, numero_serie_id: modoConSerieEdicion ? Number(formEdicion.numero_serie_id) : null, producto_id: !modoConSerieEdicion ? Number(formEdicion.producto_id) : null, precio_venta_pesos: formEdicion.precio_pesos || null, precio_venta_usd: formEdicion.precio_usd || null, cantidad: 1, numeros_serie: nuevaSerieInfo ? { id: nuevaSerieInfo.id, numero_serie: nuevaSerieInfo.numero_serie, productos: nuevaSerieInfo.productos } : null, productos: nuevoProductoInfo ? { id: nuevoProductoInfo.id, producto: nuevoProductoInfo.producto } : null }])
    setFormEdicion({ producto_id: '', numero_serie_id: '', precio_pesos: '', precio_usd: '' }); obtenerSeries()
  }

  async function guardarTotalesVenta() {
    const nuevoTotalPesos = itemsEdicion.reduce((acc, i) => acc + ((Number(i.precio_venta_pesos) || 0) * (Number(i.cantidad) || 1)), 0)
    const nuevoTotalUSD = itemsEdicion.reduce((acc, i) => acc + ((Number(i.precio_venta_usd) || 0) * (Number(i.cantidad) || 1)), 0)
    await fetchConToken(`/api/ventas/${ventaEditando.id}/historial`, { method: 'POST', body: JSON.stringify({ total_pesos: ventaEditando.total_pesos, total_dolares: ventaEditando.total_dolares, confirmada: ventaEditando.confirmada }) }).catch(() => {})
    await fetchConToken(`/api/ventas/${ventaEditando.id}`, { method: 'PUT', body: JSON.stringify({ total_pesos: nuevoTotalPesos, total_dolares: nuevoTotalUSD }) })
   // Si se eligió "Sin derivador" y tenía uno → borrarlo
if (!derivadorEdicionId && ventaEditando.derivador) {
  await fetchConToken(`/api/ventas/${ventaEditando.id}/derivador`, { method: 'DELETE' })
}
// Si se eligió un derivador → guardar/actualizar
if (derivadorEdicionId && valorComisionEdicion) {
  // Si ya tenía, borrar primero para reemplazar
  if (ventaEditando.derivador) {
    await fetchConToken(`/api/ventas/${ventaEditando.id}/derivador`, { method: 'DELETE' })
  }
  let montoFinal = montoCalculadoEdicion ? Number(montoCalculadoEdicion) : null
  if (!montoFinal && tipoComisionEdicion === 'monto_fijo') montoFinal = Number(valorComisionEdicion)
  if (!montoFinal && tipoComisionEdicion === 'porcentaje') {
    const resCotiz = await fetchConToken('/api/cotizacion')
    const dataCotiz = await resCotiz.json()
    const cotiz = dataCotiz?.cotizacion
    const base = nuevoTotalPesos + (cotiz ? nuevoTotalUSD * cotiz : 0)
    montoFinal = Math.round(base * Number(valorComisionEdicion) / 100) || null
  }
  await fetchConToken(`/api/ventas/${ventaEditando.id}/derivador`, {
    method: 'POST',
    body: JSON.stringify({ derivador_id: Number(derivadorEdicionId), tipo_comision: tipoComisionEdicion, valor_comision: Number(valorComisionEdicion), monto_calculado: montoFinal, pagado: false })
  })
}
    alert('✅ Venta actualizada'); cerrarEdicion()
    if (paciente) cargarVentasPaciente(paciente.id); obtenerSeries()
  }

  const totalPesos = items.reduce((acc, i) => acc + ((Number(i.precio_pesos) || 0) * (Number(i.cantidad) || 1)), 0)
  const totalUSD = items.reduce((acc, i) => acc + ((Number(i.precio_usd) || 0) * (Number(i.cantidad) || 1)), 0)
  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)

  return (
    <div style={{ maxWidth: '750px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Ventas</h1>
        <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '14px' }}>Registrar y gestionar ventas</p>
      </div>

      <div style={card}>
        <div style={cardTitle}>🔍 Buscar paciente</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input placeholder="DNI o Apellido" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setBuscoPaciente(false); setAltaRapida(false) }} onKeyDown={(e) => e.key === 'Enter' && buscarPaciente()} style={{ ...inputStyle, flex: 1, minWidth: '180px' }} />
          <button onClick={buscarPaciente} style={btnPrimario}>Buscar</button>
        </div>
        {resultados.length > 0 && (
          <select value="" onChange={(e) => { const p = resultados.find(x => x.id == e.target.value); if (!p) return; setPaciente(p); setDni(p.dni); setResultados([]); setObraSocialId(p.obra_social_id ? String(p.obra_social_id) : ''); setBuscoPaciente(false); cargarVentasPaciente(p.id) }} style={{ ...inputStyle, marginTop: '10px' }}>
            <option value="">Seleccionar paciente ({resultados.length} encontrados)</option>
            {resultados.map(p => <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>)}
          </select>
        )}
        {buscoPaciente && resultados.length === 0 && !altaRapida && !paciente && <button onClick={() => setAltaRapida(true)} style={{ ...btnFantasma, marginTop: '10px', width: '100%', textAlign: 'center' }}>+ No encontrado — Dar de alta como nuevo paciente</button>}
        {altaRapida && (
          <div style={{ marginTop: '12px', padding: '14px', background: '#fdf2f4', borderRadius: '8px', border: '1px solid #f5c2c9' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#8B1E2D', marginBottom: '10px' }}>Alta rápida de paciente</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label style={labelStyle}>Apellido *</label><input placeholder="APELLIDO" value={formAltaRapida.apellido} onChange={(e) => setFormAltaRapida(f => ({ ...f, apellido: e.target.value.toUpperCase() }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Nombre *</label><input placeholder="NOMBRE" value={formAltaRapida.nombre} onChange={(e) => setFormAltaRapida(f => ({ ...f, nombre: e.target.value.toUpperCase() }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>DNI *</label><input placeholder="DNI" value={formAltaRapida.dni} onChange={(e) => setFormAltaRapida(f => ({ ...f, dni: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Teléfono *</label><input placeholder="11 1234-5678" value={formAltaRapida.telefono} onChange={(e) => setFormAltaRapida(f => ({ ...f, telefono: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={guardarAltaRapida} style={{ ...btnPrimario, fontSize: '13px', padding: '8px 14px' }}>💾 Guardar y continuar</button>
              <button onClick={() => setAltaRapida(false)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px' }}>Cancelar</button>
            </div>
          </div>
        )}
        {paciente && (
          <div style={{ marginTop: '14px', padding: '14px 16px', background: '#fdf2f4', borderRadius: '8px', border: '1px solid #f5c2c9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#8B1E2D' }}>{paciente.apellido_paciente} {paciente.nombres_paciente}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>DNI: {paciente.dni} {paciente.telefono ? `· Tel: ${paciente.telefono}` : ''}</div>
            </div>
            <button onClick={() => window.location.href = `/pacientes?dni=${paciente.dni}`} style={btnSecundario}>✏️ Editar</button>
          </div>
        )}
      </div>

      {paciente && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[['nueva', '➕ Nueva venta'], ['historial', `📋 Historial (${ventasPaciente.length})`]].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: tab === val ? '#8B1E2D' : 'white', color: tab === val ? 'white' : '#374151', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>{label}</button>
          ))}
        </div>
      )}

      {tab === 'nueva' && (
        <>
          {paciente && (
            <div style={{ ...card, padding: '14px 20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>🏥 Obra social para esta venta:</label>
                <select value={obraSocialId} onChange={(e) => setObraSocialId(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: '200px' }}>
                  <option value="">Sin obra social</option>
                  {obrasSociales.map(o => <option key={o.id} value={o.id}>{o.obra_social}</option>)}
                </select>
              </div>
            </div>
          )}
          <div style={card}>
            <div style={cardTitle}>➕ Agregar producto</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={labelStyle}>Producto</label><select name="producto_id" value={form.producto_id} onChange={handleChange} style={inputStyle}><option value="">Seleccionar producto</option>{productos.map(p => <option key={p.id} value={p.id}>{p.producto}</option>)}</select></div>
              {modoConSerie && <div><label style={labelStyle}>Número de serie</label><select name="numero_serie_id" value={form.numero_serie_id} onChange={handleChange} style={inputStyle}><option value="">Seleccionar serie</option>{seriesFiltradas.map(s => <option key={s.id} value={s.id}>{s.numero_serie} — {s.productos?.producto}</option>)}</select></div>}
              {!modoConSerie && form.producto_id && <div><label style={labelStyle}>Cantidad {stockDisponible !== null && <span style={{ marginLeft: '8px', fontWeight: '400', color: stockDisponible > 0 ? '#16a34a' : '#dc2626' }}>(Stock: {stockDisponible})</span>}</label><input name="cantidad" type="number" min="1" placeholder="1" value={form.cantidad} onChange={handleChange} style={inputStyle} /></div>}
              <div><label style={labelStyle}>Precio en pesos</label><input name="precio_pesos" placeholder="$0" value={form.precio_pesos} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Precio en USD</label><input name="precio_usd" placeholder="USD 0" value={form.precio_usd} onChange={handleChange} style={inputStyle} /></div>
            </div>
            <div style={{ marginTop: '14px' }}><button onClick={agregarItem} style={btnPrimario}>+ Agregar al carrito</button></div>
          </div>

          <div style={card}>
            <div style={cardTitle}>🛒 Carrito</div>
            {items.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', padding: '10px 0' }}>No hay productos agregados</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>{item.producto}{item.cantidad > 1 && <span style={{ marginLeft: '8px', fontSize: '13px', color: '#6b7280' }}>× {item.cantidad}</span>}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {item.serie !== '-' ? `Serie: ${item.serie}` : ''}
                        {item.precio_pesos && ` · ${formatearPesos(item.precio_pesos)}${item.cantidad > 1 ? ` c/u = ${fmt(item.precio_pesos * item.cantidad)}` : ''}`}
                        {item.precio_usd && ` · USD ${formatearUSD(item.precio_usd)}${item.cantidad > 1 ? ` c/u = U$S ${(item.precio_usd * item.cantidad).toFixed(2)}` : ''}`}
                      </div>
                    </div>
                    <button onClick={() => eliminarItem(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#ef4444' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 && (
              <div style={{ marginTop: '16px', padding: '14px 16px', background: '#1a1a1a', borderRadius: '10px', color: 'white', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pesos</div><div style={{ fontSize: '20px', fontWeight: '700' }}>{formatearPesos(totalPesos)}</div></div>
                <div><div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total USD</div><div style={{ fontSize: '20px', fontWeight: '700' }}>{formatearUSD(totalUSD)}</div></div>
              </div>
            )}
            {items.length > 0 && (
              <div style={{ marginTop: '16px', padding: '14px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>👤 Derivador (opcional)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><label style={labelStyle}>Derivador</label><select value={derivadorId} onChange={(e) => seleccionarDerivador(e.target.value)} style={inputStyle}><option value="">Sin derivador</option>{derivadores.map(d => <option key={d.id} value={d.id}>{d.derivador}</option>)}</select></div>
                  {derivadorId && <div><label style={labelStyle}>Tipo de comisión</label><select value={tipoComision} onChange={(e) => setTipoComision(e.target.value)} style={inputStyle}><option value="porcentaje">Porcentaje (%)</option><option value="monto_fijo">Monto fijo ($)</option></select></div>}
                  {derivadorId && <div><label style={labelStyle}>{tipoComision === 'porcentaje' ? 'Porcentaje (%)' : 'Monto fijo ($)'}</label><input type="number" placeholder={tipoComision === 'porcentaje' ? 'Ej: 5' : 'Ej: 50000'} value={valorComision} onChange={(e) => setValorComision(e.target.value)} style={inputStyle} /></div>}
                  {derivadorId && <div><label style={labelStyle}>Comisión a pagar ($) <span style={{ fontWeight: '400', color: '#9ca3af' }}>— editable</span></label><input type="number" placeholder="$0" value={montoCalculado} onChange={(e) => setMontoCalculado(e.target.value)} style={{ ...inputStyle, background: '#fdf2f4', color: '#8B1E2D', fontWeight: '600' }} /></div>}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
              <button onClick={confirmarVenta} style={btnPrimario}>✅ Confirmar venta</button>
              <button onClick={irAPagos} style={btnSecundario}>💳 Ingresar pago</button>
              <button onClick={salir} style={btnSecundario}>Salir</button>
            </div>
          </div>
        </>
      )}

      {tab === 'historial' && !ventaEditando && (
        <div style={card}>
          <div style={cardTitle}>📋 Historial de ventas</div>
          {ventasPaciente.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No hay ventas registradas para este paciente</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ventasPaciente.map(v => {
                const saldoP = (v.total_pesos || 0) - v.pagadoPesos
                const saldoU = (v.total_dolares || 0) - v.pagadoUSD
                const pagada = saldoP <= 0 && saldoU <= 0
                return (
                  <div key={v.id} style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      <div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a' }}>Venta #{v.id} — {v.fecha ? new Date(v.fecha.includes('T') ? v.fecha : v.fecha + 'T12:00:00').toLocaleDateString('es-AR') : '-'}</div>        
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                          {v.total_pesos > 0 && `Total: ${fmt(v.total_pesos)}`}{v.total_dolares > 0 && ` · U$S ${v.total_dolares}`}
                          {v.obras_sociales?.obra_social && ` · ${v.obras_sociales.obra_social}`}
                          {v.derivador && <span style={{ color: '#8B1E2D', marginLeft: '6px' }}>· 👤 {v.derivador.derivadores?.derivador} {v.derivador.monto_calculado ? `(${fmt(v.derivador.monto_calculado)})` : ''}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: pagada ? '#dcfce7' : '#fef2f2', color: pagada ? '#16a34a' : '#dc2626' }}>{pagada ? '✅ Pagada' : `Saldo: ${saldoP > 0 ? fmt(saldoP) : `U$S ${saldoU}`}`}</span>
                        {!pagada && <button onClick={() => window.location.href = `/pagos?venta_id=${v.id}&dni=${dni}`} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px' }}>💳 Pagar</button>}
                        <button onClick={() => abrirEdicion(v)} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px', color: '#8B1E2D', borderColor: '#f5c2c9' }}>✏️ Editar</button>
                      </div>
                    </div>
                    {v.venta_detalle?.map(d => (
                      <div key={d.id} style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>
                        · {d.numeros_serie?.productos?.producto || d.productos?.producto || '-'}
                        {d.numeros_serie?.numero_serie ? ` (${d.numeros_serie.numero_serie})` : ''}
                        {d.cantidad > 1 ? ` × ${d.cantidad}` : ''}
                        {d.precio_venta_pesos ? ` — ${fmt(d.precio_venta_pesos * (d.cantidad || 1))}` : ''}
                        {d.precio_venta_usd ? ` — U$S ${(d.precio_venta_usd * (d.cantidad || 1)).toFixed(2)}` : ''}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'historial' && ventaEditando && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={cardTitle}>✏️ Editando Venta #{ventaEditando.id}</div>
            <button onClick={cerrarEdicion} style={{ ...btnSecundario, fontSize: '13px', padding: '6px 12px' }}>← Volver</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {itemsEdicion.map(item => (
              <div key={item.id} style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a', marginBottom: '10px' }}>{item.numeros_serie?.productos?.producto || item.productos?.producto || '-'}{item.numeros_serie?.numero_serie ? ` (${item.numeros_serie.numero_serie})` : ''}{item.cantidad > 1 ? ` × ${item.cantidad}` : ''}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {item.numero_serie_id && <div><label style={labelStyle}>Cambiar número de serie</label><select value={item.numero_serie_id || ''} onChange={(e) => guardarCambioItem(item, 'numero_serie_id', Number(e.target.value))} style={inputStyle}><option value={item.numero_serie_id}>{item.numeros_serie?.numero_serie} (actual)</option>{seriesAll.filter(s => s.en_stock && s.producto_id === seriesAll.find(x => x.id === item.numero_serie_id)?.producto_id).map(s => <option key={s.id} value={s.id}>{s.numero_serie}</option>)}</select></div>}
                  <div><label style={labelStyle}>Precio pesos</label><input defaultValue={item.precio_venta_pesos || ''} onBlur={(e) => { if (e.target.value !== String(item.precio_venta_pesos || '')) guardarCambioItem(item, 'precio_venta_pesos', e.target.value ? Number(e.target.value) : null) }} placeholder="$0" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Precio USD</label><input defaultValue={item.precio_venta_usd || ''} onBlur={(e) => { if (e.target.value !== String(item.precio_venta_usd || '')) guardarCambioItem(item, 'precio_venta_usd', e.target.value ? Number(e.target.value) : null) }} placeholder="U$S 0" style={inputStyle} /></div>
                </div>
                <div style={{ marginTop: '10px' }}><button onClick={() => eliminarItemEdicion(item)} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px', color: '#dc2626', borderColor: '#fecaca' }}>🗑️ Eliminar producto</button></div>
              </div>
            ))}
          </div>
          <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px', border: '1px dashed #e5e7eb', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>➕ Agregar producto a esta venta</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label style={labelStyle}>Producto</label><select name="producto_id" value={formEdicion.producto_id} onChange={handleChangeEdicion} style={inputStyle}><option value="">Seleccionar</option>{productos.map(p => <option key={p.id} value={p.id}>{p.producto}</option>)}</select></div>
              {modoConSerieEdicion && <div><label style={labelStyle}>Serie</label><select name="numero_serie_id" value={formEdicion.numero_serie_id} onChange={handleChangeEdicion} style={inputStyle}><option value="">Seleccionar serie</option>{seriesFiltradasEdicion.map(s => <option key={s.id} value={s.id}>{s.numero_serie}</option>)}</select></div>}
              <div><label style={labelStyle}>Precio pesos</label><input name="precio_pesos" placeholder="$0" value={formEdicion.precio_pesos} onChange={handleChangeEdicion} style={inputStyle} /></div>
              <div><label style={labelStyle}>Precio USD</label><input name="precio_usd" placeholder="U$S 0" value={formEdicion.precio_usd} onChange={handleChangeEdicion} style={inputStyle} /></div>
            </div>
            <div style={{ marginTop: '10px' }}><button onClick={agregarItemEdicion} style={{ ...btnSecundario, fontSize: '13px' }}>+ Agregar</button></div>
          </div>
          <div style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
    👤 {ventaEditando.derivador ? 'Editar derivador' : 'Agregar derivador'}
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
    <div><label style={labelStyle}>Derivador</label><select value={derivadorEdicionId} onChange={(e) => seleccionarDerivadorEdicion(e.target.value)} style={inputStyle}><option value="">Sin derivador</option>{derivadores.map(d => <option key={d.id} value={d.id}>{d.derivador}</option>)}</select></div>
    {derivadorEdicionId && <div><label style={labelStyle}>Tipo de comisión</label><select value={tipoComisionEdicion} onChange={(e) => setTipoComisionEdicion(e.target.value)} style={inputStyle}><option value="porcentaje">Porcentaje (%)</option><option value="monto_fijo">Monto fijo ($)</option></select></div>}
    {derivadorEdicionId && <div><label style={labelStyle}>{tipoComisionEdicion === 'porcentaje' ? 'Porcentaje (%)' : 'Monto fijo ($)'}</label><input type="number" placeholder={tipoComisionEdicion === 'porcentaje' ? 'Ej: 5' : 'Ej: 50000'} value={valorComisionEdicion} onChange={(e) => setValorComisionEdicion(e.target.value)} style={inputStyle} /></div>}
    {derivadorEdicionId && <div><label style={labelStyle}>Comisión a pagar ($)</label><input type="number" placeholder="$0" value={montoCalculadoEdicion} onChange={(e) => setMontoCalculadoEdicion(e.target.value)} style={{ ...inputStyle, background: '#fdf2f4', color: '#8B1E2D', fontWeight: '600' }} /></div>}
  </div>
</div>
     <div style={{ display: 'flex', gap: '10px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
            <button onClick={guardarTotalesVenta} style={btnPrimario}>💾 Guardar cambios</button>
            <button onClick={cerrarEdicion} style={btnSecundario}>Cancelar</button>
          </div>
        </div>
      )}
      {/* MODAL SIN STOCK */}
      {modalSinStock && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '8px' }}>⚠️ Sin stock suficiente</div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>No hay stock registrado para este producto. ¿Querés cargarlo ahora y continuar con la venta?</div>
            <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Cantidad a cargar en stock</label><input type="number" min="1" placeholder="Ej: 10" value={stockACarguar} onChange={(e) => setStockACargar(e.target.value)} style={inputStyle} /></div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={cargarStockYAgregar} style={btnPrimario}>📦 Cargar stock y continuar</button>
              <button onClick={() => _agregarItemConfirmado(modalSinStock.cantidad)} style={{ ...btnSecundario, color: '#f59e0b', borderColor: '#fcd34d' }}>⚠️ Continuar sin stock</button>
              <button onClick={() => { setModalSinStock(null); setStockACargar('') }} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SALIR */}
      {modalSalir && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '8px' }}>⚠️ Tenés una venta sin confirmar</div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>¿Qué querés hacer antes de salir?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={confirmarYSalir} style={btnPrimario}>✅ Confirmar venta y salir</button>
              <button onClick={limpiarVenta} style={{ ...btnSecundario, color: '#dc2626', borderColor: '#fecaca' }}>🗑️ Salir sin confirmar</button>
              <button onClick={() => setModalSalir(false)} style={btnSecundario}>← Volver al carrito</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '15px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const card = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const cardTitle = { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '14px' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnFantasma = { padding: '8px 16px', background: 'transparent', color: '#8B1E2D', border: '1px dashed #8B1E2D', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
