import type {
  ReactNode,
} from "react"

import {
  ArrowLeft,
  Package,
  Sparkles,
} from "lucide-react"

import {
  useNavigate,
} from "react-router-dom"

import type {
  UserScope,
} from "../types"


type PedidoInsumosProps = {
  currentUser?: UserScope
  branch?: string
}


export default function PedidoInsumos({
  currentUser,
  branch,
}: PedidoInsumosProps) {
  const navigate =
    useNavigate()


  const local =
    currentUser?.local ??
    branch ??
    "Vespucio"


  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1300px",
        margin: "0 auto",
        paddingBottom: "40px",
      }}
    >

      {/* ==================================================
          VOLVER
      ================================================== */}

      <button
        type="button"
        onClick={() =>
          navigate(
            "/solicitudes"
          )
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          marginBottom: "24px",
          padding: 0,
          border: 0,
          background: "transparent",
          color: "#99999f",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "12px",
          fontWeight: 700,
        }}
      >
        <ArrowLeft
          size={17}
        />

        Volver a solicitudes
      </button>


      {/* ==================================================
          CABECERA
      ================================================== */}

      <div
        style={{
          marginBottom: "28px",
        }}
      >

        <div className="eyebrow">
          INSUMOS Y SHOWROOM
        </div>


        <h1
          style={{
            margin: "7px 0 9px",
            color: "#ffffff",
            fontSize: "42px",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          Pedido de insumos
        </h1>


        <p
          style={{
            maxWidth: "700px",
            margin: 0,
            color: "#929297",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          Revisa el stock actual del
          local y prepara el pedido
          sugerido para reposición.
        </p>

      </div>


      {/* ==================================================
          DATOS GENERALES
      ================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >

        <InfoCard
          label="Local"
          value={local}
          icon={
            <Package
              size={19}
            />
          }
        />


        <InfoCard
          label="Modelo"
          value="Inicial · sin histórico local"
          icon={
            <Sparkles
              size={19}
            />
          }
        />

      </div>


      {/* ==================================================
          PILOTO
      ================================================== */}

      <div
        style={{
          padding: "24px",
          border:
            "1px solid rgba(255,255,255,0.08)",
          borderRadius: "18px",
          background:
            "radial-gradient(circle at 100% 0%, rgba(227,23,47,0.08), transparent 34%), linear-gradient(145deg, #151518, #0d0d0f)",
        }}
      >

        <div className="eyebrow">
          PILOTO VESPUCIO
        </div>


        <h2
          style={{
            margin: "7px 0 9px",
            color: "#ffffff",
            fontSize: "22px",
            letterSpacing: "-0.02em",
          }}
        >
          Pedido inteligente de insumos
        </h2>


        <p
          style={{
            margin: 0,
            maxWidth: "760px",
            color: "#929297",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          Esta pantalla quedará conectada
          con el catálogo y stock de
          Microsoft Lists para mostrar
          stock actual, objetivo,
          cantidad sugerida y cantidad
          final editable antes de enviar
          la solicitud.
        </p>

      </div>

    </div>
  )
}


// ======================================================
// TARJETA DE INFORMACIÓN
// ======================================================

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "13px",
        padding: "16px",
        border:
          "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        background: "#121214",
      }}
    >

      <div
        style={{
          display: "grid",
          placeItems: "center",
          width: "40px",
          height: "40px",
          flex: "0 0 auto",
          borderRadius: "11px",
          background:
            "rgba(227,23,47,0.10)",
          color: "#ef3147",
        }}
      >
        {icon}
      </div>


      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          minWidth: 0,
        }}
      >

        <span
          style={{
            color: "#77777c",
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>


        <strong
          style={{
            color: "#ffffff",
            fontSize: "13px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </strong>

      </div>

    </div>
  )
}
