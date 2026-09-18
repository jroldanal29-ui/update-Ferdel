import { useEffect, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3,
  Bell, Boxes, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, Clock3, Download,
  FileBarChart, Filter, Gauge, HelpCircle, LayoutDashboard, LogOut, Menu, MoreHorizontal,
  Package, Plus, Search, Settings, ShieldCheck, ShoppingCart, Truck, UserRound, Users,
  Warehouse, Wrench, X, Eye, Pencil, Trash2, Save, FileSpreadsheet, FileText,
  RefreshCw, Sparkles,
  Smartphone, Wifi, Copy, ExternalLink,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from 'recharts'
import { movements as seedMovements, products as seedProducts, profitabilityData, usageData, workOrders as seedOrders } from './data'
import type { Movement, Product, StockStatus, WorkOrder } from './types'
import {
  isSupabaseConfigured, loadCentralData, removeCentralProduct, saveCentralOrder,
  saveCentralProduct, signIn, signOut, supabase, loadCentralMovements, saveCentralMovement,
  loadCentralDirectory, saveCentralDirectory,
} from './lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

type Page = 'Dashboard' | 'Inventario' | 'Movimientos' | 'Órdenes de trabajo' | 'Costos y rentabilidad' | 'Clientes' | 'Proveedores' | 'Reportes' | 'Usuarios'
type UpdateState = { status: 'available' | 'downloading' | 'downloaded' | 'error'; version?: string; releaseName?: string; releaseDate?: string; percent?: number; message?: string }

const menu: { section: string; items: { label: Page; icon: typeof LayoutDashboard }[] }[] = [
  { section: 'GENERAL', items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  { section: 'OPERACIONES', items: [
    { label: 'Inventario', icon: Boxes }, { label: 'Movimientos', icon: ArrowDownLeft },
    { label: 'Órdenes de trabajo', icon: ClipboardList }, { label: 'Costos y rentabilidad', icon: CircleDollarSign },
  ] },
  { section: 'DIRECTORIO', items: [{ label: 'Clientes', icon: Users }, { label: 'Proveedores', icon: Truck }] },
  { section: 'GESTIÓN', items: [{ label: 'Reportes', icon: FileBarChart }, { label: 'Usuarios', icon: ShieldCheck }] },
]

const money = (value: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(value)

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(escape).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function stockStatus(p: Product): StockStatus {
  if (p.stock === 0) return 'Sin stock'
  if (p.stock <= Math.max(1, Math.floor(p.min / 2))) return 'Crítico'
  if (p.stock < p.min) return 'Stock bajo'
  if (p.stock > p.max) return 'Sobrestock'
  return 'Normal'
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand">
    <div className="brand-mark"><span>F</span><i /></div>
    {!compact && <div><strong>FERDEL</strong><small>PERÚ S.A.C.</small></div>}
  </div>
}

function App() {
  const [page, setPage] = useState<Page>('Dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('ferdel-products')
    return saved ? JSON.parse(saved) : seedProducts
  })
  const [orders, setOrders] = useState<WorkOrder[]>(() => {
    const saved = localStorage.getItem('ferdel-orders')
    return saved ? JSON.parse(saved) : seedOrders
  })
  const [productModal, setProductModal] = useState<Product | 'new' | null>(null)
  const [orderModal, setOrderModal] = useState<WorkOrder | 'new' | null>(null)
  const [toast, setToast] = useState('')
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [userEmail, setUserEmail] = useState(isSupabaseConfigured ? '' : 'Modo local')
  const [syncing, setSyncing] = useState(false)
  const [update, setUpdate] = useState<UpdateState | null>(null)
  const [appVersion, setAppVersion] = useState('1.2.1')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mobileAccess, setMobileAccess] = useState<{ url: string; local: boolean } | null>(null)
  const [infoPanel, setInfoPanel] = useState<'settings' | 'help' | 'notifications' | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? '')
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? '')
      setAuthReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isSupabaseConfigured) {
      if (!userEmail) return
      setSyncing(true)
      loadCentralData().then(data => {
        setProducts(data.products)
        setOrders(data.orders)
      }).catch(error => setToast(`No se pudo leer Supabase: ${error.message}`)).finally(() => setSyncing(false))
      return
    }
    const database = window.ferdelDesktop?.database
    if (!database) return
    Promise.all([database.load<Product[]>('products'), database.load<WorkOrder[]>('orders')]).then(([savedProducts, savedOrders]) => {
      if (savedProducts?.length) setProducts(savedProducts)
      if (savedOrders?.length) setOrders(savedOrders)
    }).catch(() => undefined)
  }, [userEmail])

  useEffect(() => {
    const updates = window.ferdelDesktop?.updates
    if (!updates) return
    void updates.getVersion().then(setAppVersion)
    return updates.onStatus(data => {
      if (data.status === 'available' || data.status === 'downloading' || data.status === 'downloaded') {
        setUpdate(previous => ({ ...previous, ...data } as UpdateState))
      } else if (data.status === 'not-available' && data.manual) {
        setToast('Ya tienes la versión más reciente')
        window.setTimeout(() => setToast(''), 2500)
      } else if (data.status === 'error') {
        setUpdate(previous => previous ? ({ ...previous, ...data } as UpdateState) : null)
        if (data.manual) {
          setToast('No se pudo comprobar la actualización')
          window.setTimeout(() => setToast(''), 2500)
        }
      }
    })
  }, [])

  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(''), 2500) }
  const saveProducts = (next: Product[], changed?: Product) => {
    setProducts(next)
    if (isSupabaseConfigured && changed) void saveCentralProduct(changed).catch(error => notify(`Error de sincronización: ${error.message}`))
    else { localStorage.setItem('ferdel-products', JSON.stringify(next)); void window.ferdelDesktop?.database.save('products', next) }
  }
  const deleteProduct = (product: Product) => {
    const next = products.filter(x => x.id !== product.id)
    setProducts(next)
    if (isSupabaseConfigured) void removeCentralProduct(product.id).catch(error => { setProducts(products); notify(`No se pudo eliminar: ${error.message}`) })
    else { localStorage.setItem('ferdel-products', JSON.stringify(next)); void window.ferdelDesktop?.database.save('products', next) }
  }
  const saveOrders = (next: WorkOrder[], changed?: WorkOrder) => {
    setOrders(next)
    if (isSupabaseConfigured && changed) void saveCentralOrder(changed).catch(error => notify(`Error de sincronización: ${error.message}`))
    else { localStorage.setItem('ferdel-orders', JSON.stringify(next)); void window.ferdelDesktop?.database.save('orders', next) }
  }
  const checkForUpdates = async () => {
    const updates = window.ferdelDesktop?.updates
    if (!updates) return notify('La búsqueda de actualizaciones solo está disponible en la aplicación de escritorio')
    const result = await updates.check()
    if (result.development) notify(`Modo desarrollo · versión ${result.version}`)
    else notify('Buscando actualizaciones…')
  }
  const openMobileAccess = async () => {
    const publicUrl = import.meta.env.VITE_MOBILE_APP_URL?.trim()
    if (publicUrl) return setMobileAccess({ url: publicUrl, local: false })
    const result = await window.ferdelDesktop?.mobile.getAccess()
    if (result?.url) return setMobileAccess(result)
    if (location.protocol.startsWith('http')) return setMobileAccess({ url: location.origin, local: true })
    notify('No se pudo determinar la dirección móvil')
  }

  if (!authReady) return <div className="auth-shell"><div className="auth-loading"><Brand /><div className="spinner" />Conectando con Supabase…</div></div>
  if (isSupabaseConfigured && !userEmail) return <LoginScreen />

  return <div className="app-shell">
    {mobileNavOpen && <button className="mobile-nav-overlay" aria-label="Cerrar menú" onClick={() => setMobileNavOpen(false)} />}
    <aside className={`${collapsed ? 'sidebar collapsed' : 'sidebar'}${mobileNavOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-head"><Brand compact={collapsed} /><button onClick={() => setCollapsed(!collapsed)}><Menu size={19} /></button></div>
      <div className="nav-scroll">
        {menu.map(group => <div className="nav-group" key={group.section}>
          {!collapsed && <div className="nav-section">{group.section}</div>}
          {group.items.map(item => <button key={item.label} className={page === item.label ? 'nav-item active' : 'nav-item'} onClick={() => { setPage(item.label); setQuery(''); setMobileNavOpen(false) }} title={item.label}>
            <item.icon size={19} /><span>{item.label}</span>{item.label === 'Inventario' && <b>3</b>}
          </button>)}
        </div>)}
      </div>
      <div className="sidebar-foot">
        <button className="nav-item" onClick={() => void checkForUpdates()}><RefreshCw size={19} /><span>Buscar actualización</span></button>
        <button className="nav-item" onClick={() => setInfoPanel('settings')}><Settings size={19} /><span>Configuración</span></button>
        {isSupabaseConfigured && <button className="nav-item" onClick={() => void signOut()}><LogOut size={19} /><span>Cerrar sesión</span></button>}
        <div className="user-card"><div className="avatar">AT</div>{!collapsed && <><div><strong>Ana Torres</strong><small>Administradora</small></div><MoreHorizontal size={18} /></>}</div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="mobile-menu-button" onClick={() => setMobileNavOpen(true)}><Menu size={20}/></button>
        <div className="global-search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar producto, OT, placa o cliente..." /><kbd>⌘ K</kbd></div>
        <div className="top-actions"><span className={syncing ? 'sync-state syncing' : 'sync-state'}><i />{syncing ? 'Sincronizando' : isSupabaseConfigured ? 'Supabase conectado' : 'Modo local'}</span><button className="mobile-access-button" title="Acceso móvil" onClick={() => void openMobileAccess()}><Smartphone size={19}/><span>Acceso móvil</span></button><button title="Ayuda" onClick={() => setInfoPanel('help')}><HelpCircle size={20} /></button><button className="notification" title="Notificaciones" onClick={() => setInfoPanel('notifications')}><Bell size={20} /><i /></button><span className="divider" /><div className="top-user"><div className="avatar small">AT</div><div><strong>Ana Torres</strong><small>{userEmail}</small></div><ChevronDown size={16} /></div></div>
      </header>

      <div className="content">
        {page === 'Dashboard' && <Dashboard products={products} orders={orders} setPage={setPage} notify={notify} />}
        {page === 'Inventario' && <Inventory products={products} query={query} onNew={() => setProductModal('new')} onEdit={setProductModal} onDelete={p => { if (confirm(`¿Eliminar ${p.name}?`)) { deleteProduct(p); notify('Producto eliminado') } }} />}
        {page === 'Órdenes de trabajo' && <Orders orders={orders} query={query} onNew={() => setOrderModal('new')} onOpen={setOrderModal} />}
        {page === 'Movimientos' && <Movements query={query} notify={notify} products={products} onStockChange={(product, nextStock) => {
          const changed = { ...product, stock: nextStock }
          saveProducts(products.map(item => item.id === changed.id ? changed : item), changed)
        }} />}
        {page === 'Costos y rentabilidad' && <Costs orders={orders} />}
        {page === 'Clientes' && <Directory type="Clientes" query={query} notify={notify} />}
        {page === 'Proveedores' && <Directory type="Proveedores" query={query} notify={notify} />}
        {page === 'Reportes' && <Reports notify={notify} />}
        {page === 'Usuarios' && <UsersPage notify={notify} />}
      </div>
    </main>

    {productModal && <ProductModal value={productModal} onClose={() => setProductModal(null)} onSave={p => {
      const saved = productModal === 'new' ? { ...p, id: Date.now() } : p
      const next = productModal === 'new' ? [...products, saved] : products.map(x => x.id === p.id ? saved : x)
      saveProducts(next, saved); setProductModal(null); notify(productModal === 'new' ? 'Producto registrado correctamente' : 'Producto actualizado')
    }} />}
    {orderModal && <OrderModal value={orderModal} onClose={() => setOrderModal(null)} onSave={o => {
      const saved = orderModal === 'new' ? { ...o, id: Date.now() } : o
      const next = orderModal === 'new' ? [saved, ...orders] : orders.map(x => x.id === o.id ? saved : x)
      saveOrders(next, saved); setOrderModal(null); notify(orderModal === 'new' ? 'Orden de trabajo creada' : 'Orden actualizada')
    }} />}
    {update && <UpdateModal value={update} currentVersion={appVersion} onClose={() => update.status !== 'downloading' && setUpdate(null)} onDownload={() => {
      setUpdate({ ...update, status: 'downloading', percent: 0 })
      void window.ferdelDesktop?.updates.download()
    }} onInstall={() => void window.ferdelDesktop?.updates.install()} />}
    {mobileAccess && <MobileAccessModal value={mobileAccess} onClose={() => setMobileAccess(null)} notify={notify} />}
    {infoPanel && <InfoPanel type={infoPanel} products={products} appVersion={appVersion} onClose={() => setInfoPanel(null)} onMobile={() => { setInfoPanel(null); void openMobileAccess() }} onUpdates={() => { setInfoPanel(null); void checkForUpdates() }} />}
    {toast && <div className="toast"><CheckCircle2 size={19} />{toast}</div>}
  </div>
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try { await signIn(email, password) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión') }
    finally { setLoading(false) }
  }

  return <div className="login-page">
    <div className="login-aside">
      <Brand />
      <div className="login-message"><span>SISTEMA CENTRALIZADO</span><h1>Gestión que mueve<br/>tu operación.</h1><p>Inventario, órdenes de trabajo y rentabilidad en una sola plataforma segura.</p></div>
      <div className="login-feature"><ShieldCheck size={19}/><div><strong>Datos protegidos</strong><small>Autenticación y políticas de acceso con Supabase</small></div></div>
    </div>
    <div className="login-content"><form className="login-card" onSubmit={submit}>
      <div className="login-mobile-brand"><Brand /></div>
      <div className="login-icon"><UserRound size={23}/></div><h2>Bienvenido</h2><p>Ingresa tus credenciales para acceder a FERDEL Gestión.</p>
      <label><span>Correo electrónico</span><input type="email" required autoFocus value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@ferdel.pe"/></label>
      <label><span>Contraseña</span><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
      {error && <div className="login-error"><AlertTriangle size={15}/>{error}</div>}
      <button className="btn primary login-button" disabled={loading}>{loading ? 'Ingresando…' : 'Iniciar sesión'}<ArrowRight size={17}/></button>
      <small className="login-help">Solicita acceso al administrador del sistema.</small>
    </form></div>
  </div>
}

function MobileAccessModal({ value, onClose, notify }: { value: { url: string; local: boolean }; onClose: () => void; notify: (message: string) => void }) {
  const copyLink = async () => {
    await navigator.clipboard.writeText(value.url)
    notify('Enlace móvil copiado')
  }
  return <div className="modal-backdrop mobile-qr-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="mobile-qr-modal">
    <button className="qr-close" onClick={onClose}><X size={19}/></button>
    <div className="qr-heading"><div className="qr-phone"><Smartphone size={24}/></div><div><span>FERDEL MÓVIL</span><h2>Accede desde tu celular</h2></div></div>
    <p className="qr-intro">Escanea este código con la cámara de tu teléfono para abrir el sistema.</p>
    <div className="qr-frame"><div className="qr-corners"/><QRCodeSVG value={value.url} size={205} level="M" bgColor="#ffffff" fgColor="#071936"/></div>
    <div className={value.local ? 'qr-network local' : 'qr-network'}><Wifi size={16}/><div><strong>{value.local ? 'Conexión por red local' : 'Acceso por internet'}</strong><small>{value.local ? 'El celular y esta computadora deben estar conectados a la misma red Wi-Fi.' : 'Puedes ingresar desde cualquier ubicación con conexión a internet.'}</small></div></div>
    <div className="qr-url"><span>{value.url}</span><button title="Copiar enlace" onClick={() => void copyLink()}><Copy size={16}/></button></div>
    <div className="qr-actions"><button className="btn secondary" onClick={onClose}>Cerrar</button><button className="btn primary" onClick={() => window.open(value.url, '_blank')}><ExternalLink size={16}/> Abrir enlace</button></div>
    {value.local && <small className="qr-footnote">El acceso móvil estará disponible mientras FERDEL Gestión permanezca abierto en esta computadora.</small>}
  </div></div>
}

function UpdateModal({ value, currentVersion, onClose, onDownload, onInstall }: { value: UpdateState; currentVersion: string; onClose: () => void; onDownload: () => void; onInstall: () => void }) {
  const downloading = value.status === 'downloading'
  const downloaded = value.status === 'downloaded'
  const failed = value.status === 'error'
  return <div className="modal-backdrop update-backdrop"><div className="update-modal">
    {!downloading && <button className="update-close" onClick={onClose}><X size={19}/></button>}
    <div className={downloaded ? 'update-visual ready' : failed ? 'update-visual failed' : 'update-visual'}>
      <div className="update-orbit"><RefreshCw size={33}/><Sparkles size={17}/></div>
    </div>
    <div className="update-body">
      <span className="update-eyebrow">ACTUALIZACIÓN DE FERDEL GESTIÓN</span>
      <h2>{downloaded ? 'Actualización lista' : failed ? 'No se pudo descargar' : 'Hay una nueva actualización'}</h2>
      <p>{downloaded ? 'La nueva versión se descargó correctamente. Reinicia la aplicación para completar la instalación.' : failed ? 'Verifica tu conexión a internet e inténtalo nuevamente.' : 'Hemos preparado mejoras de rendimiento, seguridad y estabilidad para tu sistema.'}</p>
      <div className="version-route"><div><small>VERSIÓN ACTUAL</small><strong>v{currentVersion}</strong></div><ArrowRight size={19}/><div><small>NUEVA VERSIÓN</small><strong>v{value.version ?? '—'}</strong></div></div>
      {downloading && <div className="update-progress"><div><span>Descargando actualización…</span><strong>{value.percent ?? 0}%</strong></div><div className="update-progress-track"><i style={{width:`${value.percent ?? 0}%`}}/></div><small>Puedes continuar trabajando mientras finaliza la descarga.</small></div>}
      {failed && value.message && <div className="update-error"><AlertTriangle size={15}/><span>{value.message}</span></div>}
      <div className="update-actions">
        {!downloading && !downloaded && <button className="btn secondary" onClick={onClose}>Más tarde</button>}
        {value.status === 'available' && <button className="btn primary" onClick={onDownload}><Download size={17}/> Descargar actualización</button>}
        {failed && <button className="btn primary" onClick={onDownload}><RefreshCw size={17}/> Reintentar</button>}
        {downloaded && <button className="btn primary install-button" onClick={onInstall}><RefreshCw size={17}/> Reiniciar e instalar</button>}
      </div>
    </div>
  </div></div>
}

function PageHeading({ eyebrow, title, subtitle, actions }: { eyebrow?: string, title: string, subtitle: string, actions?: React.ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="heading-actions">{actions}</div>}</div>
}

function Dashboard({ products, orders, setPage, notify }: { products: Product[], orders: WorkOrder[], setPage: (p: Page) => void, notify: (s: string) => void }) {
  const [chartPeriod, setChartPeriod] = useState('6')
  const low = products.filter(p => ['Stock bajo', 'Crítico', 'Sin stock'].includes(stockStatus(p))).length
  const active = orders.filter(o => ['En proceso', 'En espera'].includes(o.status)).length
  const totalCost = orders.reduce((s, o) => s + o.materialCost + o.laborCost + o.extraCost, 0)
  const profit = orders.reduce((s, o) => s + o.salePrice - o.materialCost - o.laborCost - o.extraCost, 0)
  const cards = [
    { label: 'Productos registrados', value: products.length.toString(), note: '+6 este mes', icon: Package, tone: 'blue' },
    { label: 'Alertas de stock', value: low.toString(), note: 'Requieren atención', icon: AlertTriangle, tone: 'orange' },
    { label: 'OT activas', value: active.toString(), note: `${orders.filter(o => o.status === 'Pendiente').length} por iniciar`, icon: Wrench, tone: 'purple' },
    { label: 'Rentabilidad acumulada', value: money(profit), note: '+8.4% vs. mes anterior', icon: CircleDollarSign, tone: 'green' },
  ]
  return <>
    <PageHeading eyebrow="MARTES, 15 DE SEPTIEMBRE" title="Buenos días, Ana" subtitle="Aquí tienes el resumen de operaciones de FERDEL Perú." actions={<><button className="btn secondary" onClick={() => { downloadCsv('resumen-ferdel.csv',['Indicador','Valor'],[['Productos registrados',products.length],['Alertas de stock',low],['Órdenes activas',active],['Costo acumulado',totalCost],['Ganancia estimada',profit]]); notify('Resumen descargado') }}><Download size={17} /> Exportar</button><button className="btn primary" onClick={() => setPage('Órdenes de trabajo')}><Plus size={18} /> Nueva orden</button></>} />
    <div className="metric-grid">{cards.map(c => <div className="metric-card" key={c.label}><div className={`metric-icon ${c.tone}`}><c.icon size={21} /></div><div className="metric-label">{c.label}<MoreHorizontal size={17} /></div><strong className="metric-value">{c.value}</strong><div className={`metric-note ${c.tone === 'orange' ? 'warning' : ''}`}><ArrowUpRight size={14} />{c.note}</div></div>)}</div>

    <div className="dashboard-grid">
      <section className="panel chart-panel"><PanelHead title="Movimientos de inventario" subtitle="Entradas y salidas del periodo" action={<select className="select-btn" value={chartPeriod} onChange={event=>setChartPeriod(event.target.value)}><option value="3">Últimos 3 meses</option><option value="6">Últimos 6 meses</option></select>} />
        <div className="legend"><span><i className="dot blue-dot" />Entradas</span><span><i className="dot cyan-dot" />Salidas</span></div>
        <ResponsiveContainer width="100%" height={235}><AreaChart data={usageData.slice(-Number(chartPeriod))} margin={{ left: -22, right: 8, top: 8 }}><defs><linearGradient id="entrada" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1769e0" stopOpacity={.22}/><stop offset="95%" stopColor="#1769e0" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf4"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'#8491a5', fontSize:12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill:'#8491a5', fontSize:12 }}/><Tooltip contentStyle={{ borderRadius:10, border:'1px solid #e5eaf1' }}/><Area type="monotone" dataKey="entradas" stroke="#1769e0" strokeWidth={2.4} fill="url(#entrada)"/><Area type="monotone" dataKey="salidas" stroke="#16b8c8" strokeWidth={2.4} fill="transparent"/></AreaChart></ResponsiveContainer>
      </section>
      <section className="panel alerts-panel"><PanelHead title="Alertas de stock" subtitle={`${low} productos requieren atención`} action={<button className="link-btn" onClick={() => setPage('Inventario')}>Ver inventario <ArrowRight size={15}/></button>} />
        <div className="alerts-list">{products.filter(p => stockStatus(p) !== 'Normal').slice(0,4).map(p => <div className="alert-row" key={p.id}><div className={`alert-symbol ${stockStatus(p).toLowerCase().replace(' ', '-')}`}><AlertTriangle size={17}/></div><div><strong>{p.name}</strong><small>{p.code} · {p.location}</small></div><div className="alert-stock"><b>{p.stock}</b><small>de {p.min} mín.</small></div></div>)}</div>
      </section>
    </div>

    <div className="dashboard-grid bottom-grid">
      <section className="panel"><PanelHead title="Órdenes en proceso" subtitle={`${active} buses actualmente en taller`} action={<button className="link-btn" onClick={() => setPage('Órdenes de trabajo')}>Ver todas <ArrowRight size={15}/></button>} />
        <div className="orders-compact">{orders.slice(0,4).map(o => <div className="order-compact" key={o.id}><div className="bus-icon"><Truck size={19}/></div><div className="order-main"><div><strong>{o.number}</strong><StatusBadge status={o.status}/></div><span>{o.plate} · {o.client}</span><div className="progress"><i style={{ width: `${o.progress}%` }}/></div></div><b>{o.progress}%</b></div>)}</div>
      </section>
      <section className="panel"><PanelHead title="Resumen financiero" subtitle="Acumulado de órdenes registradas" action={<button className="link-btn" onClick={() => setPage('Costos y rentabilidad')}>Ver detalle <ArrowRight size={15}/></button>} />
        <div className="finance-summary"><div><span>Costo acumulado</span><strong>{money(totalCost)}</strong></div><div><span>Facturación proyectada</span><strong>{money(orders.reduce((s,o)=>s+o.salePrice,0))}</strong></div><div className="finance-profit"><span>Ganancia estimada</span><strong>{money(profit)}</strong><em>{orders.some(o=>o.salePrice) ? Math.round(profit / orders.reduce((s,o)=>s+o.salePrice,0)*100) : 0}% margen</em></div></div>
      </section>
    </div>

    <section className="panel movements-panel"><PanelHead title="Movimientos recientes" subtitle="Últimas entradas y salidas del almacén" action={<button className="link-btn" onClick={() => setPage('Movimientos')}>Ver movimientos <ArrowRight size={15}/></button>} /><MovementTable compact /></section>
  </>
}

function Inventory({ products, query, onNew, onEdit, onDelete }: { products: Product[], query: string, onNew: () => void, onEdit: (p: Product) => void, onDelete: (p: Product) => void }) {
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [categoryFilter, setCategoryFilter] = useState('Todas')
  const categories = [...new Set(products.map(product=>product.category))]
  const filtered = products.filter(p => `${p.code} ${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()) && (statusFilter === 'Todos' || stockStatus(p) === statusFilter) && (categoryFilter === 'Todas' || p.category === categoryFilter))
  const value = products.reduce((s,p)=>s+p.stock*p.price,0)
  return <>
    <PageHeading eyebrow="ALMACÉN" title="Inventario" subtitle="Administra productos, existencias y niveles de reposición." actions={<><button className="btn secondary" onClick={()=>downloadCsv('inventario-ferdel.csv',['Código','Producto','Categoría','Marca','Stock','Mínimo','Máximo','Precio','Ubicación'],filtered.map(p=>[p.code,p.name,p.category,p.brand,p.stock,p.min,p.max,p.price,p.location]))}><Download size={17}/> Exportar</button><button className="btn primary" onClick={onNew}><Plus size={18}/> Nuevo producto</button></>} />
    <div className="summary-strip"><div><Package/><span>Total productos<strong>{products.length}</strong></span></div><div><Warehouse/><span>Unidades en stock<strong>{products.reduce((s,p)=>s+p.stock,0)}</strong></span></div><div><AlertTriangle/><span>Stock comprometido<strong>{products.filter(p=>['Stock bajo','Crítico','Sin stock'].includes(stockStatus(p))).length}</strong></span></div><div><CircleDollarSign/><span>Valor del inventario<strong>{money(value)}</strong></span></div></div>
    <section className="panel table-panel">
      <div className="table-toolbar"><div className="local-search"><Search size={17}/><input placeholder="Usa el buscador superior..." value={query} readOnly /></div><div className="filters"><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option>Todas</option>{categories.map(category=><option key={category}>{category}</option>)}</select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>Todos</option><option>Normal</option><option>Stock bajo</option><option>Crítico</option><option>Sin stock</option><option>Sobrestock</option></select></div></div>
      <div className="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>CATEGORÍA</th><th>UBICACIÓN</th><th>STOCK</th><th>PRECIO</th><th>ESTADO</th><th /></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><div className="product-cell"><div className="product-thumb"><Package size={18}/></div><div><strong>{p.name}</strong><small>{p.code} · {p.brand}</small></div></div></td><td>{p.category}</td><td><span className="location">{p.location}</span></td><td><strong>{p.stock}</strong> <span className="muted">{p.unit}</span><small className="stock-range">Mín. {p.min} · Máx. {p.max}</small></td><td><strong>{money(p.price)}</strong></td><td><StockBadge status={stockStatus(p)}/></td><td><div className="row-actions"><button title="Editar" onClick={()=>onEdit(p)}><Pencil size={16}/></button><button className="danger-hover" title="Eliminar" onClick={()=>onDelete(p)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>
      <TableFooter count={filtered.length} label="productos" />
    </section>
  </>
}

