# Wizard de Seguros — Guía Técnica Completa

---

## 1. El Problema que Resolvemos

Un sistema de contratación de seguros donde:

- Cada producto (vida, salud, auto) tiene un flujo diferente (4 a 6 pasos).
- El paso 1 siempre pide datos del titular, y opcionalmente cargas familiares.
- Cada carga tiene un parentesco (hijo, cónyuge, padre) que define sus propias reglas de validación.
- Algunos seguros piden cálculo de IMC (peso/estatura).
- Al ingresar un RUT válido, se busca si el cliente ya existe en la base de datos.
- Las reglas de validación (rangos de edad, campos obligatorios, etc.) vienen del backend.
- Los datos deben persistir al navegar entre pasos (ir y volver sin perder información).
- Existe una Declaración Personal de Salud (DPS) que se usa en el wizard de seguros, pero que también podría usarse en otros contextos (renovación de póliza, por ejemplo).

### Productos disponibles

| Producto | Ruta | Steps |
|----------|------|-------|
| Seguro de Vida Premium | `/contratar/vida-premium` | Datos Personales (+ cargas) → Cobertura → Validacion → Pago → Resumen |
| Seguro de Salud Familiar | `/contratar/salud-familiar` | Titular y Cargas (+ IMC) → DPS → Plan → Validacion → Pago → Resumen |
| Seguro Automotriz Basico | `/contratar/auto-basico` | Datos → Vehiculo → Cobertura → Validacion → Pago → Resumen |

Datos mock para probar:
- **RUTs:** `12345678-9` (Juan Perez), `98765432-1` (Maria Lopez)
- **Patentes:** `ABCD12` (Toyota Corolla 2022), `WXYZ99` (Hyundai Tucson 2021)

---

## 2. Las 3 Capas de la Arquitectura

El sistema se divide en 3 capas independientes. Cada una tiene una responsabilidad clara y no conoce los detalles de las otras.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   wizard-core/          ← CAPA 1: Motor genérico del wizard    │
│   ┌──────────────┐                                              │
│   │ StepperBar   │  Barra de progreso visual                    │
│   │ Container    │  Navegación (anterior/siguiente)             │
│   │ WizardStep   │  Interfaz que todo step debe cumplir         │
│   └──────────────┘                                              │
│   NO sabe de seguros. NO sabe de formularios.                   │
│   Podría usarse para un wizard de onboarding, encuestas, etc.   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   shared/               ← CAPA 2: Componentes reutilizables    │
│   ┌──────────────┐                                              │
│   │ PersonaForm  │  Formulario de persona (nombre, rut, etc.)   │
│   │ DpsForm      │  Declaración Personal de Salud               │
│   │ VehiculoForm │  Formulario de vehículo (patente, marca...)  │
│   │ FormFactory  │  Crea FormGroups con validadores dinámicos    │
│   │ Modelos      │  PersonaData, VehiculoData, FieldRule, etc.  │
│   └──────────────┘                                              │
│   NO sabe que está dentro de un wizard.                         │
│   Se puede usar en cualquier pantalla de la aplicación.         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   insurance/            ← CAPA 3: Dominio de seguros            │
│   ┌──────────────┐                                              │
│   │ NgRx Store   │  Estado del wizard (titular, cargas, vehiculo)│
│   │ Steps        │  Cada paso (titular, vehiculo, DPS, pago...) │
│   │ API Service  │  Llamadas al backend de seguros              │
│   │ Config       │  Configuración de productos                  │
│   └──────────────┘                                              │
│   USA wizard-core como infraestructura.                         │
│   USA shared/ como componentes.                                 │
│   SABE de seguros, productos, parentescos, etc.                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**¿Por qué 3 capas?** Si mañana necesitas un wizard de onboarding de clientes, reutilizas `wizard-core/` y `shared/` sin tocar nada. Solo creas una nueva carpeta `onboarding/` con su propio store y steps.

---

## 3. El Contrato: Interfaz WizardStep

