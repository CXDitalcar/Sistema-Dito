import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  ImagePlus,
  PauseCircle,
  PlayCircle,
  Send,
  Info,
  MessageSquareText,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react"

import {
  useNavigate,
  useParams,
} from "react-router-dom"

import "./SolicitudDetalle.css"
import SignalLight, { signalFromRequest } from "../components/SignalLight"

import {
  getAllRequestAssignments,
  getFieldDefinition,
  getRequestProcess,
} from "../services/requestCatalog"

import {
  attachmentUrl,
  getRequestById,
  getRequestHistory,
  saveRequestTransition,
  uploadRequestAttachment,
} from "../services/requestRepository"
import { isImageFile } from "../services/fileUtils"

import {
  canApproveRequest,
  canConfirmResolution,
  canManageRequest,
  canViewRequest,
} from "../services/permissions"

import {
  actorLabel,
  responsibleLabel,
  stageLabel,
  visibleStatusLabel,
} from "../services/requestPresentation"

import {
  brandAgreesRouting,
  brandRequestsChangesRouting,
  budgetApprovalRouting,
  processSlaLabel,
  routeAfterApproval,
  sendProposalToBrandRouting,
  sendToCommercialRouting,
} from "../services/workflow"

import type {
  ProcessFieldDefinition,
  RequestAttachment,
  RequestFieldValue,
  RequestItem,
  RequestTimelineItem,
  RequestTimelineType,
  UserScope,
} from "../types"
import { hasExperienceAccess } from "../services/experienceAccess"


type DetailAction =
  | "INFO"
  | "REJECT"
  | "ADJUST"
  | "NOT_RESOLVED"
  | null


type AdjustmentValues =
  Record<string, string>


// ======================================================
// PÁGINA
// ======================================================

