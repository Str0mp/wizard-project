# Arquitectura Tecnica del Wizard de Seguros

Este documento explica **como funciona** el sistema por dentro: el flujo de datos, el store, los effects, el patron smart/dumb y la comunicacion entre capas.

Para saber **como agregar** nuevos seguros o componentes, ver `GUIA-NUEVOS-SEGUROS.md`.

---

## 1. NgRx: El Ciclo Completo de una Accion

NgRx es un sistema de manejo de estado basado en Redux. Tiene 4 piezas:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Componente                                                     │
│   │                                                              │
│   │ 1. dispatch(accion)                                          │
│   ▼                                                              │
│   Action ──────────────► Reducer ──────────────► State (Store)   │
│   │                      "Funcion pura que                │      │
│   │                       toma state + accion             │      │
│   │                       y retorna NUEVO state"          │      │
│   │                                                       │      │
│   │                                              Selector ◄──    │
│   │                                              │               │
│   │                                              │ 4. emite      │
│   │                                              │    nuevo      │
│   │                                              ▼    valor      │
│   │                                         Componente           │
│   │                                         (via subscribe       │
│   │                                          o async pipe)       │
│   │                                                              │
│   └─── 2. Si hay side effect ──► Effect ──► dispatch(otra)       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Ejemplo concreto: el usuario guarda datos del vehiculo

```
1. StepVehiculoComponent.saveToStore()
   │
   │  this.store.dispatch(saveVehiculo({ vehiculo: this.vehiculoForm.value }))
   │
   ▼
2. La action llega al Reducer (insurance.reducer.ts):
   │
   │  on(A.saveVehiculo, (s, { vehiculo }) => ({ ...s, vehiculo }))
   │
   │  El reducer NO muta el state. Crea un NUEVO objeto:
   │  { ...stateAnterior, vehiculo: vehiculoNuevo }
   │
   ▼
3. El store notifica a los selectores que dependen de `vehiculo`:
   │
   │  selectVehiculo = createSelector(selectInsuranceWizard, (s) => s.vehiculo)
   │
   │  NgRx compara el valor anterior con el nuevo.
   │  Si cambio → emite. Si no cambio → no emite (memoizacion).
   │
   ▼
4. StepValidacionComponent (que esta suscrito a selectVehiculo)
   recibe el nuevo valor y lo renderiza en la card de preview.
```

### Por que inmutabilidad?

El reducer **nunca** hace `state.vehiculo = nuevoValor`. Siempre retorna un **objeto nuevo**:

```typescript
// MAL (muta el state existente)
on(A.saveVehiculo, (s, { vehiculo }) => {
  s.vehiculo = vehiculo;  // ← muta el objeto original
  return s;               // ← NgRx no detecta cambio porque es la misma referencia
})

// BIEN (crea objeto nuevo)
on(A.saveVehiculo, (s, { vehiculo }) => ({ ...s, vehiculo }))
//                                       ^^^^ spread crea nuevo objeto
```

NgRx detecta cambios comparando **referencias** (`===`), no valores profundos. Si retornas el mismo objeto, NgRx asume que nada cambio y los selectores no emiten.

---

## 2. Actions: Que Son y Como se Nombran

Una action es un mensaje que describe **que paso**. No dice como manejar el cambio, solo lo declara.

```typescript
// insurance.actions.ts

// Acciones del wizard (disparadas por componentes)
export const saveTitular = createAction(
  '[Insurance Wizard] Save Titular',        // ← tipo unico
  props<{ titular: PersonaData }>()         // ← payload tipado
);

// Acciones de la API (disparadas por effects)
export const loadParentescosSuccess = createAction(
  '[Insurance API] Load Parentescos Success',
  props<{ parentescos: ParentescoOption[] }>()
);
```

**Convencion de nombres:**

| Prefijo | Significado | Quien la dispara |
|---------|-------------|------------------|
| `[Insurance Wizard]` | Algo que hizo el usuario | Un componente |
| `[Insurance API]` | Resultado de una llamada HTTP | Un effect |

Esto no es obligatorio pero ayuda a rastrear que origino cada cambio cuando usas Redux DevTools.

### Todas las acciones del sistema

```
Navegacion:        initWizard, setStep, nextStep, prevStep, resetWizard
Datos del titular: saveTitular, saveCargas
Parentescos:       loadParentescos → loadParentescosSuccess | loadParentescosError
DPS:               saveDpsRespuestas
Vehiculo:          saveVehiculo
Otros steps:       saveCobertura, savePago
Validacion:        validarDatos → validarDatosSuccess | validarDatosError
```