Antes de entender los componentes, hay que entender la regla fundamental: **todo step del wizard debe implementar esta interfaz**.

```typescript
// wizard-core/interfaces/wizard-step.interface.ts

export interface WizardStep {
  saveToStore(): void;   // Guarda los datos del formulario en el store
  isValid(): boolean;    // Valida el formulario (retorna true si se puede avanzar)
}
```

Esto garantiza que:
- Si un desarrollador crea un step nuevo y olvida implementar `isValid()`, TypeScript da error en compilación, no en runtime.
- El wizard container puede llamar a estos métodos sin saber qué step está activo.
- Los tests pueden crear mocks simples: `{ saveToStore: jest.fn(), isValid: jest.fn(() => true) }`.

---

## 4. El Flujo Completo Paso a Paso

### 4.1 Inicialización (cuando el usuario entra al flujo)

```
El usuario hace click en "Contratar Seguro de Salud Familiar"
         │
         ▼
┌─ InsuranceWizardComponent.ngOnInit() ──────────────────────────┐
│                                                                 │
│  1. Lee la configuración del producto de INSURANCE_PRODUCTS     │
│     (en producción vendría de un GET /api/productos/{id}/config)│
│                                                                 │
│  2. dispatch initWizard({                                       │
│       productoId: 'salud-familiar',                             │
│       stepsConfig: [6 steps],                                   │
│       validationRules: { titular: {...}, cargas: {...} },       │
│       dpsConfig: { preguntas: [...] }                           │
│     })                                                          │
│     → El reducer guarda todo en el store.                       │
│                                                                 │
│  3. dispatch loadParentescos({ productoId: 'salud-familiar' })  │
│     → El effect llama a GET /api/productos/{id}/parentescos     │
│     → Respuesta: [                                              │
│         { id: 'conyuge', label: 'Cónyuge', reglas: {            │
│             fechaNacimiento: { edadMinima: 18, edadMaxima: 60 } │
│         }},                                                     │
│         { id: 'hijo', label: 'Hijo/a', reglas: {                │
│             fechaNacimiento: { edadMinima: 2, edadMaxima: 24 }  │
│         }},                                                     │
│       ]                                                         │
│     → dispatch loadParentescosSuccess → reducer los guarda      │
│                                                                 │
│  4. Se renderiza el WizardContainer + el primer step            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Step 1 — Titular y Cargas (el paso más complejo)

Este step tiene 4 funcionalidades principales que funcionan juntas:

#### A) Creación de formularios con validadores dinámicos

```
StepTitularCargasComponent.ngOnInit()
         │
         ▼
Se suscribe a selectStepTitularConfig (UN solo selector compuesto)
         │
         ▼
El selector retorna todo lo que el step necesita:
  {
    requiereCargas: true,
    requiereImc: true,
    cargasLimits: { min: 1, max: 5 },
    titularRules: { fechaNacimiento: { edadMinima: 18, edadMaxima: 60, ... } },
    cargasRules:  { fechaNacimiento: { edadMinima: 2,  edadMaxima: 75, ... } },
    parentescos:  [ { id: 'hijo', label: 'Hijo/a', reglas: {...} }, ... ],
    parentescosLoading: false,
    titular: null,        // datos guardados previamente (si vuelve de otro step)
    cargas: [],           // datos guardados previamente
  }
         │
         ▼
initForms():
  PersonaFormFactory.createPersonaFormGroup(null, incluirImc=true, titularRules)
         │
         ▼
  La fábrica lee las reglas y las convierte en Validators de Angular:
    titularRules.fechaNacimiento.edadMinima: 18  →  edadRangoValidator(18, 60)
    titularRules.nombre.required: true           →  Validators.required
    titularRules.nombre.maxLength: 50            →  Validators.maxLength(50)
         │
         ▼
  FormGroup del titular queda con validadores aplicados.
  Si el usuario ingresa una fecha que da edad 15, el campo se pone en error
  con el mensaje: "El titular debe tener entre 18 y 60 años."
