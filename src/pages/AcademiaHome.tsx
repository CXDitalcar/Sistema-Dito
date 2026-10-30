import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Clock3, ClipboardCheck, FolderOpen, GraduationCap, Library, PlayCircle, Target } from "lucide-react"
import { academyLibraryResources, consultaDetailed, juniorPlaybooks, salesPlaybooks, type AcademyCourse } from "../data/academiaData"
import { getCompletedModules, getCourseProgress, getEvaluationAttempts } from "../services/academyStore"
import { courseHome, courseState, courseStep, visibleAcademy, type CourseState } from "../services/academyVisibility"
import { getAcademyResources, type AcademyResources } from "../services/catalogoApi"
import type { UserScope } from "../types"
import "./Portal.css"
import "./Showroom.css"
import "./AcademiaHome.css"

const STATE_LABEL: Record<CourseState, string> = { PENDIENTE: "Por comenzar", EN_CURSO: "En curso", ENCUESTA: "Falta la encuesta final", COMPLETADO: "Completado" }

// Portada de la interfaz "Academia DITALCAR": qué sigue, tus cursos y material para consultar.
export default function AcademiaHome({ currentUser }: { currentUser: UserScope }) {
  const [resources, setResources] = useState<AcademyResources | null>(null)
  useEffect(() => { getAcademyResources().then(setResources).catch(() => setResources(null)) }, [])

  const { audience, admin, courses, assigned, evaluations } = visibleAcademy(currentUser)
  const email = currentUser.email
  const optional = courses.filter((c) => !assigned.includes(c))
  const pendingEvaluations = evaluations.filter((e) => {
    const attempts = getEvaluationAttempts(e.id)
    return !attempts.some((a) => a.passed) && attempts.length < e.attempts
  })

  // Avance total de lo asignado (por módulos disponibles).
  const totals = assigned.reduce((acc, c) => {
    const available = c.modules.filter((m) => m.available)
    const done = getCompletedModules(c.id).filter((id) => available.some((m) => m.id === id)).length
    return { done: acc.done + done, total: acc.total + available.length }
  }, { done: 0, total: 0 })
  const overall = totals.total ? Math.round((totals.done / totals.total) * 100) : 0
  const completedCourses = assigned.filter((c) => courseState(c, email) === "COMPLETADO").length

  // Qué sigue: primero lo en curso, luego la encuesta pendiente, luego lo por comenzar.
  const order: CourseState[] = ["EN_CURSO", "ENCUESTA", "PENDIENTE"]
  const next = [...assigned].sort((a, b) => order.indexOf(courseState(a, email)) - order.indexOf(courseState(b, email)))
    .find((c) => courseState(c, email) !== "COMPLETADO")
  const nextModule = next ? next.modules.find((m) => m.available && !getCompletedModules(next.id).includes(m.id)) : undefined

  const playbooks = audience === "JUNIOR" ? juniorPlaybooks.length : salesPlaybooks.length
  const library = academyLibraryResources.filter((r) => (admin || r.audiences.includes(audience)) && r.status !== "ARCHIVADO" && (admin || r.status !== "BORRADOR")).length
  const showModel = ["VENTAS", "JEFATURA", "GERENCIA_MARCA", "GERENCIA_VENTAS", "EXPERIENCIA"].includes(audience)
  const firstName = currentUser.name.split(" ")[0] || currentUser.name

  return (
    <div className="portal-page showroom-page academia-home">
      <section className="portal-hello">
        <h1>Hola, {firstName}</h1>
        <p>{assigned.length ? `Tienes ${assigned.length} curso${assigned.length > 1 ? "s" : ""} asignado${assigned.length > 1 ? "s" : ""}. Avanza a tu ritmo: lo que completes queda guardado.` : courses.length ? "Explora cursos y material para tu día a día." : "Material para tu día a día: guías, biblioteca y recursos."}</p>
      </section>

      {/* ---------- Lo que sigue ---------- */}
      {assigned.length > 0 && (
        <section id="para-hoy" className="portal-today ah-next" aria-labelledby="sigue-title">
          <div className="ah-progress" aria-label={`Avance de tus cursos asignados: ${overall}%`}>
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="15.5" className="ah-ring-bg" />
              <circle cx="18" cy="18" r="15.5" className="ah-ring" strokeDasharray={`${overall * 0.974} 100`} />
            </svg>
            <strong>{overall}%</strong>
            <span>{completedCourses} de {assigned.length} completados</span>
          </div>
          <div className="ah-next-body">
            <h2 id="sigue-title">{next ? "Lo que sigue" : "¡Completaste tus cursos asignados!"}</h2>
            {next ? (
              <>
                <p><strong>{next.title}</strong>{nextModule ? ` · ${nextModule.title}` : courseState(next, email) === "ENCUESTA" ? " · encuesta final (1 minuto)" : ""}</p>
                <Link to={courseState(next, email) === "PENDIENTE" ? courseHome(next.id) : courseState(next, email) === "ENCUESTA" ? courseStep(next.id, "fin") : courseStep(next.id, nextModule?.id ?? "fin")} className="showroom-cta ah-cta">
                  <PlayCircle size={22} />
                  <span><strong>{courseState(next, email) === "PENDIENTE" ? "Entrar al curso" : courseState(next, email) === "ENCUESTA" ? "Responder la encuesta" : "Continuar"}</strong><small>{nextModule ? `Módulo de ${nextModule.duration} min` : "Cierra el curso"}</small></span>
                  <ArrowRight size={18} />
                </Link>
              </>
            ) : <p>Puedes repasar cuando quieras o explorar los cursos opcionales.</p>}
            {pendingEvaluations.length > 0 && (
              <Link to="/academia?tab=evaluaciones" className="ah-eval">
                <ClipboardCheck size={18} /> {pendingEvaluations.length > 1 ? `${pendingEvaluations.length} evaluaciones pendientes` : "1 evaluación pendiente"} <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ---------- Tus cursos ---------- */}
      {assigned.length > 0 && <CourseSection id="asignados" title="Tus cursos" subtitle="Asignados para tu cargo." items={assigned} email={email} />}
      {optional.length > 0 && <CourseSection id="opcionales" title={assigned.length ? "Para seguir aprendiendo" : "Cursos"} subtitle="Opcionales: tómalos cuando quieras." items={optional} email={email} />}

      {/* ---------- Para consultar ---------- */}
      <section className="portal-section" aria-labelledby="consultar-title">
        <div className="portal-section-head">
          <h2 id="consultar-title">Para consultar</h2>
          <p>Cuando lo necesites, en sala o antes de atender.</p>
        </div>
        <div className="portal-grid">
          {showModel
            ? <Tile to="/academia?tab=modelo" icon={<Target size={22} />} title="Modelo CONSULTA" text={`${consultaDetailed.length} principios: qué hacer, qué evitar y cómo decirlo.`} />
            : <Tile to="/academia?tab=modelo" icon={<Target size={22} />} title="Sello de Experiencia" text="Lo que hace que la experiencia se cumpla detrás de escena." />}
          {playbooks > 0 && <Tile to="/academia?tab=playbooks" icon={<BookOpen size={22} />} title="Playbooks" text={`${playbooks} guías paso a paso para cada etapa de la atención.`} />}
          {library > 0 && <Tile to="/academia?tab=biblioteca" icon={<Library size={22} />} title="Biblioteca" text={`${library} materiales para descargar o revisar.`} />}
          {resources?.carpetaUrl && <Tile href={resources.carpetaUrl} icon={<FolderOpen size={22} />} title="Carpeta de recursos" text="Fichas, instructivos y todo el material en SharePoint." />}
        </div>
      </section>
    </div>
  )
}

function CourseSection({ id, title, subtitle, items, email }: { id: string; title: string; subtitle: string; items: AcademyCourse[]; email: string }) {
  return (
    <section className="portal-section" aria-labelledby={`${id}-title`}>
      <div className="portal-section-head">
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="ah-courses">
        {items.map((course) => {
          const progress = getCourseProgress(course)
          const state = courseState(course, email)
          const modules = course.modules.filter((m) => m.available).length
          return (
            <Link key={course.id} to={courseHome(course.id)} className={`ah-course ${state.toLowerCase()}`}>
              <span className="ah-course-top">
                <span className="portal-tile-icon">{state === "COMPLETADO" ? <CheckCircle2 size={20} /> : <GraduationCap size={20} />}</span>
                <span className={`ah-chip ${state.toLowerCase()}`}>{STATE_LABEL[state]}</span>
                {course.new && <span className="ah-chip nuevo">Nuevo</span>}
              </span>
              <strong>{course.title}</strong>
              <small>{course.description}</small>
              <span className="ah-meta"><Clock3 size={14} /> {course.duration} min · {modules} módulo{modules === 1 ? "" : "s"}</span>
              <span className="ah-bar" aria-label={`Avance ${progress}%`}><i style={{ width: `${progress}%` }} /></span>
              <span className="ah-course-foot">{progress}% <ArrowRight size={16} /></span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function Tile({ to, href, icon, title, text }: { to?: string; href?: string; icon: ReactNode; title: string; text: string }) {
  const body = (
    <>
      <span className="portal-tile-icon">{icon}</span>
      <span className="portal-tile-text"><strong>{title}</strong><span>{text}</span></span>
      {href ? <ArrowUpRight size={18} className="portal-tile-arrow" /> : <ArrowRight size={18} className="portal-tile-arrow" />}
    </>
  )
  return (
    <article className="portal-tile">
      {href ? <a className="portal-tile-link" href={href} target="_blank" rel="noopener noreferrer">{body}</a> : <Link className="portal-tile-link" to={to!}>{body}</Link>}
    </article>
  )
}