Las acciones con "Success/Error" son parte de un **flujo asincrono** manejado por effects (seccion 4).

---

## 3. Reducer: La Funcion Pura que Actualiza el State

El reducer es una funcion que recibe el state actual y una accion, y retorna un **nuevo** state.

```typescript
// insurance.reducer.ts (simplificado)

export const initialState: InsuranceWizardState = {
  productoId: null,
  stepsConfig: [],
  currentStep: 0,
  titular: null,
  cargas: [],
  vehiculo: null,
  validacion: { loading: false, resultado: null, error: null },
  // ... mas propiedades
};

export const insuranceReducer = createReducer(
  initialState,

  // Cada `on()` conecta una accion con su handler
  on(A.nextStep, (s) => ({
    ...s,
    currentStep: Math.min(s.currentStep + 1, s.stepsConfig.length - 1)
  })),

  on(A.saveTitular, (s, { titular }) => ({ ...s, titular })),

  // Validacion: 3 acciones para 3 estados (loading, success, error)
  on(A.validarDatos, (s) => ({
    ...s,
    validacion: { loading: true, resultado: null, error: null }
  })),
  on(A.validarDatosSuccess, (s, { resultado }) => ({
    ...s,
    validacion: { loading: false, resultado, error: null }
  })),
  on(A.validarDatosError, (s, { error }) => ({
    ...s,
    validacion: { loading: false, resultado: null, error }
  })),
);
```

### Reglas del reducer

1. **Funcion pura**: no llama APIs, no accede al DOM, no genera efectos secundarios.
2. **Inmutable**: siempre retorna un nuevo objeto con spread (`...s`).
3. **Sincrono**: no hay `await`, no hay `subscribe`. Si necesitas algo asincrono, va en un effect.

### El initialState como "reset"

Cuando se cambia de producto, el orquestador despacha `resetWizard()`:

```typescript
on(A.resetWizard, () => ({ ...initialState }))
```

Esto limpia todo y deja el store como si fuera la primera vez. Luego `initWizard` carga la config del nuevo producto.

---

## 4. Effects: Side Effects Asincronos

Los effects manejan operaciones que el reducer **no puede** hacer: llamadas HTTP, timers, etc.

### Ejemplo: cargar parentescos

```
Componente despacha loadParentescos({ productoId: 'salud-familiar' })
    │
    ▼
Effect loadParentescos$ escucha esa accion:
    │
    │  this.actions$.pipe(
    │    ofType(A.loadParentescos),               ← filtra solo esta accion
    │    switchMap(({ productoId }) =>
    │      this.api.getParentescos(productoId)     ← llamada HTTP
    │    )
    │  )
    │
    ├── Si la API responde OK:
    │   dispatch loadParentescosSuccess({ parentescos: [...] })
    │   → El reducer guarda los parentescos en el state
    │   → El selector emite → El componente recibe los parentescos
    │
    └── Si la API falla:
        dispatch loadParentescosError({ error: 'timeout' })
        → El reducer guarda el error
```

### Ejemplo: validar datos

```typescript
// insurance.effects.ts

validarDatos$ = createEffect(() =>
  this.actions$.pipe(
    ofType(A.validarDatos),
    withLatestFrom(this.store.select(selectTitularYCargas)),  // ← lee datos del store
    switchMap(([_, { titular, cargas }]) =>
      this.api.validarPersonas(titular, cargas).pipe(
        map((resultado) => A.validarDatosSuccess({ resultado })),
        catchError((e) => of(A.validarDatosError({ error: e.message }))),
      )
    ),
  )
);
```

**`withLatestFrom`** permite que el effect acceda al state actual sin que el componente tenga que pasarlo. El componente solo dice "quiero validar" (`dispatch(validarDatos())`), y el effect busca los datos que necesita.

### switchMap vs mergeMap vs concatMap

En este proyecto usamos **`switchMap`** porque:
- Si el usuario hace click dos veces rapido en "Validar", la primera llamada se **cancela** automaticamente y solo la segunda continua.
- Para parentescos es igual: si cambias de producto antes de que carguen, se cancela la peticion anterior.

---

## 5. Selectors: Lectura Eficiente del State

Un selector es una funcion que extrae un pedazo del state. NgRx los **memoiza**: si el input no cambio, retorna el mismo valor sin recalcular.

### Selector simple

