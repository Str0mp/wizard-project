import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  PersonaData,
  ImcResult,
  RutLookupResult,
  ParentescoOption,
  VehiculoData,
  VehiculoLookupResult,
} from '../../shared/models/shared.models';

@Injectable({ providedIn: 'root' })
export class InsuranceApiService {
  constructor(private http: HttpClient) {}

  getParentescos(productoId: string): Observable<ParentescoOption[]> {
    const mock: Record<string, ParentescoOption[]> = {
      'vida-premium': [
        { id: 'conyuge', label: 'Cónyuge', reglas: {
          fechaNacimiento: { required: true, edadMinima: 18, edadMaxima: 65, customErrorMsg: 'El cónyuge debe tener entre 18 y 65 años.' },
        }},
        { id: 'hijo', label: 'Hijo/a', reglas: {
          fechaNacimiento: { required: true, edadMinima: 0, edadMaxima: 24, customErrorMsg: 'El hijo/a debe tener como máximo 24 años.' },
        }},
        { id: 'padre', label: 'Padre/Madre', reglas: {
          fechaNacimiento: { required: true, edadMinima: 40, edadMaxima: 85, customErrorMsg: 'Padre/madre debe tener entre 40 y 85 años.' },
        }},
      ],
      'salud-familiar': [
        { id: 'conyuge', label: 'Cónyuge', reglas: {
          fechaNacimiento: { required: true, edadMinima: 18, edadMaxima: 60, customErrorMsg: 'El cónyuge debe tener entre 18 y 60 años.' },
          peso: { required: true, min: 40, max: 200 }, estatura: { required: true, min: 140, max: 220 },
        }},
        { id: 'hijo', label: 'Hijo/a', reglas: {
          fechaNacimiento: { required: true, edadMinima: 2, edadMaxima: 24, customErrorMsg: 'El hijo/a debe tener entre 2 y 24 años.' },
          peso: { required: true, min: 10, max: 150 }, estatura: { required: true, min: 50, max: 200 },
        }},
      ],
    };
    return of(mock[productoId] || []).pipe(delay(500));
  }

  validarPersonas(titular: PersonaData | null, cargas: PersonaData[]): Observable<any> {
    return of({ valido: true, mensaje: 'Datos validados correctamente.' }).pipe(delay(1500));
  }

  calcularImc(peso: number, estatura: number): Observable<ImcResult> {
    const h = estatura / 100;
    const imc = parseFloat((peso / (h * h)).toFixed(1));
    let cat = 'Normal';
    if (imc < 18.5) { cat = 'Bajo peso'; }
    else if (imc >= 25 && imc < 30) { cat = 'Sobrepeso'; }
    else if (imc >= 30) { cat = 'Obesidad'; }
    return of({ imc, categoria: cat, valido: imc >= 16 && imc <= 40, mensaje: `IMC ${imc} - ${cat}` }).pipe(delay(800));
  }

  buscarPorPatente(patente: string): Observable<VehiculoLookupResult> {
    const db: Record<string, Partial<VehiculoData>> = {
      'ABCD12': { marca: 'Toyota', modelo: 'Corolla', anio: 2022, color: 'Blanco' },
      'WXYZ99': { marca: 'Hyundai', modelo: 'Tucson', anio: 2021, color: 'Gris' },
    };
    const v = db[patente.toUpperCase()];
    return of(v ? { encontrado: true, vehiculo: v } : { encontrado: false }).pipe(delay(600));
  }

  buscarPorRut(rut: string): Observable<RutLookupResult> {
    const db: Record<string, Partial<PersonaData>> = {
      '12345678-9': { nombre: 'Juan', apellidos: 'Pérez González', fechaNacimiento: '1985-03-15' },
      '98765432-1': { nombre: 'María', apellidos: 'López Araya', fechaNacimiento: '1990-07-22' },
      '195194467': { nombre: 'Jorge', apellidos: 'Martini Schwenke', fechaNacimiento: '1997-04-21' },
      '194807635': { nombre: 'America', apellidos: 'Burgos', fechaNacimiento: '1997-02-27' },
      '97142807': { nombre: 'Susana', apellidos: 'Schwenke', fechaNacimiento: '1965-06-11' },
    };
    const c = db[rut];
    return of(c ? { encontrado: true, persona: c } : { encontrado: false }).pipe(delay(600));
  }
}
