"use client";

import { useState } from "react";

export default function NuevoCasoMARO() {
  const [unidad, setUnidad] = useState("");
  const [nivel, setNivel] = useState("");
  const [programa, setPrograma] = useState("");
  const [reportante, setReportante] = useState("");
  const [rol, setRol] = useState("");
  const [motivo, setMotivo] = useState("");
  const [resultado, setResultado] = useState<null | "verde" | "ambar" | "rojo">(null);

  function evaluarProcedencia() {
    if (!unidad || !nivel || !reportante || !rol || !motivo) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    // Lógica inicial simple (luego se refina con triggers)
    if (nivel === "1" && motivo === "Solicitud preventiva justificada") {
      setResultado("verde");
    } else if (motivo === "Duda en conducta clínica") {
      setResultado("ambar");
    } else {
      setResultado("rojo");
    }
  }

  return (
    <main style={{ padding: 40, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ color: "#006657" }}>MARO</h1>
      <p>
        <strong>Modelo de Atención y Respuesta Obstétrica</strong><br />
        Solicitud de colegiación de caso obstétrico
      </p>

      {/* Unidad */}
      <section style={{ marginTop: 30 }}>
        <h3>Datos de la unidad solicitante</h3>
        <input
          placeholder="Unidad que reporta"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          style={inputStyle}
        />

        <select value={nivel} onChange={(e) => setNivel(e.target.value)} style={inputStyle}>
          <option value="">Nivel de atención</option>
          <option value="1">Primer nivel</option>
          <option value="2">Segundo nivel</option>
          <option value="3">Tercer nivel</option>
        </select>

        <input
          placeholder="Programa (opcional)"
          value={programa}
          onChange={(e) => setPrograma(e.target.value)}
          style={inputStyle}
        />
      </section>

      {/* Reportante */}
      <section style={{ marginTop: 30 }}>
        <h3>Datos del reportante</h3>
        <input
          placeholder="Nombre del responsable"
          value={reportante}
          onChange={(e) => setReportante(e.target.value)}
          style={inputStyle}
        />

        <select value={rol} onChange={(e) => setRol(e.target.value)} style={inputStyle}>
          <option value="">Rol del reportante</option>
          <option value="Medico">Médico tratante</option>
          <option value="Coordinador">Coordinador médico</option>
          <option value="Enfermeria">Enfermería</option>
          <option value="Directivo">Directivo</option>
        </select>
      </section>

      {/* Justificación */}
      <section style={{ marginTop: 30 }}>
        <h3>Justificación de colegiación</h3>
        <select value={motivo} onChange={(e) => setMotivo(e.target.value)} style={inputStyle}>
          <option value="">Motivo principal</option>
          <option value="Emergencia obstetrica activa">Emergencia obstétrica activa</option>
          <option value="Falla capacidad resolutiva">Falla en capacidad resolutiva</option>
          <option value="Duda en conducta clinica">Duda en conducta clínica</option>
          <option value="Riesgo inminente">Riesgo materno o fetal inminente</option>
          <option value="Solicitud preventiva justificada">Solicitud preventiva justificada</option>
        </select>
      </section>

      <button onClick={evaluarProcedencia} style={buttonStyle}>
        Evaluar procedencia
      </button>

      {/* Resultado */}
      {resultado === "verde" && (
        <p style={{ color: "#2e7d32", marginTop: 20 }}>
          🟢 Este caso puede resolverse en su nivel de atención. No procede colegiación.
        </p>
      )}

      {resultado === "ambar" && (
        <p style={{ color: "#f9a825", marginTop: 20 }}>
          🟡 Se requiere ampliar información clínica antes de proceder.
        </p>
      )}

      {resultado === "rojo" && (
        <div style={{ marginTop: 20 }}>
          <p style={{ color: "#8e0038" }}>
            🔴 Procede registro de Caso MARO para análisis colegiado.
          </p>
          <button style={buttonStyle}>
            Registrar nuevo Caso MARO
          </button>
        </div>
      )}
    </main>
  );
}

const inputStyle = {
  display: "block",
  marginTop: 10,
  padding: 10,
  width: "100%",
  backgroundColor: "white",
  color: "black",
};

const buttonStyle = {
  marginTop: 30,
  padding: "12px 20px",
  fontSize: 16,
  cursor: "pointer",
  backgroundColor: "#006657",
  color: "white",
  border: "none",
};
