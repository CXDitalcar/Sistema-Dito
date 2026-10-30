type BrandProps = {
  large?: boolean
}

export default function Brand({ large = false }: BrandProps) {
  return (
    <div className={`brand ${large ? "brand-large" : ""}`}>
      <img
        src="/assets/logo-ditalcar-blanco.png"
        alt="Ditalcar"
        className="brand-logo"
      />

      <div className="brand-copy">
        <strong>DITO</strong>
        <span>Portal interno Ditalcar</span>
      </div>
    </div>
  )
}
