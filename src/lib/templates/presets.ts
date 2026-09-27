import type { Template } from "./types";

/**
 * Plantillas incluidas. Los `hint` son parte del prompt: describen a la IA
 * qué información pertenece a cada campo, así que conviene que sean precisos.
 */
export const PRESET_TEMPLATES: Template[] = [
  {
    id: "soap-breve",
    name: "Nota SOAP",
    description: "Formato SOAP compacto: un bloque por sección. Ideal para consultas de seguimiento.",
    specialty: "General",
    builtIn: true,
    fields: [
      { key: "subjetivo", label: "Subjetivo", hint: "Motivo de consulta, síntomas expresados por el paciente, antecedentes y medicación relevantes.", type: "text", section: "S · Subjetivo" },
      { key: "objetivo", label: "Objetivo", hint: "Signos vitales, hallazgos de la exploración física y resultados disponibles.", type: "text", section: "O · Objetivo" },
      { key: "analisis", label: "Análisis", hint: "Impresión diagnóstica, razonamiento clínico.", type: "text", section: "A · Análisis" },
      { key: "plan_general", label: "Plan", hint: "Tratamiento con dosis, exámenes solicitados, indicaciones y seguimiento.", type: "text", section: "P · Plan" },
    ],
  },
  {
    id: "soap",
    name: "Nota SOAP detallada",
    description: "SOAP con campos separados: signos vitales, diagnósticos, tratamiento y estudios por separado.",
    specialty: "General",
    builtIn: true,
    fields: [
      { key: "motivo_consulta", label: "Motivo de consulta", hint: "Razón principal de la visita, en palabras breves.", type: "text", section: "S · Subjetivo" },
      { key: "subjetivo", label: "Padecimiento actual", hint: "Síntomas referidos por el paciente: inicio, evolución, características, factores que agravan o alivian.", type: "text", section: "S · Subjetivo" },
      { key: "antecedentes_relevantes", label: "Antecedentes relevantes", hint: "Antecedentes personales, alergias y medicación actual mencionados.", type: "list", section: "S · Subjetivo" },
      { key: "signos_vitales", label: "Signos vitales", hint: "TA, FC, FR, temperatura, SatO2, peso, talla, solo si se mencionan con valor.", type: "list", section: "O · Objetivo" },
      { key: "exploracion_fisica", label: "Exploración física", hint: "Hallazgos de la exploración descritos por el médico.", type: "text", section: "O · Objetivo" },
      { key: "analisis", label: "Análisis", hint: "Razonamiento clínico e impresión diagnóstica del médico.", type: "text", section: "A · Análisis" },
      { key: "diagnosticos", label: "Diagnósticos", hint: "Diagnósticos presuntivos o confirmados, uno por elemento.", type: "list", section: "A · Análisis" },
      { key: "plan_tratamiento", label: "Tratamiento", hint: "Medicamentos con dosis, vía, frecuencia y duración, exactamente como los indicó el médico.", type: "list", section: "P · Plan" },
      { key: "estudios_solicitados", label: "Estudios solicitados", hint: "Laboratorios, imagen u otros estudios indicados.", type: "list", section: "P · Plan" },
      { key: "indicaciones_seguimiento", label: "Indicaciones y seguimiento", hint: "Recomendaciones al paciente, signos de alarma y fecha de próxima cita.", type: "text", section: "P · Plan" },
    ],
  },
  {
    id: "historia-clinica",
    name: "Historia clínica",
    description: "Primera consulta completa: antecedentes, interrogatorio por aparatos y exploración.",
    specialty: "General",
    builtIn: true,
    fields: [
      { key: "ficha_identificacion", label: "Ficha de identificación", hint: "Edad, sexo, ocupación y otros datos demográficos mencionados. No inventes nombres.", type: "text", section: "Identificación" },
      { key: "motivo_consulta", label: "Motivo de consulta", hint: "Razón principal de la visita.", type: "text", section: "Identificación" },
      { key: "antecedentes_heredofamiliares", label: "Antecedentes heredofamiliares", hint: "Enfermedades en familiares y parentesco.", type: "list", section: "Antecedentes" },
      { key: "antecedentes_personales_no_patologicos", label: "Antecedentes personales no patológicos", hint: "Tabaquismo, alcohol, actividad física, alimentación, vivienda, vacunación.", type: "list", section: "Antecedentes" },
      { key: "antecedentes_personales_patologicos", label: "Antecedentes personales patológicos", hint: "Enfermedades crónicas, cirugías, hospitalizaciones, traumatismos, alergias, transfusiones.", type: "list", section: "Antecedentes" },
      { key: "medicacion_actual", label: "Medicación actual", hint: "Medicamentos que el paciente toma actualmente con dosis si se menciona.", type: "list", section: "Antecedentes" },
      { key: "padecimiento_actual", label: "Padecimiento actual", hint: "Relato cronológico del problema actual.", type: "text", section: "Padecimiento" },
      { key: "interrogatorio_aparatos_sistemas", label: "Interrogatorio por aparatos y sistemas", hint: "Síntomas positivos y negativos pertinentes por sistema.", type: "list", section: "Padecimiento" },
      { key: "signos_vitales", label: "Signos vitales", hint: "Valores medidos mencionados.", type: "list", section: "Exploración" },
      { key: "exploracion_fisica", label: "Exploración física", hint: "Hallazgos por región.", type: "text", section: "Exploración" },
      { key: "impresion_diagnostica", label: "Impresión diagnóstica", hint: "Diagnósticos presuntivos.", type: "list", section: "Conclusión" },
      { key: "plan", label: "Plan", hint: "Tratamiento, estudios y seguimiento indicados.", type: "list", section: "Conclusión" },
    ],
  },
  {
    id: "nota-evolucion",
    name: "Nota de evolución",
    description: "Seguimiento de un paciente conocido: cambios desde la última visita y ajustes al plan.",
    specialty: "General",
    builtIn: true,
    fields: [
      { key: "resumen_evolucion", label: "Evolución", hint: "Cómo ha evolucionado el paciente desde la última valoración.", type: "text" },
      { key: "adherencia", label: "Adherencia y tolerancia al tratamiento", hint: "Si toma el tratamiento, efectos adversos referidos.", type: "text" },
      { key: "signos_vitales", label: "Signos vitales", hint: "Valores medidos mencionados.", type: "list" },
      { key: "exploracion_fisica", label: "Exploración física", hint: "Hallazgos actuales.", type: "text" },
      { key: "resultados_estudios", label: "Resultados de estudios", hint: "Resultados de laboratorio o gabinete comentados, con valores.", type: "list" },
      { key: "diagnosticos", label: "Diagnósticos", hint: "Diagnósticos vigentes.", type: "list" },
      { key: "ajustes_plan", label: "Ajustes al plan", hint: "Cambios de medicación, dosis, nuevos estudios o interconsultas.", type: "list" },
      { key: "pronostico", label: "Pronóstico", hint: "Pronóstico si el médico lo expresa.", type: "text" },
    ],
  },
  {
    id: "urgencias",
    name: "Nota de urgencias",
    description: "Valoración inicial en urgencias con triaje, manejo y destino del paciente.",
    specialty: "Urgencias",
    builtIn: true,
    fields: [
      { key: "motivo_ingreso", label: "Motivo de atención", hint: "Motivo por el que acude a urgencias.", type: "text" },
      { key: "triaje", label: "Clasificación de triaje", hint: "Nivel o color de triaje si se menciona.", type: "text" },
      { key: "padecimiento_actual", label: "Padecimiento actual", hint: "Mecanismo, tiempo de evolución y síntomas.", type: "text" },
      { key: "signos_vitales", label: "Signos vitales", hint: "Valores medidos mencionados, incluida glucemia capilar y escala de Glasgow.", type: "list" },
      { key: "exploracion_fisica", label: "Exploración física", hint: "Hallazgos relevantes.", type: "text" },
      { key: "manejo_realizado", label: "Manejo en urgencias", hint: "Medicamentos, soluciones, procedimientos realizados con dosis y hora si se mencionan.", type: "list" },
      { key: "diagnosticos", label: "Diagnósticos", hint: "Diagnósticos de ingreso.", type: "list" },
      { key: "destino", label: "Destino", hint: "Alta, observación, hospitalización, traslado o quirófano.", type: "text" },
      { key: "indicaciones", label: "Indicaciones", hint: "Indicaciones al alta o al servicio receptor.", type: "list" },
    ],
  },
  {
    id: "receta",
    name: "Receta e indicaciones",
    description: "Prescripción lista para revisar: medicamentos, dosis y recomendaciones.",
    specialty: "General",
    builtIn: true,
    fields: [
      { key: "diagnostico", label: "Diagnóstico", hint: "Diagnóstico que justifica la prescripción.", type: "text" },
      { key: "medicamentos", label: "Medicamentos", hint: "Uno por elemento: nombre, presentación, dosis, vía, frecuencia y duración, tal como se dictó.", type: "list" },
      { key: "recomendaciones", label: "Recomendaciones generales", hint: "Dieta, reposo, cuidados.", type: "list" },
      { key: "signos_alarma", label: "Signos de alarma", hint: "Síntomas por los que debe acudir a urgencias.", type: "list" },
      { key: "proxima_cita", label: "Próxima cita", hint: "Fecha o plazo de seguimiento.", type: "text" },
    ],
  },
];

export function findPreset(id: string): Template | undefined {
  return PRESET_TEMPLATES.find((t) => t.id === id);
}
