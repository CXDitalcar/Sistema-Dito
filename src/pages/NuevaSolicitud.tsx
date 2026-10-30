import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  FlaskConical,
  Info,
  Layers3,
  Megaphone,
  Package,
  Paperclip,
  Store,
  Users,
} from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import "./NuevaSolicitud.css"
import {
  mockFormBreaches,
  mockFormExecutions,
  mockForms,
} from "../data/mockData"
import {
  createRequest,
  findActiveRequestByBreach,
  uploadRequestAttachment,
} from "../services/requestRepository"
import {
  getLocalOptions,
  getProcessAssignments,
  getProcessesForUser,
  getRequestFields,
  getSupplyCatalog,
  isDemoUser,
  isProcessRequestable,
} from "../services/requestCatalog"
import { initialRequestRouting, processSlaHours, processSlaLabel, requiresLocalReview } from "../services/workflow"
import { brandOptions, getModelCatalog, OTHER_MODEL_PREFIX, type ModelBrand } from "../services/catalogoApi"
import { FAMILY_ORDER } from "../data/requestCatalogV2"
import { resolveProcessSla, type SlaResolved } from "../services/slaApi"
import type {
  ProcessConfig,
  ProcessFieldDefinition,
  RequestFamily,
  RequestItem,
  RequestStatus,
  UserScope,
} from "../types"
import { hasExperienceAccess } from "../services/experienceAccess"

type FormValues = Record<string, string>

type RepeatRow = FormValues

const familyInfo: Record<
  RequestFamily,
  {
    label: string
    description: string
    icon: typeof Package
  }
> = {
  COLABORADORES: {
    label: "Colaboradores",
    description: "Credenciales y pie de firma. Uniformes y TI, en construcción.",
    icon: Users,
  },
  EXPERIENCIA: {
    label: "Experiencia del local",
    description: "Horarios, señalizaciones, organigrama, zonas de experiencia, mobiliario e instalaciones.",
    icon: Store,
  },
  COMERCIAL: {
    label: "Marketing",
    description: "Banderas, materiales y otras solicitudes de Marketing.",
    icon: Megaphone,
  },
  DOCUMENTACION: {
    label: "Documentación de unidades",
    description: "PAI / precio, patentes por modelo, eficiencia energética, seguridad opcional y fichas de producto.",
    icon: FileText,
  },
  UNIDADES: {
    label: "Unidades",
    description: "Versión de prueba: estas solicitudes no tienen validez y el flujo sigue por correo.",
    icon: Package,
  },
  INSUMOS_SHOWROOM: {
    label: "Insumos",
    description: "Versión de prueba: estas solicitudes no tienen validez y el flujo sigue por correo.",
    icon: Layers3,
  },
  OTROS: {
    label: "Otros",
    description: "Procesos en construcción.",
    icon: FileText,
  },
}

const BETA_NOTICE = "Estas solicitudes son de prueba y no tienen validez. El flujo oficial sigue siendo por correo."