```typescript
export const selectVehiculo = createSelector(
  selectInsuranceWizard,        // ← input: el slice completo
  (s) => s.vehiculo             // ← projector: extrae lo que necesitas
);
```

### Selector compuesto

Cuando un componente necesita multiples valores, es mejor crear un selector que los agrupe:

```typescript
// En vez de hacer 7 subscribes separados en el componente...
export const selectStepTitularConfig = createSelector(
  selectStepTitularFlags,       // requiereCargas, requiereImc, parentescos, etc.
  selectTitularValidationRules, // reglas de validacion del titular
  selectCargasValidationRules,  // reglas de validacion de cargas
  selectTitular,                // datos del titular (para restaurar)
  selectCargas,                 // datos de cargas (para restaurar)
  (flags, titularRules, cargasRules, titular, cargas) => ({
    ...flags,
    titularRules,
    cargasRules,
    titular,
    cargas,
  })
);
```

**Ventaja**: el componente hace UN solo `subscribe`. NgRx solo emite si alguno de los inputs cambio. Menos suscripciones = menos bugs y mejor performance.

### Selector derivado

```typescript
export const selectIsLastStep = createSelector(
  selectStepsConfig,    // input 1
  selectCurrentStep,    // input 2
  (s, c) => c === s.length - 1   // derivacion
);
```

Este selector no existe en el state. Se **calcula** a partir de otros valores. Si ni `stepsConfig` ni `currentStep` cambian, el selector retorna el mismo `true` o `false` sin recalcular.

---

## 6. Patron Smart/Dumb (Inteligente/Tonto)

Todo el proyecto sigue este patron. Hay dos tipos de componentes:

### Componente "tonto" (presentacional)

Vive en `shared/components/`. **No sabe** que esta dentro de un wizard.

```typescript
// vehiculo-form.component.ts (shared/)
@Component({ selector: 'app-vehiculo-form' })
export class VehiculoFormComponent {
  @Input() form!: FormGroup;                    // ← recibe datos
  @Input() patenteBuscando = false;
  @Output() patenteBlur = new EventEmitter();   // ← emite eventos

  // NO inyecta Store, NO inyecta servicios HTTP
  // Solo renderiza y emite
}
```

**Reglas:**
- Solo recibe datos via `@Input()`
- Solo comunica via `@Output()`
- No inyecta `Store`, no inyecta servicios
- Se puede reutilizar en cualquier pantalla

### Componente "inteligente" (step)

Vive en `insurance/steps/`. **Sabe** del wizard, del store y de las APIs.

```typescript
// step-vehiculo.component.ts (insurance/steps/)
@Component({ selector: 'app-step-vehiculo' })
export class StepVehiculoComponent implements WizardStep {
  vehiculoForm!: FormGroup;

  constructor(
    private fb: FormBuilder,     // ← crea el FormGroup
    private store: Store,        // ← lee/escribe al store
    private api: InsuranceApiService,  // ← llama APIs
  ) {}

  // Implementa WizardStep
  saveToStore(): void {
    this.store.dispatch(saveVehiculo({ vehiculo: this.vehiculoForm.value }));
  }
  isValid(): boolean {
    this.vehiculoForm.markAllAsTouched();
    return this.vehiculoForm.valid;
  }
}
```

**Template del step:**
```html
<!-- Pasa el form al componente "tonto" -->
<app-vehiculo-form
  [form]="vehiculoForm"
  [patenteBuscando]="patenteBuscando"
  (patenteBlur)="onPatenteBlur($event)"
></app-vehiculo-form>
```

### Por que separar?

```
Sin separacion:
  Un componente gigante que tiene FormGroup + validadores + llamadas HTTP
  + rendering + logica de wizard. Imposible de reutilizar o testear.

Con separacion:
  - VehiculoFormComponent: se testea con un FormGroup mock, sin store ni APIs.
  - StepVehiculoComponent: se testea con un store mock, sin DOM.
  - Si manana necesitas un formulario de vehiculo fuera del wizard
    (ej: pantalla de edicion), usas VehiculoFormComponent directamente.
```

---

## 7. El Contrato WizardStep

Toda step component del wizard implementa esta interfaz:

```typescript
// wizard-core/interfaces/wizard-step.interface.ts
export interface WizardStep {
  saveToStore(): void;
  isValid(): boolean;
}
```

Dos metodos, dos responsabilidades:

