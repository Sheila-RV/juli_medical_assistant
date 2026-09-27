import type { FieldValue, StructuredNote, Template } from "../templates/types";

/**
 * Modo demo: respuestas deterministas sin llamar a ninguna API.
 * Permite publicar la app y probar todo el flujo sin claves ni costos.
 */

export const DEMO_TRANSCRIPT = `Buenos días, pase por favor. Paciente femenina de 34 años, maestra, acude porque desde hace tres días tiene dolor de garganta intenso, dice que le duele al tragar, y fiebre de hasta 38.8 que baja con paracetamol. No tiene tos ni escurrimiento nasal. Niega alergias a medicamentos. Como antecedentes, hipotiroidismo en tratamiento con levotiroxina 50 microgramos al día. Su mamá es hipertensa. No fuma, alcohol ocasional.
A la exploración: temperatura 38.4, frecuencia cardiaca 96, tensión arterial 118 sobre 76, saturación 98 por ciento. Faringe hiperémica con amígdalas hipertróficas grado dos y exudado blanquecino bilateral. Adenopatías cervicales anteriores dolorosas. Campos pulmonares limpios.
Con cuatro criterios de Centor, mi impresión es faringoamigdalitis aguda probablemente estreptocócica. Vamos a darle amoxicilina 500 miligramos vía oral cada 8 horas por 10 días, e ibuprofeno 400 cada 8 horas por tres días si hay dolor o fiebre, tomado con alimentos. Le pido una prueba rápida de estreptococo. Abundantes líquidos, dieta blanda y reposo relativo dos días. Si tiene dificultad para respirar, no puede tragar saliva o la fiebre dura más de 48 horas con el antibiótico, acude a urgencias. Nos vemos en diez días para revisión.`;

const DEMO_VALUES: Record<string, FieldValue> = {
  motivo_consulta: "Odinofagia y fiebre de 3 días de evolución.",
  motivo_ingreso: "Odinofagia y fiebre de 3 días de evolución.",
  subjetivo:
    "Paciente femenina de 34 años refiere odinofagia intensa de 3 días de evolución acompañada de fiebre de hasta 38.8 °C que cede con paracetamol. Niega tos y rinorrea.",
  objetivo:
    "T 38.4 °C, FC 96 lpm, TA 118/76 mmHg, SatO2 98 %. Faringe hiperémica con amígdalas hipertróficas grado II y exudado blanquecino bilateral. Adenopatías cervicales anteriores dolorosas. Campos pulmonares limpios.",
  plan_general:
    "Amoxicilina 500 mg VO cada 8 h por 10 días. Ibuprofeno 400 mg VO cada 8 h por 3 días en caso de dolor o fiebre, con alimentos. Prueba rápida de estreptococo. Líquidos abundantes, dieta blanda y reposo relativo 2 días. Signos de alarma: dificultad respiratoria, imposibilidad para deglutir saliva o fiebre >48 h con antibiótico. Revisión en 10 días.",
  padecimiento_actual:
    "Inicia hace 3 días con odinofagia intensa y fiebre de hasta 38.8 °C con respuesta a paracetamol. Niega tos y rinorrea.",
  resumen_evolucion: "",
  ficha_identificacion: "Femenina, 34 años, maestra.",
  antecedentes_relevantes: [
    "Hipotiroidismo en tratamiento con levotiroxina 50 mcg/día",
    "Niega alergias a medicamentos",
  ],
  antecedentes_heredofamiliares: ["Madre con hipertensión arterial"],
  antecedentes_personales_no_patologicos: ["Tabaquismo negado", "Alcohol ocasional"],
  antecedentes_personales_patologicos: ["Hipotiroidismo", "Alergias a medicamentos negadas"],
  medicacion_actual: ["Levotiroxina 50 mcg VO cada 24 h"],
  interrogatorio_aparatos_sistemas: ["Respiratorio: niega tos y rinorrea"],
  signos_vitales: ["Temperatura 38.4 °C", "FC 96 lpm", "TA 118/76 mmHg", "SatO2 98 %"],
  exploracion_fisica:
    "Faringe hiperémica, amígdalas hipertróficas grado II con exudado blanquecino bilateral. Adenopatías cervicales anteriores dolorosas. Campos pulmonares bien ventilados, sin agregados.",
  analisis:
    "Cuadro de faringoamigdalitis con 4 criterios de Centor (fiebre, exudado amigdalino, adenopatías cervicales anteriores dolorosas, ausencia de tos), sugestivo de etiología estreptocócica.",
  diagnosticos: ["Faringoamigdalitis aguda, probablemente estreptocócica"],
  impresion_diagnostica: ["Faringoamigdalitis aguda, probablemente estreptocócica"],
  diagnostico: "Faringoamigdalitis aguda, probablemente estreptocócica.",
  plan_tratamiento: [
    "Amoxicilina 500 mg VO cada 8 h por 10 días",
    "Ibuprofeno 400 mg VO cada 8 h por 3 días en caso de dolor o fiebre, con alimentos",
  ],
  medicamentos: [
    "Amoxicilina 500 mg, VO, cada 8 h durante 10 días",
    "Ibuprofeno 400 mg, VO, cada 8 h durante 3 días en caso de dolor o fiebre, con alimentos",
  ],
  estudios_solicitados: ["Prueba rápida de antígeno estreptocócico"],
  plan: [
    "Amoxicilina 500 mg VO cada 8 h por 10 días",
    "Ibuprofeno 400 mg VO cada 8 h por 3 días PRN",
    "Prueba rápida de estreptococo",
    "Revisión en 10 días",
  ],
  indicaciones_seguimiento:
    "Abundantes líquidos, dieta blanda y reposo relativo 2 días. Acudir a urgencias si presenta dificultad respiratoria, imposibilidad para deglutir saliva o fiebre persistente >48 h con antibiótico. Cita de revisión en 10 días.",
  recomendaciones: ["Abundantes líquidos", "Dieta blanda", "Reposo relativo por 2 días"],
  signos_alarma: [
    "Dificultad para respirar",
    "Imposibilidad para tragar saliva",
    "Fiebre que persiste más de 48 h con el antibiótico",
  ],
  proxima_cita: "En 10 días.",
  indicaciones: ["Abundantes líquidos, dieta blanda, reposo relativo 2 días", "Revisión en 10 días"],
  manejo_realizado: [],
  destino: "Alta a domicilio con tratamiento ambulatorio.",
  triaje: "",
  adherencia: "",
  resultados_estudios: [],
  ajustes_plan: [],
  pronostico: "",
};

const DEMO_WARNINGS = [
  "Se prescribe antibiótico antes de conocer el resultado de la prueba rápida de estreptococo: confirmar si se inicia de forma empírica.",
  "Fiebre de 38.8 °C referida por la paciente, no medida en consulta.",
];

export function demoStructure(template: Template): StructuredNote {
  const fields: Record<string, FieldValue> = {};
  const unknown: string[] = [];
  for (const field of template.fields) {
    const value = DEMO_VALUES[field.key];
    const fitsType = value !== undefined && Array.isArray(value) === (field.type === "list");
    if (fitsType) {
      fields[field.key] = value;
    } else {
      fields[field.key] = field.type === "list" ? [] : "";
      if (value === undefined) unknown.push(field.label);
    }
  }
  const warnings = [...DEMO_WARNINGS];
  if (unknown.length) {
    warnings.push(`Modo demo: los campos personalizados (${unknown.join(", ")}) solo se rellenan con la IA real.`);
  }
  return { fields, warnings };
}