function Orders({ orders, query, onNew, onOpen }: { orders: WorkOrder[], query: string, onNew: () => void, onOpen: (o: WorkOrder) => void }) {
  const [tab,setTab]=useState('Todas')
  const filtered = orders.filter(o => `${o.number} ${o.client} ${o.plate}`.toLowerCase().includes(query.toLowerCase()) && (tab==='Todas'||tab===o.status||(tab==='Finalizadas'&&['Finalizada','Entregada'].includes(o.status))))
  return <>
    <PageHeading eyebrow="OPERACIONES" title="Órdenes de trabajo" subtitle="Controla el proceso de conversión de cada unidad." actions={<button className="btn primary" onClick={onNew}><Plus size={18}/> Nueva orden</button>} />
    <div className="order-tabs">{['Todas','En proceso','En espera','Finalizadas'].map(label=><button key={label} className={tab===label?'active':''} onClick={()=>setTab(label)}>{label} <b>{label==='Todas'?orders.length:label==='Finalizadas'?orders.filter(o=>['Finalizada','Entregada'].includes(o.status)).length:orders.filter(o=>o.status===label).length}</b></button>)}</div>
    <div className="orders-grid">{filtered.map(o=>{
      const cost=o.materialCost+o.laborCost+o.extraCost; const gain=o.salePrice-cost
      return <article className="order-card" key={o.id} onClick={()=>onOpen(o)}><div className="order-card-head"><div><span>{o.number}</span><StatusBadge status={o.status}/></div><button title="Editar orden" onClick={event=>{event.stopPropagation();onOpen(o)}}><Pencil size={16}/></button></div><div className="vehicle"><div className="vehicle-art"><Truck size={27}/></div><div><strong>{o.plate}</strong><span>{o.bus}</span></div></div><div className="client-line"><Building2 size={15}/><span>{o.client}</span></div><div className="order-progress"><div><span>Progreso de conversión</span><b>{o.progress}%</b></div><div className="progress"><i style={{width:`${o.progress}%`}}/></div></div><div className="order-meta"><div><CalendarDays size={15}/><span>Entrega<small>{o.delivery}</small></span></div><div><UserRound size={15}/><span>Responsable<small>{o.manager}</small></span></div></div><div className="order-finance"><div><span>Costo actual</span><strong>{money(cost)}</strong></div><div><span>Ganancia estimada</span><strong className="positive">{money(gain)}</strong></div><ChevronRight size={18}/></div></article>
    })}</div>
  </>
}