| Metodo | Cuando se llama | Que hace |
|--------|-----------------|----------|
| `isValid()` | Al presionar "Siguiente" | Marca los campos como touched (muestra errores), retorna `true`/`false` |
| `saveToStore()` | Despues de `isValid() === true`, o al presionar "Anterior" | Despacha una action para persistir los datos del formulario en el store |

### Quien los llama?

El **orquestador** (`InsuranceWizardComponent`), no el wizard-container:

```typescript
// insurance-wizard.component.ts

onNext(): void {
  // 1. Validar
  if (!this._activeStepRef || !this._activeStepRef.isValid()) {
    return;  // ← no avanza, el usuario ve los errores
  }
  // 2. Guardar
  this._activeStepRef.saveToStore();
  // 3. Avanzar
  this.store.dispatch(nextStep());
}

onPrevious(): void {
  // Al ir atras, guarda sin validar (para no perder lo que escribio)
  this._activeStepRef?.saveToStore();
  this.store.dispatch(prevStep());
}
```

El `wizard-container` es **puramente presentacional**. Solo emite eventos (`next`, `previous`, `goToStep`). No sabe que existe `WizardStep` ni interactua con los steps.

---

## 8. Comunicacion entre Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  wizard-core/WizardContainerComponent (presentacional)          │
│  │                                                              │
│  │  Recibe @Inputs:  stepsConfig, currentStep, isFirst, isLast  │
│  │  Emite @Outputs:  (next), (previous), (goToStep)             │
│  │                                                              │
│  │  NO sabe de seguros. NO sabe de NgRx.                        │
│  │  Solo renderiza el stepper y los botones.                    │
│  │                                                              │
└──┼──────────────────────────────────────────────────────────────┘
   │
   │ eventos
   ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  insurance/InsuranceWizardComponent (orquestador)               │
│  │                                                              │
│  │  Conecta wizard-core con NgRx:                               │
│  │  - Lee del store via selectores + async pipe                 │
│  │  - Pasa al wizard-container via @Inputs                      │
│  │  - Recibe eventos y ejecuta logica de negocio                │
│  │  - Accede al step activo via @ViewChild                      │
│  │                                                              │
│  │  Renderiza el step activo via ngSwitch:                      │
│  │  <ng-container [ngSwitch]="stepConfig.component">            │
│  │    <app-step-vehiculo *ngSwitchCase="'step-vehiculo'" #step> │
│  │  </ng-container>                                             │
│  │                                                              │
└──┼──────────────────────────────────────────────────────────────┘
   │
   │ #step (ViewChild)
   ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  insurance/steps/StepVehiculoComponent (step inteligente)       │
│  │                                                              │
│  │  Implementa WizardStep (saveToStore, isValid)                │
│  │  Crea FormGroup, inyecta Store y API service                 │
│  │  Delega el rendering al componente tonto                     │
│  │                                                              │
│  │  <app-vehiculo-form [form]="vehiculoForm">                  │
│  │                                                              │
└──┼──────────────────────────────────────────────────────────────┘
   │
   │ @Input/@Output
   ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  shared/components/VehiculoFormComponent (presentacional)       │
│                                                                 │
│  Recibe @Input form: FormGroup                                  │
│  Emite @Output patenteBlur                                      │
│  NO sabe del wizard, del store, ni de seguros                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de datos (resumen)

```
       Datos bajan (store → template)           Eventos suben (template → store)
       ──────────────────────────                ────────────────────────────────

       Store                                     VehiculoFormComponent
         │                                         │
         │ selectores + async pipe                  │ @Output patenteBlur
         ▼                                         ▼
       InsuranceWizardComponent                  StepVehiculoComponent
         │                                         │
         │ @Input stepsConfig, currentStep          │ saveToStore() → dispatch
         ▼                                         ▼
       WizardContainerComponent                  Store
```

---

## 9. El Store: Estructura Completa del State

```typescript
interface InsuranceWizardState {
  // ── Config (se escribe UNA vez con initWizard, no cambia despues) ──
  productoId: string | null;                    // 'salud-familiar', 'auto-basico', etc.
  stepsConfig: InsuranceStepConfig[];           // array de steps del producto
  validationRules: ProductValidationRules | null; // reglas de validacion del backend
  dpsConfig: DpsConfig | null;                  // config de preguntas DPS

  // ── Navegacion ──
  currentStep: number;                          // indice del step activo (0-based)

  // ── Datos del usuario (se escriben con save*) ──
  titular: PersonaData | null;
  cargas: PersonaData[];
  vehiculo: VehiculoData | null;                // solo auto-basico
  dpsRespuestas: Record<string, any>;           // respuestas de la DPS
  cobertura: any | null;
  pago: any | null;

  // ── Datos del backend (se escriben con effects) ──
  parentescos: ParentescoOption[];              // opciones de parentesco (hijo, conyuge...)
  parentescosLoading: boolean;

  // ── Estado de validacion async ──
  validacion: {
    loading: boolean;       // true mientras la API valida
    resultado: any | null;  // respuesta exitosa de la API
    error: string | null;   // mensaje de error si fallo
  };
}
```

