import { Movement, Product, WorkOrder } from './types'

export const products: Product[] = [
  { id: 1, code: 'KIT-GNV-05', name: 'Kit GNV quinta generación', category: 'Kits de conversión', brand: 'Landi Renzo', unit: 'Kit', stock: 12, min: 5, max: 20, price: 4250, location: 'A-01-01', supplier: 'Gas Motors Perú' },
  { id: 2, code: 'REG-250', name: 'Regulador de presión 250 kW', category: 'Sistema GNV', brand: 'Tomasetto', unit: 'Unidad', stock: 3, min: 5, max: 15, price: 890, location: 'A-02-03', supplier: 'Autogas Andino' },
  { id: 3, code: 'INY-06', name: 'Riel de inyectores 6 cil.', category: 'Inyección', brand: 'AEB', unit: 'Unidad', stock: 0, min: 4, max: 12, price: 1180, location: 'B-01-02', supplier: 'Gas Motors Perú' },
  { id: 4, code: 'VAL-CIL-01', name: 'Válvula para cilindro GNV', category: 'Válvulas', brand: 'Emer', unit: 'Unidad', stock: 18, min: 8, max: 25, price: 235, location: 'B-03-01', supplier: 'Tecnogas S.A.C.' },
  { id: 5, code: 'MANG-12', name: 'Manguera alta presión 12 mm', category: 'Conexiones', brand: 'Parker', unit: 'Metro', stock: 86, min: 20, max: 70, price: 42.5, location: 'C-02-04', supplier: 'Hidráulica Perú' },
  { id: 6, code: 'ECU-GNV-08', name: 'ECU GNV 8 cilindros', category: 'Electrónica', brand: 'AEB', unit: 'Unidad', stock: 6, min: 3, max: 10, price: 1680, location: 'A-04-02', supplier: 'Autogas Andino' },
  { id: 7, code: 'FILT-01', name: 'Filtro fase gaseosa', category: 'Filtros', brand: 'Valtek', unit: 'Unidad', stock: 7, min: 8, max: 30, price: 65, location: 'C-01-01', supplier: 'Tecnogas S.A.C.' },
  { id: 8, code: 'SOP-CIL-02', name: 'Soporte reforzado de cilindro', category: 'Estructuras', brand: 'FERDEL', unit: 'Unidad', stock: 24, min: 10, max: 30, price: 315, location: 'D-01-01', supplier: 'Metalúrgica Lima' },
]

export const workOrders: WorkOrder[] = [
  { id: 1, number: 'OT-2026-001', client: 'Transporte San Martín S.A.', plate: 'ABC-123', bus: 'Mercedes-Benz OF-1721 · 2019', type: 'Diésel a GNV', admission: '03 Sep 2026', delivery: '18 Sep 2026', manager: 'Carlos Mendoza', status: 'En proceso', progress: 68, materialCost: 18450, laborCost: 4200, extraCost: 1850, salePrice: 34000 },
  { id: 2, number: 'OT-2026-002', client: 'Expreso Metropolitano', plate: 'BKR-582', bus: 'Volvo B270F · 2020', type: 'Diésel a GNV', admission: '06 Sep 2026', delivery: '22 Sep 2026', manager: 'José Salazar', status: 'En proceso', progress: 42, materialCost: 13280, laborCost: 2800, extraCost: 620, salePrice: 32500 },
  { id: 3, number: 'OT-2026-003', client: 'Turismo Pacífico E.I.R.L.', plate: 'C9X-411', bus: 'Scania K250 · 2018', type: 'Diésel a GNV', admission: '09 Sep 2026', delivery: '26 Sep 2026', manager: 'Luis Herrera', status: 'En espera', progress: 25, materialCost: 7200, laborCost: 1300, extraCost: 450, salePrice: 36000 },
  { id: 4, number: 'OT-2026-004', client: 'Transportes Unidos', plate: 'F8D-729', bus: 'Mercedes-Benz LO-916 · 2021', type: 'Diésel a GNV', admission: '12 Sep 2026', delivery: '29 Sep 2026', manager: 'Carlos Mendoza', status: 'Pendiente', progress: 5, materialCost: 2100, laborCost: 0, extraCost: 0, salePrice: 29500 },
  { id: 5, number: 'OT-2026-005', client: 'Rápido Norte S.A.C.', plate: 'AWG-806', bus: 'Volkswagen 17.230 · 2019', type: 'Diésel a GNV', admission: '20 Ago 2026', delivery: '08 Sep 2026', manager: 'José Salazar', status: 'Finalizada', progress: 100, materialCost: 17640, laborCost: 4800, extraCost: 2160, salePrice: 35000 },
]

export const movements: Movement[] = [
  { id: 1, number: 'MOV-00248', date: '15 Sep · 09:42', type: 'Salida', product: 'Kit GNV quinta generación', quantity: 1, unitCost: 4250, reference: 'OT-2026-002', user: 'Ana Torres' },
  { id: 2, number: 'MOV-00247', date: '15 Sep · 08:15', type: 'Entrada', product: 'Válvula para cilindro GNV', quantity: 12, unitCost: 235, reference: 'GR-00185', user: 'Marco Ruiz' },
  { id: 3, number: 'MOV-00246', date: '14 Sep · 16:30', type: 'Salida', product: 'Manguera alta presión 12 mm', quantity: 8, unitCost: 42.5, reference: 'OT-2026-001', user: 'Ana Torres' },
  { id: 4, number: 'MOV-00245', date: '14 Sep · 11:08', type: 'Salida', product: 'Filtro fase gaseosa', quantity: 2, unitCost: 65, reference: 'OT-2026-003', user: 'Marco Ruiz' },
  { id: 5, number: 'MOV-00244', date: '13 Sep · 15:22', type: 'Entrada', product: 'ECU GNV 8 cilindros', quantity: 4, unitCost: 1680, reference: 'FAC-F001-884', user: 'Ana Torres' },
]

export const usageData = [
  { name: 'Abr', entradas: 82, salidas: 62 }, { name: 'May', entradas: 68, salidas: 74 },
  { name: 'Jun', entradas: 95, salidas: 78 }, { name: 'Jul', entradas: 72, salidas: 84 },
  { name: 'Ago', entradas: 104, salidas: 91 }, { name: 'Sep', entradas: 88, salidas: 69 },
]

export const profitabilityData = [
  { name: 'OT-001', costo: 24500, venta: 34000 }, { name: 'OT-002', costo: 21800, venta: 32500 },
  { name: 'OT-003', costo: 26900, venta: 36000 }, { name: 'OT-004', costo: 20400, venta: 29500 },
  { name: 'OT-005', costo: 24600, venta: 35000 },
]