function Movements({ query, notify, products, onStockChange }: { query: string, notify: (s:string)=>void, products: Product[], onStockChange: (product: Product, stock: number)=>void }) {
  const [kind,setKind]=useState<'Todos'|'Entrada'|'Salida'>('Todos')
  const [movementList,setMovementList]=useState<Movement[]>(seedMovements)
  const [movementModal,setMovementModal]=useState<'Entrada'|'Salida'|null>(null)
  const filtered=movementList.filter(m=>(kind==='Todos'||m.type===kind)&&`${m.number} ${m.product} ${m.reference}`.toLowerCase().includes(query.toLowerCase()))
  useEffect(()=>{if(isSupabaseConfigured)void loadCentralMovements().then(rows=>setMovementList(rows)).catch(()=>undefined)},[])
  const register=(data:{productId:number;quantity:number;unitCost:number;reference:string})=>{
    const product=products.find(p=>p.id===data.productId)
    if(!product)return
    if(movementModal==='Salida'&&data.quantity>product.stock){notify('La salida supera el stock disponible');return}
    const movement:Movement={id:Date.now(),number:`MOV-${String(movementList.length+249).padStart(5,'0')}`,date:new Date().toLocaleString('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),type:movementModal!,product:product.name,quantity:data.quantity,unitCost:data.unitCost,reference:data.reference,user:'Ana Torres'}
    setMovementList([movement,...movementList]);onStockChange(product,product.stock+(movementModal==='Entrada'?data.quantity:-data.quantity));if(isSupabaseConfigured)void saveCentralMovement(movement,product.id).catch(error=>notify(`Movimiento guardado solo en pantalla: ${error.message}`));setMovementModal(null);notify(`${movementModal} registrada correctamente`)
  }
  return <><PageHeading eyebrow="ALMACÉN" title="Movimientos" subtitle="Trazabilidad completa de entradas y salidas." actions={<><button className="btn success" onClick={()=>setMovementModal('Entrada')}><ArrowDownLeft size={18}/> Registrar entrada</button><button className="btn primary" onClick={()=>setMovementModal('Salida')}><ArrowUpRight size={18}/> Registrar salida</button></>} />
    <div className="segment"><button className={kind==='Todos'?'active':''} onClick={()=>setKind('Todos')}>Todos</button><button className={kind==='Entrada'?'active':''} onClick={()=>setKind('Entrada')}>Entradas</button><button className={kind==='Salida'?'active':''} onClick={()=>setKind('Salida')}>Salidas</button></div>
    <section className="panel table-panel"><div className="table-toolbar"><div className="local-search"><Search size={17}/><input value={query} readOnly placeholder="Buscar movimiento..."/></div><button className="select-btn" onClick={()=>downloadCsv('movimientos-ferdel.csv',['Movimiento','Fecha','Tipo','Producto','Cantidad','Costo unitario','Referencia','Responsable'],filtered.map(m=>[m.number,m.date,m.type,m.product,m.quantity,m.unitCost,m.reference,m.user]))}><Download size={16}/> Exportar movimientos</button></div><MovementTable data={filtered}/><TableFooter count={filtered.length} label="movimientos"/></section>
    {movementModal&&<MovementModal type={movementModal} products={products} onClose={()=>setMovementModal(null)} onSave={register}/>}</>
}

function MovementTable({ compact=false, filter='Todos', data=seedMovements }: { compact?:boolean, filter?:string, data?:Movement[] }) {
  const rows=data.filter(m=>filter==='Todos'||m.type===filter)
  return <div className="table-wrap"><table><thead><tr><th>MOVIMIENTO</th><th>FECHA</th><th>TIPO</th><th>PRODUCTO</th><th>CANT.</th>{!compact&&<th>COSTO TOTAL</th>}<th>REFERENCIA</th><th>RESPONSABLE</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td><strong>{m.number}</strong></td><td>{m.date}</td><td><span className={`movement-type ${m.type.toLowerCase()}`}>{m.type==='Entrada'?<ArrowDownLeft size={14}/>:<ArrowUpRight size={14}/>} {m.type}</span></td><td><strong>{m.product}</strong></td><td>{m.quantity}</td>{!compact&&<td><strong>{money(m.quantity*m.unitCost)}</strong></td>}<td><span className="ref-chip">{m.reference}</span></td><td><div className="person"><div>{m.user.split(' ').map(x=>x[0]).join('')}</div>{m.user}</div></td></tr>)}</tbody></table></div>
}

