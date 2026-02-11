import { GoogleGenAI } from "@google/genai";

// Inicializar la IA. Asumimos que la API Key está disponible en el entorno.
// Nota: En un entorno de producción real, asegúrate de proteger tu API Key o usar un proxy.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseTaskWithGemini = async (command, availableParentTasks) => {
  const model = "gemini-3-flash-preview"; // Usamos Flash por ser rápido y eficiente
  const now = new Date();
  
  // Construimos una lista de las tareas padre disponibles para que la IA sepa clasificar
  const categories = availableParentTasks.map(t => `${t.name} (ID: ${t.id})`).join(", ");

  const prompt = `
    Hoy es: ${now.toLocaleString('es-ES')}.
    
    Tengo una lista de categorías principales: [${categories}].
    
    El usuario quiere crear una subtarea con este comando: "${command}".
    
    Tu trabajo es extraer la siguiente información en formato JSON estricto:
    1. "title": El título de la tarea (ej: "Hacer la cama").
    2. "description": Si hay detalles extra, ponlos aquí, si no, string vacío.
    3. "deadline": La fecha límite en formato ISO (YYYY-MM-DD) si el usuario menciona tiempo (ej: "mañana", "el viernes", "en 3 días"). Si menciona "por la mañana" pon las 09:00, si es "tarde" las 18:00. Si no menciona fecha, null.
    4. "parentTaskId": El ID de la categoría principal que mejor encaje. Si no encaja ninguna obvia, usa la primera de la lista.
    5. "status": Si la fecha es hoy, pon "today". Si es futuro cercano, "pending". Si no hay fecha, "idea".

    Responde SOLAMENTE con el objeto JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error parsing task with AI:", error);
    return null;
  }
};