```

#### B) Búsqueda por RUT (al salir del campo)

```
Usuario escribe "12345678-9" en el input de RUT y sale del campo (blur)
         │
         ▼
PersonaFormComponent detecta el blur
  → Verifica que el RUT sea válido (pase las validaciones del FormControl)
  → Emite @Output() rutBlur con el valor "12345678-9"
         │
         ▼
StepTitularCargasComponent.onTitularRutBlur("12345678-9")
  → Llama a InsuranceApiService.buscarPorRut("12345678-9")
  → Actualiza titularState.rutBuscando = true (PersonaForm muestra spinner)
         │
         ▼
API responde: { encontrado: true, persona: { nombre: 'Juan', apellidos: 'Pérez', ... } }
         │
         ▼
El step hace titularForm.patchValue(persona)
  → Los campos nombre, apellidos, fecha se llenan automáticamente
  → titularState.rutMensaje = "✓ Cliente encontrado."
  → PersonaForm muestra el mensaje (desaparece en 4 segundos)
```

**Dato importante:** PersonaFormComponent NO llama al API. Solo emite un evento. El step padre decide qué hacer. Esto permite reutilizar PersonaForm en cualquier contexto.

#### C) Parentesco y cambio dinámico de reglas

```
Usuario hace click en "Agregar Carga"
         │
         ▼
agregarCarga():
  → PersonaFormFactory.addCargaToArray(formArray, incluirImc, cargasRules)
  → Se crea un FormGroup con uid único (ej: "1707836400-abc123def")
  → Se agrega al cargaStatesMap: Map<uid, CargaState>
  → La carga aparece con un combobox de parentesco vacío
         │
         ▼
Usuario selecciona "Hijo/a" en el combobox
         │
         ▼
(change) → onParentescoChange(index=0)
  │
  │  1. Lee el parentescoId del FormGroup: 'hijo'
  │
  │  2. Busca las reglas del parentesco 'hijo':
  │     formFactory.resolveRulesForParentesco('hijo', parentescos, fallback)
  │     → Encuentra: { fechaNacimiento: { edadMinima: 2, edadMaxima: 24 } }
  │
  │  3. Re-aplica los validators EN CALIENTE:
  │     formFactory.applyValidationRules(cargaFormGroup, hijosRules)
  │       → setValidators(edadRangoValidator(2, 24))
  │       → updateValueAndValidity()
  │     Los datos que el usuario ya escribió NO se pierden.
  │
  │  4. Actualiza el mapa: cargaStatesMap.set(uid, { rules: hijosRules })
  │     PersonaForm recibe las nuevas reglas y muestra:
  │     "El hijo/a debe tener como máximo 24 años."
  │
  ▼
Si el usuario CAMBIA a "Cónyuge":
  → Se repite el proceso con las reglas de cónyuge
  → edadRangoValidator(18, 65) reemplaza al anterior
  → Si la fecha ya ingresada tiene 20 años → ahora es VÁLIDO
```

**¿Por qué uid en vez de índice?**

```
Antes (con índice):

  Cargas:  [Carga 0] [Carga 1] [Carga 2]
  Mapa:    { 0: reglas_hijo, 1: reglas_conyuge, 2: reglas_padre }

  El usuario elimina Carga 1:

  Cargas:  [Carga 0] [Carga 2]  ← el índice 2 ahora es 1
  Mapa:    { 0: reglas_hijo, 1: reglas_conyuge, 2: reglas_padre }
                                  ↑ ¡DESINCRONIZADO!
  Carga 2 tiene reglas de cónyuge en vez de padre.


Ahora (con uid):

  Cargas:  [uid-aaa] [uid-bbb] [uid-ccc]
  Mapa:    { uid-aaa: reglas_hijo, uid-bbb: reglas_conyuge, uid-ccc: reglas_padre }

  El usuario elimina uid-bbb:

  Cargas:  [uid-aaa] [uid-ccc]
  Mapa:    { uid-aaa: reglas_hijo, uid-ccc: reglas_padre }
                                    ↑ CORRECTO. Las keys no se mueven.
