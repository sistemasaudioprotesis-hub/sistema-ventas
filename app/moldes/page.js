'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { fetchConToken } from '../../lib/fetchConToken'
import { normalizarTexto } from '../../lib/formatText'
import { usePermiso } from '../../lib/usePermisos'

const ESTADOS = [
  { key: 'ingresado', label: 'Ingresado', color: '#4b5563', bg: '#f3f4f6', border: '#d1d5db' },
  { key: 'en_proceso', label: 'En proceso', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'listo_entregar', label: 'Listo para entregar', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'entregado', label: 'Entregado', color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
  { key: 'cancelado', label: 'Cancelado', color: '#9ca3af', bg: '#f3f4f6', border: '#e5e7eb' },
]

const ESTADOS_ACTIVOS = ['ingresado', 'en_proceso', 'listo_entregar']
const ESTADOS_CERRADOS = ['entregado', 'cancelado']

function getEstado(key) {
  return ESTADOS.find(e => e.key === key) || ESTADOS[0]
}

export default function Moldes() {
  const { verificando, permitido } = usePermiso('moldes_tapones')
  const [moldes, setMoldes] = useState([])
  const [soloActivas, setSoloActivas] = useState(true)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalVer, setModalVer] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [historial, setHistorial] = useState([])
  const [laboratorios, setLaboratorios] = useState([])

  const [busquedaPaciente, setBusquedaPaciente] = useState('')
  const [pacientesResultados, setPacientesResultados] = useState([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null)
  const [buscoPaciente, setBuscoPaciente] = useState(false)
  const [altaRapida, setAltaRapida] = useState(false)
  const [formAltaRapida, setFormAltaRapida] = useState({ apellido: '', nombre: '', dni: '', telefono: '' })

  const [formNuevo, setFormNuevo] = useState({ producto: '', cantidad: '1', observaciones: '', costo_pesos: '', costo_usd: '', laboratorio_id: '' })
  const [formEdicion, setFormEdicion] = useState({})
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  const [guardandoNuevo, setGuardandoNuevo] = useState(false)

  useEffect(() => { cargarDatos() }, [])
  useEffect(() => { cargarMoldes() }, [soloActivas])

  if (verificando || !permitido) return null

  async function cargarDatos() {
    const res = await fetchConToken('/api/usuarios')
    const data = await res.json()
    const labs = (data.usuarios || []).filter(u => u.rol === 'laboratorio' && u.activo)
    setLaboratorios(labs)
    cargarMoldes()
  }

  async function cargarMoldes() {
    setCargando(true)
    const res = await fetchConToken('/api/moldes')
    const data = await res.json()
    let resultado = data.moldes || []
    if (soloActivas) {
      resultado = resultado.filter(r => ESTADOS_ACTIVOS.includes(r.respuesta_paciente || 'ingresado'))
    }
    setMoldes(resultado)
    setCargando(false)
  }

  async function buscarPacientes() {
    const termino = busquedaPaciente.trim()
    if (!termino) return
    const res = await fetchConToken(`/api/pacientes?q=${encodeURIComponent(termino)}`)
    const data = await res.json()
    setPacientesResultados(data.pacientes || [])
    setBuscoPaciente(true)
  }

  async function guardarAltaRapida() {
    if (!formAltaRapida.apellido || !formAltaRapida.nombre || !formAltaRapida.dni) {
      alert('Apellido, nombre y DNI son obligatorios'); return
    }
    const res = await fetchConToken('/api/pacientes', {
      method: 'POST',
      body: JSON.stringify({
        apellido_paciente: formAltaRapida.apellido,
        nombres_paciente: formAltaRapida.nombre,
        dni: formAltaRapida.dni,
        telefono: formAltaRapida.telefono || null,
      })
    })
    const data = await res.json()
    if (!res.ok) { alert('Error: ' + data.error); return }
    setPacienteSeleccionado(data.paciente)
    setAltaRapida(false); setFormAltaRapida({ apellido: '', nombre: '', dni: '', telefono: '' })
    setBusquedaPaciente(''); setPacientesResultados([]); setBuscoPaciente(false)
  }

  async function guardarNuevo() {
  if (guardandoNuevo) return
  setGuardandoNuevo(true)
  try {
    if (!pacienteSeleccionado) { alert('Seleccioná un paciente'); return }
    if (!formNuevo.producto) { alert('Ingresar producto'); return }
    const res = await fetchConToken('/api/moldes', {
      method: 'POST',
      body: JSON.stringify({
        paciente_id: pacienteSeleccionado.id,
        marca: normalizarTexto(formNuevo.producto),
        observaciones: formNuevo.observaciones || null,
        costo_pesos: formNuevo.costo_pesos ? Number(formNuevo.costo_pesos) : null,
        costo_usd: formNuevo.costo_usd ? Number(formNuevo.costo_usd) : null,
        laboratorio_id: formNuevo.laboratorio_id ? Number(formNuevo.laboratorio_id) : null,
      })
    })
    const data = await res.json()
    if (!res.ok) { alert('Error: ' + data.error); return }
    cerrarModalNuevo()
    cargarMoldes()
    alert(`✅ Orden #${data.molde.numero_orden} creada`)
  } finally {
    setGuardandoNuevo(false)
  }
}

  function cerrarModalNuevo() {
    setModalNuevo(false)
    setFormNuevo({ producto: '', cantidad: '1', observaciones: '', costo_pesos: '', costo_usd: '', laboratorio_id: '' })
    setPacienteSeleccionado(null); setBusquedaPaciente(''); setPacientesResultados([])
    setBuscoPaciente(false); setAltaRapida(false)
    setFormAltaRapida({ apellido: '', nombre: '', dni: '', telefono: '' })
  }

  async function abrirVer(r) {
    setModalVer(r)
    setHistorial([])
    setFormEdicion({
      observaciones: r.observaciones || '',
      costo_pesos: r.costo_pesos || '',
      costo_usd: r.costo_usd || '',
      respuesta_paciente: r.respuesta_paciente || 'ingresado',
      fecha_entrega: r.fecha_entrega || '',
      laboratorio_id: r.laboratorio_id || '',
    })
    const resH = await fetchConToken(`/api/moldes/${r.id}/historial`)
    const dataH = await resH.json()
    setHistorial(dataH.historial || [])
  }

  async function guardarEdicion() {
    const estadoActual = modalVer.respuesta_paciente
    if (ESTADOS_CERRADOS.includes(estadoActual)) {
      const confirmar = confirm('Esta orden está cerrada. ¿Querés modificarla de todas formas?')
      if (!confirmar) return
    }
    setGuardandoEdicion(true)
    const res = await fetchConToken(`/api/moldes/${modalVer.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        observaciones: formEdicion.observaciones || null,
        costo_pesos: formEdicion.costo_pesos ? Number(formEdicion.costo_pesos) : null,
        costo_usd: formEdicion.costo_usd ? Number(formEdicion.costo_usd) : null,
        respuesta_paciente: formEdicion.respuesta_paciente,
        fecha_entrega: formEdicion.fecha_entrega || null,
        laboratorio_id: formEdicion.laboratorio_id ? Number(formEdicion.laboratorio_id) : null,
      })
    })
    setGuardandoEdicion(false)
    if (!res.ok) { const d = await res.json(); alert('Error: ' + d.error); return }
    setModalVer(null)
    cargarMoldes()
  }

  const porEstado = ESTADOS.reduce((acc, e) => {
    acc[e.key] = moldes.filter(r => (r.respuesta_paciente || 'ingresado') === e.key)
    return acc
  }, {})

  const estadosMostrar = soloActivas ? ESTADOS.filter(e => ESTADOS_ACTIVOS.includes(e.key)) : ESTADOS
  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
  const fmtFecha = (f) => f ? new Date(f + (f.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-AR') : '-'
  const fmtFechaHora = (f) => f ? new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'

  return (
    <div style={{ maxWidth: '860px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Moldes y Tapones</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
            {moldes.length} órdenes {soloActivas ? 'activas' : 'totales'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setSoloActivas(!soloActivas)} style={{
            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
            border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '600',
            background: soloActivas ? '#1a1a1a' : 'white',
            color: soloActivas ? 'white' : '#374151',
            fontFamily: "'Outfit', sans-serif",
          }}>
            {soloActivas ? '👁 Ver todas' : '🔧 Solo activas'}
          </button>
          <button onClick={() => setModalNuevo(true)} style={btnPrimario}>+ Nueva orden</button>
        </div>
      </div>

      {cargando ? (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {estadosMostrar.map(estado => (
            <div key={estado.key} style={{
              background: 'white', border: '1px solid #e5e7eb',
              borderRadius: '12px', overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                padding: '10px 14px', background: estado.bg,
                borderBottom: `1px solid ${estado.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: estado.color }}>{estado.label.toUpperCase()}</span>
                <span style={{
                  fontSize: '11px', fontWeight: '700', color: estado.color,
                  background: 'white', borderRadius: '20px',
                  padding: '1px 8px', border: `1px solid ${estado.border}`,
                }}>
                  {porEstado[estado.key]?.length || 0}
                </span>
              </div>
              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(porEstado[estado.key] || []).length === 0 ? (
                  <div style={{
                    textAlign: 'center', color: '#d1d5db', fontSize: '12px',
                    padding: '16px 0', border: '1px dashed #e5e7eb', borderRadius: '8px',
                  }}>
                    Sin órdenes
                  </div>
                ) : (
                  (porEstado[estado.key] || []).map(r => (
                    <div key={r.id} onClick={() => abrirVer(r)} style={{
                      padding: '10px 12px', background: 'white', borderRadius: '8px',
                      border: '1px solid #e5e7eb', borderLeft: `3px solid ${estado.color}`,
                      cursor: 'pointer', transition: '0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fafafa' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#8B1E2D' }}>#{r.numero_orden}</span>
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{fmtFecha(r.fecha)}</span>
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a1a', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.pacientes?.apellido_paciente} {r.pacientes?.nombres_paciente}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {r.marca || '-'}
                      </div>
                      {(r.costo_pesos || r.costo_usd) && (
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#15803d', marginTop: '2px' }}>
                          {r.costo_pesos ? fmt(r.costo_pesos) : ''}
                          {r.costo_usd ? ` U$S ${r.costo_usd}` : ''}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NUEVA ORDEN */}
      {modalNuevo && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a', marginBottom: '20px' }}>🧩 Nueva orden</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Paciente *</label>
                {pacienteSeleccionado ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ ...inputStyle, background: '#fdf2f4', color: '#8B1E2D', fontWeight: '600', fontSize: '13px', padding: '10px 14px' }}>
                      {pacienteSeleccionado.apellido_paciente} {pacienteSeleccionado.nombres_paciente} — DNI: {pacienteSeleccionado.dni}
                    </div>
                    <button onClick={() => { setPacienteSeleccionado(null); setBusquedaPaciente(''); setPacientesResultados([]); setBuscoPaciente(false) }} style={{ padding: '10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input placeholder="DNI o apellido..." value={busquedaPaciente} onChange={(e) => { setBusquedaPaciente(e.target.value); setBuscoPaciente(false) }} onKeyDown={(e) => e.key === 'Enter' && buscarPacientes()} style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={buscarPacientes} style={{ ...btnSecundario, whiteSpace: 'nowrap', fontSize: '13px' }}>Buscar</button>
                    </div>
                    {pacientesResultados.length > 0 && (
                      <select value="" onChange={(e) => {
                        const p = pacientesResultados.find(x => x.id == e.target.value)
                        if (!p) return
                        setPacienteSeleccionado(p); setPacientesResultados([]); setBusquedaPaciente(''); setBuscoPaciente(false)
                      }} style={{ ...inputStyle, marginTop: '6px' }}>
                        <option value="">Seleccionar ({pacientesResultados.length} encontrados)</option>
                        {pacientesResultados.map(p => <option key={p.id} value={p.id}>{p.apellido_paciente} {p.nombres_paciente} — DNI: {p.dni}</option>)}
                      </select>
                    )}
                    {buscoPaciente && pacientesResultados.length === 0 && !altaRapida && (
                      <button onClick={() => setAltaRapida(true)} style={{ ...btnFantasma, marginTop: '8px', width: '100%', textAlign: 'center' }}>
                        + No encontrado — Dar de alta como nuevo paciente
                      </button>
                    )}
                    {altaRapida && (
                      <div style={{ marginTop: '10px', padding: '14px', background: '#fdf2f4', borderRadius: '8px', border: '1px solid #f5c2c9' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#8B1E2D', marginBottom: '10px' }}>Alta rápida de paciente</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div><label style={labelStyle}>Apellido *</label><input placeholder="APELLIDO" value={formAltaRapida.apellido} onChange={(e) => setFormAltaRapida(f => ({ ...f, apellido: e.target.value.toUpperCase() }))} style={inputStyle} /></div>
                          <div><label style={labelStyle}>Nombre *</label><input placeholder="NOMBRE" value={formAltaRapida.nombre} onChange={(e) => setFormAltaRapida(f => ({ ...f, nombre: e.target.value.toUpperCase() }))} style={inputStyle} /></div>
                          <div><label style={labelStyle}>DNI *</label><input placeholder="DNI" value={formAltaRapida.dni} onChange={(e) => setFormAltaRapida(f => ({ ...f, dni: e.target.value }))} style={inputStyle} /></div>
                          <div><label style={labelStyle}>Teléfono</label><input placeholder="11 1234-5678" value={formAltaRapida.telefono} onChange={(e) => setFormAltaRapida(f => ({ ...f, telefono: e.target.value }))} style={inputStyle} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button onClick={guardarAltaRapida} style={{ ...btnPrimario, fontSize: '13px', padding: '8px 14px' }}>💾 Guardar y seleccionar</button>
                          <button onClick={() => setAltaRapida(false)} style={{ ...btnSecundario, fontSize: '13px', padding: '8px 14px' }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <label style={labelStyle}>Producto *</label>
                <input placeholder="Ej: Tapón, Molde, etc..." value={formNuevo.producto} onChange={(e) => setFormNuevo({ ...formNuevo, producto: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Observaciones</label>
                <textarea placeholder="Detalles de la orden..." value={formNuevo.observaciones} onChange={(e) => setFormNuevo({ ...formNuevo, observaciones: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Costo en pesos</label>
                  <input type="number" placeholder="$0" value={formNuevo.costo_pesos} onChange={(e) => setFormNuevo({ ...formNuevo, costo_pesos: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Costo en USD</label>
                  <input type="number" placeholder="U$S 0" value={formNuevo.costo_usd} onChange={(e) => setFormNuevo({ ...formNuevo, costo_usd: e.target.value })} style={inputStyle} />
                </div>
              </div>
              {laboratorios.length > 0 && (
                <div>
                  <label style={labelStyle}>Laboratorio asignado</label>
                  <select value={formNuevo.laboratorio_id} onChange={(e) => setFormNuevo({ ...formNuevo, laboratorio_id: e.target.value })} style={inputStyle}>
                    <option value="">Sin asignar</option>
                    {laboratorios.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={guardarNuevo} disabled={guardandoNuevo} style={{ ...btnPrimario, opacity: guardandoNuevo ? 0.7 : 1 }}>
  {guardandoNuevo ? 'Guardando...' : '💾 Guardar orden'}
</button>
              <button onClick={cerrarModalNuevo} style={btnSecundario}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER / EDITAR */}
      {modalVer && (
        <div style={overlay}>
          <div style={{ ...modalBox, maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a' }}>🧩 Orden #{modalVer.numero_orden}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Ingresada: {fmtFecha(modalVer.fecha)}</div>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                background: getEstado(formEdicion.respuesta_paciente).bg,
                color: getEstado(formEdicion.respuesta_paciente).color,
              }}>
                {getEstado(formEdicion.respuesta_paciente).label}
              </span>
            </div>

            <div style={{ padding: '12px 16px', background: '#fdf2f4', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#8B1E2D' }}>
                {modalVer.pacientes?.apellido_paciente} {modalVer.pacientes?.nombres_paciente}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                DNI: {modalVer.pacientes?.dni}{modalVer.pacientes?.telefono && ` · Tel: ${modalVer.pacientes.telefono}`}
              </div>
              <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px', fontWeight: '600' }}>{modalVer.marca}</div>
            </div>

            {ESTADOS_CERRADOS.includes(modalVer.respuesta_paciente) && (
              <div style={{
                padding: '8px 14px', borderRadius: '8px', marginBottom: '14px',
                background: '#fef9c3', border: '1px solid #fde047',
                fontSize: '12px', color: '#854d0e', fontWeight: '600',
              }}>
                ⚠️ Esta orden está cerrada. Podés modificarla pero se te va a pedir confirmación.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Estado</label>
                <select value={formEdicion.respuesta_paciente} onChange={(e) => setFormEdicion({ ...formEdicion, respuesta_paciente: e.target.value })} style={inputStyle}>
                  {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Observaciones</label>
                <textarea value={formEdicion.observaciones} onChange={(e) => setFormEdicion({ ...formEdicion, observaciones: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Costo en pesos</label>
                  <input type="number" placeholder="$0" value={formEdicion.costo_pesos} onChange={(e) => setFormEdicion({ ...formEdicion, costo_pesos: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Costo en USD</label>
                  <input type="number" placeholder="U$S 0" value={formEdicion.costo_usd} onChange={(e) => setFormEdicion({ ...formEdicion, costo_usd: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Fecha de entrega</label>
                <input type="date" value={formEdicion.fecha_entrega} onChange={(e) => setFormEdicion({ ...formEdicion, fecha_entrega: e.target.value })} style={inputStyle} />
              </div>
              {laboratorios.length > 0 && (
                <div>
                  <label style={labelStyle}>Laboratorio asignado</label>
                  <select value={formEdicion.laboratorio_id} onChange={(e) => setFormEdicion({ ...formEdicion, laboratorio_id: e.target.value })} style={inputStyle}>
                    <option value="">Sin asignar</option>
                    {laboratorios.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                </div>
              )}
              {modalVer.ventas && (
                <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px' }}>
                  🔗 Venta vinculada: #{modalVer.ventas.id}
                  {modalVer.ventas.total_pesos ? ` — ${fmt(modalVer.ventas.total_pesos)}` : ''}
                </div>
              )}
              <div>
                <label style={labelStyle}>Cambio rápido de estado</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {ESTADOS.filter(e => e.key !== formEdicion.respuesta_paciente).map(e => (
                    <button key={e.key} onClick={() => setFormEdicion({ ...formEdicion, respuesta_paciente: e.key })} style={{
                      padding: '4px 10px', borderRadius: '20px', border: `1px solid ${e.color}`,
                      background: 'white', color: e.color, fontSize: '11px', fontWeight: '600',
                      cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                    }}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {historial.length > 0 && (
                <div>
                  <label style={labelStyle}>Historial de estados</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {historial.map((h, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: '10px', alignItems: 'center',
                        fontSize: '12px', padding: '6px 10px',
                        background: '#f9fafb', borderRadius: '6px',
                        border: '1px solid #f3f4f6',
                      }}>
                        <span style={{ color: getEstado(h.estado).color, fontWeight: '700', whiteSpace: 'nowrap' }}>
                          {getEstado(h.estado).label}
                        </span>
                        <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtFechaHora(h.created_at)}</span>
                        {h.observaciones && (
                          <span style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.observaciones}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
              <button onClick={guardarEdicion} disabled={guardandoEdicion} style={{ ...btnPrimario, opacity: guardandoEdicion ? 0.7 : 1 }}>
                {guardandoEdicion ? 'Guardando...' : '💾 Guardar cambios'}
              </button>
              {!modalVer.ventas && (
                <button onClick={() => {
                  const params = new URLSearchParams({
                    dni: modalVer.pacientes?.dni,
                    producto: 'Moldes y Tapones',
                    ...(modalVer.costo_pesos ? { monto_pesos: modalVer.costo_pesos } : {}),
                    ...(modalVer.costo_usd ? { monto_usd: modalVer.costo_usd } : {}),
                  })
                  window.location.href = `/ventas?${params}`
                }} style={{ ...btnSecundario, fontSize: '13px' }}>
                  💳 Registrar venta y pago
                </button>
              )}
              <button onClick={() => setModalVer(null)} style={btnSecundario}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', fontFamily: "'Outfit', sans-serif", background: 'white', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' }
const btnPrimario = { padding: '10px 20px', background: '#8B1E2D', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnSecundario = { padding: '10px 20px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const btnFantasma = { padding: '8px 16px', background: 'transparent', color: '#8B1E2D', border: '1px dashed #8B1E2D', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }
const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }
