import AcademiaRecursos from "../components/AcademiaRecursos"
import {
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  GraduationCap,
  HeartHandshake,
  Layers3,
  Library,
  LockKeyhole,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  XCircle,
} from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import type { UserScope } from "../types"
import { academyQuestions, type AcademyQuestion } from "../data/academyQuestions"
import {
  academyCourses,
  academyEvaluations,
  academyLibraryResources,
  academyTeamProgress,
  academyUpdates,
  consultaDetailed,
  customerJourney,
  juniorJourney,
  juniorPlaybooks,
  salesPlaybooks,
  selloExperiencia,
  PILOT_VISIBLE_COURSE_IDS,
  PILOT_VISIBLE_EVALUATION_IDS,
  type AcademyAudience,
  type AcademyCourse,
  type AcademyEvaluation,
  type AcademyTab,
  type LibraryResource,
} from "../data/academiaData"
import {
  createQuestionSet,
  evaluationNeedsReinforcement,
  getAcademyObservations,
  getAcademyState,
  hasAcademyFeedback,
  getCompletedModules,
  getCourseProgress,
  getEvaluationAttempts,
  getEvaluationBestScore,
  getEvaluationLastScore,
  getEvaluationReinforcementIds,
  getUnseenUpdates,
  markAcademyUpdateSeen,
  markCourseModuleComplete,
  saveAcademyObservation,
  saveEvaluationAttempt,
  toggleAcademyFavorite,
  type ObservableValue,
} from "../services/academyStore"
import AcademyFeedbackPanel from "../components/AcademyFeedbackPanel"
import SignalLight, { signalFromPercent } from "../components/SignalLight"
import "./Academia.css"
import { hasExperienceAccess } from "../services/experienceAccess"

const CONSULTA_CODES = ["C", "O", "N", "S", "U", "L", "T", "A"]

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? ""
}

function getAudience(user: UserScope): AcademyAudience {
  if (hasExperienceAccess(user)) return "EXPERIENCIA"
  if (user.role === "GERENCIA_VENTAS") return "GERENCIA_VENTAS"
  if (
    user.role === "GERENCIA_MARCA" ||
    user.role === "JEFATURA_MARCA" ||
    user.role === "JEFATURA_ZONAL"
  ) {
    return "GERENCIA_MARCA"
  }
  if (user.role === "JEFATURA_LOCAL") return "JEFATURA"
  if (user.role === "VENDEDOR") return "VENTAS"
  if (user.role === "ASISTENTE_JUNIOR") return "JUNIOR"
  if (
    user.role === "ADMINISTRATIVO" &&
    ["junior", "operacion", "operación"].some((token) =>
      normalize(user.areaFunctional).includes(token)
    )
  ) {
    return "JUNIOR"
  }
  if (user.role === "ADMINISTRATIVO" && normalize(user.name).includes("junior")) {
    return "JUNIOR"
  }
  return "CASA_MATRIZ"
}

function audienceLabel(audience: AcademyAudience) {
  const labels: Record<AcademyAudience, string> = {
    VENTAS: "Equipo de Ventas",
    JEFATURA: "Jefatura de Sucursal",
    GERENCIA_MARCA: "Gerencia de Marca",
    GERENCIA_VENTAS: "Gerencia de Ventas",
    JUNIOR: "Junior / Operación",
    EXPERIENCIA: "Experiencia de Clientes",
    CASA_MATRIZ: "Casa Matriz",
  }
  return labels[audience]
}

function canAdminAcademy(user: UserScope) {
  return (
    hasExperienceAccess(user) ||
    (user.role === "EQUIPO_COMERCIAL" &&
      normalize(user.areaFunctional).includes("project"))
  )
}

function canObserveAcademy(user: UserScope) {
  return [
    "JEFATURA_LOCAL",
    "GERENCIA_MARCA",
    "JEFATURA_MARCA",
    "JEFATURA_ZONAL",
    "GERENCIA_VENTAS",
    "EXPERIENCIA_CLIENTES", "PROJECT_MANAGER",
  ].includes(user.role)
}

function canSeeAcademyTeam(user: UserScope) {
  return (
    user.role === "JEFATURA_LOCAL" ||
    user.role === "GERENCIA_MARCA" ||
    user.role === "JEFATURA_MARCA" ||
    user.role === "JEFATURA_ZONAL" ||
    user.role.startsWith("GERENCIA_") ||
    hasExperienceAccess(user)
  )
}

function canSeeAcademyNetwork(user: UserScope) {
  return (
    hasExperienceAccess(user) ||
    user.role.startsWith("GERENCIA_") ||
    user.role === "GERENCIA_MARCA" ||
    user.role === "JEFATURA_MARCA" ||
    user.role === "JEFATURA_ZONAL"
  )
}

function isContentVisible(status: string, admin: boolean) {
  return status !== "ARCHIVADO" && (admin || status !== "BORRADOR")
}

type ConsultaLens = "VENDEDOR" | "JEFATURA" | "GERENCIA" | "SENALES" | "MEDICION" | "PLAYBOOKS"
const CONSULTA_LENSES: { id: ConsultaLens; label: string }[] = [
  { id: "VENDEDOR", label: "Para el vendedor" },
  { id: "JEFATURA", label: "Para la jefatura" },
  { id: "GERENCIA", label: "Para la gerencia" },
  { id: "SENALES", label: "Se ve bien cuando" },
  { id: "MEDICION", label: "Cómo se mide" },
  { id: "PLAYBOOKS", label: "Playbooks" },
]

// Pestañas agrupadas (opción A, 15-10): Aprender y Consultar.
const TAB_GROUPS: { label: string; tabs: AcademyTab[] }[] = [
  { label: "Aprender", tabs: ["CURSOS", "EVALUACIONES"] },
  { label: "Consultar", tabs: ["MODELO", "PLAYBOOKS", "BIBLIOTECA"] },
]
const TAB_LABELS: Record<AcademyTab, string> = {
  MODELO: "Modelo",
  PLAYBOOKS: "Playbooks",
  CURSOS: "Cursos",
  EVALUACIONES: "Evaluaciones",
  BIBLIOTECA: "Biblioteca",
}

// embedded: dentro de la interfaz "Academia DITALCAR" (la portada propia reemplaza al encabezado y a "Tu ruta de hoy").
export default function Academia({ currentUser, embedded = false }: { currentUser: UserScope; embedded?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")?.toUpperCase() as AcademyTab | undefined
  const initialTab: AcademyTab = [
    "MODELO",
    "PLAYBOOKS",
    "CURSOS",
    "EVALUACIONES",
    "BIBLIOTECA",
  ].includes(requestedTab ?? "")
    ? (requestedTab as AcademyTab)
    : "MODELO"

  const [tab, setTab] = useState<AcademyTab>(initialTab)
  const [vehicleRoute, setVehicleRoute] = useState<"NUEVOS" | "USADOS">("NUEVOS")
  const [selectedConsulta, setSelectedConsulta] = useState("C")
  const [consultaLens, setConsultaLens] = useState<ConsultaLens>("VENDEDOR")
  const [selectedSello, setSelectedSello] = useState(selloExperiencia[0]?.title ?? "")
  const [selectedPlaybook, setSelectedPlaybook] = useState(salesPlaybooks[0]?.id ?? "")
  const [selectedJuniorPlaybook, setSelectedJuniorPlaybook] = useState(
    juniorPlaybooks[0]?.id ?? ""
  )
  // ?curso=ID abre directamente ese curso (por ejemplo, desde "Continuar" en la portada).
  const [selectedCourse, setSelectedCourse] = useState<string | null>(searchParams.get("curso"))
  const [courseSearch, setCourseSearch] = useState("")
  const [brandFilter, setBrandFilter] = useState("Todas")
  const [localFilter, setLocalFilter] = useState("Todos")
  const [librarySearch, setLibrarySearch] = useState("")
  const [libraryCategory, setLibraryCategory] = useState("TODAS")
  const [libraryBrand, setLibraryBrand] = useState("Todas")
  const [libraryRoute, setLibraryRoute] = useState("TODOS")
  const [storeVersion, setStoreVersion] = useState(0)
  const [assignedOverviewOpen, setAssignedOverviewOpen] = useState(true)
  const [optionalOverviewOpen, setOptionalOverviewOpen] = useState(false)

  const [quizEvaluation, setQuizEvaluation] = useState<AcademyEvaluation | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<AcademyQuestion[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizResultId, setQuizResultId] = useState<string | null>(null)

  const [observationOpen, setObservationOpen] = useState(false)
  const [observationTarget, setObservationTarget] = useState("")
  const [observationLocal, setObservationLocal] = useState(
    currentUser.local ?? currentUser.localPrincipal ?? ""
  )
  const [observationBrand, setObservationBrand] = useState(
    currentUser.brands?.[0] ?? ""
  )
  const [observationComment, setObservationComment] = useState("")
  const [observationValues, setObservationValues] = useState<
    Record<string, ObservableValue>
  >({})
  const [lastObservationScore, setLastObservationScore] = useState<number | null>(null)

  const audience = getAudience(currentUser)
  const admin = canAdminAcademy(currentUser)
  const canObserve = canObserveAcademy(currentUser)
  const canSeeTeam = canSeeAcademyTeam(currentUser)
  const canSeeNetwork = canSeeAcademyNetwork(currentUser)
  const salesModelAudience = [
    "VENTAS",
    "JEFATURA",
    "GERENCIA_MARCA",
    "GERENCIA_VENTAS",
    "EXPERIENCIA",
  ].includes(audience)
  const salesPlaybookAudience = audience !== "JUNIOR"

  const state = useMemo(() => getAcademyState(), [storeVersion])
  const unseenUpdates = useMemo(
    () =>
      getUnseenUpdates(
        academyUpdates.filter((item) => item.audiences.includes(audience))
      ),
    [audience, storeVersion]
  )

  const visibleCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase()
    return academyCourses.filter(
      (course) =>
        course.audience.includes(audience) &&
        isContentVisible(course.status, admin) &&
        (admin || PILOT_VISIBLE_COURSE_IDS.includes(course.id as (typeof PILOT_VISIBLE_COURSE_IDS)[number])) &&
        (!query ||
          `${course.title} ${course.description} ${course.modules
            .map((item) => item.title)
            .join(" ")}`
            .toLowerCase()
            .includes(query))
    )
  }, [audience, admin, courseSearch, storeVersion])

  // La Asistente de Gerencia no tiene cursos asignados: solo opcionales y recursos.
  const noAssignments = currentUser.role === "ASISTENTE_GERENCIA"
  const assignedCourses = noAssignments
    ? []
    : visibleCourses.filter((course) => course.assignedTo.includes(audience))
  const continuingCourses = assignedCourses.filter((course) => {
    const progress = getCourseProgress(course)
    return progress > 0 && progress < 100
  })
  const zeroAssignedCourses = assignedCourses.filter(
    (course) => getCourseProgress(course) === 0
  )
  const completedAssignedCourses = assignedCourses.filter(
    (course) =>
      getCourseProgress(course) >= 100 &&
      hasAcademyFeedback(course.id, currentUser.email)
  )
  const pendingAssignedCourses = assignedCourses.filter(
    (course) => !completedAssignedCourses.some((item) => item.id === course.id)
  )
  const optionalCourses = visibleCourses.filter(
    (course) => !course.assignedTo.includes(audience)
  )

  const visibleEvaluations = academyEvaluations.filter(
    (evaluation) =>
      evaluation.audience.includes(audience) &&
      (admin ||
        PILOT_VISIBLE_EVALUATION_IDS.includes(
          evaluation.id as (typeof PILOT_VISIBLE_EVALUATION_IDS)[number]
        ))
  )
  const pendingEvaluations = visibleEvaluations.filter((evaluation) => {
    if (noAssignments || !evaluation.assignedTo.includes(audience)) return false
    const attempts = getEvaluationAttempts(evaluation.id)
    return !attempts.some((attempt) => attempt.passed) && attempts.length < evaluation.attempts
  })

  const recommendedCourse = visibleCourses.find(
    (course) => !course.assignedTo.includes(audience) && getCourseProgress(course) === 0
  )

  const currentConsulta =
    consultaDetailed.find((item) => item.code === selectedConsulta) ?? consultaDetailed[0]
  const currentSello =
    selloExperiencia.find((item) => item.title === selectedSello) ?? selloExperiencia[0]
  const currentPlaybook =
    salesPlaybooks.find((item) => item.id === selectedPlaybook) ?? salesPlaybooks[0]
  const currentJuniorPlaybook =
    juniorPlaybooks.find((item) => item.id === selectedJuniorPlaybook) ??
    juniorPlaybooks[0]

  const visibleLibrary = useMemo(() => {
    const query = librarySearch.trim().toLowerCase()
    return academyLibraryResources.filter((resource) => {
      if (!resource.audiences.includes(audience) && !admin) return false
      if (!isContentVisible(resource.status, admin)) return false
      if (libraryCategory !== "TODAS" && resource.category !== libraryCategory) {
        return false
      }
      if (libraryBrand !== "Todas" && resource.brand !== libraryBrand) return false
      if (
        libraryRoute !== "TODOS" &&
        resource.route !== "AMBOS" &&
        resource.route !== libraryRoute
      ) {
        return false
      }
      if (!query) return true
      return `${resource.title} ${resource.description} ${resource.brand ?? ""} ${
        resource.model ?? ""
      } ${resource.documentType} ${resource.tags.join(" ")}`
        .toLowerCase()
        .includes(query)
    })
  }, [audience, admin, librarySearch, libraryCategory, libraryBrand, libraryRoute])

  const libraryBrands = Array.from(
    new Set(
      academyLibraryResources
        .map((resource) => resource.brand)
        .filter((value): value is string => Boolean(value))
    )
  ).sort()

  const teamRows = useMemo(() => {
    const allowedLocals = new Set(
      [
        currentUser.local,
        currentUser.localPrincipal,
        ...(currentUser.assignedLocals ?? []),
      ]
        .filter((value): value is string => Boolean(value))
        .map(normalize)
    )
    const allowedBrands = new Set((currentUser.brands ?? []).map(normalize))

    return academyTeamProgress.filter((row) => {
      if (currentUser.role === "JEFATURA_LOCAL" && allowedLocals.size) {
        if (!allowedLocals.has(normalize(row.local))) return false
      }
      if (audience === "GERENCIA_MARCA") {
        const localMatch = !allowedLocals.size || allowedLocals.has(normalize(row.local))
        const brandMatch = !allowedBrands.size || allowedBrands.has(normalize(row.brand))
        if (!localMatch && !brandMatch) return false
      }
      if (brandFilter !== "Todas" && row.brand !== brandFilter) return false
      if (localFilter !== "Todos" && row.local !== localFilter) return false
      return true
    })
  }, [currentUser, audience, brandFilter, localFilter])

  const dashboardBrands = Array.from(new Set(teamRows.map((row) => row.brand))).sort()
  const dashboardLocals = Array.from(new Set(teamRows.map((row) => row.local))).sort()

  // Pestañas sin contenido para este perfil no se muestran.
  const tabHasContent: Record<AcademyTab, boolean> = {
    MODELO: true,
    PLAYBOOKS: (salesPlaybookAudience ? salesPlaybooks.length : juniorPlaybooks.length) > 0,
    CURSOS: visibleCourses.length > 0,
    EVALUACIONES: visibleEvaluations.length > 0,
    BIBLIOTECA: visibleLibrary.length > 0,
  }

  useEffect(() => {
    if (!tabHasContent[tab]) setTab("MODELO")
  }, [tab, tabHasContent.CURSOS, tabHasContent.EVALUACIONES, tabHasContent.BIBLIOTECA, tabHasContent.PLAYBOOKS])

  // Al llegar con ?curso=ID, se muestra ese curso abierto en pantalla.
  useEffect(() => {
    const id = searchParams.get("curso")
    if (!id) return
    const timer = window.setTimeout(() => document.getElementById(`curso-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 250)
    return () => window.clearTimeout(timer)
  }, [])

  function changeTab(next: AcademyTab) {
    setTab(next)
    setSearchParams({ tab: next.toLowerCase() })
  }

  function refreshStore() {
    setStoreVersion((value) => value + 1)
  }

  function toggleFavorite(id: string) {
    toggleAcademyFavorite(id)
    refreshStore()
  }

  function openUpdate(id: string, nextTab: AcademyTab) {
    markAcademyUpdateSeen(id)
    refreshStore()
    changeTab(nextTab)
  }

  function completeModule(course: AcademyCourse, moduleId: string) {
    markCourseModuleComplete(course.id, moduleId)
    refreshStore()
  }

  function startQuiz(evaluation: AcademyEvaluation) {
    const questions = createQuestionSet(evaluation)
    setQuizEvaluation(evaluation)
    setQuizQuestions(questions)
    setQuizAnswers({})
    setQuizResultId(null)
  }

  function submitQuiz() {
    if (!quizEvaluation || !quizQuestions.length) return
    const attempt = saveEvaluationAttempt(
      quizEvaluation,
      quizQuestions.map((question) => question.id),
      quizAnswers
    )
    setQuizResultId(attempt.id)
    refreshStore()
  }

  function submitObservation() {
    if (!observationTarget.trim()) return
    if (CONSULTA_CODES.some((code) => !observationValues[code])) return
    if (!observationComment.trim()) return

    const observation = saveAcademyObservation({
      targetName: observationTarget.trim(),
      local: observationLocal || currentUser.local || "",
      brand: observationBrand || undefined,
      observerName: currentUser.name,
      observerEmail: currentUser.email,
      values: observationValues,
      comment: observationComment.trim(),
    })
    setLastObservationScore(observation.score)
    setObservationOpen(false)
    setObservationTarget("")
    setObservationComment("")
    setObservationValues({})
    refreshStore()
  }

  const favoritesCount = state.favorites.length

  return (
    <div className={`academy-page ${embedded ? "academy-embedded" : ""}`}>
      {!embedded && (<>
      <section className="academy-hero">
        <div>
          <span className="academy-eyebrow">ACADEMIA DITALCAR · PILOTO</span>
          <h1>
            Aprender, aplicar y <em>mejorar la experiencia.</em>
          </h1>
          <p>
            Una sola Academia para Ventas, Jefaturas, Gerencias, Junior y Casa Matriz,
            con contenido filtrado según rol y alcance.
          </p>
          <div className="academy-profile">
            <ShieldCheck size={16} /> Ruta activa: <strong>{audienceLabel(audience)}</strong>
          </div>
        </div>
        <div className="academy-hero-result">
          <span>MODELO DE APRENDIZAJE</span>
          <strong>Aprendo → Veo cómo hacerlo → Aplico → Me evalúo → Refuerzo</strong>
          <small>
            {admin
              ? "Administración Academia: Experiencia de Clientes · backup Project Manager."
              : "Los contenidos obligatorios, opcionales y asignados cambian según tu perfil."}
          </small>
        </div>
      </section>

      <AcademiaRecursos admin={admin} />

      <section className="academy-now">
        <div className="academy-now-head">
          <div>
            <span className="academy-eyebrow">PRIMERA APERTURA</span>
            <h2>Tu ruta de hoy</h2>
          </div>
          <span className="academy-pulse">Actualizado</span>
        </div>

        <div className="academy-route-overview">
          {/* Regla: lo que el perfil no tiene asignado no aparece ni como título. */}
          {(assignedCourses.length > 0 || pendingEvaluations.length > 0) && (
          <article className={`academy-route-box assigned ${assignedOverviewOpen ? "open" : ""}`}>
            <button
              type="button"
              className="academy-route-box-head"
              onClick={() => setAssignedOverviewOpen((value) => !value)}
            >
              <div className="academy-route-box-title">
                <SignalLight tone="green" compact />
                <div>
                  <span className="academy-eyebrow">TU APRENDIZAJE</span>
                  <h3>Cursos asignados</h3>
                  <p>Lo que tienes que comenzar, continuar o cerrar.</p>
                </div>
              </div>
              <ChevronRight size={19} className={assignedOverviewOpen ? "open" : ""} />
            </button>
            <div className="academy-route-stats">
              <div><strong>{assignedCourses.length}</strong><span>Asignados</span></div>
              <div><strong>{pendingAssignedCourses.length}</strong><span>Pendientes</span></div>
              <div><strong>{continuingCourses.length}</strong><span>En curso</span></div>
              <div><strong>{completedAssignedCourses.length}</strong><span>Completados</span></div>
            </div>
            {assignedOverviewOpen && (
              <div className="academy-route-list">
                {assignedCourses.length ? assignedCourses.map((course) => {
                  const progress = getCourseProgress(course)
                  const feedbackDone = hasAcademyFeedback(course.id, currentUser.email)
                  const completed = progress >= 100 && feedbackDone
                  return (
                    <button
                      type="button"
                      key={course.id}
                      onClick={() => { setSelectedCourse(course.id); changeTab("CURSOS") }}
                    >
                      <SignalLight tone={completed ? "neutral" : "green"} compact />
                      <div>
                        <strong>{course.title}</strong>
                        <span>
                          {completed
                            ? "Completado"
                            : progress >= 100
                              ? "Encuesta final pendiente"
                              : progress > 0
                                ? `En curso · ${progress}%`
                                : "Asignado · 0%"}
                        </span>
                      </div>
                      <b>{progress}%</b>
                    </button>
                  )
                }) : (
                  <div className="academy-route-empty">Sin cursos asignados por ahora.</div>
                )}
                {pendingEvaluations.length > 0 && (
                  <button type="button" onClick={() => changeTab("EVALUACIONES")}>
                    <SignalLight tone="green" compact />
                    <div>
                      <strong>Evaluaciones pendientes</strong>
                      <span>{pendingEvaluations.length} por completar</span>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            )}
          </article>
          )}

          <article className={`academy-route-box optional ${optionalOverviewOpen ? "open" : ""}`}>
            <button
              type="button"
              className="academy-route-box-head"
              onClick={() => setOptionalOverviewOpen((value) => !value)}
            >
              <div className="academy-route-box-title">
                <BookOpen size={19} />
                <div>
                  <span className="academy-eyebrow">PARA CONSULTAR</span>
                  <h3>Recursos opcionales</h3>
                  <p>Playbooks, biblioteca y cursos que puedes revisar cuando los necesites.</p>
                </div>
              </div>
              <ChevronRight size={19} className={optionalOverviewOpen ? "open" : ""} />
            </button>
            <div className="academy-route-stats compact">
              <div><strong>{optionalCourses.length}</strong><span>Cursos</span></div>
              <div><strong>{salesPlaybookAudience ? salesPlaybooks.length : juniorPlaybooks.length}</strong><span>Playbooks</span></div>
              <div><strong>{visibleLibrary.length}</strong><span>Materiales</span></div>
              <div><strong>{favoritesCount}</strong><span>Guardados</span></div>
            </div>
            {optionalOverviewOpen && (
              <div className="academy-optional-actions">
                <button type="button" onClick={() => changeTab("PLAYBOOKS")}>Playbooks <ArrowRight size={14} /></button>
                <button type="button" onClick={() => changeTab("BIBLIOTECA")}>Biblioteca <ArrowRight size={14} /></button>
                <button type="button" onClick={() => changeTab("CURSOS")}>Cursos opcionales <ArrowRight size={14} /></button>
              </div>
            )}
          </article>
        </div>

        {unseenUpdates.length > 0 && (
          <div className="academy-updates" id="academy-updates">
            {unseenUpdates.slice(0, 4).map((update) => (
              <button
                type="button"
                key={update.id}
                onClick={() => openUpdate(update.id, update.tab)}
              >
                <span className={`academy-update-kind kind-${update.kind.toLowerCase()}`}>
                  {update.kind}
                </span>
                <div>
                  <strong>{update.title}</strong>
                  <p>{update.detail}</p>
                </div>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        )}
      </section>

      </>)}

      <nav className="academy-tabs academy-tabs-grouped" aria-label="Academia Ditalcar">
        {TAB_GROUPS.filter((group) => group.tabs.some((item) => tabHasContent[item])).map((group) => (
          <div className="academy-tab-group" key={group.label}>
            <span className="academy-tab-group-label">{group.label}</span>
            <div className="academy-tab-group-items">
              {group.tabs.filter((item) => tabHasContent[item]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={tab === item ? "active" : ""}
                  aria-current={tab === item ? "page" : undefined}
                  onClick={() => changeTab(item)}
                >
                  {item === "MODELO" && <Target size={17} />}
                  {item === "PLAYBOOKS" && <BookOpen size={17} />}
                  {item === "CURSOS" && <GraduationCap size={17} />}
                  {item === "EVALUACIONES" && <ClipboardCheck size={17} />}
                  {item === "BIBLIOTECA" && <Library size={17} />}
                  {TAB_LABELS[item]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {tab === "MODELO" &&
        (salesModelAudience ? (
          <section className="academy-panel">
            <div className="academy-panel-head">
              <div>
                <span className="academy-eyebrow">MODELO CONSULTA</span>
                <h2>Comprender antes de ofrecer.</h2>
                <p>
                  Ocho principios que funcionan como lenguaje común durante todo el viaje
                  del cliente. Elige una letra para ver qué hacer, qué evitar y cómo decirlo.
                </p>
              </div>
              <RouteToggle value={vehicleRoute} onChange={setVehicleRoute} />
            </div>

            <div className="consulta-word" role="tablist" aria-label="Principios CONSULTA">
              {consultaDetailed.map((item) => (
                <button
                  type="button"
                  role="tab"
                  key={item.code}
                  aria-selected={selectedConsulta === item.code}
                  aria-label={`${item.code}: ${item.title}`}
                  title={item.title}
                  className={selectedConsulta === item.code ? "active" : ""}
                  onClick={() => setSelectedConsulta(item.code)}
                >
                  {item.code}
                </button>
              ))}
            </div>

            {(() => {
              const index = consultaDetailed.findIndex((item) => item.code === currentConsulta.code)
              const prev = consultaDetailed[index - 1]
              const next = consultaDetailed[index + 1]
              const lensContent: Record<ConsultaLens, { title: string; items: string[] }> = {
                VENDEDOR: { title: "Para el vendedor", items: [currentConsulta.sellerLens] },
                JEFATURA: { title: "Para la jefatura local", items: [currentConsulta.managerLens] },
                GERENCIA: { title: "Para la gerencia de marca y ventas", items: [currentConsulta.managementLens] },
                SENALES: { title: "Se ve bien cuando…", items: currentConsulta.signals },
                MEDICION: { title: "Cómo se mide", items: currentConsulta.indicators },
                PLAYBOOKS: { title: "Playbooks relacionados", items: currentConsulta.relatedPlaybooks },
              }
              const lens = lensContent[consultaLens]
              return (
                <article className="consulta-card" aria-live="polite">
                  <header className="consulta-card-head">
                    <div className="consulta-card-letter">{currentConsulta.code}</div>
                    <div>
                      <span className="academy-eyebrow">PRINCIPIO {index + 1} DE {consultaDetailed.length}</span>
                      <h3>{currentConsulta.title}</h3>
                      <p>{currentConsulta.principle}</p>
                    </div>
                  </header>

                  <p className="consulta-card-meaning">{currentConsulta.meaning}</p>
                  <p className="consulta-card-why"><strong>Por qué importa:</strong> {currentConsulta.why}</p>

                  <div className="consulta-card-pair">
                    <section className="consulta-box do">
                      <span><Check size={14} /> HACER</span>
                      <ul>{currentConsulta.behaviors.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                    <section className="consulta-box avoid">
                      <span><XCircle size={14} /> EVITAR</span>
                      <ul>{currentConsulta.avoid.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                  </div>

                  <div className="consulta-card-pair">
                    <section className="consulta-box">
                      <span>FRASES PARA USAR</span>
                      <ul>{currentConsulta.questions.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                    <section className="consulta-box quote">
                      <span>EJEMPLO APLICADO</span>
                      <p>“{currentConsulta.example}”</p>
                    </section>
                  </div>

                  <div className="consulta-lens-chips" role="tablist" aria-label="Más sobre este principio">
                    {CONSULTA_LENSES.map((item) => (
                      <button
                        type="button"
                        role="tab"
                        key={item.id}
                        aria-selected={consultaLens === item.id}
                        className={consultaLens === item.id ? "active" : ""}
                        onClick={() => setConsultaLens(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <section className="consulta-box lens">
                    <span>{lens.title.toUpperCase()}</span>
                    {lens.items.length > 1 ? (
                      <ul>{lens.items.map((item) => <li key={item}>{item}</li>)}</ul>
                    ) : (
                      <p>{lens.items[0]}</p>
                    )}
                  </section>

                  <footer className="consulta-card-nav">
                    <button type="button" disabled={!prev} onClick={() => prev && setSelectedConsulta(prev.code)}>
                      ← {prev ? `${prev.code} · ${prev.title}` : "Inicio"}
                    </button>
                    <button type="button" className="next" disabled={!next} onClick={() => next && setSelectedConsulta(next.code)}>
                      {next ? `Siguiente: ${next.code} · ${next.title}` : "Último principio"} →
                    </button>
                  </footer>
                </article>
              )
            })()}

            <div className="academy-route-note">
              <CarRouteCopy vehicleRoute={vehicleRoute} />
            </div>

            <div className="academy-subhead">
              <span className="academy-eyebrow">VIAJE COMPLETO</span>
              <h3>CONSULTA acompaña toda la atención</h3>
            </div>
            <div className="customer-journey">
              {customerJourney.map((step, index) => (
                <article key={step.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                  <small className="journey-letters">
                    {step.consulta.map((code) => (
                      <button type="button" key={code} onClick={() => setSelectedConsulta(code)} aria-label={`Ver principio ${code}`}>
                        {code}
                      </button>
                    ))}
                  </small>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="academy-panel">
            <div className="academy-panel-head">
              <div>
                <span className="academy-eyebrow">SELLO DE EXPERIENCIA DITALCAR</span>
                <h2>La experiencia también se construye detrás de escena.</h2>
                <p>
                  Exactitud, cuidado, preparación, comunicación, cumplimiento y un momento
                  final coherente con lo prometido.
                </p>
              </div>
            </div>

            <div className="sello-strip">
              {selloExperiencia.map((item) => (
                <button
                  type="button"
                  key={`${item.code}-${item.title}`}
                  className={selectedSello === item.title ? "active" : ""}
                  onClick={() => setSelectedSello(item.title)}
                >
                  <span>{item.code}</span>
                  <strong>{item.title}</strong>
                </button>
              ))}
            </div>

            {currentSello && (
              <div className="sello-detail">
                <div className="sello-main">
                  <span>{currentSello.code}</span>
                  <div>
                    <h3>{currentSello.title}</h3>
                    <p>{currentSello.summary}</p>
                  </div>
                </div>
                <InfoColumn title="Conductas" items={currentSello.behaviors} />
                <InfoColumn title="Evitar" items={currentSello.avoid} danger />
              </div>
            )}

            <div className="academy-subhead">
              <span className="academy-eyebrow">RUTA OPERACIONAL</span>
              <h3>Recepción → Stock → Preparación → Control previo → Entrega</h3>
            </div>
            <div className="junior-journey">
              {juniorJourney.map((step, index) => (
                <article key={step.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
            <div className="academy-callout">
              <HeartHandshake size={22} />
              <div>
                <strong>Atención básica al cliente</strong>
                <p>
                  La ruta Junior también considera toma de usados, calidad de unidad en la
                  entrega y experiencia memorable con el cliente final. La Entrega a Cliente
                  Final de Frogmi continúa siendo responsabilidad del vendedor.
                </p>
              </div>
            </div>
          </section>
        ))}

      {tab === "PLAYBOOKS" && (
        <section className="academy-panel">
          <div className="academy-panel-head">
            <div>
              <span className="academy-eyebrow">PLAYBOOKS</span>
              <h2>{audience === "JUNIOR" ? "Ejecución operacional" : "Viaje del cliente"}</h2>
              <p>
                {audience === "JUNIOR"
                  ? "Guías operacionales conectadas con Recepción, Stock, Preparación, Control previo y Entrega."
                  : "Herramientas de consulta para aplicar CONSULTA en situaciones reales. No generan porcentaje de completitud: se consultan, guardan y relacionan con cursos/evaluaciones."}
              </p>
            </div>
            {salesPlaybookAudience && (
              <RouteToggle value={vehicleRoute} onChange={setVehicleRoute} />
            )}
          </div>

          {salesPlaybookAudience ? (
            <>
              <div className="academy-before-apply">
                <div>
                  <span>ANTES DE APLICAR</span>
                  <strong>
                    CONSULTA relacionado: {currentPlaybook?.consulta.join(" · ")}
                  </strong>
                </div>
                <div>
                  <span>CURSOS RELACIONADOS</span>
                  <strong>
                    {currentPlaybook?.relatedCourses
                      .map(
                        (id) => academyCourses.find((course) => course.id === id)?.title ?? id
                      )
                      .join(" · ")}
                  </strong>
                </div>
              </div>

              <div className="playbook-journey">
                {salesPlaybooks.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={selectedPlaybook === item.id ? "active" : ""}
                    onClick={() => setSelectedPlaybook(item.id)}
                  >
                    <span>{item.transversal ? "TRANSVERSAL" : `0${item.order}`}</span>
                    <strong>{item.title}</strong>
                    <small>{item.journey}</small>
                  </button>
                ))}
              </div>

              {currentPlaybook && (
                <div className="playbook-detail">
                  <div className="playbook-detail-top">
                    <div>
                      <span className="academy-eyebrow">{currentPlaybook.journey}</span>
                      <h3>{currentPlaybook.title}</h3>
                      <p>{currentPlaybook.objective}</p>
                      <div className="playbook-client-state">
                        <span>QUÉ PUEDE ESTAR VIVIENDO EL CLIENTE</span>
                        <p>{currentPlaybook.clientState}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="academy-favorite"
                      onClick={() => toggleFavorite(currentPlaybook.id)}
                    >
                      <Bookmark
                        size={16}
                        fill={state.favorites.includes(currentPlaybook.id) ? "currentColor" : "none"}
                      />
                      {state.favorites.includes(currentPlaybook.id) ? "Guardado" : "Guardar"}
                    </button>
                  </div>

                  <div className="playbook-result">
                    <Target size={18} />
                    <div>
                      <span>RESULTADO ESPERADO</span>
                      <strong>{currentPlaybook.result}</strong>
                    </div>
                  </div>

                  <div className="playbook-meta-row">
                    <span>CONSULTA: {currentPlaybook.consulta.join(" · ")}</span>
                    <span>Versión {currentPlaybook.version}</span>
                    <span>{currentPlaybook.status}</span>
                  </div>

                  <div className="route-notes">
                    <div>
                      <span>
                        {vehicleRoute === "NUEVOS" ? "VEHÍCULOS NUEVOS" : "VEHÍCULOS USADOS"}
                      </span>
                      {(vehicleRoute === "NUEVOS"
                        ? currentPlaybook.newVsUsed.nuevos
                        : currentPlaybook.newVsUsed.usados
                      ).map((note) => (
                        <p key={note}>• {note}</p>
                      ))}
                    </div>
                  </div>

                  <div className="playbook-sections playbook-accordions">
                    {currentPlaybook.sections.map((section) => (
                      <details key={section.id} className="playbook-section-accordion">
                        <summary>
                          <div>
                            <h4>{section.title}</h4>
                            {section.consulta?.length ? (
                              <span>{section.consulta.join(" · ")}</span>
                            ) : null}
                          </div>
                          <ChevronRight size={17} />
                        </summary>
                        <div className="playbook-section-body">
                          {section.bullets.map((item) => (
                            <p key={item}>• {item}</p>
                          ))}
                          {section.note && <small>{section.note}</small>}
                        </div>
                      </details>
                    ))}
                  </div>

                  <div className="academy-deepen">
                    <div>
                      <span>¿QUIERES PROFUNDIZAR?</span>
                      <strong>Curso → caso práctico → volver al viaje del cliente</strong>
                    </div>
                    <button type="button" onClick={() => changeTab("CURSOS")}>
                      Ver cursos relacionados <ArrowRight size={15} />
                    </button>
                  </div>

                  <AcademyFeedbackPanel
                    contentId={currentPlaybook.id}
                    contentType="PLAYBOOK"
                    currentUser={currentUser}
                    onSaved={refreshStore}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="junior-playbook-tabs">
                {juniorPlaybooks.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={selectedJuniorPlaybook === item.id ? "active" : ""}
                    onClick={() => setSelectedJuniorPlaybook(item.id)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.journey}</span>
                  </button>
                ))}
              </div>
              {currentJuniorPlaybook && (
                <div className="junior-playbook-detail">
                  <div>
                    <span className="academy-eyebrow">{currentJuniorPlaybook.journey}</span>
                    <h3>{currentJuniorPlaybook.title}</h3>
                    <p>{currentJuniorPlaybook.result}</p>
                  </div>
                  <div className="junior-playbook-actions">
                    {currentJuniorPlaybook.bullets.map((item) => (
                      <div key={item}>
                        <CheckCircle2 size={16} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {currentJuniorPlaybook && (
                <AcademyFeedbackPanel
                  contentId={currentJuniorPlaybook.id}
                  contentType="PLAYBOOK"
                  currentUser={currentUser}
                  onSaved={refreshStore}
                />
              )}
              <div className="academy-callout">
                <ShieldCheck size={22} />
                <div>
                  <strong>Estándares Operacionales · transversal</strong>
                  <p>
                    Los estándares acompañan toda la ruta operacional, igual que Reclamos
                    atraviesa el viaje comercial. Más adelante se cruzarán con Frogmi para
                    comparar conocimiento versus ejecución real.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {tab === "CURSOS" && (
        <section className="academy-panel">
          <div className="academy-panel-head">
            <div>
              <span className="academy-eyebrow">MICROCURSOS</span>
              <h2>Aprender en módulos cortos.</h2>
              <p>
                Los contenidos pueden asignarse de a poco, quedar en 0% desde el momento de
                asignación y liberarse por semana. Para cargos altos pueden mantenerse como
                consulta opcional.
              </p>
            </div>
          </div>

          <div className="academy-search">
            <Search size={17} />
            <input
              value={courseSearch}
              onChange={(event) => setCourseSearch(event.target.value)}
              placeholder="Buscar curso, habilidad o tema…"
            />
          </div>

          <div className="course-grid">
            {visibleCourses.map((course) => {
              const progress = getCourseProgress(course)
              const completedModules = getCompletedModules(course.id)
              const assigned = course.assignedTo.includes(audience)
              const mandatory = course.mandatoryFor.includes(audience)
              const feedbackDone = hasAcademyFeedback(course.id, currentUser.email)
              const open = selectedCourse === course.id

              return (
                <article className={`course-card ${open ? "open" : ""}`} key={course.id} id={`curso-${course.id}`}>
                  <div className="course-top">
                    <div>
                      <span>{course.status}</span>
                      {assigned && <b>ASIGNADO</b>}
                      {course.new && <b>NUEVO</b>}
                      {course.updated && <b>ACTUALIZADO</b>}
                    </div>
                    <button type="button" onClick={() => toggleFavorite(course.id)}>
                      <Bookmark
                        size={15}
                        fill={state.favorites.includes(course.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  {course.sourceNote && <div className="course-source-note">{course.sourceNote}</div>}
                  <div className="course-meta">
                    <span>
                      <Clock3 size={14} /> {course.duration} min
                    </span>
                    <span>{mandatory ? "Obligatorio" : "Opcional"}</span>
                    <span>{course.releaseMode === "GRADUAL" ? "Liberación gradual" : "Disponible completo"}</span>
                  </div>
                  <div className="course-progress">
                    <div>
                      <span>Avance</span>
                      <strong>{progress}%</strong>
                    </div>
                    <div>
                      <i style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {embedded ? (
                    <Link className="course-action" to={`/academia-ditalcar/curso/${encodeURIComponent(course.id)}`}>
                      {progress >= 100 ? "Repasar el curso" : progress > 0 ? "Continuar el curso" : "Entrar al curso"} <ArrowRight size={15} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="course-action"
                      onClick={() => setSelectedCourse(open ? null : course.id)}
                    >
                      {progress > 0 ? "Continuar" : "Ver módulos"} <ArrowRight size={15} />
                    </button>
                  )}

                  {open && !embedded && (
                    <div className="course-modules">
                      {course.modules.map((module, index) => {
                        const completed = completedModules.includes(module.id)
                        return (
                          <details
                            key={module.id}
                            className={`course-module-accordion ${completed ? "completed" : ""} ${
                              !module.available ? "locked" : ""
                            }`}
                          >
                            <summary>
                              <span>{completed ? <Check size={14} /> : index + 1}</span>
                              <div className="course-module-title">
                                <strong>{module.title}</strong>
                                <small>{module.duration} min</small>
                              </div>
                              <ChevronRight size={15} />
                            </summary>
                            <div className="course-module-content">
                              <p>{module.detail}</p>
                              {module.highlight && (
                                <div className="course-module-highlight">{module.highlight}</div>
                              )}
                              {module.bullets?.length ? (
                                <ul>
                                  {module.bullets.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                              ) : null}
                              {module.note && <small className="course-module-note">{module.note}</small>}
                              {!module.available && (
                                <em>
                                  <LockKeyhole size={12} /> {module.releaseLabel ? `En construcción · ${module.releaseLabel}` : "En construcción"}
                                </em>
                              )}
                              {module.available && !completed && (
                                <button
                                  type="button"
                                  onClick={() => completeModule(course, module.id)}
                                >
                                  Marcar módulo completado
                                </button>
                              )}
                              {completed && <em className="module-done">Completado</em>}
                            </div>
                          </details>
                        )
                      })}
                    </div>
                  )}
                  {open && !embedded && (
                    <AcademyFeedbackPanel
                      contentId={course.id}
                      contentType="CURSO"
                      currentUser={currentUser}
                      required={assigned}
                      onSaved={refreshStore}
                    />
                  )}
                  {assigned && getCourseProgress(course) >= 100 && !feedbackDone && (
                    <div className="course-feedback-pending">Encuesta final pendiente para completar el curso.</div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}

      {tab === "EVALUACIONES" && (
        <section className="academy-panel">
          <div className="academy-panel-head">
            <div>
              <span className="academy-eyebrow">EVALUACIONES</span>
              <h2>Conocimiento y conducta observable.</h2>
              <p>
                Conocimiento: máximo 3 intentos, banco amplio y preguntas sin repetirse entre
                intentos. Solo después del tercer intento fallido se activa Requiere refuerzo.
              </p>
            </div>
            {canObserve && (
              <button
                type="button"
                className="academy-primary-action"
                onClick={() => setObservationOpen((value) => !value)}
              >
                <Eye size={16} /> Registrar observación CONSULTA
              </button>
            )}
          </div>

          {observationOpen && (
            <ObservableForm
              currentUser={currentUser}
              target={observationTarget}
              setTarget={setObservationTarget}
              local={observationLocal}
              setLocal={setObservationLocal}
              brand={observationBrand}
              setBrand={setObservationBrand}
              values={observationValues}
              setValues={setObservationValues}
              comment={observationComment}
              setComment={setObservationComment}
              onSubmit={submitObservation}
              onCancel={() => setObservationOpen(false)}
            />
          )}

          {lastObservationScore !== null && (
            <div className="academy-success-note">
              <CheckCircle2 size={18} /> Observación guardada · Resultado {lastObservationScore}%
            </div>
          )}

          {quizEvaluation && (
            <QuizPanel
              evaluation={quizEvaluation}
              questions={quizQuestions}
              answers={quizAnswers}
              setAnswers={setQuizAnswers}
              resultId={quizResultId}
              onSubmit={submitQuiz}
              onClose={() => {
                setQuizEvaluation(null)
                setQuizQuestions([])
                setQuizAnswers({})
                setQuizResultId(null)
              }}
              onRetry={() => startQuiz(quizEvaluation)}
            />
          )}

          <div className="evaluation-grid">
            {visibleEvaluations.map((evaluation) => {
              const attempts = getEvaluationAttempts(evaluation.id)
              const passed = attempts.some((attempt) => attempt.passed)
              const needsRef = evaluationNeedsReinforcement(evaluation)
              const best = getEvaluationBestScore(evaluation.id)
              const last = getEvaluationLastScore(evaluation.id)
              const assigned = evaluation.assignedTo.includes(audience)

              return (
                <article key={evaluation.id}>
                  <div className="evaluation-icon">
                    {evaluation.type === "OBSERVADA" ? <Eye /> : <ClipboardCheck />}
                  </div>
                  <span>{evaluation.type}</span>
                  <h3>{evaluation.title}</h3>
                  {assigned && <div className="evaluation-assigned">ASIGNADA</div>}
                  <div className="evaluation-rules">
                    <p>
                      <strong>{evaluation.passing}%</strong> aprobación
                    </p>
                    <p>
                      <strong>
                        {evaluation.type === "OBSERVADA"
                          ? "—"
                          : `${attempts.length}/${evaluation.attempts}`}
                      </strong>{" "}
                      {evaluation.type === "OBSERVADA" ? "registro libre" : "intentos usados"}
                    </p>
                    <p>
                      <strong>{evaluation.questionsPerAttempt}</strong> preguntas
                    </p>
                    <p>
                      <strong>{evaluation.bankSize}</strong> banco total
                    </p>
                  </div>

                  {best !== undefined && evaluation.type !== "OBSERVADA" && (
                    <div className="evaluation-scores">
                      <span>Mejor: {best}%</span>
                      <span>Último: {last}%</span>
                    </div>
                  )}

                  {needsRef && (
                    <div className="evaluation-reinforcement">
                      <XCircle size={16} />
                      <div>
                        <strong>Requiere refuerzo</strong>
                        <p>
                          {getEvaluationReinforcementIds(evaluation.id)
                            .map(
                              (id) =>
                                academyCourses.find((course) => course.id === id)?.title ?? id
                            )
                            .slice(0, 4)
                            .join(" · ") || "Revisar contenido relacionado"}
                        </p>
                      </div>
                    </div>
                  )}

                  {evaluation.type === "OBSERVADA" ? (
                    <div className="observed-scale">
                      <span>Cumple</span>
                      <span>Parcial</span>
                      <span>No cumple</span>
                      <small>+ comentario obligatorio</small>
                    </div>
                  ) : (
                    <p className="evaluation-note">
                      {passed
                        ? "Evaluación aprobada. Se mantienen todos los intentos en el historial."
                        : "Las preguntas utilizadas no vuelven a aparecer en los intentos siguientes."}
                    </p>
                  )}

                  {evaluation.type !== "OBSERVADA" && (
                    <button
                      type="button"
                      disabled={passed || attempts.length >= evaluation.attempts}
                      onClick={() => startQuiz(evaluation)}
                    >
                      {passed
                        ? "Aprobada"
                        : attempts.length
                          ? "Nuevo intento"
                          : "Comenzar"}
                      <ChevronRight size={15} />
                    </button>
                  )}
                </article>
              )
            })}
          </div>

          {canObserve && getAcademyObservations().length > 0 && (
            <div className="academy-observation-history">
              <span className="academy-eyebrow">ÚLTIMAS OBSERVACIONES DEMO</span>
              {getAcademyObservations()
                .slice(0, 4)
                .map((observation) => (
                  <article key={observation.id}>
                    <div>
                      <strong>{observation.targetName}</strong>
                      <span>
                        {observation.local} · {observation.brand || "Sin marca"}
                      </span>
                    </div>
                    <b>{observation.score}%</b>
                    <small>{new Date(observation.createdAt).toLocaleDateString("es-CL")}</small>
                  </article>
                ))}
            </div>
          )}
        </section>
      )}

      {tab === "BIBLIOTECA" && (
        <section className="academy-panel">
          <div className="academy-panel-head">
            <div>
              <span className="academy-eyebrow">BIBLIOTECA DITALCAR</span>
              <h2>Información vigente, fácil de encontrar.</h2>
              <p>
                Fichas de producto, catálogos de accesorios, CRM, procesos, operación y
                entrega. La fuente definitiva será una Biblioteca de documentos SharePoint;
                React solo leerá metadatos y abrirá el archivo vigente.
              </p>
            </div>
            <div className="sharepoint-badge">
              <FolderOpen size={17} /> Biblioteca SharePoint
            </div>
          </div>

          <div className="library-toolbar">
            <div className="academy-search library-search">
              <Search size={17} />
              <input
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="Buscar ficha, modelo, accesorio, CRM o proceso…"
              />
            </div>
            <select
              value={libraryCategory}
              onChange={(event) => setLibraryCategory(event.target.value)}
            >
              <option value="TODAS">Todas las categorías</option>
              <option value="PRODUCTO">Producto</option>
              <option value="ACCESORIOS">Accesorios</option>
              <option value="COMERCIAL">Comercial</option>
              <option value="CRM">CRM</option>
              <option value="PROCESOS">Procesos</option>
              <option value="OPERACIONES">Operaciones</option>
              <option value="ENTREGA">Entrega</option>
              <option value="OTROS">Otros</option>
            </select>
            <select value={libraryBrand} onChange={(event) => setLibraryBrand(event.target.value)}>
              <option>Todas</option>
              {libraryBrands.map((brand) => (
                <option key={brand}>{brand}</option>
              ))}
            </select>
            <select value={libraryRoute} onChange={(event) => setLibraryRoute(event.target.value)}>
              <option value="TODOS">Nuevos y Usados</option>
              <option value="NUEVOS">Nuevos</option>
              <option value="USADOS">Usados</option>
            </select>
          </div>

          <div className="library-grid">
            {visibleLibrary.map((resource) => (
              <LibraryCard
                key={resource.id}
                resource={resource}
                favorite={state.favorites.includes(resource.id)}
                onFavorite={() => toggleFavorite(resource.id)}
                currentUser={currentUser}
                onFeedbackSaved={refreshStore}
              />
            ))}
          </div>

          {!visibleLibrary.length && (
            <div className="academy-empty">
              <Search size={24} />
              <strong>Sin resultados</strong>
              <span>Prueba con otra marca, categoría o término de búsqueda.</span>
            </div>
          )}
        </section>
      )}

      {canSeeTeam && (
        <section className="academy-team">
          <div className="academy-team-head">
            <div>
              <span className="academy-eyebrow">SEGUIMIENTO</span>
              <h2>{currentUser.role === "JEFATURA_LOCAL" ? "Mi equipo" : "Dashboard Academia"}</h2>
              <p>
                Conocimiento, avance y aplicación observable. Más adelante se podrá cruzar con
                CRM, encuestas y Frogmi sin mezclar responsabilidades de cada formulario.
              </p>
            </div>
            {canSeeNetwork && (
              <div className="academy-filters">
                <Filter size={16} />
                <select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
                  <option>Todas</option>
                  {dashboardBrands.map((brand) => (
                    <option key={brand}>{brand}</option>
                  ))}
                </select>
                <select value={localFilter} onChange={(event) => setLocalFilter(event.target.value)}>
                  <option>Todos</option>
                  {dashboardLocals.map((local) => (
                    <option key={local}>{local}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <AcademyKPIs rows={teamRows} />

          <div className="academy-team-table-wrap">
            <table className="academy-team-table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Marca</th>
                  <th>Local</th>
                  <th>Avance obligatorio</th>
                  <th>Aprobación</th>
                  <th>CONSULTA observado</th>
                  <th>Pendientes</th>
                  <th>Refuerzo</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <span>{row.role}</span>
                    </td>
                    <td>{row.brand}</td>
                    <td>{row.local}</td>
                    <td>{row.mandatoryProgress}%</td>
                    <td>{row.evaluationPass}%</td>
                    <td>{row.consultaObserved ? `${row.consultaObserved}%` : "—"}</td>
                    <td>{row.pendingEvaluations}</td>
                    <td>
                      <span className={row.reinforcement ? "team-alert" : "team-ok"}>
                        {row.reinforcement ? "Requiere" : "OK"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {currentUser.role === "JEFATURA_LOCAL" && (
            <div className="manager-board">
              <div>
                <span className="academy-eyebrow">TABLERO SEMANAL</span>
                <h3>Preparar la reunión comercial</h3>
                <p>
                  Revisar acuerdos anteriores, estándares, avance del equipo, personas a reforzar
                  y prioridades antes de la reunión de 15 minutos.
                </p>
              </div>
              <button type="button">
                Abrir tablero <ArrowRight size={16} />
              </button>
              <small>Responsable: Jefatura de Sucursal · Backup: Gerencia de Marca asociada</small>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function RouteToggle({
  value,
  onChange,
}: {
  value: "NUEVOS" | "USADOS"
  onChange: (value: "NUEVOS" | "USADOS") => void
}) {
  return (
    <div className="academy-route-toggle">
      <button
        type="button"
        className={value === "NUEVOS" ? "active" : ""}
        onClick={() => onChange("NUEVOS")}
      >
        Nuevos
      </button>
      <button
        type="button"
        className={value === "USADOS" ? "active" : ""}
        onClick={() => onChange("USADOS")}
      >
        Usados
      </button>
    </div>
  )
}

function CarRouteCopy({ vehicleRoute }: { vehicleRoute: "NUEVOS" | "USADOS" }) {
  return (
    <div>
      <span>{vehicleRoute === "NUEVOS" ? "APLICACIÓN EN NUEVOS" : "APLICACIÓN EN USADOS"}</span>
      <p>
        {vehicleRoute === "NUEVOS"
          ? "Validar versión, disponibilidad, bonos, financiamiento, unidad en tránsito, plazo, equipamiento y documentación de vehículo nuevo."
          : "Trabajar sobre la unidad específica: año, kilometraje, estado, equipamiento real, antecedentes disponibles, documentación y disponibilidad efectiva."}
      </p>
    </div>
  )
}

function QuickCard({
  icon: Icon,
  label,
  value,
  detail,
  onClick,
}: {
  icon: typeof PlayCircle
  label: string
  value: number
  detail: string
  onClick: () => void
}) {
  return (
    <button type="button" className="academy-quick" onClick={onClick}>
      <Icon size={19} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <ChevronRight size={16} />
    </button>
  )
}

function InfoColumn({
  title,
  items,
  danger = false,
}: {
  title: string
  items: string[]
  danger?: boolean
}) {
  return (
    <div className={`consulta-info ${danger ? "danger" : ""}`}>
      <span>{title}</span>
      {items.map((item) => (
        <p key={item}>• {item}</p>
      ))}
    </div>
  )
}

function QuizPanel({
  evaluation,
  questions,
  answers,
  setAnswers,
  resultId,
  onSubmit,
  onClose,
  onRetry,
}: {
  evaluation: AcademyEvaluation
  questions: AcademyQuestion[]
  answers: Record<string, number>
  setAnswers: (value: Record<string, number>) => void
  resultId: string | null
  onSubmit: () => void
  onClose: () => void
  onRetry: () => void
}) {
  const attempts = getEvaluationAttempts(evaluation.id)
  const result = resultId ? attempts.find((item) => item.id === resultId) : undefined
  const canSubmit = questions.length > 0 && questions.every((question) => answers[question.id] !== undefined)
  const remaining = Math.max(0, evaluation.attempts - attempts.length)

  if (!questions.length && !result) {
    return (
      <div className="quiz-panel">
        <div className="quiz-head">
          <div>
            <span className="academy-eyebrow">{evaluation.title}</span>
            <h3>No quedan preguntas disponibles para un nuevo intento.</h3>
          </div>
          <button type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-panel">
      <div className="quiz-head">
        <div>
          <span className="academy-eyebrow">EVALUACIÓN EN CURSO</span>
          <h3>{evaluation.title}</h3>
          <p>
            Intento {Math.min(attempts.length + (result ? 0 : 1), evaluation.attempts)} de {evaluation.attempts} ·
            aprobación {evaluation.passing}% · estas preguntas no volverán a aparecer en otro intento.
          </p>
        </div>
        <button type="button" onClick={onClose}>Cerrar</button>
      </div>

      {!result ? (
        <>
          <div className="quiz-questions">
            {questions.map((question, questionIndex) => (
              <article key={question.id}>
                <span>Pregunta {questionIndex + 1}</span>
                <h4>{question.prompt}</h4>
                <div className="quiz-options">
                  {question.options.map((option, optionIndex) => (
                    <button
                      type="button"
                      key={option}
                      className={answers[question.id] === optionIndex ? "selected" : ""}
                      onClick={() =>
                        setAnswers({ ...answers, [question.id]: optionIndex })
                      }
                    >
                      <i>{String.fromCharCode(65 + optionIndex)}</i>
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="quiz-footer">
            <span>
              Respondidas {Object.keys(answers).length}/{questions.length}
            </span>
            <button type="button" disabled={!canSubmit} onClick={onSubmit}>
              Finalizar intento <CheckCircle2 size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className={`quiz-result ${result.passed ? "passed" : "failed"}`}>
          {result.passed ? <CheckCircle2 size={34} /> : <RefreshCw size={34} />}
          <div>
            <span>{result.passed ? "APROBADA" : "RESULTADO DEL INTENTO"}</span>
            <strong>{result.score}%</strong>
            <p>
              {result.passed
                ? "El resultado quedó guardado en el historial de esta evaluación."
                : remaining > 0
                  ? `Quedan ${remaining} intento(s). El próximo usará preguntas diferentes.`
                  : "Se utilizaron los tres intentos. Se activa Requiere refuerzo con contenidos específicos."}
            </p>
          </div>
          {!result.passed && remaining > 0 && (
            <button type="button" onClick={onRetry}>
              Preparar siguiente intento
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ObservableForm({
  currentUser,
  target,
  setTarget,
  local,
  setLocal,
  brand,
  setBrand,
  values,
  setValues,
  comment,
  setComment,
  onSubmit,
  onCancel,
}: {
  currentUser: UserScope
  target: string
  setTarget: (value: string) => void
  local: string
  setLocal: (value: string) => void
  brand: string
  setBrand: (value: string) => void
  values: Record<string, ObservableValue>
  setValues: (value: Record<string, ObservableValue>) => void
  comment: string
  setComment: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const locals = Array.from(
    new Set(
      [
        currentUser.local,
        currentUser.localPrincipal,
        ...(currentUser.assignedLocals ?? []),
        ...academyTeamProgress.map((row) => row.local),
      ].filter((value): value is string => Boolean(value))
    )
  )
  const brands = Array.from(
    new Set([...(currentUser.brands ?? []), ...academyTeamProgress.map((row) => row.brand)])
  )
  const valid =
    target.trim() &&
    comment.trim() &&
    CONSULTA_CODES.every((code) => Boolean(values[code]))

  return (
    <div className="observable-form">
      <div className="observable-head">
        <div>
          <span className="academy-eyebrow">EVALUACIÓN DE CONDUCTA</span>
          <h3>Observación CONSULTA</h3>
          <p>Registra hechos observables. Escala: Cumple · Parcial · No cumple + comentario.</p>
        </div>
        <button type="button" onClick={onCancel}>Cerrar</button>
      </div>
      <div className="observable-meta">
        <label>
          <span>Colaborador observado *</span>
          <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Nombre" />
        </label>
        <label>
          <span>Local</span>
          <select value={local} onChange={(event) => setLocal(event.target.value)}>
            <option value="">Seleccionar</option>
            {locals.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Marca</span>
          <select value={brand} onChange={(event) => setBrand(event.target.value)}>
            <option value="">Seleccionar</option>
            {brands.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="observable-grid">
        {consultaDetailed.map((item) => (
          <article key={item.code}>
            <div>
              <span>{item.code}</span>
              <strong>{item.title}</strong>
            </div>
            <select
              value={values[item.code] ?? ""}
              onChange={(event) =>
                setValues({
                  ...values,
                  [item.code]: event.target.value as ObservableValue,
                })
              }
            >
              <option value="">Seleccionar</option>
              <option value="CUMPLE">Cumple</option>
              <option value="PARCIAL">Parcial</option>
              <option value="NO_CUMPLE">No cumple</option>
            </select>
          </article>
        ))}
      </div>
      <label className="observable-comment">
        <span>Comentario / evidencia *</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Describe conductas observadas, hechos y oportunidades de refuerzo…"
        />
      </label>
      <div className="observable-actions">
        <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="primary" disabled={!valid} onClick={onSubmit}>
          Guardar observación
        </button>
      </div>
    </div>
  )
}

function LibraryCard({
  resource,
  favorite,
  onFavorite,
  currentUser,
  onFeedbackSaved,
}: {
  resource: LibraryResource
  favorite: boolean
  onFavorite: () => void
  currentUser: UserScope
  onFeedbackSaved: () => void
}) {
  const available = Boolean(resource.url)
  return (
    <article className="library-card">
      <div className="library-card-top">
        <div className="library-icon"><FileText size={20} /></div>
        <button type="button" onClick={onFavorite} aria-label="Guardar recurso">
          <Bookmark size={16} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="library-badges">
        <span>{resource.category}</span>
        {resource.new && <b>NUEVO</b>}
        {resource.updated && <b>ACTUALIZADO</b>}
      </div>
      <h3>{resource.title}</h3>
      <p>{resource.description}</p>
      <div className="library-meta">
        <span>{resource.documentType}</span>
        {resource.brand && <span>{resource.brand}</span>}
        {resource.model && <span>{resource.model}</span>}
        <span>{resource.route}</span>
      </div>
      <div className="library-version">
        <div>
          <span>Versión</span>
          <strong>{resource.version}</strong>
        </div>
        <div>
          <span>Estado</span>
          <strong>{resource.documentState}</strong>
        </div>
      </div>
      {available ? (
        <a className="library-open" href={resource.url} target="_blank" rel="noreferrer">
          Abrir documento <ArrowRight size={15} />
        </a>
      ) : (
        <button type="button" className="library-open disabled" disabled>
          Pendiente publicar en SharePoint
        </button>
      )}
      {resource.sharePointPath && (
        <small className="library-path">Destino: {resource.sharePointPath}</small>
      )}
      <AcademyFeedbackPanel
        contentId={resource.id}
        contentType="MATERIAL"
        currentUser={currentUser}
        onSaved={onFeedbackSaved}
      />
    </article>
  )
}

function AcademyKPIs({ rows }: { rows: typeof academyTeamProgress }) {
  if (!rows.length) {
    return <div className="academy-empty">Sin datos para los filtros seleccionados.</div>
  }

  const average = (values: number[]) =>
    Math.round(values.reduce((total, value) => total + value, 0) / values.length)
  const consultaValues = rows
    .map((row) => row.consultaObserved)
    .filter((value) => value > 0)

  const mandatoryProgress = average(rows.map((row) => row.mandatoryProgress))
  const evaluationPass = average(rows.map((row) => row.evaluationPass))
  const consultaObserved = consultaValues.length ? average(consultaValues) : undefined

  const metrics = [
    { label: "Avance obligatorio", value: `${mandatoryProgress}%`, percent: mandatoryProgress },
    { label: "Aprobación evaluaciones", value: `${evaluationPass}%`, percent: evaluationPass },
    { label: "Con refuerzo", value: String(rows.filter((row) => row.reinforcement).length) },
    {
      label: "CONSULTA observado",
      value: consultaObserved === undefined ? "—" : `${consultaObserved}%`,
      percent: consultaObserved,
    },
    {
      label: "Evaluaciones pendientes",
      value: String(rows.reduce((total, row) => total + row.pendingEvaluations, 0)),
    },
  ]

  return (
    <div className="academy-kpis">
      {metrics.map((metric) => (
        <article key={metric.label}>
          <SignalLight
            tone={metric.percent === undefined ? "neutral" : signalFromPercent(metric.percent)}
            compact
          />
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </article>
      ))}
    </div>
  )
}