```

#### D) Cálculo de IMC (solo seguros de salud)

```
Usuario ingresa peso: 75, estatura: 170 y presiona "Calcular IMC"
         │
         ▼
PersonaFormComponent emite @Output() calcularImc({ peso: 75, estatura: 170 })
         │
         ▼
StepTitularCargasComponent.onTitularCalcularImc(data)
  → Llama a InsuranceApiService.calcularImc(75, 170)
  → Actualiza titularState.imcCalculando = true
         │
         ▼
API responde: { imc: 26.0, categoria: 'Sobrepeso', valido: true }
         │
         ▼
  → titularState.imcResult = resultado
  → titularForm.patchValue({ imc: 26.0 })  ← se guarda en el FormGroup
  → PersonaForm muestra: "IMC: 26.0 — Sobrepeso" (en verde si válido)
```

### 4.3 Navegación — Cómo se persisten los datos al cambiar de paso

```
Usuario está en Step 1 y presiona "Siguiente"
         │
         ▼
WizardContainerComponent.onNext()
  │  Emite (next) → InsuranceWizardComponent.onNext()
  │
  │  1. activeStep.isValid()
  │     → StepTitularCargasComponent.isValid()
  │       → titularForm.markAllAsTouched()  (muestra errores si hay)
  │       → Verifica que titularForm.valid === true
  │       → Verifica que cargasFormArray.length >= cargasLimits.min
  │       → Verifica que cargasFormArray.valid === true
  │       → Retorna true o false
  │
  │  2. Si isValid() retorna false → NO avanza. El usuario ve los errores.
  │
  │  3. Si isValid() retorna true:
  │     activeStep.saveToStore()
  │       → dispatch saveTitular({ titular: titularForm.value })
  │       → dispatch saveCargas({ cargas: cargasFormArray.value })
  │       → Reducer actualiza state.titular y state.cargas
  │
  │  4. dispatch nextStep()
  │     → Reducer: currentStep = 1
  │
  │  5. Angular destruye StepTitularCargasComponent
  │     Angular crea el componente del Step 2 (via ngSwitch)
  │
  ▼

Si el usuario presiona "Anterior" desde el Step 3:
         │
         ▼
  1. saveToStore() del Step 3 actual
  2. dispatch prevStep() → currentStep = 0
  3. Angular destruye Step 3, crea Step 1
  4. Step 1.ngOnInit() se suscribe a selectStepTitularConfig
  5. El selector retorna los datos guardados: titular = {...}, cargas = [...]
  6. initForms() crea los FormGroups y hace patchValue con los datos
  7. El usuario ve todos sus datos restaurados
```

### 4.4 Step DPS — Ejemplo de reutilización

```
┌─── StepDpsComponent (insurance/steps/) ────────────────────────┐
│                                                                 │
│  - Implementa WizardStep (saveToStore, isValid)                 │
│  - Lee selectDpsConfig del store                                │
│  - Crea el FormGroup dinámicamente según las preguntas          │
│  - Pasa todo al DpsFormComponent via @Input                     │
│                                                                 │
│  ┌─── DpsFormComponent (shared/components/) ────────────────┐   │
│  │                                                           │   │
│  │  - Recibe @Input config: DpsConfig                        │   │
│  │  - Recibe @Input form: FormGroup                          │   │
│  │  - Renderiza preguntas dinámicamente (si/no, texto, etc.) │   │
│  │  - Maneja lógica condicional (pregunta B depende de A)    │   │
│  │  - NO sabe que está en un wizard                          │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Si mañana necesitas DPS en una pantalla de renovación (sin wizard):

