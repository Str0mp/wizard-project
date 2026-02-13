// ============================================================================
// insurance.effects.ts
// ============================================================================

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { switchMap, withLatestFrom, map, catchError } from 'rxjs/operators';
import * as A from './insurance.actions';
import { selectTitularYCargas } from './insurance.selectors';
import { InsuranceApiService } from '../services/insurance-api.service';

@Injectable()
export class InsuranceEffects {

  loadParentescos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadParentescos),
      switchMap(({ productoId }) =>
        this.api.getParentescos(productoId).pipe(
          map((parentescos) => A.loadParentescosSuccess({ parentescos })),
          catchError((e) => of(A.loadParentescosError({ error: e.message }))),
        )
      ),
    )
  );

  validarDatos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.validarDatos),
      withLatestFrom(this.store.select(selectTitularYCargas)),
      switchMap(([_, { titular, cargas }]) =>
        this.api.validarPersonas(titular, cargas).pipe(
          map((resultado) => A.validarDatosSuccess({ resultado })),
          catchError((e) => of(A.validarDatosError({ error: e.message }))),
        )
      ),
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store,
    private api: InsuranceApiService,
  ) {}
}
