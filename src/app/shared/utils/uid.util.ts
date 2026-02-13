// ============================================================================
// uid.util.ts
// Generador de IDs únicos para tracking de cargas.
//
// PROBLEMA QUE RESUELVE:
// Antes, las cargas se trackeaban por índice en el FormArray.
// Al eliminar la carga #2 de 4, los índices 3 y 4 se desplazaban,
// y el mapa de reglas se desincronizaba. Reconstruir el mapa era
// error-prone y difícil de testear.
//
// AHORA: cada carga tiene un uid único generado al crearla.
// El mapa de reglas usa uid como key. Al eliminar una carga,
// las keys de las demás no cambian. Simple, robusto, testeable.
// ============================================================================

/**
 * Genera un ID único suficientemente aleatorio para uso en frontend.
 * No necesita ser un UUID v4 completo — solo necesita ser único
 * dentro de la sesión del wizard.
 */
export function generateUid(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