┌─── RenovacionPólizaComponent ──────────────────────────────────┐
│                                                                 │
│  - Carga la DpsConfig desde un endpoint                         │
│  - Crea el FormGroup                                            │
│  - Usa <app-dps-form [config]="..." [form]="...">               │
│  - Al enviar, guarda donde necesite (no necesita NgRx)          │
│                                                                 │
│  ┌─── DpsFormComponent (shared/) ← EL MISMO ────────────────┐  │
│  │                                                            │  │
│  │  Funciona exactamente igual. No cambió nada.               │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Step Vehículo — Solo para Auto Básico

```
┌─── StepVehiculoComponent (insurance/steps/) ─────────────────┐
│                                                                │
│  - Implementa WizardStep (saveToStore, isValid)                │
│  - Crea FormGroup: patente, marca, modelo, año, color,         │
│    número de motor, número de chasis                           │
│  - Maneja búsqueda por patente via API                         │
│  - Pasa todo al VehiculoFormComponent via @Input/@Output       │
│                                                                │
│  ┌─── VehiculoFormComponent (shared/components/) ──────────┐   │
│  │                                                          │   │
│  │  - Recibe @Input form: FormGroup                         │   │
│  │  - Emite @Output patenteBlur cuando el usuario sale      │   │
│  │    del campo de patente                                  │   │
│  │  - Renderiza grid de campos del vehículo                 │   │
│  │  - NO sabe que está en un wizard                         │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

Mismo patrón que PersonaForm y DpsForm: el componente "tonto" vive en
`shared/` y el step "inteligente" vive en `insurance/steps/`.

---

## 5. El Store (NgRx) — Qué se Guarda y Por Qué

```
insuranceWizard: {

  // ── Configuración (se escribe UNA vez al iniciar, no cambia) ──
  productoId: 'salud-familiar',
  stepsConfig: [ ...6 steps... ],
  currentStep: 2,                        // qué paso está activo
  validationRules: {                     // reglas del backend
    titular: { fechaNacimiento: { edadMinima: 18, edadMaxima: 60 } },
    cargas:  { fechaNacimiento: { edadMinima: 2,  edadMaxima: 75 } },
    maxCargas: 5, minCargas: 1,
  },

  // ── Parentescos (se cargan via REST al iniciar) ──
  parentescos: [
    { id: 'hijo',    label: 'Hijo/a',  reglas: { ... } },
    { id: 'conyuge', label: 'Cónyuge', reglas: { ... } },
  ],
  parentescosLoading: false,             // para mostrar spinner

  // ── Datos del usuario (se actualizan al navegar entre pasos) ──
  titular: {
    uid: '1707836400-abc',
    nombre: 'Juan', apellidos: 'Pérez',
    rut: '12345678-9', fechaNacimiento: '1985-03-15',
    peso: 75, estatura: 170, imc: 26.0,
  },
  cargas: [
    {
      uid: '1707836401-def',
      nombre: 'María', apellidos: 'Pérez',
      rut: '11111111-1', fechaNacimiento: '2010-05-20',
      parentescoId: 'hijo',
      peso: 45, estatura: 155, imc: 18.7,
    },
  ],

  // ── DPS ──
  dpsConfig: { titulo: '...', preguntas: [...] },
  dpsRespuestas: {
    enfermedad_cronica: 'no',
    medicamentos: 'si',
    medicamentos_detalle: 'Losartán 50mg',
  },

  // ── Vehículo (solo auto-basico) ──
  vehiculo: {
    patente: 'ABCD12',
    marca: 'Toyota', modelo: 'Corolla',
    anio: 2022, color: 'Blanco',
    numeroMotor: null, numeroChasis: null,
  },

  // ── Otros pasos ──
  cobertura: { ... },
  pago: { ... },

  // ── Estado de validación async ──
  validacion: { loading: false, resultado: null, error: null },
}
```

**¿Por qué NgRx y no un servicio simple?**

Los datos deben ser accesibles desde CUALQUIER paso. El Step 3 (Validación) necesita leer los datos del Step 1 (titular + cargas) para enviarlos al backend. Con un servicio simple esto funciona, pero con NgRx además se obtiene:

- Estado predecible (redux pattern).
- Debugging con Redux DevTools (se puede ver cada cambio de estado).
- Selectors memoizados (no recalculan si los datos no cambiaron).
- Effects para side effects (llamadas HTTP desacopladas de los componentes).

---

## 6. Cómo se Conectan los Archivos

```
El usuario abre /contratar/salud-familiar
         │
         ▼