function Costs({ orders }: { orders: WorkOrder[] }) {
  const rows=orders.map(o=>({...o,cost:o.materialCost+o.laborCost+o.extraCost,gain:o.salePrice-o.materialCost-o.laborCost-o.extraCost}))
  const sales=rows.reduce((s,o)=>s+o.salePrice,0), costs=rows.reduce((s,o)=>s+o.cost,0), gains=sales-costs
  return <><PageHeading eyebrow="CONTROL FINANCIERO" title="Costos y rentabilidad" subtitle="Analiza el costo real y margen de cada conversión." actions={<button className="btn secondary" onClick={()=>downloadCsv('rentabilidad-ferdel.csv',['Orden','Placa','Cliente','Materiales','Mano de obra','Otros','Costo real','Venta','Ganancia','Margen %'],rows.map(o=>[o.number,o.plate,o.client,o.materialCost,o.laborCost,o.extraCost,o.cost,o.salePrice,o.gain,o.salePrice?Math.round(o.gain/o.salePrice*100):0]))}><Download size={17}/> Exportar informe</button>} />
    <div className="financial-kpis"><div><span>Facturación total</span><strong>{money(sales)}</strong><small>{orders.length} conversiones registradas</small></div><div><span>Costos acumulados</span><strong>{money(costs)}</strong><small>{sales ? Math.round(costs/sales*100) : 0}% de la facturación</small></div><div className="highlight"><span>Ganancia acumulada</span><strong>{money(gains)}</strong><small><ArrowUpRight size={13}/> Margen promedio {sales ? Math.round(gains/sales*100) : 0}%</small></div></div>
    <div className="dashboard-grid"><section className="panel chart-panel"><PanelHead title="Costo vs. precio de venta" subtitle="Comparativa por orden de trabajo"/><div className="legend"><span><i className="dot blue-dot"/>Venta</span><span><i className="dot gray-dot"/>Costo real</span></div><ResponsiveContainer width="100%" height={260}><BarChart data={profitabilityData} margin={{left:-15,right:8}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf4"/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip formatter={(v)=>money(Number(v))}/><Bar dataKey="venta" fill="#1769e0" radius={[5,5,0,0]}/><Bar dataKey="costo" fill="#cbd4e2" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></section><section className="panel cost-breakdown"><PanelHead title="Composición de costos" subtitle="Distribución acumulada"/><CostLine label="Materiales" value={rows.reduce((s,o)=>s+o.materialCost,0)} total={costs} color="#1769e0"/><CostLine label="Mano de obra" value={rows.reduce((s,o)=>s+o.laborCost,0)} total={costs} color="#16b8c8"/><CostLine label="Servicios y adicionales" value={rows.reduce((s,o)=>s+o.extraCost,0)} total={costs} color="#7259d6"/></section></div>
    <section className="panel table-panel cost-table"><PanelHead title="Rentabilidad por conversión" subtitle="Detalle financiero de las órdenes"/><div className="table-wrap"><table><thead><tr><th>ORDEN / BUS</th><th>MATERIALES</th><th>MANO DE OBRA</th><th>OTROS</th><th>COSTO REAL</th><th>VENTA</th><th>GANANCIA</th><th>MARGEN</th></tr></thead><tbody>{rows.map(o=><tr key={o.id}><td><strong>{o.number}</strong><small className="block">{o.plate} · {o.client}</small></td><td>{money(o.materialCost)}</td><td>{money(o.laborCost)}</td><td>{money(o.extraCost)}</td><td><strong>{money(o.cost)}</strong></td><td><strong>{money(o.salePrice)}</strong></td><td className="positive"><strong>{money(o.gain)}</strong></td><td><span className="margin-badge">{o.salePrice ? Math.round(o.gain/o.salePrice*100) : 0}%</span></td></tr>)}</tbody></table></div></section></>
}

const clientData=[['Transportes San Martín S.A.','20154823691','María Rojas','987 452 180','4 buses'],['Expreso Metropolitano','20517483920','Jorge Flores','996 218 044','7 buses'],['Turismo Pacífico E.I.R.L.','20608374915','Raúl Cáceres','945 790 321','2 buses'],['Transportes Unidos','20451983762','Claudia Núñez','982 441 630','5 buses'],['Rápido Norte S.A.C.','20193746528','Felipe Guerra','961 385 270','3 buses']]
const supplierData=[['Gas Motors Perú','20584619372','Ricardo León','989 321 755','Kits y sistemas GNV'],['Autogas Andino','20601738549','Patricia Vega','945 182 690','Electrónica y regulación'],['Tecnogas S.A.C.','20495817326','Óscar Peña','978 560 143','Válvulas y filtros'],['Hidráulica Perú','20184957263','Sandra Ríos','956 837 412','Mangueras y conexiones'],['Metalúrgica Lima','20571839460','Miguel Soto','923 640 851','Estructuras y soportes']]
function Directory({type,query,notify}:{type:'Clientes'|'Proveedores',query:string,notify:(s:string)=>void}){
  const [rows,setRows]=useState<string[][]>(type==='Clientes'?clientData:supplierData)
  const [editing,setEditing]=useState<string[]|'new'|null>(null)
  const data=rows.filter(r=>r.join(' ').toLowerCase().includes(query.toLowerCase()))
  useEffect(()=>{if(isSupabaseConfigured)void loadCentralDirectory(type).then(setRows).catch(()=>undefined)},[type])
  const save=(row:string[])=>{setRows(editing==='new'?[...rows,row]:rows.map(item=>item[1]===row[1]?row:item));if(isSupabaseConfigured)void saveCentralDirectory(type,row).catch(error=>notify(`No se pudo guardar en Supabase: ${error.message}`));setEditing(null);notify(`${type.slice(0,-1)} guardado correctamente`)}
  return <><PageHeading eyebrow="DIRECTORIO" title={type} subtitle={type==='Clientes'?'Empresas y propietarios con unidades asociadas.':'Socios comerciales y productos suministrados.'} actions={<button className="btn primary" onClick={()=>setEditing('new')}><Plus size={18}/> Nuevo {type.slice(0,-1).toLowerCase()}</button>}/><section className="panel table-panel"><div className="table-toolbar"><div className="local-search"><Search size={17}/><input value={query} readOnly placeholder={`Buscar ${type.toLowerCase()}...`}/></div><button className="select-btn" onClick={()=>downloadCsv(`${type.toLowerCase()}-ferdel.csv`,['Razón social','RUC','Contacto','Teléfono',type==='Clientes'?'Unidades':'Suministro'],data)}><Download size={16}/> Exportar</button></div><div className="table-wrap"><table><thead><tr><th>RAZÓN SOCIAL</th><th>RUC</th><th>CONTACTO</th><th>TELÉFONO</th><th>{type==='Clientes'?'UNIDADES':'SUMINISTRO'}</th><th>ESTADO</th><th/></tr></thead><tbody>{data.map(r=><tr key={r[1]}><td><div className="company-cell"><div><Building2 size={18}/></div><strong>{r[0]}</strong></div></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td><span className="ref-chip">{r[4]}</span></td><td><span className="status normal">Activo</span></td><td><button className="icon-button" title="Editar" onClick={()=>setEditing(r)}><Pencil size={16}/></button></td></tr>)}</tbody></table></div><TableFooter count={data.length} label={type.toLowerCase()}/></section>{editing&&<DirectoryModal type={type} value={editing} onClose={()=>setEditing(null)} onSave={save}/>}</>
}

function Reports({notify}:{notify:(s:string)=>void}){const reports=[['Inventario actual','Existencias, valorización y niveles de stock',Boxes,'Actualizado ahora'],['Kardex de movimientos','Entradas y salidas por producto y periodo',Activity,'248 movimientos'],['Materiales por bus','Consumos asociados a cada orden de trabajo',Wrench,'5 órdenes'],['Costos de conversión','Costos reales, ventas, ganancias y márgenes',CircleDollarSign,'Sep 2026'],['Historial de conversiones','Unidades finalizadas y trazabilidad completa',ClipboardList,'36 registros'],['Stock crítico y reposición','Productos bajo mínimo o sin existencias',AlertTriangle,'3 alertas']]
const exportSummary=()=>{downloadCsv('reporte-ejecutivo-ferdel.csv',['Reporte','Descripción','Resumen'],reports.map(([title,desc,,meta])=>[String(title),String(desc),String(meta)]));notify('Reporte ejecutivo descargado')}
return <><PageHeading eyebrow="ANÁLISIS" title="Centro de reportes" subtitle="Genera, filtra y exporta información para la toma de decisiones."/><div className="report-hero"><div><FileBarChart size={30}/><div><strong>Reporte ejecutivo mensual</strong><span>Resumen consolidado de operaciones · Septiembre 2026</span></div></div><button className="btn light" onClick={exportSummary}><Download size={17}/> Generar reporte</button></div><div className="report-grid">{reports.map(([title,desc,Icon,meta])=><article className="report-card" key={String(title)}><div className="report-icon"><Icon size={22}/></div><div><strong>{String(title)}</strong><p>{String(desc)}</p><span>{String(meta)}</span></div><button title="Descargar reporte" onClick={()=>{downloadCsv(`${String(title).toLowerCase().replaceAll(' ','-')}.csv`,['Reporte','Descripción','Resumen'],[[String(title),String(desc),String(meta)]]);notify(`${title} descargado`)}}><Download size={17}/></button></article>)}</div><section className="panel export-panel"><PanelHead title="Exportación rápida" subtitle="Selecciona el formato de salida"/><div><button onClick={exportSummary}><FileSpreadsheet size={24}/><span><strong>Microsoft Excel</strong><small>CSV compatible con Excel</small></span></button><button onClick={()=>{window.print();notify('Vista de impresión abierta')}}><FileText size={24}/><span><strong>Documento PDF</strong><small>Guardar desde la ventana de impresión</small></span></button></div></section></>}

function UsersPage({notify}:{notify:(s:string)=>void}){const users=[['Ana Torres','ana.torres@ferdel.pe','Administradora','AT'],['Marco Ruiz','marco.ruiz@ferdel.pe','Almacén','MR'],['Carlos Mendoza','carlos.mendoza@ferdel.pe','Operaciones','CM'],['Lucía Paredes','lucia.paredes@ferdel.pe','Gerencia','LP']];const openUsers=()=>window.open('https://supabase.com/dashboard/project/esezzaqdixjwvyvrvtbk/auth/users','_blank');return <><PageHeading eyebrow="SEGURIDAD" title="Usuarios y permisos" subtitle="Administra accesos, roles y actividad del sistema." actions={<button className="btn primary" onClick={openUsers}><Plus size={18}/> Nuevo usuario</button>}/><section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>USUARIO</th><th>CORREO</th><th>ROL</th><th>ÚLTIMO ACCESO</th><th>ESTADO</th><th/></tr></thead><tbody>{users.map((u,i)=><tr key={u[1]}><td><div className="person"><div>{u[3]}</div><strong>{u[0]}</strong></div></td><td>{u[1]}</td><td><span className="role-chip"><ShieldCheck size={14}/>{u[2]}</span></td><td>{i===0?'Ahora':`${i+1} h atrás`}</td><td><span className="status normal">Activo</span></td><td><button className="icon-button" title="Gestionar usuario en Supabase" onClick={()=>{openUsers();notify(`Abriendo gestión de ${u[0]}`)}}><ExternalLink size={16}/></button></td></tr>)}</tbody></table></div></section></>}

function PanelHead({title,subtitle,action}:{title:string,subtitle:string,action?:React.ReactNode}){return <div className="panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>}
function TableFooter({count,label}:{count:number,label:string}){return <div className="table-footer"><span>Mostrando <strong>{count}</strong> {label}</span><div><button disabled><ChevronLeft size={16}/></button><button className="current">1</button><button disabled><ChevronRight size={16}/></button></div></div>}
function StatusBadge({status}:{status:WorkOrder['status']}){return <span className={`status ${status.toLowerCase().replace(' ','-')}`}><i/>{status}</span>}
function StockBadge({status}:{status:StockStatus}){return <span className={`stock-badge ${status.toLowerCase().replaceAll(' ','-')}`}><i/>{status}</span>}
function CostLine({label,value,total,color}:{label:string,value:number,total:number,color:string}){const percentage=total?value/total*100:0;return <div className="cost-line"><div><span>{label}</span><strong>{money(value)}</strong></div><div className="cost-bar"><i style={{width:`${percentage}%`,background:color}}/></div><small>{Math.round(percentage)}% del costo total</small></div>}

function InfoPanel({type,products,appVersion,onClose,onMobile,onUpdates}:{type:'settings'|'help'|'notifications',products:Product[],appVersion:string,onClose:()=>void,onMobile:()=>void,onUpdates:()=>void}){
  if(type==='notifications'){
    const alerts=products.filter(product=>stockStatus(product)!=='Normal')
    return <Modal title="Centro de notificaciones" subtitle={`${alerts.length} alertas requieren revisión`} onClose={onClose}><div className="info-panel-list">{alerts.length?alerts.map(product=><div className="info-list-row" key={product.id}><div className="alert-symbol"><AlertTriangle size={17}/></div><div><strong>{product.name}</strong><small>{stockStatus(product)} · Stock actual: {product.stock} · Mínimo: {product.min}</small></div></div>):<div className="empty-state"><CheckCircle2 size={27}/><strong>Todo está en orden</strong><span>No tienes alertas pendientes.</span></div>}</div><div className="modal-actions info-actions"><button className="btn primary" onClick={onClose}>Entendido</button></div></Modal>
  }
  if(type==='help')return <Modal title="Ayuda rápida" subtitle="Guía de las acciones principales" onClose={onClose}><div className="help-grid"><div><Boxes/><strong>Inventario</strong><span>Crea productos, filtra existencias y exporta el listado.</span></div><div><ArrowDownLeft/><strong>Movimientos</strong><span>Registra entradas y salidas; el stock se actualiza automáticamente.</span></div><div><ClipboardList/><strong>Órdenes de trabajo</strong><span>Selecciona una tarjeta para editar estado, progreso y costos.</span></div><div><Smartphone/><strong>Acceso móvil</strong><span>Genera el QR para ingresar desde un celular.</span></div></div><div className="modal-actions info-actions"><button className="btn secondary" onClick={onMobile}><Smartphone size={16}/> Mostrar QR</button><button className="btn primary" onClick={onClose}>Cerrar</button></div></Modal>
  return <Modal title="Configuración del sistema" subtitle="Estado y acciones de la aplicación" onClose={onClose}><div className="settings-list"><div><span>Versión instalada</span><strong>v{appVersion}</strong></div><div><span>Base de datos</span><strong className="positive">Supabase conectado</strong></div><div><span>Acceso móvil</span><button className="link-btn" onClick={onMobile}>Mostrar código QR <ArrowRight size={15}/></button></div><div><span>Actualizaciones</span><button className="link-btn" onClick={onUpdates}>Buscar ahora <RefreshCw size={14}/></button></div></div><div className="modal-actions info-actions"><button className="btn primary" onClick={onClose}>Guardar y cerrar</button></div></Modal>
}

function MovementModal({type,products,onClose,onSave}:{type:'Entrada'|'Salida',products:Product[],onClose:()=>void,onSave:(data:{productId:number;quantity:number;unitCost:number;reference:string})=>void}){
  const [productId,setProductId]=useState(products[0]?.id??0)
  const product=products.find(item=>item.id===productId)
  const [quantity,setQuantity]=useState(1)
  const [unitCost,setUnitCost]=useState(product?.price??0)
  const [reference,setReference]=useState('')
  return <Modal title={`Registrar ${type.toLowerCase()}`} subtitle={type==='Entrada'?'Agrega existencias al almacén.':'Retira material y actualiza el stock.'} onClose={onClose}><form onSubmit={event=>{event.preventDefault();onSave({productId,quantity,unitCost,reference})}}><div className="form-grid"><label className="span-2"><span>Producto</span><select required value={productId} onChange={event=>{const id=Number(event.target.value);setProductId(id);setUnitCost(products.find(item=>item.id===id)?.price??0)}}>{products.map(item=><option key={item.id} value={item.id}>{item.code} · {item.name} (stock: {item.stock})</option>)}</select></label><label><span>Cantidad</span><input required min="0.001" step="0.001" type="number" value={quantity} onChange={event=>setQuantity(Number(event.target.value))}/></label><label><span>Costo unitario</span><input required min="0" step="0.01" type="number" value={unitCost} onChange={event=>setUnitCost(Number(event.target.value))}/></label><label className="span-2"><span>{type==='Entrada'?'Documento de referencia':'Orden de trabajo / motivo'}</span><input required value={reference} onChange={event=>setReference(event.target.value)} placeholder={type==='Entrada'?'Factura o guía de remisión':'OT-2026-000'}/></label>{product&&<div className="movement-preview span-2"><span>Stock después del movimiento</span><strong>{product.stock+(type==='Entrada'?quantity:-quantity)} {product.unit}</strong></div>}</div><div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className={type==='Entrada'?'btn success':'btn primary'}><Save size={17}/> Registrar {type.toLowerCase()}</button></div></form></Modal>
}

function DirectoryModal({type,value,onClose,onSave}:{type:'Clientes'|'Proveedores',value:string[]|'new',onClose:()=>void,onSave:(row:string[])=>void}){
  const [form,setForm]=useState<string[]>(value==='new'?['','','','','']:value)
  const labels=['Razón social','RUC','Contacto','Teléfono',type==='Clientes'?'Unidades asociadas':'Productos suministrados']
  return <Modal title={`${value==='new'?'Nuevo':'Editar'} ${type.slice(0,-1).toLowerCase()}`} subtitle="Completa la información del directorio" onClose={onClose}><form onSubmit={event=>{event.preventDefault();onSave(form)}}><div className="form-grid">{labels.map((label,index)=><label className={index===4?'span-2':''} key={label}><span>{label}</span><input required value={form[index]} onChange={event=>setForm(form.map((item,i)=>i===index?event.target.value:item))}/></label>)}</div><div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary"><Save size={17}/> Guardar</button></div></form></Modal>
}

function ProductModal({value,onClose,onSave}:{value:Product|'new',onClose:()=>void,onSave:(p:Product)=>void}){
 const empty:Product={id:0,code:'',name:'',category:'Kits de conversión',brand:'',unit:'Unidad',stock:0,min:1,max:10,price:0,location:'',supplier:''}; const [form,setForm]=useState(value==='new'?empty:value)
 const field=(key:keyof Product,label:string,type='text')=><label><span>{label}</span><input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:type==='number'?Number(e.target.value):e.target.value})}/></label>
 return <Modal title={value==='new'?'Registrar nuevo producto':'Editar producto'} subtitle="Información y configuración de existencias" onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSave(form)}}><div className="form-grid">{field('code','Código del producto')}{field('name','Nombre del producto')}<label><span>Categoría</span><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Kits de conversión</option><option>Sistema GNV</option><option>Inyección</option><option>Electrónica</option><option>Conexiones</option><option>Filtros</option></select></label>{field('brand','Marca')}{field('unit','Unidad de medida')}{field('location','Ubicación')}{field('stock','Stock actual','number')}{field('min','Stock mínimo','number')}{field('max','Stock máximo','number')}{field('price','Precio de compra','number')}<div className="span-2">{field('supplier','Proveedor')}</div></div><div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary"><Save size={17}/> Guardar producto</button></div></form></Modal>
}

