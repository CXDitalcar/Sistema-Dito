// Tareas críticas del negocio (Administración de Ventas). Fuente: paquete de Bruno Reveco, 26-10-2026.
export type AdmTarea = {
  codigo: string
  nombre: string
  aplicaA: "VN" | "VU" | "UNIDAD" | "AMBOS"
  criticidad: "CRITICA" | "ALTA"
  slaDiasHabiles: number
  descripcion: string
}

export const ADM_TAREAS: AdmTarea[] = [
  { codigo: "INGRESO_UNIDADES", nombre: "Ingreso de unidades", aplicaA: "UNIDAD", criticidad: "CRITICA", slaDiasHabiles: 1, descripcion: "Recepción de la unidad en stock con chasis, motor, OC y guía." },
  { codigo: "OC_BANSA_ACCESORIOS", nombre: "Emisión de OC Bansa accesorios", aplicaA: "VN", criticidad: "ALTA", slaDiasHabiles: 2, descripcion: "OC al proveedor Bansa por accesorios vendidos en la NV." },
  { codigo: "REVISION_FACTURACION", nombre: "Revisión y facturación de negocios", aplicaA: "AMBOS", criticidad: "CRITICA", slaDiasHabiles: 1, descripcion: "Validar NV (precio, bonos, crédito, retoma) y emitir factura." },
  { codigo: "FACTURACION_BONOS", nombre: "Facturación de bonos", aplicaA: "VN", criticidad: "CRITICA", slaDiasHabiles: 5, descripcion: "Facturar al importador los bonos y bonificaciones de las unidades vendidas." },
  { codigo: "VALIDACION_VPP", nombre: "Validación de VPP", aplicaA: "AMBOS", criticidad: "ALTA", slaDiasHabiles: 2, descripcion: "Validar vehículo en parte de pago: documentos, prendas, prepago." },
  { codigo: "SALDO_PRECIO", nombre: "Saldo de precio", aplicaA: "AMBOS", criticidad: "ALTA", slaDiasHabiles: 5, descripcion: "Controlar saldos pendientes del cliente o financiera." },
  { codigo: "LIBRO_COMPRAS_OC_IB", nombre: "Ingreso a libro de compras (OC-IB)", aplicaA: "UNIDAD", criticidad: "ALTA", slaDiasHabiles: 3, descripcion: "Ingresar factura de compra con su OC e IB." },
  { codigo: "PREPAGO_CIERRE", nombre: "Prepagos de negocio de cierre", aplicaA: "AMBOS", criticidad: "ALTA", slaDiasHabiles: 3, descripcion: "Pagar prepagos de créditos de retomas para liberar prendas." },
  { codigo: "HOMOLOGADO_PATENTES", nombre: "Gestión de homologado y patentes", aplicaA: "VN", criticidad: "CRITICA", slaDiasHabiles: 10, descripcion: "Homologación del modelo y primera inscripción (AGP/Ditalcar)." },
  { codigo: "CARGA_FACTURAS_AGP", nombre: "Carga de facturas en AGP", aplicaA: "VN", criticidad: "CRITICA", slaDiasHabiles: 1, descripcion: "Subir la factura a AGP para iniciar la inscripción." },
  { codigo: "TRANSFERENCIA_VU", nombre: "Transferencia de vehículo usado", aplicaA: "VU", criticidad: "CRITICA", slaDiasHabiles: 10, descripcion: "Autofact o contrato manual hasta TRANSFERIDO_ING_STEV." },
]

export const ADM_APLICA_LABEL: Record<AdmTarea["aplicaA"], string> = {
  VN: "Nuevos",
  VU: "Usados",
  UNIDAD: "Unidad en stock",
  AMBOS: "Nuevos y usados",
}