InsuranceWizardComponent                       [insurance/insurance-wizard.component.ts]
  │  Lee INSURANCE_PRODUCTS['salud-familiar']  [insurance/config/insurance-products.config.ts]
  │  dispatch initWizard(...)                  [insurance/store/insurance.actions.ts]
  │  dispatch loadParentescos(...)             [insurance/store/insurance.actions.ts]
  │                                            
  │  Renderiza:
  │  ┌─ WizardContainerComponent ─────────┐   [wizard-core/components/wizard-container/]
  │  │  ┌─ StepperBarComponent ─────────┐ │   [wizard-core/components/stepper-bar/]
  │  │  │  [1 ✓] [2 ●] [3] [4] [5] [6] │ │
  │  │  └───────────────────────────────┘ │
  │  │                                     │
  │  │  ┌─ [ngSwitch] ──────────────────┐ │
  │  │  │                                │ │
  │  │  │  StepTitularCargasComponent    │ │   [insurance/steps/step-titular-cargas/]
  │  │  │  │                             │ │
  │  │  │  │  Lee: selectStepTitularConfig│ │  [insurance/store/insurance.selectors.ts]
  │  │  │  │  Usa:  PersonaFormFactory    │ │  [shared/services/persona-form.factory.ts]
  │  │  │  │  Llama: InsuranceApiService  │ │  [insurance/services/insurance-api.service.ts]
  │  │  │  │                             │ │
  │  │  │  │  Renderiza:                 │ │
  │  │  │  │  ┌─ PersonaFormComponent ─┐ │ │   [shared/components/persona-form/]
  │  │  │  │  │  Titular               │ │ │
  │  │  │  │  │  RUT ──(blur)──────────┼─┼─┼── @Output rutBlur → step maneja
  │  │  │  │  │  Nombre                │ │ │
  │  │  │  │  │  Apellidos             │ │ │
  │  │  │  │  │  Fecha Nacimiento      │ │ │
  │  │  │  │  │  Peso / Estatura / IMC │ │ │
  │  │  │  │  └────────────────────────┘ │ │
  │  │  │  │                             │ │
  │  │  │  │  [Parentesco: Hijo/a ▼]     │ │   (change) → onParentescoChange()
  │  │  │  │  ┌─ PersonaFormComponent ─┐ │ │   re-aplica validators
  │  │  │  │  │  Carga #1             │ │ │
  │  │  │  │  └────────────────────────┘ │ │
  │  │  │  │                             │ │
  │  │  │  │  [+ Agregar Carga]          │ │
  │  │  │  │                             │ │
  │  │  └──┼─────────────────────────────┘ │
  │  │     │                               │
  │  │  [← Anterior]        [Siguiente →]  │   → emite (next)
  │  │                                     │
  │  └─────────────────────────────────────┘
  │
  │  InsuranceWizardComponent.onNext():
  │    → activeStep.isValid()
  │    → activeStep.saveToStore()
  │    → dispatch nextStep()
  │
  ▼
El reducer actualiza currentStep, ngSwitch renderiza el siguiente step.
```

---

## 7. Las Reglas de Validación — De Dónde Vienen y Cómo Llegan al Formulario

```
BACKEND                              STORE                         FORMULARIO
───────                              ─────                         ──────────

