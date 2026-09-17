export type StockStatus = 'Normal' | 'Stock bajo' | 'Crítico' | 'Sin stock' | 'Sobrestock'

export interface Product {
  id: number
  code: string
  name: string
  category: string
  brand: string
  unit: string
  stock: number
  min: number
  max: number
  price: number
  location: string
  supplier: string
}

export interface WorkOrder {
  id: number
  number: string
  client: string
  plate: string
  bus: string
  type: string
  admission: string
  delivery: string
  manager: string
  status: 'Pendiente' | 'En proceso' | 'En espera' | 'Finalizada' | 'Entregada' | 'Cancelada'
  progress: number
  materialCost: number
  laborCost: number
  extraCost: number
  salePrice: number
}

export interface Movement {
  id: number
  number: string
  date: string
  type: 'Entrada' | 'Salida'
  product: string
  quantity: number
  unitCost: number
  reference: string
  user: string
}
