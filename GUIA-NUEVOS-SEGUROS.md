# Guía: Cómo agregar nuevos seguros y componentes

## Agregar un nuevo producto de seguro (solo config)

Si el nuevo seguro usa steps que ya existen, solo necesitás tocar **un archivo**:

**`src/app/insurance/config/insurance-products.config.ts`**

```typescript
'hogar-basico': {
  productoId: 'hogar-basico',
  productoNombre: 'Seguro de Hogar Básico',
  steps: [
    { id: 'titular', label: 'Datos', component: 'step-titular-cargas', requiereCargas: false },
    { id: 'cobertura', label: 'Cobertura', component: 'step-cobertura' },
    { id: 'pago', label: 'Pago', component: 'step-pago' },
    { id: 'resumen', label: 'Resumen', component: 'step-resumen' },
  ],
  validationRules: {
    titular: {
      nombre: { required: true, minLength: 2 },
      rut: { required: true },
      fechaNacimiento: { required: true, edadMinima: 18, edadMaxima: 99 },
    },
  },
},
```

Luego agregá la ruta en `app-routing.module.ts` apuntando a `/contratar/hogar-basico`.

---

## Agregar un step con un componente nuevo (ej: datos de propiedad)

Son 5 pasos. Se puede usar como checklist.

### 1. Modelo en shared

**Archivo:** `src/app/shared/models/shared.models.ts`

```typescript
export interface PropiedadData {
  direccion: string;
  comuna: string;
  metrosCuadrados: number | null;
  tipoConstruccion: string;
}
```

### 2. Componente presentacional en shared

**Crear carpeta:** `src/app/shared/components/propiedad-form/`

Tres archivos:

- `propiedad-form.component.ts` — recibe `@Input() form: FormGroup`, emite `@Output()` para eventos. **No inyecta servicios.**
- `propiedad-form.component.html` — template con los campos
- `propiedad-form.component.scss` — estilos

**Registrar en** `src/app/shared/shared-forms.module.ts`:

```typescript
declarations: [..., PropiedadFormComponent],
exports: [..., PropiedadFormComponent],
```

### 3. Store (action + reducer + selector)

**`insurance.actions.ts`** — agregar:
```typescript
export const savePropiedad = createAction('[Insurance Wizard] Save Propiedad', props<{ propiedad: PropiedadData }>());
```

**`insurance.models.ts`** — agregar al `InsuranceWizardState`:
```typescript
propiedad: PropiedadData | null;
```

**`insurance.reducer.ts`** — agregar al `initialState` y al reducer:
```typescript
// initialState
propiedad: null,

// reducer
on(A.savePropiedad, (s, { propiedad }) => ({ ...s, propiedad })),
```

**`insurance.selectors.ts`** — agregar:
```typescript
export const selectPropiedad = createSelector(selectInsuranceWizard, (s) => s.propiedad);
```

### 4. Step component en insurance

**Crear carpeta:** `src/app/insurance/steps/step-propiedad/`

```typescript
// step-propiedad.component.ts
@Component({
  selector: 'app-step-propiedad',
  templateUrl: './step-propiedad.component.html',
})
export class StepPropiedadComponent implements WizardStep, OnInit, OnDestroy {
  propiedadForm!: FormGroup;

  constructor(private fb: FormBuilder, private store: Store) {}

  ngOnInit(): void {
    this.propiedadForm = this.fb.group({
      direccion: ['', Validators.required],
      comuna: ['', Validators.required],
      metrosCuadrados: [null, [Validators.required, Validators.min(10)]],
      tipoConstruccion: ['', Validators.required],
    });

    // Restaurar datos si el usuario vuelve de un step posterior
    this.store.select(selectPropiedad).pipe(take(1)).subscribe((p) => {
      if (p) { this.propiedadForm.patchValue(p); }
    });
  }

  saveToStore(): void {
    this.store.dispatch(savePropiedad({ propiedad: this.propiedadForm.value }));
  }

  isValid(): boolean {
    this.propiedadForm.markAllAsTouched();
    return this.propiedadForm.valid;
  }
}
```

Template:
```html
<app-propiedad-form [form]="propiedadForm"></app-propiedad-form>
```

**Registrar en** `src/app/insurance/insurance-wizard.module.ts`:
```typescript
declarations: [..., StepPropiedadComponent],
```

### 5. Conectar

**`insurance-wizard.component.html`** — agregar al ngSwitch:
```html
<app-step-propiedad *ngSwitchCase="'step-propiedad'" #step></app-step-propiedad>
```

**`insurance-products.config.ts`** — agregar el step al producto:
```typescript
{ id: 'propiedad', label: 'Propiedad', component: 'step-propiedad' },
```

---

## Resumen visual

```
shared/models/           → Interfaz (PropiedadData)
shared/components/       → Componente "tonto" (PropiedadFormComponent)
shared/shared-forms.module → Registrar
insurance/store/         → Action + Reducer + Selector
insurance/steps/         → Step "inteligente" (StepPropiedadComponent)
insurance/module         → Registrar
insurance/config         → Agregar al producto
insurance-wizard.html    → Agregar al ngSwitch
```

Cada capa tiene una responsabilidad. El componente shared no sabe del wizard. El step no sabe del template. El config no sabe de Angular. Si seguís este orden no vas a tener problemas de dependencias circulares ni componentes acoplados.