GET /productos/{id}/config           initWizard action              
  │                                    │                            
  │  {                                 ▼                            
  │    validationRules: {            Reducer guarda en              
  │      titular: {                  state.validationRules           
  │        fechaNacimiento: {          │                            
  │          edadMinima: 18,           ▼                            
  │          edadMaxima: 60,         selectTitularValidationRules    
  │          customErrorMsg:           │                            
  │            "El titular debe        ▼                            
  │             tener entre 18       StepTitularCargas lee           
  │             y 60 años."          las reglas                     
  │        }                           │                            
  │      }                             ▼                            
  │    }                             PersonaFormFactory              
  │  }                               .createPersonaFormGroup(       
  │                                      data, imc, rules)          
  │                                    │                            
  │                                    ▼                            
  │                                  buildDateValidators(rules)     
  │                                    │                            
  │                                    ▼                            
  │                                  edadRangoValidator(18, 60)     
  │                                    │                            
  │                                    ▼                            
  │                                  FormControl('fechaNacimiento')
  │                                  tiene el validator aplicado     
  │                                    │                            
  │                                    ▼                            
  │                                  Usuario ingresa fecha           
  │                                  que da edad 15                  
  │                                    │                            
  │                                    ▼                            
  │                                  Validator retorna error:        
  │                                  { edadFueraDeRango: {          
  │                                      edadActual: 15,            
  │                                      edadMinima: 18,            
  │                                      edadMaxima: 60,            
  │                                      mensaje: "El titular       
  │                                        debe tener entre         
  │                                        18 y 60 años."           
  │                                  }}                              
  │                                    │                            
  │                                    ▼                            
  │                                  PersonaFormComponent            
  │                                  muestra el mensaje              

GET /productos/{id}/parentescos      loadParentescosSuccess          
  │                                    │                            
  │  [                                 ▼                            
  │    { id: 'hijo',                 Reducer guarda en              
  │      reglas: {                   state.parentescos               
  │        fechaNacimiento: {          │                            
  │          edadMinima: 2,            ▼                            
  │          edadMaxima: 24          Usuario selecciona parentesco   
  │        }                           │                            
  │      }                             ▼                            
  │    }                             onParentescoChange()            
  │  ]                                 │                            
  │                                    ▼                            
  │                                  formFactory.applyValidationRules()
  │                                    │                            
  │                                    ▼                            
  │                                  setValidators(                  
  │                                    edadRangoValidator(2, 24))    
  │                                  updateValueAndValidity()        
  │                                    │                            
  │                                  Los datos NO se pierden.        
  │                                  Solo cambian los validators.    
```

---

## 8. PersonaFormComponent — Por Qué es "Dumb"

PersonaFormComponent es el componente más reutilizado del sistema. Aparece una vez como titular y N veces como cargas. Su principio fundamental es: **solo renderiza lo que le dicen y emite eventos cuando el usuario interactúa**.

```
         INPUTS (qué le dicen)              OUTPUTS (qué emite)
         ──────────────────                 ───────────────────
@Input   form: FormGroup            ──→     (renderiza los campos)
@Input   titulo: string             ──→     (muestra el título)
@Input   mostrarImc: boolean        ──→     (muestra/oculta peso/estatura)
@Input   validationRules: Rules     ──→     (muestra mensajes de error)
@Input   rutBuscando: boolean       ──→     (muestra spinner de RUT)
@Input   rutMensaje: string         ──→     (muestra "Cliente encontrado")
@Input   imcCalculando: boolean     ──→     (muestra "Calculando...")
@Input   imcResult: ImcResult       ──→     (muestra resultado de IMC)

                                    @Output  rutBlur → string (RUT del blur)
                                    @Output  calcularImc → { peso, estatura }
