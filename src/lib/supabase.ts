import { createClient } from '@supabase/supabase-js'
import type { Movement, Product, WorkOrder } from '../types'
import { products as demoProducts, workOrders as demoOrders } from '../data'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && publishableKey && !url.includes('TU-PROYECTO'))

export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null

export type SystemUser = {
  id: string
  fullName: string
  email: string
  role: 'administrador' | 'almacen' | 'operaciones' | 'gerencia'
  active: boolean
  createdAt: string
}

type ProductRow = {
  id: number; code: string; name: string; description: string | null; category: string
  brand: string; unit: string; stock: number; min_stock: number; max_stock: number
  purchase_price: number; location: string; supplier_name: string
}

type OrderRow = {
  id: number; order_number: string; client_name: string; plate: string; vehicle: string
  conversion_type: string; admission_date: string; estimated_delivery: string
  manager_name: string; status: WorkOrder['status']; progress: number
  material_cost: number; labor_cost: number; extra_cost: number; sale_price: number
}

const toProduct = (row: ProductRow): Product => ({
  id: Number(row.id), code: row.code, name: row.name, category: row.category,
  brand: row.brand, unit: row.unit, stock: Number(row.stock), min: Number(row.min_stock),
  max: Number(row.max_stock), price: Number(row.purchase_price), location: row.location,
  supplier: row.supplier_name,
})

const productRow = (p: Product) => ({
  id: p.id, code: p.code, name: p.name, category: p.category, brand: p.brand,
  unit: p.unit, stock: p.stock, min_stock: p.min, max_stock: p.max,
  purchase_price: p.price, location: p.location, supplier_name: p.supplier,
})

const toOrder = (row: OrderRow): WorkOrder => ({
  id: Number(row.id), number: row.order_number, client: row.client_name, plate: row.plate,
  bus: row.vehicle, type: row.conversion_type, admission: row.admission_date,
  delivery: row.estimated_delivery, manager: row.manager_name, status: row.status,
  progress: Number(row.progress), materialCost: Number(row.material_cost),
  laborCost: Number(row.labor_cost), extraCost: Number(row.extra_cost), salePrice: Number(row.sale_price),
})

const orderRow = (o: WorkOrder) => ({
  id: o.id, order_number: o.number, client_name: o.client, plate: o.plate,
  vehicle: o.bus, conversion_type: o.type, admission_date: o.admission,
  estimated_delivery: o.delivery, manager_name: o.manager, status: o.status,
  progress: o.progress, material_cost: o.materialCost, labor_cost: o.laborCost,
  extra_cost: o.extraCost, sale_price: o.salePrice,
})

function requireClient() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

export async function loadCentralData() {
  const client = requireClient()
  const [productResult, orderResult] = await Promise.all([
    client.from('products').select('*').order('name'),
    client.from('work_orders').select('*').order('created_at', { ascending: false }),
  ])
  if (productResult.error) throw productResult.error
  if (orderResult.error) throw orderResult.error

  let products = (productResult.data as ProductRow[]).map(toProduct)
  let orders = (orderResult.data as OrderRow[]).map(toOrder)
  if (import.meta.env.VITE_SUPABASE_SEED_DEMO === 'true') {
    if (!products.length) {
      await client.from('products').upsert(demoProducts.map(productRow))
      products = demoProducts
    }
    if (!orders.length) {
      await client.from('work_orders').upsert(demoOrders.map(orderRow))
      orders = demoOrders
    }
  }
  return { products, orders }
}

export async function saveCentralProduct(product: Product) {
  const { error } = await requireClient().from('products').upsert(productRow(product))
  if (error) throw error
}

export async function removeCentralProduct(id: number) {
  const { error } = await requireClient().from('products').delete().eq('id', id)
  if (error) throw error
}

export async function saveCentralOrder(order: WorkOrder) {
  const { error } = await requireClient().from('work_orders').upsert(orderRow(order))
  if (error) throw error
}

export async function loadCentralMovements(): Promise<Movement[]> {
  const { data, error } = await requireClient().from('inventory_movements').select('id, movement_number, movement_type, quantity, unit_cost, reference, created_at, products(name)').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: Number(row.id), number: row.movement_number, type: row.movement_type,
    product: row.products?.name ?? 'Producto', quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost), reference: row.reference,
    date: new Date(row.created_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    user: 'Usuario del sistema',
  }))
}

export async function saveCentralMovement(movement: Movement, productId: number) {
  const { error } = await requireClient().from('inventory_movements').insert({
    movement_number: movement.number, movement_type: movement.type, product_id: productId,
    quantity: movement.quantity, unit_cost: movement.unitCost, reference: movement.reference,
  })
  if (error) throw error
}