### Ciclo de vida del state

```
1. Usuario navega a /contratar/auto-basico
   │
   ▼
2. InsuranceWizardComponent.initProduct()
   │  dispatch resetWizard()        → state = initialState (todo null/vacio)
   │  dispatch initWizard({...})    → state.productoId = 'auto-basico'
   │                                  state.stepsConfig = [titular, vehiculo, ...]
   │                                  state.validationRules = { titular: {...} }
   │
   ▼
3. Usuario llena step 1 (titular) y presiona Siguiente
   │  dispatch saveTitular({...})   → state.titular = { nombre: 'Juan', ... }
   │  dispatch nextStep()           → state.currentStep = 1
   │
   ▼
4. Usuario llena step 2 (vehiculo) y presiona Siguiente
   │  dispatch saveVehiculo({...})  → state.vehiculo = { patente: 'ABCD12', ... }
   │  dispatch nextStep()           → state.currentStep = 2
   │
   ▼
5. Usuario llega a validacion y presiona "Validar Datos"
   │  dispatch validarDatos()       → state.validacion.loading = true
   │  (effect llama a la API)
   │  dispatch validarDatosSuccess  → state.validacion = { loading: false, resultado: {...} }
   │
   ▼
6. Si el usuario vuelve al step 1 y vuelve a avanzar
   │  Los datos se restauran del store (patchValue en ngOnInit de cada step)
```

---

## 10. Async Pipe vs Subscribe Manual

El orquestador usa **async pipe** para consumir el store:

```html
<!-- insurance-wizard.component.html -->
<app-wizard-container
  [stepsConfig]="(stepsConfig$ | async) || []"
  [currentStep]="(currentStep$ | async) || 0"
  [isFirstStep]="(isFirstStep$ | async) !== false"
  [isLastStep]="(isLastStep$ | async) === true"
>
```

```typescript
// insurance-wizard.component.ts
stepsConfig$: Observable<InsuranceStepConfig[]> = this.store.select(selectStepsConfig);
currentStep$: Observable<number> = this.store.select(selectCurrentStep);
```

### Por que async pipe en vez de subscribe?

| | `subscribe` manual | `async` pipe |
|---|---|---|
| Desuscripcion | Manual (necesitas `destroy$` + `takeUntil`) | Automatica (Angular lo maneja) |
| Change detection | Puede causar NG0100 si asignas en ngOnChanges | Seguro, Angular sabe cuando re-renderizar |
| Codigo | Mas verbose (subscribe + asignacion + cleanup) | Menos codigo |

Los **steps** usan `subscribe` manual porque necesitan asignar valores a propiedades que luego pasan como `@Input` a componentes hijos. En ese caso se usa el patron `destroy$`:

```typescript
private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.store.select(selectVehiculo)
    .pipe(takeUntil(this.destroy$))
    .subscribe((v) => { if (v) { this.vehiculoForm.patchValue(v); } });
}

ngOnDestroy(): void {
  this.destroy$.next();      // emite → takeUntil cancela todas las suscripciones
  this.destroy$.complete();  // limpia el Subject
}
```

---

## 11. El ViewChild y Por Que No es un @Input

El orquestador accede al step activo via `@ViewChild`:

```typescript
@ViewChild('step') set stepRef(ref: WizardStep) {
  if (ref) { this._activeStepRef = ref; }
}
private _activeStepRef: WizardStep | null = null;
```

Y lo usa **solo en event handlers** (nunca en bindings del template):

```typescript
onNext(): void {
  if (!this._activeStepRef || !this._activeStepRef.isValid()) { return; }
  this._activeStepRef.saveToStore();
  this.store.dispatch(nextStep());
}
```

### Por que no pasarlo como @Input al wizard-container?

Antes se hacia asi: `[activeStep]="activeStepRef"`. Esto causaba el error **NG0100** (ExpressionChangedAfterItHasBeenCheckedError) porque:

1. Primera pasada de change detection: `activeStepRef` es `null` (el view no se creo todavia)
2. Angular crea el view, el `@ViewChild` se resuelve → `activeStepRef` pasa a ser el componente
3. Segunda pasada (dev mode): Angular detecta que `activeStepRef` cambio de `null` a objeto → NG0100

**Solucion**: el ViewChild se usa solo en metodos imperativos (event handlers), nunca en bindings reactivos. El wizard-container no necesita saber del step, solo emite eventos.

---

## 12. Persistencia de Datos entre Steps

Cuando el usuario avanza de step, Angular **destruye** el componente actual y **crea** el siguiente (via `ngSwitch`). Los datos del formulario se perderian si no se guardaran.

```
Step 1 (activo)    →  Usuario presiona "Siguiente"  →  Step 2 (activo)
FormGroup con datos     saveToStore() guarda en NgRx     ngOnInit() restaura del store
                        Angular destruye Step 1
```

Cada step implementa esta logica:

```typescript
// Al crear el step: restaurar datos si existen
ngOnInit(): void {
  this.vehiculoForm = this.fb.group({ ... });

  // Si el usuario vuelve de un step posterior, restaura lo que habia escrito
  this.store.select(selectVehiculo)
    .pipe(take(1))  // ← solo la primera emision, no necesita destroy$
    .subscribe((v) => {
      if (v) { this.vehiculoForm.patchValue(v); }
    });
}

// Al salir del step: guardar datos
saveToStore(): void {
  this.store.dispatch(saveVehiculo({ vehiculo: this.vehiculoForm.value }));
}
```

**`take(1)`** es importante: solo leemos el valor actual del store para restaurar. No queremos una suscripcion viva que sobreescriba lo que el usuario tipea.

---

## 13. Flujo de Validacion Asincrona (Effect Completo)

El step de validacion tiene un boton "Validar Datos" que llama a una API:

```
Usuario presiona "Validar Datos"
  │
  ▼
StepValidacionComponent.validar()
  │  this.store.dispatch(validarDatos())
  │
  ▼
Reducer: validarDatos
  │  state.validacion = { loading: true, resultado: null, error: null }
  │  → El template muestra "Validando..."
  │
  ▼
Effect: validarDatos$
  │  1. Escucha la accion validarDatos
  │  2. Lee titular y cargas del store (withLatestFrom)
  │  3. Llama a this.api.validarPersonas(titular, cargas)
  │
  ├── API responde OK:
  │   dispatch validarDatosSuccess({ resultado: { valido: true, mensaje: '...' } })
  │   → Reducer: state.validacion = { loading: false, resultado: {...}, error: null }
  │   → Template: muestra "✓ Datos validos"
  │   → isValid() retorna true → el usuario puede avanzar
  │
  └── API falla:
      dispatch validarDatosError({ error: 'Error de conexion' })
      → Reducer: state.validacion = { loading: false, resultado: null, error: '...' }
      → Template: muestra "✗ Error de conexion"
      → isValid() retorna false → no puede avanzar
```

### Los 3 estados de una operacion async

Cualquier operacion async sigue el mismo patron de 3 acciones:

```
accion           → loading: true,  resultado: null, error: null
accionSuccess    → loading: false, resultado: {...}, error: null
accionError      → loading: false, resultado: null,  error: '...'
```

Esto se repite para `loadParentescos` y `validarDatos`. Si agregas una nueva llamada async, seguirias el mismo patron.

---

## Resumen

| Concepto | Archivo(s) | Responsabilidad |
|----------|-----------|-----------------|
| Actions | `insurance.actions.ts` | Declaran QUE paso (mensajes) |
| Reducer | `insurance.reducer.ts` | Calcula el NUEVO state (funcion pura, sincrona) |
| Selectors | `insurance.selectors.ts` | Leen pedazos del state (memoizados) |
| Effects | `insurance.effects.ts` | Manejan side effects (HTTP, timers) |
| Store | NgRx runtime | Contiene el state, notifica a los selectores |
| Step (smart) | `insurance/steps/` | Implementa WizardStep, inyecta Store y APIs |
| Form (dumb) | `shared/components/` | Renderiza formulario, solo @Input/@Output |
| Orquestador | `insurance-wizard.component.ts` | Conecta store con wizard-core, maneja navegacion |
| Container | `wizard-container.component.ts` | Renderiza stepper y botones, emite eventos |
