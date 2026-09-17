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

export async function signIn(email: string, password: string) {
  const result = await requireClient().auth.signInWithPassword({ email, password })
  if (result.error) throw result.error
  return result.data
}

export async function signOut() {
  const { error } = await requireClient().auth.signOut()
  if (error) throw error
}
