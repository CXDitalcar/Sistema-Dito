import {
  ArrowRight,
  BookOpenCheck,
  CarFront,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  RefreshCw,
  Route,
  ShieldAlert,
  Sparkles,
} from "lucide-react"
import { useMemo, useState } from "react"

import {
  consultaModel,
  journeyStages,
  playbooks,
  playbookSections,
  type PlaybookId,
  type PlaybookSectionId,
  type VehicleRoute,
} from "../data/playbooksVenta"

import "./PlaybooksVenta.css"

const defaultSection: PlaybookSectionId = "momento"

export default function PlaybooksVenta() {
  const [vehicleRoute, setVehicleRoute] = useState<VehicleRoute>("NUEVOS")
  const [activePlaybookId, setActivePlaybookId] = useState<PlaybookId>("primer-contacto")
  const [activeSection, setActiveSection] = useState<PlaybookSectionId>(defaultSection)

  const activePlaybook = useMemo(
    () => playbooks.find((item) => item.id === activePlaybookId) ?? playbooks[0],
    [activePlaybookId]
  )

  function openPlaybook(id: PlaybookId) {
    setActivePlaybookId(id)
    setActiveSection(defaultSection)
  }

  return (
    <div className="playbooks-page">
      <section className="playbooks-hero">
        <div className="playbooks-hero-copy">
          <div className="playbooks-kicker">
            <span>PLAYBOOKS DE VENTA</span>
            <span className="playbooks-pilot">PILOTO VESPUCIO</span>
          </div>

          <h1>
            Una experiencia conectada por el
            <em> viaje del cliente.</em>
          </h1>

          <p>
            Los playbooks acompañan la atención desde el primer interés hasta la relación posterior,
            manteniendo un mismo lenguaje Ditalcar y distinguiendo la ruta de vehículos nuevos y usados.
          </p>
        </div>

        <div className="playbooks-route-selector" aria-label="Tipo de vehículo">
          <span>RUTA</span>
          <div className="playbooks-segmented-control">
            <button
              type="button"
              className={vehicleRoute === "NUEVOS" ? "active" : ""}
              onClick={() => setVehicleRoute("NUEVOS")}
            >
              <CarFront size={17} />
              Nuevos
            </button>
            <button
              type="button"
              className={vehicleRoute === "USADOS" ? "active" : ""}
              onClick={() => setVehicleRoute("USADOS")}
            >
              <RefreshCw size={16} />
              Usados
            </button>
          </div>
        </div>
      </section>

      <section className="playbooks-journey-panel">
        <div className="playbooks-section-heading">
          <div>
            <span className="eyebrow">VIAJE DEL CLIENTE</span>
            <h2>La atención se entiende como una sola ruta</h2>
          </div>
          <div className="playbooks-route-chip">
            {vehicleRoute === "NUEVOS" ? "Vehículo nuevo" : "Vehículo usado"}
          </div>
        </div>

        <div className="playbooks-journey">
          <div className="playbooks-journey-line" />

          {journeyStages.map((stage) => {
            const selected = stage.playbookId === activePlaybookId
            const clickable = Boolean(stage.playbookId)

            return (
              <button
                type="button"
                key={stage.id}
                className={`playbooks-stage ${selected ? "selected" : ""} ${stage.outcome ? "outcome" : ""}`}
                disabled={!clickable}
                onClick={() => stage.playbookId && openPlaybook(stage.playbookId)}
              >
                <div className="playbooks-stage-top">
                  <span className="playbooks-stage-number">0{stage.number}</span>
                  {stage.outcome ? <Sparkles size={17} /> : <CircleDot size={17} />}
                </div>

                <span className="playbooks-stage-journey">{stage.journey}</span>
                <strong>{stage.title}</strong>
                <p>{stage.description}</p>

                {clickable ? (
                  <span className="playbooks-stage-link">
                    Abrir playbook <ChevronRight size={14} />
                  </span>
                ) : (
                  <span className="playbooks-stage-result">Resultado esperado</span>
                )}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className={`playbooks-claims-rail ${activePlaybookId === "reclamos" ? "active" : ""}`}
          onClick={() => openPlaybook("reclamos")}
        >
          <span className="playbooks-claims-icon">
            <ShieldAlert size={19} />
          </span>
          <span>
            <small>TRANSVERSAL A TODO EL VIAJE</small>
            <strong>Reclamos y recuperación de la experiencia</strong>
          </span>
          <span className="playbooks-claims-moments">
            Primer contacto · Orientación · Espera · Entrega · Postventa
          </span>
          <ArrowRight size={18} />
        </button>
      </section>

      <section className="playbooks-consulta-panel">
        <div className="playbooks-consulta-heading">
          <div className="playbooks-consulta-title">
            <Route size={20} />
            <div>
              <span className="eyebrow">LENGUAJE COMÚN</span>
              <h2>CONSULTA</h2>
            </div>
          </div>
          <p>El modelo se mantiene como criterio transversal de atención, especialmente en orientación y sugerencia.</p>
        </div>

        <div className="playbooks-consulta-grid">
          {consultaModel.map((item) => (
            <div className="playbooks-consulta-item" key={item.letter}>
              <span>{item.letter}</span>
              <p>{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="playbooks-workspace">
        <div className="playbooks-workspace-head">
          <div>
            <span className="eyebrow">{activePlaybook.eyebrow}</span>
            <h2>{activePlaybook.title}</h2>
            <p>{activePlaybook.intro}</p>
          </div>

          <div className="playbooks-workspace-badges">
            <span>{activePlaybook.journeyMoment}</span>
            {activePlaybook.transversal && <span className="danger">Transversal</span>}
            {activePlaybook.consulta && <span className="consulta">CONSULTA</span>}
          </div>
        </div>

        <div className="playbooks-route-differences">
          <div className="playbooks-differences-title">
            <CarFront size={18} />
            <div>
              <span>RUTA ACTIVA</span>
              <strong>{vehicleRoute === "NUEVOS" ? "Vehículos nuevos" : "Vehículos usados"}</strong>
            </div>
          </div>

          <div className="playbooks-difference-list">
            {activePlaybook.routeNotes[vehicleRoute].map((note) => (
              <div key={note}>
                <CheckCircle2 size={15} />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="playbooks-detail-layout">
          <aside className="playbooks-section-nav">
            <span className="playbooks-section-nav-title">ESTRUCTURA DEL PLAYBOOK</span>
            {playbookSections.map((section) => (
              <button
                type="button"
                key={section.id}
                className={activeSection === section.id ? "active" : ""}
                onClick={() => setActiveSection(section.id)}
              >
                <span>{String(section.number).padStart(2, "0")}</span>
                <strong>{section.shortTitle}</strong>
                <ChevronRight size={14} />
              </button>
            ))}
          </aside>

          <PlaybookContent
            playbookId={activePlaybook.id}
            sectionId={activeSection}
            vehicleRoute={vehicleRoute}
            journeyMoment={activePlaybook.journeyMoment}
            objective={activePlaybook.objective}
          />
        </div>
      </section>

      <section className="playbooks-outcome-panel">
        <div className="playbooks-outcome-icon">
          <Sparkles size={22} />
        </div>
        <div>
          <span className="eyebrow">RESULTADO FINAL</span>
          <h2>Fidelización, renovación y construcción de cartera</h2>
          <p>
            El objetivo no termina con la entrega: cada etapa debe dejar confianza, un próximo compromiso claro
            y una relación que facilite el seguimiento y una futura recompra.
          </p>
        </div>
      </section>
    </div>
  )
}

function PlaybookContent({
  playbookId,
  sectionId,
  vehicleRoute,
  journeyMoment,
  objective,
}: {
  playbookId: PlaybookId
  sectionId: PlaybookSectionId
  vehicleRoute: VehicleRoute
  journeyMoment: string
  objective: string
}) {
  const section = playbookSections.find((item) => item.id === sectionId) ?? playbookSections[0]

  const knownContent = getKnownContent(playbookId, sectionId, journeyMoment, objective)

  return (
    <article className="playbooks-content-card">
      <div className="playbooks-content-head">
        <div className="playbooks-content-number">{String(section.number).padStart(2, "0")}</div>
        <div>
          <span className="eyebrow">FICHA INTERACTIVA</span>
          <h3>{section.title}</h3>
        </div>
      </div>

      {knownContent ? (
        <div className="playbooks-known-content">
          <p>{knownContent}</p>
        </div>
      ) : (
        <div className="playbooks-placeholder">
          <BookOpenCheck size={26} />
          <div>
            <strong>Espacio preparado para validación</strong>
            <p>
              Este contenido se completará en la revisión específica del playbook. La estructura ya queda lista
              para mantener el mismo formato en todas las etapas.
            </p>
          </div>
        </div>
      )}

      <div className="playbooks-content-footer">
        <div>
          <span>Ruta seleccionada</span>
          <strong>{vehicleRoute === "NUEVOS" ? "Nuevos" : "Usados"}</strong>
        </div>
        <div>
          <span>Estado de contenido</span>
          <strong>Por validar</strong>
        </div>
      </div>
    </article>
  )
}

function getKnownContent(
  playbookId: PlaybookId,
  sectionId: PlaybookSectionId,
  journeyMoment: string,
  objective: string
) {
  if (sectionId === "momento") {
    return journeyMoment
  }

  if (sectionId === "objetivo") {
    return objective
  }

  if (playbookId === "reclamos" && sectionId === "cliente") {
    return "El cliente puede llegar confundido, frustrado o con pérdida de confianza. El contenido específico se validará al construir este playbook."
  }

  if (playbookId === "orientacion-sugerencia" && sectionId === "conductas") {
    return "Esta sección utilizará CONSULTA como estructura principal de conductas esperadas. El detalle se validará paso a paso."
  }

  if (playbookId === "entrega" && sectionId === "pasos") {
    return "La secuencia comenzará desde la confirmación de compra e incluirá la espera, preparación, coordinación y entrega. Los pasos concretos se validarán después."
  }

  return ""
}