function OrderModal({value,onClose,onSave}:{value:WorkOrder|'new',onClose:()=>void,onSave:(o:WorkOrder)=>void}){
 const next=`OT-2026-${String(seedOrders.length+1).padStart(3,'0')}`; const empty:WorkOrder={id:0,number:next,client:'',plate:'',bus:'',type:'Diésel a GNV',admission:'15 Sep 2026',delivery:'30 Sep 2026',manager:'',status:'Pendiente',progress:0,materialCost:0,laborCost:0,extraCost:0,salePrice:0};const [form,setForm]=useState(value==='new'?empty:value)
 const field=(key:keyof WorkOrder,label:string,type='text')=><label><span>{label}</span><input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:type==='number'?Number(e.target.value):e.target.value})}/></label>
 return <Modal title={value==='new'?'Nueva orden de trabajo':form.number} subtitle={value==='new'?'Registra el bus y los datos de la conversión':`${form.plate} · ${form.client}`} onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSave(form)}}><div className="form-grid">{field('number','Número de OT')}{field('plate','Placa')}{field('client','Cliente / empresa')} {field('bus','Marca, modelo y año')}{field('type','Tipo de conversión')}{field('manager','Responsable')} {field('admission','Fecha de ingreso')}{field('delivery','Entrega estimada')}<label><span>Estado</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value as WorkOrder['status']})}>{['Pendiente','En proceso','En espera','Finalizada','Entregada','Cancelada'].map(s=><option key={s}>{s}</option>)}</select></label>{field('progress','Progreso (%)','number')}<div className="form-divider span-2">Información financiera</div>{field('materialCost','Costo de materiales','number')}{field('laborCost','Mano de obra','number')}{field('extraCost','Servicios y adicionales','number')}{field('salePrice','Precio de venta','number')}</div><div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary"><Save size={17}/> Guardar orden</button></div></form></Modal>
}
function Modal({title,subtitle,onClose,children}:{title:string,subtitle:string,onClose:()=>void,children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose}><X size={20}/></button></div>{children}</div></div>}

export default App