export default function NuevaSolicitud({
  currentUser,
  processFilter,
}: {
  currentUser: UserScope
  // Interfaz "Gestión de Showroom": solo procesos de Experiencia.
  processFilter?: (code: string) => boolean
}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const processFromUrl = searchParams.get("process")
  const breachFromUrl = searchParams.get("breach")
  const originFormFromUrl = searchParams.get("originForm")
  const originExecutionFromUrl = searchParams.get("originExecution")
  const originLocalFromUrl = searchParams.get("originLocal")
  const originSectionFromUrl = searchParams.get("originSection")
  const originQuestionFromUrl = searchParams.get("originQuestion")
  const originDetailFromUrl = searchParams.get("originDetail")
  const returnTo = searchParams.get("returnTo")

  const [step, setStep] = useState(1)
  const [selectedFamily, setSelectedFamily] =
    useState<RequestFamily | null>(null)
  const [selectedProcess, setSelectedProcess] =
    useState<ProcessConfig | null>(null)
  const [values, setValues] = useState<FormValues>({})
  const [repeatRows, setRepeatRows] = useState<RepeatRow[]>([{}])
  const [attachments, setAttachments] = useState<File[]>([])
  const [createdId, setCreatedId] = useState("")
  const [createdStatus, setCreatedStatus] = useState<RequestStatus | null>(null)
  const [duplicateId, setDuplicateId] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [resolvedSla, setResolvedSla] = useState<SlaResolved | null>(null)
  const [modelCatalog, setModelCatalog] = useState<ModelBrand[]>([])

  useEffect(() => {
    let active = true
    getModelCatalog().then((value) => { if (active) setModelCatalog(value) })
    return () => { active = false }
  }, [])

  const sourceBreach = useMemo(() => {
    if (!breachFromUrl) return undefined
    const existing = mockFormBreaches.find((breach) => breach.id === breachFromUrl)
    if (existing) return existing
    if (!originExecutionFromUrl || !originFormFromUrl) return undefined
    return {
      id: breachFromUrl,
      executionId: originExecutionFromUrl,
      formCode: originFormFromUrl,
      local: originLocalFromUrl || currentUser.local || currentUser.localPrincipal || "",
      section: originSectionFromUrl || "Ruta de Experiencia",
      question: originQuestionFromUrl || "Hallazgo de Ruta de Experiencia",
      status: "NO_CUMPLE" as const,
      mappedProcessCode: processFromUrl || undefined,
    }
  }, [breachFromUrl, originExecutionFromUrl, originFormFromUrl, originLocalFromUrl, originSectionFromUrl, originQuestionFromUrl, processFromUrl, currentUser.local, currentUser.localPrincipal])

  const sourceExecution = useMemo(() => {
    if (!sourceBreach) return undefined
    const existing = mockFormExecutions.find((execution) => execution.id === sourceBreach.executionId)
    if (existing) return existing
    return {
      id: sourceBreach.executionId,
      formCode: sourceBreach.formCode,
      local: sourceBreach.local,
      completedByName: currentUser.name,
      completedByEmail: currentUser.email,
      completedAt: new Date().toISOString(),
      compliant: 0,
      nonCompliant: 1,
      requested: 0,
    }
  }, [sourceBreach, currentUser.name, currentUser.email])

  const sourceForm = useMemo(() => {
    if (!sourceExecution) return undefined
    const existing = mockForms.find((form) => form.code === sourceExecution.formCode)
    if (existing) return existing
    return {
      code: sourceExecution.formCode,
      name: sourceExecution.formCode === "FOR-AUD-RUTA-01" ? "Auditoría Ruta Experiencia" : "Ruta de Experiencia",
      description: "Hallazgo generado dentro de DITO.",
      url: "",
      frequency: "SEMANAL" as const,
      roles: [currentUser.role],
      stellantisOnly: false,
      active: true,
    }
  }, [sourceExecution, currentUser.role])

  const localConfig = useMemo(
    () => getLocalOptions(currentUser, sourceBreach?.local),
    [currentUser, sourceBreach?.local]
  )

  const [selectedLocal, setSelectedLocal] = useState(localConfig.selected)

  useEffect(() => {
    setSelectedLocal(localConfig.selected)
  }, [localConfig.selected])

  const availableProcesses = useMemo(
    () => getProcessesForUser(currentUser).filter((process) => !processFilter || processFilter(process.code)),
    [currentUser]
  )

  useEffect(() => {
    if (!processFromUrl) return

    const process = availableProcesses.find(
      (item) => item.code === processFromUrl && item.active && isProcessRequestable(item)
    )

    if (!process) return

    setSelectedFamily(process.family)
    setSelectedProcess(process)
    setStep(3)
  }, [processFromUrl, availableProcesses])

  useEffect(() => {
    let active = true
    if (!selectedProcess) {
      setResolvedSla(null)
      return () => { active = false }
    }
    resolveProcessSla(selectedProcess)
      .then((result) => { if (active) setResolvedSla(result) })
      .catch(() => { if (active) setResolvedSla(null) })
    return () => { active = false }
  }, [selectedProcess])

  useEffect(() => {
    let active = true

    async function checkDuplicate() {
      if (!sourceBreach) {
        setDuplicateId("")
        return
      }

      try {
        const existing = await findActiveRequestByBreach(
          currentUser,
          sourceBreach.id
        )
        if (active) setDuplicateId(existing?.id ?? "")
      } catch {
        if (active) setDuplicateId("")
      }
    }

    checkDuplicate()
    return () => {
      active = false
    }
  }, [sourceBreach, currentUser])

  const visibleFamilies = useMemo(() => {
    return FAMILY_ORDER.filter((family) =>
      availableProcesses.some((process) => process.family === family)
    )
  }, [availableProcesses])

  function familyState(family: RequestFamily) {
    const processes = availableProcesses.filter((process) => process.family === family)
    if (processes.every((process) => !isProcessRequestable(process))) return "CONSTRUCCION"
    if (processes.every((process) => process.availability === "BETA")) return "BETA"
    return "ACTIVO"
  }

  const familyProcesses = useMemo(() => {
    if (!selectedFamily) return []
    return availableProcesses.filter(
      (process) => process.family === selectedFamily
    )
  }, [availableProcesses, selectedFamily])

  const needsBossReview = Boolean(
    selectedProcess &&
      selectedProcess.availability !== "BETA" &&
      requiresLocalReview(currentUser, selectedProcess.code)
  )

  const allProcessFields = useMemo(() => {
    if (!selectedProcess) return []
    return getRequestFields(selectedProcess.code)
  }, [selectedProcess])

  const visibleFields = allProcessFields.filter(
    (field) => field.visibleBeforeSubmit !== false && !field.readOnly
  )
  const simpleFields = visibleFields.filter((field) => !field.repeatable)
  const repeatableFields = visibleFields.filter((field) => field.repeatable)

  useEffect(() => {
    if (!selectedProcess) return

    const initialValues: FormValues = {}
    if (originDetailFromUrl) {
      const detailField = allProcessFields.find((field) =>
        /detalle|descripci[oó]n|observaci[oó]n|motivo|solicitud/i.test(`${field.label} ${field.key || ""}`)
      )
      if (detailField) initialValues[detailField.id] = originDetailFromUrl
    }
    setValues(initialValues)
    setAttachments([])
    setError("")

    if (selectedProcess.formMode === "INSUMOS_2_0") {
      const stockField = allProcessFields.find(
        (field) => field.key === "STOCK_ACTUAL"
      )
      const itemField = allProcessFields.find(
        (field) => field.key === "INSUMO"
      )

      const sample = getSupplyCatalog()
        .filter((item) => item.family.toLowerCase().includes("cafe"))
        .slice(0, 6)

      if (stockField && itemField && sample.length) {
        setRepeatRows(
          sample.map((item) => ({
            [itemField.id]: item.code,
            [stockField.id]: "",
          }))
        )
      } else {
        setRepeatRows([{}])
      }
    } else {
      setRepeatRows([{}])
    }
  }, [selectedProcess, allProcessFields, originDetailFromUrl])

  function selectFamily(family: RequestFamily) {
    setSelectedFamily(family)
    setSelectedProcess(null)
    setStep(2)
  }

  function selectProcess(process: ProcessConfig) {
    setSelectedProcess(process)
    setStep(3)
  }

  function updateValue(fieldId: string, value: string) {
    setValues((current) => ({ ...current, [fieldId]: value }))
  }

  function updateRepeatValue(
    rowIndex: number,
    fieldId: string,
    value: string
  ) {
    setRepeatRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? { ...row, [fieldId]: value } : row
      )
    )
  }

  function addRepeatRow() {
    setRepeatRows((current) => [...current, {}])
  }

  function removeRepeatRow(index: number) {
    setRepeatRows((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index)
      return next.length ? next : [{}]
    })
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    setAttachments((current) => [...current, ...files])
    event.target.value = ""
  }

  function removeAttachment(index: number) {
    setAttachments((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    )
  }

  function validateField(field: ProcessFieldDefinition, value: string) {
    const trimmed = value.trim()

    if (field.required && !trimmed) {
      return `${field.label} es obligatorio.`
    }

    if (!trimmed) return ""

    if (field.type === "MODEL_SELECT" && value.startsWith(OTHER_MODEL_PREFIX) && !value.slice(OTHER_MODEL_PREFIX.length).trim()) {
      return `Escribe el modelo en "${field.label}".`
    }

    if (field.type === "PHONE") {
      const digits = trimmed.replace(/\D/g, "")
      if (digits.length < 8) {
        return `${field.label} debe contener un número de teléfono válido.`
      }
    }

    if (field.type === "EMAIL" && !/^\S+@\S+\.\S+$/.test(trimmed)) {
      return `${field.label} debe contener un correo válido.`
    }

    if (field.type === "VIN") {
      const vin = trimmed.replace(/\s/g, "")
      if (vin.length !== 17) {
        return `${field.label} debe tener 17 caracteres.`
      }
    }

    return ""
  }

  function validateForm() {
    if (!selectedLocal) return "Debes seleccionar un local."

    for (const field of simpleFields) {
      const message = validateField(field, values[field.id] ?? "")
      if (message) return message
    }

    if (repeatableFields.length) {
      const meaningfulRows = repeatRows.filter((row) =>
        repeatableFields.some((field) => (row[field.id] ?? "").trim())
      )

      if (!meaningfulRows.length) {
        return "Debes completar al menos una línea de detalle."
      }

      for (const row of meaningfulRows) {
        for (const field of repeatableFields) {
          // En Insumos 2.0 el insumo viene cargado por el sistema.
          const value = row[field.id] ?? ""
          const message = validateField(field, value)
          if (message) return message
        }
      }
    }

    if (selectedProcess?.requiresAttachment && attachments.length === 0) {
      return "Este proceso requiere al menos un adjunto."
    }

    return ""
  }

  function buildRequestFields() {
    const simple = simpleFields.map((field) => ({
      fieldId: field.id,
      requestedValue: values[field.id] ?? "",
    }))

    const repeated = repeatRows
      .filter((row) =>
        repeatableFields.some((field) => (row[field.id] ?? "").trim())
      )
      .flatMap((row, rowIndex) =>
        repeatableFields.map((field) => ({
          fieldId: `${field.id}__${rowIndex + 1}`,
          requestedValue: row[field.id] ?? "",
        }))
      )

    return [...simple, ...repeated]
  }

  async function submitRequest() {
    if (!selectedProcess || submitting) return

    if (duplicateId) {
      setError("Esta brecha ya tiene una solicitud activa.")
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError("")
    setWarnings([])

    try {
      const sla = resolvedSla ?? await resolveProcessSla(selectedProcess).catch(() => null)
      const routing = initialRequestRouting(
        currentUser,
        selectedProcess.code,
        selectedLocal,
        {
          reviewHours: sla?.review?.hours,
          acceptanceHours: sla?.acceptance?.hours,
        }
      )

      const routingApprovalStartedAt = "approvalSLAStartedAt" in routing ? routing.approvalSLAStartedAt : undefined
      const routingApprovalHours = "approvalSLAHours" in routing ? routing.approvalSLAHours : undefined
      const routingAcceptanceHours = "acceptanceSLAHours" in routing ? routing.acceptanceSLAHours : undefined

      const isBeta = selectedProcess.availability === "BETA"
      const builtFields = buildRequestFields()
      const amountValue = builtFields.find((field) => /MONTO/i.test(field.fieldId))?.requestedValue ?? ""
      const flow =
        selectedProcess.flow === "PROPUESTA" ||
        (selectedProcess.amountTriggersProposal && Number(amountValue) > 0)
          ? "PROPUESTA"
          : "ESTANDAR"
      const slaHours = flow === "PROPUESTA" ? 14 * 24 : processSlaHours(selectedProcess.code)
      const assignments = getProcessAssignments(selectedProcess.code).filter((item) => item.type !== "APPROVER")
      const audience = {
        roles: Array.from(new Set(assignments.filter((item) => !item.email && item.role).map((item) => item.role!))),
        emails: Array.from(new Set(assignments.filter((item) => item.email).map((item) => item.email!.toLowerCase()))),
      }
      const nowIso = new Date().toISOString()
      // Experiencia crea proyectos "con propuesta" por iniciativa propia: entra directo a la iteración.
      const experienceStartsProposal =
        flow === "PROPUESTA" && hasExperienceAccess(currentUser) && routing.status === "RECIBIDA"
      const proposalStart = experienceStartsProposal
        ? {
            status: "EN_GESTION" as const,
            managementAcceptedAt: nowIso,
            managementOwnerEmail: currentUser.email,
            managementOwnerName: currentUser.name,
            managementOwnerLabel: "Experiencia de Clientes",
            currentResponsibleEmail: currentUser.email,
            currentResponsibleName: currentUser.name,
            currentResponsibleLabel: "Experiencia de Clientes",
            resolutionSLAStartedAt: nowIso,
          }
        : {}

      const request: Omit<RequestItem, "id"> = {
        processCode: selectedProcess.code,
        processName: selectedProcess.name,
        family: selectedProcess.family,
        requesterEmail: currentUser.email,
        requesterName: currentUser.name,
        requesterRole: currentUser.role,
        local: selectedLocal,
        fields: builtFields,
        createdAt: nowIso,
        approvalSLAPausedMinutes: 0,
        resolutionSLAPausedMinutes: 0,
        reopened: false,
        autoClosed: false,
        originFormCode: sourceForm?.code,
        originExecutionId: sourceBreach?.executionId,
        originBreachId: sourceBreach?.id,
        internalCheckpoints:
          selectedProcess.code === "UNI-BON-01"
            ? [
                { checkpointId: "BON_SOLICITUD_MARCA", completed: false },
                { checkpointId: "BON_FACTURA_RECIBIDA", completed: false },
              ]
            : [],
        ...routing,
        approvalSLAHours: routingApprovalStartedAt
          ? (sla?.review?.hours ?? routingApprovalHours)
          : routingApprovalHours,
        acceptanceSLAHours: sla?.acceptance?.hours ?? routingAcceptanceHours,
        resolutionSLAHours: slaHours ?? sla?.resolution?.hours,
        slaFixedDays: flow === "PROPUESTA" ? 14 : selectedProcess.slaDays,
        slaDefault: flow === "PROPUESTA" ? false : selectedProcess.slaDefault,
        flow,
        proposal: flow === "PROPUESTA" ? { round: 0, stage: "EXPERIENCIA" } : undefined,
        audience,
        isTest: isBeta || undefined,
        ...proposalStart,
        confirmationSLAHours: sla?.confirmation?.hours ?? selectedProcess.confirmationHours,
        slaReviewCode: selectedProcess.slaReviewCode,
        slaAcceptanceCode: selectedProcess.slaAcceptanceCode,
        slaResolutionCode: selectedProcess.slaResolutionCode,
        slaConfirmationCode: selectedProcess.slaConfirmationCode,
        slaSource: sla?.source ?? "FALLBACK",
        slaListName: sla?.listName ?? undefined,
        slaCheckedAt: sla?.checkedAt,
      }

      const result = await createRequest(currentUser, request)
      const uploadWarnings: string[] = []
      if (attachments.length && !isDemoUser(currentUser)) {
        for (const file of attachments) {
          try {
            await uploadRequestAttachment(currentUser, result.request.id, file, "SOLICITUD")
          } catch (uploadError: any) {
            uploadWarnings.push(`No se pudo subir "${file.name}": ${uploadError?.message ?? "error"}. Puedes adjuntarlo desde el detalle.`)
          }
        }
      }
      if (breachFromUrl && originExecutionFromUrl) {
        localStorage.setItem(`ditalcar.route.request.${breachFromUrl}`, result.request.id)
      }
      setCreatedId(result.request.id)
      setCreatedStatus(result.request.status)
      setWarnings([...result.warnings, ...uploadWarnings])
      setStep(4)
    } catch (errorValue: any) {
      setError(
        errorValue?.message ??
          "No fue posible registrar la solicitud."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (createdId && selectedProcess) {
    return (
      <div className="new-request-page">
        <div className="request-success">
          <div className="request-success-icon">
            <CheckCircle2 size={34} />
          </div>
          <div className="eyebrow">SOLICITUD REGISTRADA</div>
          <h1>Solicitud ingresada</h1>
          <p>
            <strong>{selectedProcess.name}</strong> ya forma parte del
            seguimiento de solicitudes Ditalcar.
          </p>

          <div className="request-success-info">
            <div>
              <span>Solicitud</span>
              <strong>{createdId}</strong>
            </div>
            <div>
              <span>Local</span>
              <strong>{selectedLocal}</strong>
            </div>
            <div>
              <span>Estado inicial</span>
              <strong>{statusLabel(createdStatus)}</strong>
            </div>
            <div>
              <span>Fuente</span>
              <strong>{isDemoUser(currentUser) ? "Piloto Demo" : "Registro externo Azure"}</strong>
            </div>
          </div>

          {selectedProcess.formMode === "INSUMOS_2_0" && (
            <div className="request-review">
              <div className="request-review-head">
                <div>
                  <span>INSUMOS 2.0</span>
                  <h3>Stock registrado</h3>
                </div>
              </div>
              <p>
                El cálculo automático de cantidad a reponer queda separado de
                esta pantalla. El motor definitivo usará hasta 6 meses de datos
                disponibles de cotizaciones, ventas, stock y consumo histórico,
                sin mostrar el objetivo antes del envío.
              </p>
            </div>
          )}

          {warnings.length > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                border: "1px solid rgba(255,183,77,.28)",
                borderRadius: 10,
                background: "rgba(255,183,77,.07)",
                color: "#e9c77f",
                fontSize: 12,
              }}
            >
              <strong>Solicitud creada con observaciones de sincronización</strong>
              {warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          )}

          <div className="request-actions">
            {returnTo && (
              <button
                className="secondary-btn"
                onClick={() => navigate(returnTo)}
              >
                Volver a Ruta de Experiencia
              </button>
            )}
            <button
              className="secondary-btn"
              onClick={() => navigate("/solicitudes")}
            >
              Ver solicitudes
            </button>
            <button
              className="primary-btn"
              onClick={() => navigate(`/solicitudes/${createdId}`)}
            >
              Ver solicitud
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="new-request-page">
      <div className="page-head">
        <div className="eyebrow">SOLICITUDES</div>
        <h1>Nueva solicitud</h1>
        <p>
          El tipo de gestión define los campos, responsable, aprobaciones y
          seguimiento. El local se obtiene automáticamente desde el perfil.
        </p>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 18,
            padding: 14,
            border: "1px solid rgba(239,57,67,.35)",
            borderRadius: 10,
            color: "#ffadb2",
            background: "rgba(239,57,67,.07)",
          }}
        >
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {duplicateId && (
        <div className="request-review">
          <div className="request-review-head">
            <div>
              <span>SOLICITUD EXISTENTE</span>
              <h3>Esta brecha ya está siendo gestionada</h3>
            </div>
            <span className="status requested">Solicitado</span>
          </div>
          <div className="request-actions">
            <button
              className="primary-btn"
              onClick={() => navigate(`/solicitudes/${duplicateId}`)}
            >
              Ver solicitud {duplicateId}
            </button>
          </div>
        </div>
      )}

      <div className="request-stepper">
        <Step number={1} label="Familia" caption="¿Qué necesitas?" active={step >= 1} />
        <Step number={2} label="Proceso" caption="Tipo de gestión" active={step >= 2} />
        <Step number={3} label="Datos" caption="Completar solicitud" active={step >= 3} />
        <Step number={4} label="Enviar" caption="Revisión final" active={step >= 4} />
      </div>

      {step === 1 && (
        <section className="request-section">
          <div className="section-head">
            <div className="eyebrow">PASO 1</div>
            <h2>¿Qué necesitas solicitar?</h2>
          </div>
          <div className="request-family-grid">
            {visibleFamilies.map((family) => {
              const config = familyInfo[family]
              const Icon = config.icon
              const state = familyState(family)
              const development = state === "CONSTRUCCION"
              const beta = state === "BETA"
              return (
                <button
                  key={family}
                  className={`request-family-card ${development ? "in-development" : ""}`}
                  onClick={() => !development && selectFamily(family)}
                  disabled={development}
                  aria-disabled={development}
                >
                  <div className="request-family-icon">
                    <Icon size={25} />
                  </div>
                  <div>
                    <div className="request-family-title-row">
                      <h3>{config.label}</h3>
                      {development && <span className="request-development-badge">EN CONSTRUCCIÓN</span>}
                      {beta && <span className="request-development-badge beta">BETA · PRUEBA</span>}
                    </div>
                    <p>
                      {development
                        ? "Estas solicitudes se están preparando y todavía no están habilitadas."
                        : config.description}
                    </p>
                  </div>
                  {development ? (
                    <span className="request-development-label">En construcción</span>
                  ) : (
                    <ArrowRight className="family-arrow" size={20} />
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {step === 2 && selectedFamily && (
        <section className="request-section">
          <button className="back-btn" onClick={() => setStep(1)}>
            <ArrowLeft size={17} />
            Volver a familias
          </button>
          <div className="section-head">
            <div className="eyebrow">PASO 2</div>
            <h2>Selecciona la gestión</h2>
            <p>{familyInfo[selectedFamily].label}</p>
          </div>
          <div className="process-choice-list">
            {familyProcesses.map((process) => {
              const requestable = isProcessRequestable(process)
              return (
                <button
                  key={process.code}
                  className={`process-choice-card ${requestable ? "" : "in-development"}`}
                  onClick={() => requestable && selectProcess(process)}
                  disabled={!requestable}
                  aria-disabled={!requestable}
                >
                  <div>
                    <span className="process-code">
                      {process.code}
                      {process.availability === "BETA" && <span className="request-development-badge beta">BETA · PRUEBA</span>}
                      {!requestable && <span className="request-development-badge">EN CONSTRUCCIÓN</span>}
                    </span>
                    <h3>{process.name}</h3>
                    <p>{requestable ? process.description : "En construcción: todavía no se puede solicitar por la app."}</p>
                    {requestable && processSlaLabel(process.code) && (
                      <small className="process-sla">Plazo: {processSlaLabel(process.code)}</small>
                    )}
                  </div>
                  {requestable ? <ArrowRight size={20} /> : <span className="request-development-label">En construcción</span>}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {step === 3 && selectedProcess && (
        <section className="request-section">
          {!sourceBreach && (
            <button className="back-btn" onClick={() => setStep(2)}>
              <ArrowLeft size={17} />
              Volver a procesos
            </button>
          )}

          <div className="request-form-layout">
            <div className="request-form-main">
              <div className="section-head">
                <div className="eyebrow">PASO 3</div>
                <h2>{selectedProcess.name}</h2>
                <p>{selectedProcess.description}</p>
              </div>

              {selectedProcess.availability === "BETA" && (
                <div className="request-notice beta">
                  <FlaskConical size={18} />
                  <div><strong>Versión de prueba</strong><span>{BETA_NOTICE}</span></div>
                </div>
              )}
              {selectedProcess.formNotice && (
                <div className="request-notice">
                  <Info size={18} />
                  <div><span>{selectedProcess.formNotice}</span></div>
                </div>
              )}
              {needsBossReview && (
                <div className="request-notice">
                  <Info size={18} />
                  <div><span>Tu jefatura revisa esta solicitud antes de que llegue al área responsable.</span></div>
                </div>
              )}

              <div className="dynamic-form">
                <LocalField
                  localConfig={localConfig}
                  value={selectedLocal}
                  onChange={setSelectedLocal}
                />

                {simpleFields.map((field) => (
                  <DynamicField
                    key={field.id}
                    field={field}
                    value={values[field.id] ?? ""}
                    onChange={(value) => updateValue(field.id, value)}
                    localOptions={localConfig.options}
                    modelCatalog={modelCatalog}
                  />
                ))}
              </div>

              {repeatableFields.length > 0 && (
                <div className="request-review" style={{ marginTop: 18 }}>
                  <div className="request-review-head">
                    <div>
                      <span>DETALLE</span>
                      <h3>
                        {selectedProcess.formMode === "INSUMOS_2_0"
                          ? "Informa únicamente el stock actual"
                          : "Ítems de la solicitud"}
                      </h3>
                    </div>
                  </div>

                  {selectedProcess.formMode === "INSUMOS_2_0" && (
                    <p>
                      El objetivo de stock no se muestra antes de enviar. En el
                      demo se carga un subconjunto del catálogo; al conectar
                      Lists se filtrará automáticamente por local.
                    </p>
                  )}

                  {repeatRows.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="dynamic-form"
                      style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: "1px solid rgba(255,255,255,.08)",
                      }}
                    >
                      {repeatableFields.map((field) => (
                        <DynamicField
                          key={`${field.id}-${rowIndex}`}
                          field={field}
                          value={row[field.id] ?? ""}
                          onChange={(value) =>
                            updateRepeatValue(rowIndex, field.id, value)
                          }
                          localOptions={localConfig.options}
                          modelCatalog={modelCatalog}
                          forceReadOnly={
                            selectedProcess.formMode === "INSUMOS_2_0" &&
                            field.type === "CATALOG_ITEM"
                          }
                        />
                      ))}

                      {selectedProcess.formMode !== "INSUMOS_2_0" && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => removeRepeatRow(rowIndex)}
                        >
                          Quitar línea
                        </button>
                      )}
                    </div>
                  ))}

                  {selectedProcess.formMode !== "INSUMOS_2_0" && (
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ marginTop: 14 }}
                      onClick={addRepeatRow}
                    >
                      Agregar otro ítem
                    </button>
                  )}
                </div>
              )}

              {selectedProcess.allowsAttachments && (
                <div className="request-upload">
                  <div className="request-upload-head">
                    <Paperclip size={19} />
                    <div>
                      <strong>Adjuntos</strong>
                      <span>
                        {selectedProcess.requiresAttachment
                          ? "Este proceso requiere respaldo."
                          : "Puedes agregar evidencia o documentos de respaldo."}
                      </span>
                    </div>
                  </div>
                  <label className="secondary-btn">
                    Agregar archivo
                    <input type="file" multiple hidden onChange={handleFiles} />
                  </label>
                  {attachments.length > 0 && (
                    <div className="upload-file-list">
                      {attachments.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="upload-file"
                        >
                          <FileText size={16} />
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="request-process-summary">
              <div className="eyebrow">ANTES DE ENVIAR</div>
              <h3>{selectedProcess.name}</h3>
              <SummaryRow label="Solicitante" value={currentUser.name} />
              <SummaryRow label="Local" value={selectedLocal || "—"} />
              <SummaryRow
                label="Área responsable"
                value={selectedProcess.areaLabel ?? "Según configuración"}
              />
              <SummaryRow
                label="Confirmación"
                value={`${resolvedSla?.confirmation?.hours ?? selectedProcess.confirmationHours} h`}
              />
              {processSlaLabel(selectedProcess.code) ? (
                <SummaryRow label="Plazo de gestión" value={processSlaLabel(selectedProcess.code)!} />
              ) : resolvedSla?.resolution?.hours !== undefined && (
                <SummaryRow label="Plazo de resolución" value={`${resolvedSla.resolution.hours} h`} />
              )}
              {selectedProcess.availability === "BETA" && <SummaryRow label="Tipo" value="Prueba · sin validez" />}
              {hasExperienceAccess(currentUser) && (
                <SummaryRow
                  label="Fuente de SLA"
                  value={resolvedSla?.source === "SHAREPOINT_LIST" ? `LIST ${resolvedSla.listName || "SLA"}` : resolvedSla?.source === "CACHE" ? "Último SLA sincronizado" : "Respaldo temporal"}
                />
              )}
            </aside>
          </div>

          <div className="request-actions">
            {!sourceBreach && (
              <button className="secondary-btn" onClick={() => setStep(2)}>
                Atrás
              </button>
            )}
            <button
              className="primary-btn"
              disabled={Boolean(duplicateId)}
              onClick={() => {
                const message = validateForm()
                if (message) {
                  setError(message)
                  return
                }
                setError("")
                setStep(4)
              }}
            >
              Revisar solicitud
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}

      {step === 4 && selectedProcess && (
        <section className="request-section">
          <button className="back-btn" onClick={() => setStep(3)}>
            <ArrowLeft size={17} />
            Volver a editar
          </button>
          <div className="section-head">
            <div className="eyebrow">PASO 4</div>
            <h2>Revisa antes de enviar</h2>
          </div>

          <div className="request-review">
            <div className="request-review-head">
              <div>
                <span>{familyInfo[selectedProcess.family].label}</span>
                <h3>{selectedProcess.name}</h3>
              </div>
              <span className="status requested">Nueva solicitud</span>
            </div>

            <div className="request-review-grid">
              <ReviewValue label="Solicitante" value={currentUser.name} />
              <ReviewValue label="Local" value={selectedLocal} />
              {simpleFields.map((field) => (
                <ReviewValue
                  key={field.id}
                  label={field.label}
                  value={formatReviewValue(field, values[field.id])}
                />
              ))}
            </div>

            {repeatableFields.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {repeatRows
                  .filter((row) =>
                    repeatableFields.some(
                      (field) => (row[field.id] ?? "").trim() !== ""
                    )
                  )
                  .map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="request-review-grid"
                      style={{
                        paddingTop: 12,
                        marginTop: 12,
                        borderTop: "1px solid rgba(255,255,255,.08)",
                      }}
                    >
                      {repeatableFields.map((field) => (
                        <ReviewValue
                          key={`${field.id}-${rowIndex}`}
                          label={field.label}
                          value={formatReviewValue(field, row[field.id])}
                        />
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="request-actions">
            <button className="secondary-btn" onClick={() => setStep(3)}>
              Editar
            </button>
            <button
              className="primary-btn"
              onClick={submitRequest}
              disabled={submitting}
            >
              {submitting ? "Registrando..." : "Enviar solicitud"}
              {!submitting && <CheckCircle2 size={17} />}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function Step({
  number,
  label,
  caption,
  active,
}: {
  number: number
  label: string
  caption: string
  active: boolean
}) {
  return (
    <div className={`request-step ${active ? "active" : ""}`}>
      <span>{number}</span>
      <div>
        <strong>{label}</strong>
        <small>{caption}</small>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="request-summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function LocalField({
  localConfig,
  value,
  onChange,
}: {
  localConfig: ReturnType<typeof getLocalOptions>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="dynamic-field">
      <span>Local</span>
      {localConfig.mode === "LOCKED" ? (
        <input value={value} readOnly />
      ) : (
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Seleccionar local</option>
          {localConfig.options.map((local) => (
            <option key={local} value={local}>
              {local}
            </option>
          ))}
        </select>
      )}
      <small>
        {localConfig.mode === "LOCKED"
          ? "Asignado automáticamente desde el perfil."
          : "Solo aparecen locales dentro del alcance del perfil."}
      </small>
    </label>
  )
}

function DynamicField({
  field,
  value,
  onChange,
  localOptions,
  modelCatalog = [],
  forceReadOnly = false,
}: {
  field: ProcessFieldDefinition
  value: string
  onChange: (value: string) => void
  localOptions: string[]
  modelCatalog?: ModelBrand[]
  forceReadOnly?: boolean
}) {
  const catalog = getSupplyCatalog()

  if (field.type === "BRAND_SELECT") {
    return (
      <label className="dynamic-field">
        <FieldLabel field={field} />
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Seleccionar marca</option>
          {brandOptions(modelCatalog).map((brand) => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
        {field.help && <small>{field.help}</small>}
      </label>
    )
  }

  if (field.type === "MODEL_SELECT") {
    const isOther = value.startsWith(OTHER_MODEL_PREFIX)
    return (
      <label className="dynamic-field">
        <FieldLabel field={field} />
        <select
          value={isOther ? "__OTRO__" : value}
          onChange={(event) => onChange(event.target.value === "__OTRO__" ? OTHER_MODEL_PREFIX : event.target.value)}
        >
          <option value="">{modelCatalog.length ? "Seleccionar modelo" : "Aún no hay listas de precios cargadas · elige Otro"}</option>
          {modelCatalog.map((brand) => (
            <optgroup key={brand.marca} label={brand.marca}>
              {brand.modelos.map((model) => (
                <option key={`${brand.marca}-${model}`} value={`${brand.marca} · ${model}`}>{model}</option>
              ))}
            </optgroup>
          ))}
          <option value="__OTRO__">Otro (escribir)</option>
        </select>
        {isOther && (
          <input
            value={value.slice(OTHER_MODEL_PREFIX.length)}
            placeholder="Marca y modelo"
            onChange={(event) => onChange(OTHER_MODEL_PREFIX + event.target.value)}
            autoFocus
          />
        )}
        {field.help && <small>{field.help}</small>}
      </label>
    )
  }

  if (forceReadOnly && field.type === "CATALOG_ITEM") {
    const item = catalog.find((catalogItem) => catalogItem.code === value)
    return (
      <label className="dynamic-field">
        <span>{field.label}</span>
        <input value={item?.name ?? value} readOnly />
      </label>
    )
  }

  if (field.type === "TEXTAREA") {
    return (
      <label className="dynamic-field">
        <FieldLabel field={field} />
        <FieldExample field={field} />
        <textarea
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.help && <small>{field.help}</small>}
      </label>
    )
  }

  if (field.type === "SELECT") {
    return (
      <label className="dynamic-field">
        <FieldLabel field={field} />
        <FieldExample field={field} />
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Seleccionar</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {field.help && <small>{field.help}</small>}
      </label>
    )
  }

  if (field.type === "LOCAL_SELECT") {
    return (
      <label className="dynamic-field">
        <FieldLabel field={field} />
        <FieldExample field={field} />
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Seleccionar local</option>
          {localOptions.map((local) => (
            <option key={local} value={local}>
              {local}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (field.type === "CATALOG_ITEM") {
    return (
      <label className="dynamic-field">
        <FieldLabel field={field} />
        <FieldExample field={field} />
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Seleccionar insumo</option>
          {catalog.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name} · {item.unit}
            </option>
          ))}
        </select>
      </label>
    )
  }

  const inputType =
    field.type === "NUMBER" || field.type === "CURRENCY"
      ? "number"
      : field.type === "DATE"
        ? "date"
        : field.type === "EMAIL"
          ? "email"
          : field.type === "PHONE"
            ? "tel"
            : "text"

  return (
    <label className="dynamic-field">
      <FieldLabel field={field} />
      <FieldExample field={field} />
      <input
        type={inputType}
        value={value}
        readOnly={field.readOnly}
        placeholder={field.placeholder}
        onChange={(event) =>
          onChange(
            field.type === "VIN"
              ? event.target.value.toUpperCase()
              : event.target.value
          )
        }
      />
      {field.help && <small>{field.help}</small>}
    </label>
  )
}

function FieldExample({ field }: { field: ProcessFieldDefinition }) {
  if (!field.exampleImage) return null
  return (
    <figure className="field-example">
      <img src={field.exampleImage} alt={field.exampleCaption ?? `Ejemplo ${field.label}`} />
      {field.exampleCaption && <figcaption>{field.exampleCaption}</figcaption>}
    </figure>
  )
}

function FieldLabel({ field }: { field: ProcessFieldDefinition }) {
  return (
    <span>
      {field.label}
      {field.required ? " *" : ""}
    </span>
  )
}

function ReviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="request-review-field">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  )
}

function formatReviewValue(
  field: ProcessFieldDefinition,
  value?: string
) {
  if (!value) return "—"

  if (field.type === "CURRENCY") {
    const number = Number(value)
    if (!Number.isNaN(number)) {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }).format(number)
    }
  }

  if (field.type === "CATALOG_ITEM") {
    return getSupplyCatalog().find((item) => item.code === value)?.name ?? value
  }

  return value
}

function statusLabel(status: RequestStatus | null) {
  if (status === "PENDIENTE_APROBACION") return "Revisión / aprobación"
  if (status === "RECIBIDA") return "Ingresada"
  return status ? status.replaceAll("_", " ") : "Ingresada"
}