export default function SolicitudDetalle({
  currentUser,
}: {
  currentUser: UserScope
}) {
  const { requestId } =
    useParams<{ requestId: string }>()

  const navigate = useNavigate()
  const [request, setRequest] =
    useState<RequestItem | null | undefined>(undefined)
  const [loadError, setLoadError] =
    useState("")

  useEffect(() => {
    let active = true

    async function load() {
      if (!requestId) {
        setRequest(null)
        return
      }

      setLoadError("")
      try {
        const value = await getRequestById(currentUser, requestId)
        if (active) setRequest(value ?? null)
      } catch (errorValue: any) {
        if (active) {
          setLoadError(errorValue?.message ?? "No fue posible cargar la solicitud.")
          setRequest(null)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [requestId, currentUser.email, currentUser.role])

  if (request === undefined) {
    return (
      <div className="request-detail-page">
        <div className="request-detail-empty">
          <Clock3 size={30} />
          <h2>Cargando solicitud…</h2>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="request-detail-page">
        <button
          className="back-btn"
          onClick={() => navigate("/solicitudes")}
        >
          <ArrowLeft size={17} />
          Volver
        </button>

        <div className="request-detail-empty">
          <FileText size={32} />
          <h2>Solicitud no encontrada</h2>
          <p>{loadError || "No encontramos esta solicitud."}</p>
        </div>
      </div>
    )
  }

  return (
    <RequestDetailContent
      seed={request}
      currentUser={currentUser}
    />
  )
}


// ======================================================
// DETALLE
// ======================================================

function RequestDetailContent({
  seed,
  currentUser,
}: {
  seed: RequestItem
  currentUser: UserScope
}) {
  const navigate = useNavigate()
  const showSlaTerm = hasExperienceAccess(currentUser)

  const [request, setRequest] =
    useState<RequestItem>(seed)

  const [comment, setComment] =
    useState("")

  const [action, setAction] =
    useState<DetailAction>(null)

  const [adjustmentValues, setAdjustmentValues] =
    useState<AdjustmentValues>({})

  const [requestedToBrand, setRequestedToBrand] =
    useState(false)

  const [invoiceReceived, setInvoiceReceived] =
    useState(false)

  const [historyVersion, setHistoryVersion] =
    useState(0)

  const [history, setHistory] =
    useState<RequestTimelineItem[]>([])

  const [saving, setSaving] =
    useState(false)

  const [persistError, setPersistError] =
    useState("")

  const [persistWarnings, setPersistWarnings] =
    useState<string[]>([])

  const process = getRequestProcess(request.processCode)

  const canView = canViewRequest(
    currentUser,
    request,
    getAllRequestAssignments()
  )

  const canApprove = canApproveRequest(
    currentUser,
    request,
    getAllRequestAssignments()
  )

  const canManage = canManageRequest(
    currentUser,
    request,
    getAllRequestAssignments()
  )

  const canConfirm = canConfirmResolution(
    currentUser,
    request
  )

  useEffect(() => {
    let active = true

    getRequestHistory(currentUser, request.id)
      .then((items) => {
        if (active) setHistory(items)
      })
      .catch(() => {
        if (active) setHistory([])
      })

    return () => {
      active = false
    }
  }, [request.id, historyVersion, currentUser.email])

  const fields = useMemo(
    () =>
      request.fields.map(
        (field) => {
          const definition =
            getFieldDefinition(
              field.fieldId,
              request.processCode
            )

          return {
            ...field,
            label:
              definition?.label ??
              field.fieldId,
            type:
              definition?.type,
            isAmount:
              definition?.isAmount,
          }
        }
      ),
    [request.fields]
  )

  // Solo campos monetarios pueden cambiarse durante
  // "Aprobar con ajuste".
  const currencyAdjustmentFields = useMemo(
    () =>
      request.fields
        .map((field) => {
          const definition =
            getFieldDefinition(
              field.fieldId,
              request.processCode
            )

          if (
            !definition ||
            definition.type !== "CURRENCY"
          ) {
            return undefined
          }

          return {
            field,
            definition,
          }
        })
        .filter(
          (
            item
          ): item is {
            field: RequestFieldValue
            definition: ProcessFieldDefinition
          } => Boolean(item)
        ),
    [request.fields]
  )


  // ====================================================
  // PERSISTENCIA DEMO / SHAREPOINT + HISTORIAL
  // ====================================================

  async function persist(
    patch: Partial<RequestItem>,
    type: RequestTimelineType,
    title: string,
    detail?: string,
    attachmentIds?: string[]
  ) {
    if (saving) return

    const next: RequestItem = {
      ...request,
      ...patch,
    }

    setSaving(true)
    setPersistError("")
    setPersistWarnings([])

    try {
      const result = await saveRequestTransition(
        currentUser,
        request,
        next,
        type,
        title,
        detail,
        attachmentIds
      )

      setRequest(result.request)
      setPersistWarnings(result.warnings)
      setHistoryVersion((value) => value + 1)
    } catch (errorValue: any) {
      setPersistError(
        errorValue?.message ??
          "No fue posible guardar el cambio de la solicitud."
      )
    } finally {
      setSaving(false)
    }
  }


  // ====================================================
  // APROBAR
  // ====================================================

  function approve() {
    const localReview =
      request.approvalContext ===
      "JEFATURA_LOCAL"

    const commercialProposal =
      request.approvalContext === "PRESUPUESTO_COMERCIAL" && request.flow === "PROPUESTA"

    persist(
      {
        ...routeAfterApproval(request),
        ...(commercialProposal
          ? { proposal: { ...(request.proposal ?? { round: 1 }), stage: "EJECUCION" as const } }
          : {}),
      },
      "APPROVED",
      localReview
        ? "Revisión aprobada"
        : commercialProposal
          ? "Aprobada por Gerencia Comercial"
          : "Solicitud aprobada",
      commercialProposal ? "Comienza la ejecución." : "La solicitud avanzó al siguiente paso."
    )

    setAction(null)
    setComment("")
    setAdjustmentValues({})
  }


  // ====================================================
  // APROBAR CON AJUSTE
  // - comentario obligatorio
  // - solo montos
  // - conserva solicitado y aprobado
  // ====================================================

  function approveWithAdjustment() {
    if (!comment.trim()) {
      return
    }

    if (
      currencyAdjustmentFields.length === 0
    ) {
      return
    }

    let hasRealAdjustment = false

    const nextFields = request.fields.map(
      (field) => {
        const definition =
          getFieldDefinition(
            field.fieldId,
            request.processCode
          )

        if (
          !process?.allowsAmountAdjustment ||
          !definition ||
          (definition.type !== "CURRENCY" && !definition.isAmount)
        ) {
          return field
        }

        const nextApproved =
          adjustmentValues[field.fieldId] ??
          field.approvedValue ??
          field.requestedValue

        if (
          normalizeAmount(nextApproved) !==
          normalizeAmount(field.requestedValue)
        ) {
          hasRealAdjustment = true
        }

        return {
          ...field,
          approvedValue:
            nextApproved,
        }
      }
    )

    if (!hasRealAdjustment) {
      return
    }

    const amountTrace =
      currencyAdjustmentFields
        .map(({ field, definition }) => {
          const previousApproved =
            field.approvedValue

          const nextApproved =
            adjustmentValues[field.fieldId] ??
            previousApproved ??
            field.requestedValue

          const previousPart =
            previousApproved &&
            normalizeAmount(previousApproved) !==
              normalizeAmount(field.requestedValue)
              ? ` · Aprobado anterior: ${formatCurrency(previousApproved)}`
              : ""

          return (
            `${definition.label}: ` +
            `Solicitado ${formatCurrency(field.requestedValue)}` +
            previousPart +
            ` · Aprobado ${formatCurrency(nextApproved)}`
          )
        })
        .join(" | ")

    persist(
      {
        ...routeAfterApproval(request),
        fields: nextFields,
      },
      "APPROVED_WITH_ADJUSTMENT",
      "Aprobada con ajuste",
      `${amountTrace} | Comentario: ${comment.trim()}`
    )

    setAction(null)
    setComment("")
    setAdjustmentValues({})
  }


  // ====================================================
  // RECHAZAR
  // ====================================================

  function reject() {
    if (!comment.trim()) {
      return
    }

    persist(
      {
        status: "RECHAZADA",
      },
      "REJECTED",
      "Solicitud rechazada",
      comment.trim()
    )

    setComment("")
    setAction(null)
  }


  // ====================================================
  // PEDIR INFORMACIÓN
  // ====================================================

  function requestInfo() {
    if (!comment.trim()) {
      return
    }

    persist(
      {
        status:
          "INFORMACION_REQUERIDA",
        returnStatusAfterInfo:
          request.status,
        returnResponsibleEmail:
          request.currentResponsibleEmail,
        returnResponsibleName:
          request.currentResponsibleName,
        returnResponsibleLabel:
          request.currentResponsibleLabel,
        approvalSLAPausedAt:
          request.status ===
          "PENDIENTE_APROBACION"
            ? new Date().toISOString()
            : request.approvalSLAPausedAt,
        resolutionSLAPausedAt:
          request.status ===
          "EN_GESTION"
            ? new Date().toISOString()
            : request.resolutionSLAPausedAt,
        slaPausedReason:
          "Falta información",
        currentResponsibleEmail:
          request.requesterEmail,
        currentResponsibleName:
          request.requesterName,
        currentResponsibleLabel:
          "Solicitante",
      },
      "INFORMATION_REQUESTED",
      "Información solicitada",
      comment.trim()
    )

    setComment("")
    setAction(null)
  }


  // ====================================================
  // ENTREGAR INFORMACIÓN
  // ====================================================

  function provideInformation() {
    if (!comment.trim()) {
      return
    }

    const approvalPaused =
      request.approvalSLAPausedAt
        ? Math.max(
            0,
            Math.round(
              (
                Date.now() -
                new Date(
                  request.approvalSLAPausedAt
                ).getTime()
              ) /
                60000
            )
          )
        : 0

    const resolutionPaused =
      request.resolutionSLAPausedAt
        ? Math.max(
            0,
            Math.round(
              (
                Date.now() -
                new Date(
                  request.resolutionSLAPausedAt
                ).getTime()
              ) /
                60000
            )
          )
        : 0

    persist(
      {
        status:
          request.returnStatusAfterInfo ??
          "RECIBIDA",
        currentResponsibleEmail:
          request.returnResponsibleEmail,
        currentResponsibleName:
          request.returnResponsibleName,
        currentResponsibleLabel:
          request.returnResponsibleLabel,
        approvalSLAPausedAt:
          undefined,
        approvalSLAPausedMinutes:
          request.approvalSLAPausedMinutes +
          approvalPaused,
        resolutionSLAPausedAt:
          undefined,
        resolutionSLAPausedMinutes:
          (
            request.resolutionSLAPausedMinutes ??
            0
          ) + resolutionPaused,
        slaPausedReason:
          undefined,
        returnStatusAfterInfo:
          undefined,
        returnResponsibleEmail:
          undefined,
        returnResponsibleName:
          undefined,
        returnResponsibleLabel:
          undefined,
      },
      "INFORMATION_PROVIDED",
      "Información entregada",
      comment.trim()
    )

    setComment("")
  }


  // ====================================================
  // TOMAR SOLICITUD
  // Aquí nace el gestor individual real.
  // ====================================================

  function takeRequest() {
    persist(
      {
        status:
          "EN_GESTION",
        managementAcceptedAt:
          new Date().toISOString(),
        managementOwnerEmail:
          currentUser.email,
        managementOwnerName:
          currentUser.name,
        managementOwnerLabel:
          request.currentResponsibleLabel,
        currentResponsibleEmail:
          currentUser.email,
        currentResponsibleName:
          currentUser.name,
        resolutionSLAStartedAt:
          request.resolutionSLAStartedAt ??
          new Date().toISOString(),
      },
      "MANAGEMENT",
      "Solicitud tomada",
      "Comienza la gestión del área responsable."
    )
  }


  // ====================================================
  // SOLICITAR APROBACIÓN ADICIONAL
  // ====================================================

  function requestBudget() {
    persist(
      budgetApprovalRouting(request),
      "BUDGET_REQUESTED",
      "Aprobación solicitada",
      "La gestión queda en pausa mientras se revisa la aprobación."
    )
  }


  // ====================================================
  // ADJUNTOS (fotos, propuestas, evidencia de cierre)
  // ====================================================

  async function uploadFiles(files: File[], stage: string) {
    const ids: string[] = []
    let latest: RequestItem | null = null
    for (const file of files) {
      const result = await uploadRequestAttachment(currentUser, request.id, file, stage)
      ids.push(result.attachment.id)
      latest = result.request
    }
    if (latest) setRequest(latest)
    return ids
  }

  async function withFiles(
    files: File[],
    stage: string,
    run: (ids: string[]) => Promise<void> | void
  ) {
    setPersistError("")
    try {
      setSaving(true)
      const ids = files.length ? await uploadFiles(files, stage) : []
      setSaving(false)
      await run(ids)
    } catch (errorValue: any) {
      setSaving(false)
      setPersistError(errorValue?.message ?? "No fue posible subir el archivo.")
    }
  }

  async function addEvidence(note: string, files: File[]) {
    await withFiles(files, "SEGUIMIENTO", (ids) =>
      persist({}, "COMMENT", files.length ? "Adjunto agregado" : "Comentario", note.trim() || undefined, ids)
    )
  }


  // ====================================================
  // FLUJO CON PROPUESTA
  // ====================================================

  async function sendProposal(note: string, files: File[]) {
    await withFiles(files, "PROPUESTA", (ids) =>
      persist(
        sendProposalToBrandRouting(request),
        "MANAGEMENT",
        `Propuesta enviada a Gerencia de Marca (vuelta ${(request.proposal?.round ?? 0) + 1})`,
        note.trim() || undefined,
        ids
      )
    )
  }

  async function brandAgrees(note: string, files: File[]) {
    await withFiles(files, "PROPUESTA", (ids) =>
      persist(brandAgreesRouting(request), "APPROVED", "Gerencia de Marca de acuerdo con la propuesta", note.trim() || undefined, ids)
    )
  }

  async function brandRequestsChanges(note: string, files: File[]) {
    await withFiles(files, "PROPUESTA", (ids) =>
      persist(brandRequestsChangesRouting(request), "COMMENT", "Gerencia de Marca pide cambios", note.trim(), ids)
    )
  }

  function sendToCommercial() {
    persist(
      sendToCommercialRouting(request),
      "BUDGET_REQUESTED",
      "Enviada a Gerencia Comercial",
      "Hay acuerdo entre Experiencia y Gerencia de Marca. El plazo queda en pausa mientras Gerencia Comercial revisa."
    )
  }


  // ====================================================
  // EN ESPERA DE APROBACIÓN (PAI): pausa sin indicar quién aprueba
  // ====================================================

  function toggleWaitingApproval() {
    if (request.waitingApproval) {
      const paused = request.resolutionSLAPausedAt
        ? Math.max(0, Math.round((Date.now() - new Date(request.resolutionSLAPausedAt).getTime()) / 60000))
        : 0
      persist(
        {
          waitingApproval: false,
          resolutionSLAPausedAt: undefined,
          resolutionSLAPausedMinutes: (request.resolutionSLAPausedMinutes ?? 0) + paused,
          slaPausedReason: undefined,
        },
        "MANAGEMENT",
        "Gestión reanudada",
        "La aprobación llegó; el plazo vuelve a correr."
      )
      return
    }
    persist(
      {
        waitingApproval: true,
        resolutionSLAPausedAt: new Date().toISOString(),
        slaPausedReason: "En espera de aprobación",
      },
      "MANAGEMENT",
      "En espera de aprobación",
      "El plazo queda en pausa hasta que llegue la aprobación."
    )
  }


  // ====================================================
  // MARCAR RESUELTA
  // ====================================================

  function resolve() {
    persist(
      {
        status:
          "RESUELTA_POR_CONFIRMAR",
        resolutionConfirmationDeadline:
          new Date(
            Date.now() +
            (request.confirmationSLAHours ?? 48) * 3600000
          ).toISOString(),
        slaPausedReason:
          undefined,
        resolutionSLAPausedAt:
          undefined,
        currentResponsibleEmail:
          request.requesterEmail,
        currentResponsibleName:
          request.requesterName,
        currentResponsibleLabel:
          "Solicitante / Jefatura de Sucursal",
      },
      "RESOLUTION_REPORTED",
      "Marcada como resuelta",
      "Queda pendiente de confirmación."
    )
  }


  // ====================================================
  // CONFIRMAR
  // ====================================================

  async function confirmResolution(note = "", files: File[] = []) {
    const mode = process?.closeMode ?? "CONFIRMAR"
    if (mode === "FOTO" && !files.length) {
      setPersistError("Para cerrar, sube una foto de cómo quedó la implementación.")
      return
    }
    await withFiles(files, "CIERRE", (ids) =>
      persist(
        { status: "RESUELTA" },
        "RESOLUTION_CONFIRMED",
        mode === "INSTALADA" ? "Instalada" : mode === "FOTO" ? "Implementación confirmada con foto" : "Resolución confirmada",
        note.trim() || "La solicitud quedó cerrada.",
        ids
      )
    )
  }


  // ====================================================
  // NO RESUELTO
  // ====================================================

  function reopen() {
    if (!comment.trim()) {
      return
    }

    persist(
      {
        status: "EN_GESTION",
        reopened: true,
        currentResponsibleEmail:
          request.managementOwnerEmail ??
          request.currentResponsibleEmail,
        currentResponsibleName:
          request.managementOwnerName ??
          request.currentResponsibleName,
        currentResponsibleLabel:
          request.managementOwnerLabel ??
          request.currentResponsibleLabel,
      },
      "NOT_RESOLVED",
      "No resuelto",
      comment.trim()
    )

    setComment("")
    setAction(null)
  }


  // ====================================================
  // SIN ACCESO
  // ====================================================

  if (!canView) {
    return (
      <div className="request-detail-page">
        <button
          className="back-btn"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={17} />
          Volver
        </button>

        <div className="request-detail-empty">
          <ShieldCheck size={34} />
          <h2>Esta solicitud no está a tu cargo</h2>
          <p>
            No tienes acciones pendientes en ella. Si necesitas
            información, consulta con quien la ingresó o con Experiencia de Clientes.
          </p>
        </div>
      </div>
    )
  }


  const showBonification =
    request.processCode ===
      "UNI-BON-01" &&
    currentUser.role ===
      "JEFATURA_OPERACIONES_COMERCIALES"

  const isInformationRecipient =
    request.status ===
      "INFORMACION_REQUERIDA" &&
    (
      request.requesterEmail ===
        currentUser.email ||
      (
        currentUser.role ===
          "JEFATURA_LOCAL" &&
        currentUser.local ===
          request.local
      )
    )

  const canShowAdjustment =
    canApprove &&
    currencyAdjustmentFields.length > 0

  const adjustmentIsValid =
    Boolean(comment.trim()) &&
    currencyAdjustmentFields.some(
      ({ field }) => {
        const effective =
          adjustmentValues[field.fieldId] ??
          field.approvedValue ??
          field.requestedValue

        return (
          effective.trim() !== "" &&
          normalizeAmount(effective) !==
            normalizeAmount(field.requestedValue)
        )
      }
    )


  return (
    <div className="request-detail-page">
      <button
        className="back-btn"
        onClick={() =>
          navigate("/aprobaciones")
        }
      >
        <ArrowLeft size={17} />
        Volver a gestión
      </button>


      {/* ==================================================
          CABECERA
      ================================================== */}

      <div className="request-detail-header">
        <div>
          <div className="eyebrow request-id-row">
            {request.id}
            {request.isTest && <span className="pilot-test-tag">PRUEBA</span>}
          </div>

          <h1>{request.processName}</h1>

          <div className="request-detail-meta">
            <span>
              <UserRound size={14} />
              {request.requesterName}
            </span>

            <span>{request.local}</span>
          </div>
        </div>

        <StatusBadge request={request} />
      </div>


      {/* ==================================================
          RESUMEN
      ================================================== */}

      <div className="request-detail-summary">
        <Summary
          label="Solicitante"
          value={request.requesterName}
        />

        <Summary
          label="Local"
          value={request.local}
        />

        <Summary
          label="Responsable actual"
          value={
            responsibleLabel(
              currentUser,
              request
            )
          }
        />

        <Summary
          label={showSlaTerm ? "SLA" : "Plazo"}
          value={
            request.slaPausedReason
              ? "En pausa"
              : request.slaFixedDays
                ? `${request.slaFixedDays} días${request.flow === "PROPUESTA" ? "" : " hábiles"}${request.slaDefault ? " (por defecto)" : ""}`
                : processSlaLabel(request.processCode) ?? "A tiempo"
          }
          icon={Clock3}
        />
      </div>

      <div className="request-user-action">
        <SignalLight tone={signalFromRequest(request)} />
        <div>
          <span>TU ACCIÓN</span>
          <strong>{userActionLabel(currentUser, request, canApprove, canManage, canConfirm)}</strong>
          <small>{userActionDetail(currentUser, request, canApprove, canManage, canConfirm)}</small>
        </div>
      </div>

      {request.isTest && (
        <div className="pilot-flow-alert pilot-test-alert">
          <Info size={17} />
          <div>
            <strong>Solicitud de prueba (Beta)</strong>
            <span>Estas solicitudes son de prueba y no tienen validez. El flujo oficial sigue siendo por correo.</span>
          </div>
        </div>
      )}

      {request.slaPausedReason && (
        <div className="pilot-flow-alert">
          <Clock3 size={17} />
          <div>
            <strong>{showSlaTerm ? "SLA en pausa" : "Plazo en pausa"}</strong>
            <span>
              {request.slaPausedReason}
            </span>
          </div>
        </div>
      )}

      {persistError && (
        <div className="pilot-flow-alert">
          <Info size={17} />
          <div>
            <strong>No se pudo guardar el cambio</strong>
            <span>{persistError}</span>
          </div>
        </div>
      )}

      {persistWarnings.length > 0 && (
        <div className="pilot-flow-alert">
          <Info size={17} />
          <div>
            <strong>Cambio guardado con observaciones</strong>
            <span>{persistWarnings.join(" · ")}</span>
          </div>
        </div>
      )}

      <div className="request-detail-layout">
        <div className="request-detail-main">

          {/* ==============================================
              ANTECEDENTES
          ============================================== */}

          <section className="request-detail-card">
            <div className="request-detail-card-head">
              <div>
                <span className="eyebrow">
                  SOLICITUD
                </span>
                <h2>Antecedentes</h2>
              </div>
            </div>

            <div className="request-data-grid">
              {fields.map((field) => (
                <div
                  key={field.fieldId}
                  className="request-data-field"
                >
                  <span>{field.label}</span>

                  <strong>
                    {formatValue(
                      field.requestedValue,
                      field.type
                    )}
                  </strong>

                  {field.approvedValue &&
                    (field.type === "CURRENCY" || field.isAmount) && (
                    <small>
                      Monto aprobado: {" "}
                      {formatCurrency(
                        field.approvedValue
                      )}
                    </small>
                  )}
                </div>
              ))}
            </div>
          </section>


          {/* ==============================================
              ORIGEN
          ============================================== */}

          {(
            request.originFormCode ||
            request.originBreachId
          ) && (
            <section className="request-detail-card">
              <div className="request-detail-card-head">
                <div>
                  <span className="eyebrow">
                    ORIGEN
                  </span>
                  <h2>
                    Formulario relacionado
                  </h2>
                </div>
                <FileText size={18} />
              </div>

              <div className="request-data-grid">
                <div className="request-data-field">
                  <span>Formulario</span>
                  <strong>
                    {request.originFormCode ?? "—"}
                  </strong>
                </div>

                <div className="request-data-field">
                  <span>Ejecución</span>
                  <strong>
                    {request.originExecutionId ?? "—"}
                  </strong>
                </div>

                <div className="request-data-field">
                  <span>Brecha</span>
                  <strong>
                    {request.originBreachId ?? "—"}
                  </strong>
                </div>
              </div>
            </section>
          )}


          {/* ==============================================
              ADJUNTOS
          ============================================== */}

          <section className="request-detail-card">
            <div className="request-detail-card-head">
              <div>
                <span className="eyebrow">
                  RESPALDO
                </span>
                <h2>Adjuntos</h2>
              </div>
              <Paperclip size={18} />
            </div>

            <AttachmentList requestId={request.id} attachments={request.attachments ?? []} />

            {!request.isTest || hasExperienceAccess(currentUser) ? (
              <FileComposer
                label="Agregar adjunto o comentario"
                placeholder="Comentario (opcional)"
                button="Agregar"
                disabled={saving}
                requireSomething
                onSubmit={addEvidence}
              />
            ) : null}
          </section>


          {/* ==============================================
              CONTROL INTERNO BONIFICACIÓN
          ============================================== */}

          {showBonification && (
            <section className="request-detail-card private-control">
              <div className="request-detail-card-head">
                <div>
                  <span className="eyebrow">
                    CONTROL INTERNO
                  </span>
                  <h2>
                    Seguimiento de bonificación
                  </h2>
                </div>
                <ShieldCheck size={18} />
              </div>

              <p className="private-control-description">
                Visible para Jefatura
                Operaciones Comerciales.
              </p>

              <div className="private-check-list">
                <button
                  className={
                    requestedToBrand
                      ? "private-check checked"
                      : "private-check"
                  }
                  onClick={() =>
                    setRequestedToBrand(
                      !requestedToBrand
                    )
                  }
                >
                  <span>
                    {requestedToBrand ? (
                      <Check size={16} />
                    ) : null}
                  </span>
                  <div>
                    <strong>
                      Solicitud realizada a marca
                    </strong>
                    <small>
                      Checkpoint interno
                    </small>
                  </div>
                </button>

                <button
                  className={
                    invoiceReceived
                      ? "private-check checked"
                      : "private-check"
                  }
                  onClick={() =>
                    setInvoiceReceived(
                      !invoiceReceived
                    )
                  }
                >
                  <span>
                    {invoiceReceived ? (
                      <Check size={16} />
                    ) : null}
                  </span>
                  <div>
                    <strong>
                      Factura recibida
                    </strong>
                    <small>
                      Checkpoint interno
                    </small>
                  </div>
                </button>
              </div>
            </section>
          )}


          {/* ==============================================
              HISTORIAL
          ============================================== */}

          <section className="request-detail-card">
            <div className="request-detail-card-head">
              <div>
                <span className="eyebrow">
                  SEGUIMIENTO
                </span>
                <h2>Historial</h2>
              </div>
            </div>

            <div className="request-history">
              {history.length === 0 && (
                <div className="request-no-files">
                  <Clock3 size={20} />
                  <div>
                    <strong>
                      Sin movimientos registrados todavía
                    </strong>
                    <span>
                      Las próximas acciones
                      quedarán guardadas aquí.
                    </span>
                  </div>
                </div>
              )}

              {history.map((entry) => {
                const parts =
                  entry.comment?.split(" · ") ??
                  []

                return (
                  <div
                    key={entry.id}
                    className="history-entry"
                  >
                    <div className="history-dot" />

                    <div className="history-content">
                      <div className="history-entry-head">
                        <strong>
                          {parts[0] ?? "Movimiento"}
                        </strong>
                        <span>
                          {new Date(
                            entry.createdAt
                          ).toLocaleString("es-CL")}
                        </span>
                      </div>

                      {parts[1] && (
                        <p>
                          {parts
                            .slice(1)
                            .join(" · ")}
                        </p>
                      )}

                      {entry.attachmentIds?.length ? (
                        <AttachmentList
                          requestId={request.id}
                          attachments={(request.attachments ?? []).filter((item) => entry.attachmentIds!.includes(item.id))}
                          compact
                        />
                      ) : null}

                      <small>
                        {actorLabel(
                          currentUser,
                          entry.authorEmail,
                          entry.authorName
                        )}
                      </small>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>


        {/* ==================================================
            PANEL DERECHO
        ================================================== */}

        <aside className="request-detail-side">
          <section className="request-side-card">
            <span className="eyebrow">
              SEGUIMIENTO
            </span>

            <h3>
              {process?.name ?? request.processName}
            </h3>

            <div className="request-side-row">
              <span>Estado</span>
              <strong>
                {stageLabel(request)}
              </strong>
            </div>

            <div className="request-side-row">
              <span>Responsable</span>
              <strong>
                {responsibleLabel(
                  currentUser,
                  request
                )}
              </strong>
            </div>

            {request.slaPausedReason && (
              <div className="request-side-row">
                <span>{showSlaTerm ? "SLA" : "Plazo"}</span>
                <strong>En pausa</strong>
              </div>
            )}
          </section>


          {/* ==============================================
              APROBACIÓN
          ============================================== */}

          {canApprove && request.approvalContext === "PROPUESTA_MARCA" && (
            <section className="request-side-card approval-actions-card">
              <span className="eyebrow">PROPUESTA · VUELTA {request.proposal?.round ?? 1}</span>
              <h3>Revisa la propuesta de Experiencia</h3>
              <p className="side-note">Mira las imágenes en el historial. Puedes dar tu acuerdo o pedir cambios, también con imágenes.</p>
              <FileComposer
                label="Comentario (opcional)"
                placeholder="Ej.: de acuerdo, avancemos."
                button="Dar acuerdo"
                disabled={saving}
                onSubmit={brandAgrees}
              />
              <FileComposer
                label="¿Qué cambios pides? *"
                placeholder="Describe los cambios"
                button="Pedir cambios"
                requireNote
                danger
                disabled={saving}
                onSubmit={brandRequestsChanges}
              />
            </section>
          )}

          {canApprove && request.approvalContext !== "PROPUESTA_MARCA" && (
            <section className="request-side-card approval-actions-card">
              <span className="eyebrow">
                ACCIÓN
              </span>

              <h3>
                {request.approvalContext ===
                "JEFATURA_LOCAL"
                  ? "Revisión local"
                  : "Por aprobar"}
              </h3>

              <button
                className="request-action approve"
                onClick={approve}
              >
                <CheckCircle2 size={17} />
                Aprobar
              </button>

              {canShowAdjustment && (
                <button
                  className="request-action adjust"
                  onClick={() => {
                    setAction(
                      action === "ADJUST"
                        ? null
                        : "ADJUST"
                    )
                    setComment("")
                  }}
                >
                  <CircleDollarSign size={17} />
                  Aprobar con ajuste
                </button>
              )}

              <button
                className="request-action information"
                onClick={() => {
                  setAction(
                    action === "INFO"
                      ? null
                      : "INFO"
                  )
                  setComment("")
                }}
              >
                <MessageSquareText size={17} />
                Pedir información
              </button>

              <button
                className="request-action reject"
                onClick={() => {
                  setAction(
                    action === "REJECT"
                      ? null
                      : "REJECT"
                  )
                  setComment("")
                }}
              >
                <X size={17} />
                Rechazar
              </button>


              {action === "ADJUST" && (
                <div className="action-form">
                  <div className="action-form-title">
                    Aprobar con ajuste
                  </div>

                  {currencyAdjustmentFields.map(
                    ({ field, definition }) => (
                      <label key={field.fieldId}>
                        <span>
                          {definition.label}
                        </span>

                        <small>
                          Solicitado: {" "}
                          {formatCurrency(
                            field.requestedValue
                          )}
                          {field.approvedValue
                            ? ` · Aprobado anterior: ${formatCurrency(
                                field.approvedValue
                              )}`
                            : ""}
                        </small>

                        <input
                          type="number"
                          min="0"
                          value={
                            adjustmentValues[
                              field.fieldId
                            ] ??
                            field.approvedValue ??
                            field.requestedValue
                          }
                          onChange={(event) =>
                            setAdjustmentValues(
                              (current) => ({
                                ...current,
                                [field.fieldId]:
                                  event.target.value,
                              })
                            )
                          }
                        />
                      </label>
                    )
                  )}

                  <label>
                    <span>
                      Comentario del ajuste *
                    </span>
                    <textarea
                      value={comment}
                      onChange={(event) =>
                        setComment(
                          event.target.value
                        )
                      }
                      placeholder="Explica el motivo del monto aprobado."
                    />
                  </label>

                  <button
                    className="primary-btn"
                    disabled={!adjustmentIsValid}
                    onClick={approveWithAdjustment}
                  >
                    Aprobar con ajuste
                  </button>

                  {!adjustmentIsValid && (
                    <small>
                      Debes cambiar al menos un monto
                      y agregar un comentario.
                    </small>
                  )}
                </div>
              )}


              {(action === "INFO" ||
                action === "REJECT") && (
                <CommentBox
                  value={comment}
                  onChange={setComment}
                  label={
                    action === "INFO"
                      ? "¿Qué información falta? *"
                      : "Motivo del rechazo *"
                  }
                  button={
                    action === "INFO"
                      ? "Pedir información"
                      : "Rechazar"
                  }
                  danger={
                    action === "REJECT"
                  }
                  onSubmit={
                    action === "INFO"
                      ? requestInfo
                      : reject
                  }
                />
              )}
            </section>
          )}


          {/* ==============================================
              INGRESADA
          ============================================== */}

          {canManage &&
            request.status === "RECIBIDA" && (
            <section className="request-side-card">
              <span className="eyebrow">
                INGRESADA
              </span>

              <h3>Tomar solicitud</h3>

              <p className="side-note">
                El área responsable tiene
                1 día hábil para iniciar
                la gestión.
              </p>

              <button
                className="request-action approve"
                onClick={takeRequest}
              >
                <CheckCircle2 size={17} />
                Tomar y comenzar
              </button>
            </section>
          )}


          {/* ==============================================
              EN GESTIÓN
          ============================================== */}

          {canManage &&
            request.status === "EN_GESTION" && (
            <section className="request-side-card">
              <span className="eyebrow">
                EN GESTIÓN
              </span>

              <h3>Acciones</h3>

              {request.flow === "PROPUESTA" && request.proposal?.stage !== "EJECUCION" && (
                <div className="proposal-box">
                  <p className="side-note">
                    {request.proposal?.stage === "ACUERDO"
                      ? "Hay acuerdo con la Gerencia de Marca. Envía la solicitud a Gerencia Comercial o ajusta la propuesta."
                      : request.proposal?.round
                        ? "La Gerencia de Marca pidió cambios. Sube una nueva propuesta."
                        : "Sube la propuesta (imágenes, referencias, presupuesto) para la Gerencia de Marca del local."}
                  </p>
                  {request.proposal?.stage === "ACUERDO" && (
                    <button className="request-action approve" onClick={sendToCommercial} disabled={saving}>
                      <Send size={17} />
                      Enviar a Gerencia Comercial
                    </button>
                  )}
                  <FileComposer
                    label={request.proposal?.stage === "ACUERDO" ? "Ajustar propuesta" : "Propuesta para Gerencia de Marca"}
                    placeholder="Describe la propuesta"
                    button="Enviar propuesta"
                    requireSomething
                    disabled={saving}
                    onSubmit={sendProposal}
                  />
                </div>
              )}

              {process?.allowsWaitingApproval && (
                <button className="request-action adjust" onClick={toggleWaitingApproval} disabled={saving}>
                  {request.waitingApproval ? <PlayCircle size={17} /> : <PauseCircle size={17} />}
                  {request.waitingApproval ? "Reanudar (aprobación recibida)" : "En espera de aprobación"}
                </button>
              )}

              <button
                className="request-action information"
                onClick={() => {
                  setAction(
                    action === "INFO"
                      ? null
                      : "INFO"
                  )
                  setComment("")
                }}
              >
                <MessageSquareText size={17} />
                Pedir información
              </button>

              {request.flow !== "PROPUESTA" && !process?.allowsWaitingApproval && (
                <button
                  className="request-action adjust"
                  onClick={requestBudget}
                >
                  <CircleDollarSign size={17} />
                  Solicitar aprobación
                </button>
              )}

              {(request.flow !== "PROPUESTA" || request.proposal?.stage === "EJECUCION") && (
                <button
                  className="request-action approve"
                  onClick={resolve}
                  disabled={Boolean(request.waitingApproval)}
                >
                  <CheckCircle2 size={17} />
                  {request.flow === "PROPUESTA" ? "Marcar implementada" : "Marcar resuelta"}
                </button>
              )}

              {action === "INFO" && (
                <CommentBox
                  value={comment}
                  onChange={setComment}
                  label="¿Qué información falta? *"
                  button="Pedir información"
                  onSubmit={requestInfo}
                />
              )}
            </section>
          )}


          {/* ==============================================
              FALTA INFORMACIÓN
          ============================================== */}

          {isInformationRecipient && (
            <section className="request-side-card">
              <span className="eyebrow">
                FALTA INFORMACIÓN
              </span>

              <h3>Responder</h3>

              <p className="side-note">
                {showSlaTerm ? "El SLA" : "El plazo"} está en pausa y continuará
                desde el punto anterior.
              </p>

              <CommentBox
                value={comment}
                onChange={setComment}
                label="Información / comentario *"
                button="Enviar información"
                onSubmit={provideInformation}
              />
            </section>
          )}


          {/* ==============================================
              POR CONFIRMAR
          ============================================== */}

          {request.status ===
            "RESUELTA_POR_CONFIRMAR" && (
            <section className="request-side-card confirmation-card">
              <Info size={19} />

              <div>
                <strong>Por confirmar</strong>
                <p>
                  {process?.closeMode === "FOTO"
                    ? "El local confirma subiendo una foto de cómo quedó la implementación."
                    : process?.closeMode === "INSTALADA"
                      ? "Quien lo pidió marca que quedó instalado."
                      : "Puede confirmar el solicitante o la Jefatura de Sucursal. El plazo es 48 h."}
                </p>
              </div>

              {canConfirm && (
                <>
                  {process?.closeMode === "FOTO" ? (
                    <FileComposer
                      label="Foto de la implementación *"
                      placeholder="Comentario (opcional)"
                      button="Confirmar con foto"
                      requireFiles
                      imagesOnly
                      disabled={saving}
                      onSubmit={(note, files) => confirmResolution(note, files)}
                    />
                  ) : (
                    <button
                      className="request-action approve"
                      onClick={() => void confirmResolution()}
                    >
                      <CheckCircle2 size={17} />
                      {process?.closeMode === "INSTALADA" ? "Marcar instalada" : "Confirmar resuelto"}
                    </button>
                  )}

                  <button
                    className="request-action reject"
                    onClick={() => {
                      setAction(
                        action === "NOT_RESOLVED"
                          ? null
                          : "NOT_RESOLVED"
                      )
                      setComment("")
                    }}
                  >
                    <RotateCcw size={17} />
                    No resuelto
                  </button>

                  {action === "NOT_RESOLVED" && (
                    <CommentBox
                      value={comment}
                      onChange={setComment}
                      label="¿Qué sigue sin resolverse? *"
                      button="Volver a gestión"
                      danger
                      onSubmit={reopen}
                    />
                  )}
                </>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}


// ======================================================
// COMENTARIO
// ======================================================

function CommentBox({
  value,
  onChange,
  label,
  button,
  onSubmit,
  danger = false,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  button: string
  onSubmit: () => void
  danger?: boolean
}) {
  return (
    <div className="action-form">
      <label>
        <span>{label}</span>
        <textarea
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      </label>

      <button
        className={
          danger
            ? "danger-btn"
            : "primary-btn"
        }
        disabled={!value.trim()}
        onClick={onSubmit}
      >
        {button}
      </button>
    </div>
  )
}


// ======================================================
// RESUMEN
// ======================================================

function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: typeof Clock3
}) {
  return (
    <div className="request-summary-item">
      {Icon && <Icon size={16} />}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}


// ======================================================
// ESTADO
// ======================================================

function StatusBadge({
  request,
}: {
  request: RequestItem
}) {
  return (
    <div className="request-detail-status-wrap">
      {request.reopened && (
        <span className="request-reopened">
          <RotateCcw size={11} />
          Reabierta
        </span>
      )}

      <span
        className={
          `request-detail-status status-${request.status.toLowerCase()}`
        }
      >
        {visibleStatusLabel(request)}
      </span>
    </div>
  )
}


// ======================================================
// FORMATO
// ======================================================

function normalizeAmount(value: string) {
  const numeric = Number(value)

  return Number.isFinite(numeric)
    ? String(numeric)
    : value.trim()
}


function formatCurrency(value: string) {
  const number = Number(value)

  if (Number.isNaN(number)) {
    return value || "—"
  }

  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }
  ).format(number)
}


function formatValue(
  value: string,
  type?: string
) {
  if (type === "CURRENCY") {
    return formatCurrency(value)
  }

  return value || "—"
}


function userActionLabel(
  user: UserScope,
  request: RequestItem,
  canApprove: boolean,
  canManage: boolean,
  canConfirm: boolean
) {
  if (request.status === "RECIBIDA" && canManage) return "Tomar solicitud"
  if (request.status === "PENDIENTE_APROBACION" && canApprove && request.approvalContext === "PROPUESTA_MARCA") return "Revisar propuesta"
  if (request.status === "PENDIENTE_APROBACION" && canApprove) return "Revisar y aprobar"
  if (request.status === "EN_GESTION" && canManage) return "Continuar gestión"
  if (request.status === "RESUELTA_POR_CONFIRMAR" && canConfirm) return "Confirmar si quedó resuelto"
  if (request.status === "INFORMACION_REQUERIDA") {
    if (request.currentResponsibleEmail?.toLowerCase() === user.email.toLowerCase()) {
      return "Completar información solicitada"
    }
    return "Esperar información"
  }
  if (request.status === "RESUELTA") return "Sin acción pendiente"
  if (request.status === "RECHAZADA") return "Sin acción pendiente"
  return "Solo seguimiento"
}

function userActionDetail(
  user: UserScope,
  request: RequestItem,
  canApprove: boolean,
  canManage: boolean,
  canConfirm: boolean
) {
  const action = userActionLabel(user, request, canApprove, canManage, canConfirm)
  if (action === "Solo seguimiento") return "Puedes revisar el avance y el historial, pero no tienes una acción requerida en este estado."
  if (action === "Sin acción pendiente") return "La solicitud no requiere una acción adicional de tu parte."
  if (action === "Esperar información") return "El plazo está detenido mientras la persona responsable completa los antecedentes."
  return "Esta actividad está disponible para tu perfil y requiere continuar el flujo."
}


// ======================================================
// ADJUNTOS
// ======================================================

function AttachmentList({
  requestId,
  attachments,
  compact = false,
}: {
  requestId: string
  attachments: RequestAttachment[]
  compact?: boolean
}) {
  if (!attachments.length) {
    if (compact) return null
    return (
      <div className="request-no-files">
        <FileText size={20} />
        <div>
          <strong>Sin adjuntos</strong>
          <span>Fotos, propuestas y documentos de la solicitud aparecerán aquí.</span>
        </div>
      </div>
    )
  }
  return (
    <div className={`request-attachments ${compact ? "compact" : ""}`}>
      {attachments.map((item) => {
        const url = attachmentUrl(requestId, item.id)
        return isImageFile(item) ? (
          <a key={item.id} href={url} target="_blank" rel="noreferrer" className="request-attachment image" title={item.fileName}>
            <img src={url} alt={item.fileName} loading="lazy" />
          </a>
        ) : (
          <a key={item.id} href={url} target="_blank" rel="noreferrer" className="request-attachment file">
            <FileText size={16} />
            <span>{item.fileName}</span>
          </a>
        )
      })}
    </div>
  )
}

function FileComposer({
  label,
  placeholder,
  button,
  onSubmit,
  disabled = false,
  requireFiles = false,
  requireNote = false,
  requireSomething = false,
  imagesOnly = false,
  danger = false,
}: {
  label: string
  placeholder?: string
  button: string
  onSubmit: (note: string, files: File[]) => Promise<void> | void
  disabled?: boolean
  requireFiles?: boolean
  requireNote?: boolean
  requireSomething?: boolean
  imagesOnly?: boolean
  danger?: boolean
}) {
  const [note, setNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const picker = useRef<HTMLInputElement>(null)
  const valid =
    (!requireFiles || files.length > 0) &&
    (!requireNote || note.trim().length > 0) &&
    (!requireSomething || files.length > 0 || note.trim().length > 0)

  return (
    <div className="action-form file-composer">
      <label>
        <span>{label}</span>
        <textarea value={note} placeholder={placeholder} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button type="button" className="request-action information file-composer-pick" onClick={() => picker.current?.click()}>
        <ImagePlus size={16} />
        {imagesOnly ? "Agregar foto" : "Agregar imagen o archivo"}
      </button>
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        accept={imagesOnly ? "image/*" : "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"}
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? [])
          setFiles((current) => [...current, ...picked])
          event.target.value = ""
        }}
      />
      {files.length > 0 && (
        <div className="upload-file-list">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="upload-file">
              <FileText size={14} />
              <span>{file.name}</span>
              <button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        className={danger ? "danger-btn" : "primary-btn"}
        disabled={disabled || !valid}
        onClick={async () => {
          await onSubmit(note, files)
          setNote("")
          setFiles([])
        }}
      >
        {button}
      </button>
    </div>
  )
}
