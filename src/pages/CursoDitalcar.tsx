import { useEffect, useState } from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ClipboardCheck, Clock3, Flag, GraduationCap,
  Lightbulb, ListChecks, LockKeyhole, PlayCircle, TriangleAlert, Video,
} from "lucide-react"
import AcademyFeedbackPanel from "../components/AcademyFeedbackPanel"
import { juniorPlaybooks, salesPlaybooks, type AcademyCourse, type CourseModule } from "../data/academiaData"
import { getCompletedModules, getCourseProgress, getEvaluationAttempts, markCourseModuleComplete } from "../services/academyStore"
import { courseHome, courseState, courseStep, nextModuleOf, visibleAcademy } from "../services/academyVisibility"
import type { UserScope } from "../types"
import "./CursoDitalcar.css"

// Nombres visibles de los playbooks relacionados (en los datos vienen por id).
function playbookNames(course: AcademyCourse) {
  const all = [...salesPlaybooks, ...juniorPlaybooks]
  return (course.relatedPlaybooks ?? []).map((id) => all.find((p) => p.id === id)?.title ?? id)
}

// Curso como experiencia propia: portada → módulos uno a uno (con video si lo tiene) → cierre.
export default function CursoDitalcar({ currentUser }: { currentUser: UserScope }) {
  const { courseId = "", step } = useParams()
  const [, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)
  const { courses, assigned, evaluations } = visibleAcademy(currentUser)
  const course = courses.find((c) => c.id === courseId)

  useEffect(() => { window.scrollTo(0, 0) }, [courseId, step])

  if (!course) return <Navigate to="/academia-ditalcar" replace />
  const isAssigned = assigned.includes(course)
  const relatedEvaluations = evaluations.filter((e) => e.relatedCourseIds.includes(course.id))

  if (step === "fin") return <CourseEnd course={course} currentUser={currentUser} required={isAssigned} evaluations={relatedEvaluations} onSaved={refresh} />
  if (step) {
    const index = course.modules.findIndex((m) => m.id === step)
    const module = course.modules[index]
    if (!module || !module.available) return <Navigate to={courseHome(course.id)} replace />
    return <Lesson course={course} module={module} index={index} onDone={refresh} />
  }
  return <CourseCover course={course} currentUser={currentUser} assigned={isAssigned} hasEvaluation={relatedEvaluations.length > 0} />
}

/* ---------------- Portada del curso ---------------- */
function CourseCover({ course, currentUser, assigned, hasEvaluation }: { course: AcademyCourse; currentUser: UserScope; assigned: boolean; hasEvaluation: boolean }) {
  const progress = getCourseProgress(course)
  const state = courseState(course, currentUser.email)
  const done = getCompletedModules(course.id)
  const next = nextModuleOf(course)
  const available = course.modules.filter((m) => m.available)
  const videos = available.filter((m) => m.video).length

  const cta = state === "PENDIENTE" && next
    ? { to: courseStep(course.id, next.id), label: "Entrar al curso", hint: `Comienza por: ${next.title}` }
    : next
      ? { to: courseStep(course.id, next.id), label: "Continuar donde quedaste", hint: `Módulo ${course.modules.indexOf(next) + 1}: ${next.title}` }
      : state === "ENCUESTA"
        ? { to: courseStep(course.id, "fin"), label: "Cerrar el curso", hint: "Falta tu opinión (1 minuto)" }
        : available[0]
          ? { to: courseStep(course.id, available[0].id), label: "Repasar el curso", hint: "Ya lo completaste: vuelve a verlo cuando quieras" }
          : null

  return (
    <div className="curso-page">
      <section className="curso-cover">
        <div className="curso-chips">
          <span className="curso-chip">{assigned ? "Asignado para tu cargo" : "Opcional"}</span>
          {course.new && <span className="curso-chip rojo">Nuevo</span>}
          {state === "COMPLETADO" && <span className="curso-chip ok"><Check size={13} /> Completado</span>}
        </div>
        <h1>{course.title}</h1>
        <p className="curso-lead">{course.description}</p>
        <div className="curso-meta">
          <span><Clock3 size={16} /> {course.duration} min en total</span>
          <span><ListChecks size={16} /> {available.length} módulo{available.length === 1 ? "" : "s"}</span>
          {videos > 0 && <span><Video size={16} /> {videos} con video</span>}
        </div>
        {progress > 0 && (
          <div className="curso-progress" aria-label={`Avance ${progress}%`}>
            <div><i style={{ width: `${progress}%` }} /></div>
            <strong>{progress}%</strong>
          </div>
        )}
        {cta && (
          <Link to={cta.to} className="curso-cta">
            <PlayCircle size={26} />
            <span><strong>{cta.label}</strong><small>{cta.hint}</small></span>
            <ArrowRight size={20} />
          </Link>
        )}
      </section>

      <section className="curso-section" aria-labelledby="temario">
        <h2 id="temario">Qué vas a aprender</h2>
        <ol className="curso-syllabus">
          {course.modules.map((m, i) => {
            const completed = done.includes(m.id)
            const body = (
              <>
                <span className={`curso-num ${completed ? "ok" : ""}`}>{completed ? <Check size={15} /> : m.available ? i + 1 : <LockKeyhole size={14} />}</span>
                <span className="curso-syl-text">
                  <strong>{m.title}</strong>
                  <small>{m.available ? <>{m.video && <><Video size={13} /> Video · </>}{m.duration} min{completed ? " · visto" : ""}</> : `En construcción${m.releaseLabel ? ` · ${m.releaseLabel}` : ""}`}</small>
                </span>
                {m.available && <ArrowRight size={17} className="curso-syl-arrow" />}
              </>
            )
            return (
              <li key={m.id} className={m.available ? "" : "locked"}>
                {m.available ? <Link to={courseStep(course.id, m.id)}>{body}</Link> : <div>{body}</div>}
              </li>
            )
          })}
        </ol>
      </section>

      <section className="curso-section curso-after">
        <h2>Al terminar</h2>
        <ul>
          <li><CheckCircle2 size={18} /> Nos cuentas en 1 minuto si te sirvió{assigned ? " (necesario para completar el curso)" : ""}.</li>
          {hasEvaluation && <li><ClipboardCheck size={18} /> Tienes una evaluación para comprobar lo aprendido.</li>}
          {playbookNames(course).length ? <li><BookOpen size={18} /> Para repasar en sala: {playbookNames(course).join(" · ")}.</li> : null}
        </ul>
      </section>
    </div>
  )
}

