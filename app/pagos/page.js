'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { formatearPesos } from '../../lib/format'

export default function Pagos() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const ventaIdParam = searchParams.get('venta_id')
  const dniParam = searchParams.get('dni')

  const [dni, setDni] = useState(dniParam || '')
  const [paciente, setPaciente] = useState(null)

  const [ventas, setVentas] = useState([])
  const [ventaSeleccionada, setVentaSeleccionada] = useState(ventaIdParam || '')

  const [formasPago, setFormasPago] = useState([])

  const [detalleVenta, setDetalleVenta] = useState([])
  const [totalPesos, setTotalPesos] = useState(0)
  const [totalUSD, setTotalUSD] = useState(0)

  const [pagadoPesos, setPagadoPesos] = useState(0)
  const [pagadoUSD, setPagadoUSD] = useState(0)

  const [form, setForm] = useState({
    forma_pago_id: '',
    monto_pesos: '',
    monto_usd: '',
  })

  useEffect(() => {
    obtenerFormasPago()

    if (dniParam) {
      buscarPacienteAutomatico(dniParam)
    }
  }, [])

  useEffect(() => {
    if (ventaIdParam) {
      setVentaSeleccionada(ventaIdParam)
      cargarDetalleVenta(ventaIdParam)
    }
  }, [ventaIdParam])

  async function obtenerFormasPago() {
    const { data } = await supabase
      .from('formas_pago')
      .select('*')
      .order('forma_pago')

    setFormasPago(data || [])
  }

  async function buscarPacienteAutomatico(dniValor) {
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', dniValor)
      .maybeSingle()

    if (data) {
      setPaciente(data)

      const { data: ventasData } = await supabase
        .from('ventas')
        .select('*')
        .eq('paciente_id', data.id)
        .order('fecha', { ascending: false })

      setVentas(ventasData || [])
    }
  }

  async function buscarPaciente() {
    if (!dni) {
      alert('Ingresar DNI')
      return
    }

    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('dni', dni)
      .maybeSingle()

    if (!data) {
      alert('Paciente no encontrado')
      return
    }

    setPaciente(data)

    const { data: ventasData } = await supabase
      .from('ventas')
      .select('*')
      .eq('paciente_id', data.id)
      .order('fecha', { ascending: false })

    setVentas(ventasData || [])
  }

  async function cargarDetalleVenta(ventaId) {
    const { data: detalle } = await supabase
      .from('venta_detalle')
      .select(`
        *,
        numeros_serie (
          numero_serie,
          productos (producto)
        ),
        productos (
          producto
        )
      `)
      .eq('venta_id', ventaId)

    setDetalleVenta(detalle || [])

    const totalPesosCalc = (detalle || []).reduce((acc, d) => {
  return acc + (Number(d.precio_venta_pesos) || 0)
}, 0)

const totalUSDCalc = (detalle || []).reduce((acc, d) => {
  return acc + (Number(d.precio_venta_usd) || 0)
}, 0)

setTotalPesos(totalPesosCalc)
setTotalUSD(totalUSDCalc)

    const { data: pagos } = await supabase
      .from('pagos')
      .select('*')
      .eq('venta_id', ventaId)

    const pagadoPesosCalc = (pagos || []).reduce((acc, p) => {
  return acc + (Number(p.monto_pesos) || 0)
}, 0)

const pagadoUSDCalc = (pagos || []).reduce((acc, p) => {
  return acc + (Number(p.monto_usd) || 0)
}, 0)

setPagadoPesos(pagadoPesosCalc)
setPagadoUSD(pagadoUSDCalc)
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  async function guardarPago() {
    if (!ventaSeleccionada) {
      alert('Seleccionar venta')
      return
    }

    const montoPesos = Number(form.monto_pesos) || 0
    const montoUsd = Number(form.monto_usd) || 0

    if (!montoPesos && !montoUsd) {
      alert('Debe ingresar monto en pesos o USD')
      return
    }

    if (montoPesos && montoUsd) {
      alert('No se puede cargar pago en ambas monedas')
      return
    }

    if (!form.forma_pago_id) {
      alert('Seleccionar forma de pago')
      return
    }

    const { data: pagosExistentes } = await supabase
      .from('pagos')
      .select('*')
      .eq('venta_id', ventaSeleccionada)

    const usaPesos = (pagosExistentes || []).some(p => p.monto_pesos)
    const usaUsd = (pagosExistentes || []).some(p => p.monto_usd)

    if (usaPesos && montoUsd) {
      alert('Esta venta ya tiene pagos en PESOS')
      return
    }

    if (usaUsd && montoPesos) {
      alert('Esta venta ya tiene pagos en USD')
      return
    }

    const saldo = totalVenta - totalPagado

    if (montoPesos > saldo) {
      alert('El pago supera el saldo pendiente')
      return
    }

    const { error } = await supabase.from('pagos').insert([
      {
        venta_id: Number(ventaSeleccionada),
        fecha_pago: new Date().toISOString(),
        forma_pago_id: Number(form.forma_pago_id),
        monto_pesos: montoPesos || null,
        monto_usd: montoUsd || null,
        creado_por: 1,
      },
    ])

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    alert('Pago registrado')

    router.replace(`/ventas?dni=${dni}`)
  }

  return (
    <div style={{ padding: '30px', maxWidth: '700px' }}>
      <h1>Pagos</h1>

      <input
        placeholder="DNI"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
      />

      <button onClick={buscarPaciente}>
        Buscar
      </button>

      {paciente && (
        <div style={{ marginTop: '10px', border: '1px solid #ccc', padding: '10px' }}>
          <strong>
            {paciente.apellido_paciente} {paciente.nombres_paciente}
          </strong>

          <div>Tel: {paciente.telefono || '-'}</div>
          <div>Mail: {paciente.mail || '-'}</div>

          <button
            onClick={() =>
              (window.location.href = `/pacientes?dni=${paciente.dni}&volver=pagos`)
            }
          >
            Editar paciente
          </button>
        </div>
      )}

      <hr />

      <select
        value={ventaSeleccionada}
        onChange={(e) => {
          const id = e.target.value
          setVentaSeleccionada(id)

          if (id) {
            cargarDetalleVenta(id)
          }
        }}
      >
        <option value="">Seleccionar venta</option>

        {ventas.map(v => (
          <option key={v.id} value={v.id}>
            Venta #{v.id} - {new Date(v.fecha).toLocaleDateString()}
          </option>
        ))}
      </select>

      <hr />

      <h3>Detalle de venta</h3>

      {detalleVenta.map(d => (
        <div key={d.id}>
          {d.numeros_serie?.productos?.producto || d.productos?.producto || '-'} | 
          {formatearPesos(d.precio_venta_pesos || 0)}
        </div>
      ))}

      <hr />

      <div>Total venta: {formatearPesos(totalVenta)}</div>
      <div>Total pagado: {formatearPesos(totalPagado)}</div>
      <div><strong>Saldo: {formatearPesos(totalVenta - totalPagado)}</strong></div>

      <hr />

      <select
        name="forma_pago_id"
        value={form.forma_pago_id}
        onChange={handleChange}
      >
        <option value="">Forma de pago</option>
        {formasPago.map(f => (
          <option key={f.id} value={f.id}>
            {f.forma_pago}
          </option>
        ))}
      </select>

      <input
        name="monto_pesos"
        placeholder="Monto en pesos"
        value={form.monto_pesos}
        onChange={handleChange}
      />

      <input
        name="monto_usd"
        placeholder="Monto en USD"
        value={form.monto_usd}
        onChange={handleChange}
      />

      <button onClick={guardarPago}>
        Guardar pago
      </button>
    </div>
  )
}