export async function loadCentralDirectory(type: 'Clientes' | 'Proveedores'): Promise<string[][]> {
  const table = type === 'Clientes' ? 'clients' : 'suppliers'
  const detail = type === 'Clientes' ? 'associated_units' : 'supplied_products'
  const { data, error } = await requireClient().from(table).select(`business_name, tax_id, contact_name, phone, ${detail}`).order('business_name')
  if (error) throw error
  return (data ?? []).map((row: any) => [row.business_name, row.tax_id, row.contact_name, row.phone, row[detail]])
}

export async function saveCentralDirectory(type: 'Clientes' | 'Proveedores', row: string[]) {
  const table = type === 'Clientes' ? 'clients' : 'suppliers'
  const detail = type === 'Clientes' ? 'associated_units' : 'supplied_products'
  const { error } = await requireClient().from(table).upsert({ business_name: row[0], tax_id: row[1], contact_name: row[2], phone: row[3], [detail]: row[4] }, { onConflict: 'tax_id' })
  if (error) throw error
}

export async function loadCentralUsers(): Promise<SystemUser[]> {
  const client = requireClient()
  const result = await client.from('profiles').select('id, full_name, email, role, active, created_at').order('created_at')
  if (result.error) {
    // Compatibilidad mientras se aplica la columna email del esquema actualizado.
    const fallback = await client.from('profiles').select('id, full_name, role, active, created_at').order('created_at')
    if (fallback.error) throw fallback.error
    return (fallback.data ?? []).map((row: any) => ({
      id: row.id, fullName: row.full_name, email: '', role: row.role,
      active: row.active, createdAt: row.created_at,
    }))
  }
  return (result.data ?? []).map((row: any) => ({
    id: row.id, fullName: row.full_name, email: row.email ?? '', role: row.role,
    active: row.active, createdAt: row.created_at,
  }))
}

export async function loadCurrentProfile(): Promise<SystemUser | null> {
  const client = requireClient()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!authData.user) return null
  let { data, error } = await client.from('profiles').select('id, full_name, email, role, active, created_at').eq('id', authData.user.id).maybeSingle()
  if (error) {
    const fallback = await client.from('profiles').select('id, full_name, role, active, created_at').eq('id', authData.user.id).maybeSingle()
    if (fallback.error) throw fallback.error
    data = fallback.data ? { ...fallback.data, email: authData.user.email ?? '' } : null
    error = null
  }
  if (!data) return {
    id: authData.user.id,
    fullName: authData.user.user_metadata?.full_name ?? authData.user.email?.split('@')[0] ?? 'Usuario',
    email: authData.user.email ?? '',
    role: authData.user.user_metadata?.role ?? 'almacen',
    active: true,
    createdAt: authData.user.created_at,
  }
  return {
    id: data.id, fullName: data.full_name, email: data.email || authData.user.email || '',
    role: data.role, active: data.active, createdAt: data.created_at,
  }
}

export async function registerCentralUser(input: { fullName: string; email: string; password: string; role: SystemUser['role'] }): Promise<SystemUser> {
  if (!url || !publishableKey) throw new Error('El servidor central no está configurado')
  // Cliente aislado: crear otra cuenta no reemplaza la sesión del administrador actual.
  const registrationClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await registrationClient.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { full_name: input.fullName.trim(), role: input.role } },
  })
  if (error) throw error
  if (!data.user) throw new Error('El autenticador no devolvió el usuario creado')
  if (data.user.identities?.length === 0) throw new Error('Este correo ya se encuentra registrado')
  return {
    id: data.user.id,
    fullName: input.fullName.trim(),
    email: data.user.email ?? input.email.trim().toLowerCase(),
    role: input.role,
    active: true,
    createdAt: data.user.created_at,
  }
}

export async function updateCentralUser(id: string, input: { fullName: string; role: SystemUser['role']; active: boolean }) {
  const { error } = await requireClient().from('profiles').update({
    full_name: input.fullName.trim(), role: input.role, active: input.active,
  }).eq('id', id)
  if (error) throw error
}

export async function deleteCentralUser(id: string) {
  const { error } = await requireClient().rpc('delete_managed_user', { target_user_id: id })
  if (error) throw error
}

export async function signIn(email: string, password: string) {
  const result = await requireClient().auth.signInWithPassword({ email, password })
  if (result.error) throw result.error
  const profile = await requireClient().from('profiles').select('active').eq('id', result.data.user.id).maybeSingle()
  if (profile.data?.active === false) {
    await requireClient().auth.signOut()
    throw new Error('Esta cuenta se encuentra inactiva')
  }
  return result.data
}

export async function signOut() {
  const { error } = await requireClient().auth.signOut()
  if (error) throw error
}