/* ---------------- Módulo (lección) ---------------- */
function Lesson({ course, module, index, onDone }: { course: AcademyCourse; module: CourseModule; index: number; onDone: () => void }) {
  const navigate = useNavigate()
  const done = getCompletedModules(course.id)
  const available = course.modules.filter((m) => m.available)
  const position = available.indexOf(module)
  const prev = available[position - 1]
  const nextAvailable = available[position + 1]
  const completed = done.includes(module.id)

  function finish() {
    markCourseModuleComplete(course.id, module.id)
    onDone()
    navigate(nextAvailable ? courseStep(course.id, nextAvailable.id) : courseStep(course.id, "fin"))
  }

  return (
    <div className="curso-page curso-lesson-page">
      <div className="curso-lesson-top">
        <Link to={courseHome(course.id)} className="curso-exit"><ArrowLeft size={17} /> {course.title}</Link>
        <div className="curso-steps" aria-label={`Módulo ${position + 1} de ${available.length}`}>
          {available.map((m, i) => (
            <Link key={m.id} to={courseStep(course.id, m.id)} aria-label={`Módulo ${i + 1}: ${m.title}`}
              className={`${m.id === module.id ? "actual" : ""} ${done.includes(m.id) ? "ok" : ""}`} />
          ))}
        </div>
      </div>

      <div className="curso-lesson-grid">
        <article className="curso-lesson">
          <span className="curso-eyebrow">MÓDULO {index + 1} DE {course.modules.length} · {module.duration} MIN</span>
          <h1>{module.title}</h1>

          {module.video && <VideoBlock url={module.video} title={module.title} />}

          {module.highlight && (
            <div className="curso-key">
              <Lightbulb size={22} />
              <div><small>Idea clave</small><p>{module.highlight}</p></div>
            </div>
          )}

          <p className="curso-text">{module.detail}</p>

          {module.bullets?.length ? (
            <div className="curso-how">
              <h2>Cómo hacerlo</h2>
              <ol>{module.bullets.map((b, i) => <li key={b}><span>{i + 1}</span><p>{b}</p></li>)}</ol>
            </div>
          ) : null}

          {module.note && (
            <div className="curso-note"><TriangleAlert size={19} /><p>{module.note}</p></div>
          )}
        </article>

        <aside className="curso-side" aria-label="Módulos del curso">
          <strong>En este curso</strong>
          <ol>
            {course.modules.map((m, i) => (
              <li key={m.id} className={`${m.id === module.id ? "actual" : ""} ${m.available ? "" : "locked"}`}>
                {m.available ? (
                  <Link to={courseStep(course.id, m.id)}>
                    <span className={`curso-num sm ${done.includes(m.id) ? "ok" : ""}`}>{done.includes(m.id) ? <Check size={12} /> : i + 1}</span>
                    {m.title}
                  </Link>
                ) : <div><span className="curso-num sm"><LockKeyhole size={11} /></span>{m.title}</div>}
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <nav className="curso-nav" aria-label="Avanzar en el curso">
        <div className="curso-nav-inner">
          {prev ? <Link to={courseStep(course.id, prev.id)} className="curso-nav-prev"><ArrowLeft size={18} /> <span>Anterior</span></Link> : <span />}
          <button type="button" className="curso-nav-next" onClick={finish}>
            {nextAvailable ? (completed ? "Siguiente módulo" : "Entendido, siguiente") : (completed ? "Ir al cierre" : "Terminar el curso")}
            {nextAvailable ? <ArrowRight size={19} /> : <Flag size={18} />}
          </button>
        </div>
      </nav>
    </div>
  )
}

/* ---------------- Cierre del curso ---------------- */
function CourseEnd({ course, currentUser, required, evaluations, onSaved }: {
  course: AcademyCourse; currentUser: UserScope; required: boolean
  evaluations: ReturnType<typeof visibleAcademy>["evaluations"]; onSaved: () => void
}) {
  const next = nextModuleOf(course)
  const state = courseState(course, currentUser.email)
  if (next) return <Navigate to={courseStep(course.id, next.id)} replace />
  const pendingEvals = evaluations.filter((e) => {
    const attempts = getEvaluationAttempts(e.id)
    return !attempts.some((a) => a.passed) && attempts.length < e.attempts
  })

  return (
    <div className="curso-page">
      <section className="curso-cover curso-end">
        <span className="curso-end-icon"><GraduationCap size={34} /></span>
        <h1>{state === "COMPLETADO" ? "¡Curso completado!" : "¡Llegaste al final!"}</h1>
        <p className="curso-lead">
          {state === "COMPLETADO"
            ? `Terminaste "${course.title}". Puedes repasarlo cuando quieras.`
            : `Viste todos los módulos de "${course.title}". ${required ? "Para completarlo, cuéntanos en 1 minuto cómo te fue." : "Si quieres, cuéntanos cómo te fue."}`}
        </p>
      </section>

      <section className="curso-section curso-survey">
        <AcademyFeedbackPanel contentId={course.id} contentType="CURSO" currentUser={currentUser} required={required} onSaved={onSaved} />
      </section>

      <section className="curso-section">
        <h2>Lo que sigue</h2>
        <div className="curso-next-grid">
          {pendingEvals.map((e) => (
            <Link key={e.id} to="/academia?tab=evaluaciones" className="curso-next-card">
              <ClipboardCheck size={22} />
              <span><strong>{e.title}</strong><small>{e.duration} min · comprueba lo aprendido</small></span>
              <ArrowRight size={18} />
            </Link>
          ))}
          {course.relatedPlaybooks?.length ? (
            <Link to="/academia?tab=playbooks" className="curso-next-card">
              <BookOpen size={22} />
              <span><strong>Repasar en los Playbooks</strong><small>{playbookNames(course).join(" · ")}</small></span>
              <ArrowRight size={18} />
            </Link>
          ) : null}
          <Link to="/academia-ditalcar" className="curso-next-card">
            <GraduationCap size={22} />
            <span><strong>Volver a Academia</strong><small>Tus cursos y tu avance</small></span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}

/* ---------------- Video ---------------- */
// Acepta YouTube, Vimeo, Microsoft Stream/SharePoint (link de inserción) o un archivo .mp4/.webm.
export function videoSource(url: string): { kind: "file" | "embed"; src: string } {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i)
  if (yt) return { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vimeo) return { kind: "embed", src: `https://player.vimeo.com/video/${vimeo[1]}` }
  if (/\.(mp4|webm|m4v)(\?|$)/i.test(url)) return { kind: "file", src: url }
  return { kind: "embed", src: url }
}

function VideoBlock({ url, title }: { url: string; title: string }) {
  const source = videoSource(url)
  return (
    <div className="curso-video">
      {source.kind === "file"
        ? <video src={source.src} controls preload="metadata" playsInline />
        : <iframe src={source.src} title={`Video: ${title}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />}
    </div>
  )
}
