// ============================================================================
// shared.models.ts
// Modelos compartidos que NO pertenecen al wizard sino al DOMINIO de negocio.
//
// PersonaData, ParentescoOption, ImcResult, etc. se usan en el wizard,
// pero TAMBIÉN se podrían usar en un flujo de DPS standalone, en un
// módulo de renovación de póliza, o en una pantalla de administración.
//
// Por eso viven en shared/, no en insurance/.
// ============================================================================

/**
 * Datos de una persona. Unidad fundamental reutilizable.
 * Cada instancia tiene un uid único para tracking sin depender de índices.
 */
export interface PersonaData {
  uid: string;              // UUID único — evita problemas de tracking por índice
  nombre: string;
  apellidos: string;
  rut: string;
  fechaNacimiento: string;
  parentescoId?: string | null;
  peso?: number | null;
  estatura?: number | null;
  imc?: number | null;
}

export interface ImcResult {
  imc: number;
  categoria: string;
  valido: boolean;
  mensaje?: string;
}

export interface RutLookupResult {
  encontrado: boolean;
  persona?: Partial<PersonaData>;
}

// ─── Vehículo ────────────────────────────────────────────────────────────────

export interface VehiculoData {
  patente: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color?: string | null;
  numeroMotor?: string | null;
  numeroChasis?: string | null;
}

export interface VehiculoLookupResult {
  encontrado: boolean;
  vehiculo?: Partial<VehiculoData>;
}

// ─── Reglas de validación dinámicas ──────────────────────────────────────────

export interface FieldRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customErrorMsg?: string;
}

export interface DateFieldRule extends FieldRule {
  edadMinima?: number;
  edadMaxima?: number;
}

export interface PersonaValidationRules {
  nombre?: FieldRule;
  apellidos?: FieldRule;
  rut?: FieldRule;
  fechaNacimiento?: DateFieldRule;
  peso?: FieldRule;
  estatura?: FieldRule;
}

// ─── Parentescos ─────────────────────────────────────────────────────────────

export interface ParentescoOption {
  id: string;
  label: string;
  reglas: PersonaValidationRules;
}

// ─── DPS (Declaración Personal de Salud) ─────────────────────────────────────

/**
 * Una pregunta de la DPS. Estructura genérica para que el backend
 * defina las preguntas dinámicamente.
 */
export interface DpsPregunta {
  id: string;
  texto: string;
  tipo: 'si_no' | 'texto' | 'fecha' | 'numerico';
  requerida: boolean;
  placeholder?: string;
  dependeDe?: string;       // id de otra pregunta (lógica condicional)
  dependeValor?: any;       // valor que activa esta pregunta
}

/**
 * Configuración completa de DPS para un producto.
 * Puede usarse dentro del wizard o como formulario independiente.
 */
export interface DpsConfig {
  titulo: string;
  descripcion?: string;
  preguntas: DpsPregunta[];
}

/**
 * Respuesta a una pregunta de DPS.
 */
export interface DpsRespuesta {
  preguntaId: string;
  valor: any;
}