```

PersonaForm NO inyecta ningún servicio. NO hace llamadas HTTP. NO conoce el store.

El step padre (StepTitularCargasComponent) es quien:
1. Escucha los `@Output`.
2. Llama al API.
3. Pasa los resultados de vuelta via `@Input`.

Esto hace que PersonaForm se pueda testear así:

```typescript
it('emite rutBlur cuando el RUT es válido y se sale del campo', () => {
  component.form = new FormGroup({ rut: new FormControl('12345678-9') });
  jest.spyOn(component.rutBlur, 'emit');

  component.onRutBlur();

  expect(component.rutBlur.emit).toHaveBeenCalledWith('12345678-9');
});
```

Sin TestBed, sin mocks de HttpClient, sin store.

---

## 9. Archivos y Para Qué Sirve Cada Uno

### wizard-core/ (Motor genérico)

| Archivo | Responsabilidad |
|---------|-----------------|
| `wizard-step.interface.ts` | Define el contrato WizardStep. Todo step lo implementa. |
| `wizard-container.component.ts` | Renderiza stepper + contenido + botones de navegación. Emite eventos (next, previous, goToStep). |
| `stepper-bar.component.ts` | Barra visual de progreso. Recibe steps y paso activo. |

### shared/ (Reutilizable)

| Archivo | Responsabilidad |
|---------|-----------------|
| `shared.models.ts` | Interfaces de dominio: PersonaData, VehiculoData, FieldRule, ParentescoOption, DpsConfig, etc. |
| `persona-form.factory.ts` | Crea FormGroups con validators dinámicos. Convierte reglas del backend en Validators de Angular. |
| `persona-form.component.ts` | Renderiza campos de persona. Emite eventos. No llama APIs. |
| `dps-form.component.ts` | Renderiza preguntas de DPS dinámicamente. Maneja dependencias entre preguntas. |
| `vehiculo-form.component.ts` | Renderiza campos de vehículo (patente, marca, modelo, año). Emite patenteBlur. No llama APIs. |
| `uid.util.ts` | Genera IDs únicos para tracking de cargas. |

### insurance/ (Dominio de seguros)

| Archivo | Responsabilidad |
|---------|-----------------|
| `insurance.models.ts` | Modelos específicos: InsuranceStepConfig, ProductValidationRules, InsuranceWizardState. |
| `insurance-products.config.ts` | Configuración de productos (steps, reglas, DPS). En producción viene del backend. |
| `insurance-api.service.ts` | Llamadas HTTP: parentescos, validación, IMC, búsqueda por RUT. |
| `insurance.actions.ts` | Acciones NgRx: initWizard, saveTitular, loadParentescos, etc. |
| `insurance.reducer.ts` | Reducer: actualiza state inmutablemente por cada acción. |
| `insurance.selectors.ts` | Selectores memoizados. Incluye selectStepTitularConfig (compuesto). |
| `insurance.effects.ts` | Effects: loadParentescos$ y validarDatos$ (side effects async). |
| `insurance-wizard.component.ts` | Orquestador: inicializa store, maneja navegación (isValid/saveToStore), renderiza steps via ngSwitch. Usa observables + async pipe. |
| `step-titular-cargas.component.ts` | Step titular + cargas + parentescos + RUT + IMC. |
| `step-vehiculo.component.ts` | Step vehículo: crea FormGroup, maneja búsqueda por patente via API. Solo se usa en auto-basico. |
| `step-dps.component.ts` | Step DPS: wrapper delgado sobre DpsFormComponent. |
| `step-validacion.component.ts` | Lee datos del store (titular, cargas, vehículo, DPS), envía al backend para validación. |
| `step-cobertura/pago/resumen` | Steps placeholder que implementan WizardStep. |

---

## 10. Instalación y Uso

### Dependencias npm

```bash
npm install @ngrx/store@^11 @ngrx/effects@^11 @ngrx/store-devtools@^11
```

### AppModule

```typescript
imports: [
  StoreModule.forRoot({}),
  EffectsModule.forRoot([]),
  InsuranceWizardModule,    // ← trae todo lo necesario
]
```

### Uso en un template

```html
<!-- En la ruta /contratar/:productoId -->
<app-insurance-wizard [productoId]="productoId"></app-insurance-wizard>
```

Eso es todo. El módulo se encarga de registrar el store, los effects, los componentes, y todo lo demás.
