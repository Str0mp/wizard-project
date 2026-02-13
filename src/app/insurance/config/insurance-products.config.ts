// ============================================================================
// insurance-products.config.ts
// En producción todo esto vendría de un endpoint.
// Aquí se simula para desarrollo.
// ============================================================================

import { InsuranceWizardConfig } from "../models/insurance.models";

export const INSURANCE_PRODUCTS: Record<string, InsuranceWizardConfig> = {
  "vida-premium": {
    productoId: "vida-premium",
    productoNombre: "Seguro de Vida Premium",
    steps: [
      {
        id: "titular-cargas",
        label: "Datos Personales",
        component: "step-titular-cargas",
        requiereCargas: true,
      },
      { id: "cobertura", label: "Cobertura", component: "step-cobertura" },
      { id: "validacion", label: "Validación", component: "step-validacion" },
      { id: "pago", label: "Forma de Pago", component: "step-pago" },
      { id: "resumen", label: "Resumen", component: "step-resumen" },
    ],
    validationRules: {
      titular: {
        nombre: { required: true, minLength: 2, maxLength: 50 },
        apellidos: { required: true, minLength: 2, maxLength: 80 },
        rut: { required: true },
        fechaNacimiento: {
          required: true,
          edadMinima: 18,
          edadMaxima: 65,
          customErrorMsg: "El titular debe tener entre 18 y 65 años.",
        },
      },
      cargas: {
        nombre: { required: true, minLength: 2 },
        rut: { required: true },
        fechaNacimiento: {
          required: true,
          edadMinima: 0,
          edadMaxima: 75,
          customErrorMsg: "La carga debe tener como máximo 75 años.",
        },
      },
      maxCargas: 8,
      minCargas: 0,
    },
  },

  "salud-familiar": {
    productoId: "salud-familiar",
    productoNombre: "Seguro de Salud Familiar",
    steps: [
      {
        id: "titular-cargas",
        label: "Titular y Cargas",
        component: "step-titular-cargas",
        requiereCargas: true,
        requiereImc: true,
      },
      {
        id: "dps",
        label: "Declaración de Salud",
        component: "step-dps",
        requiereDps: true,
      },
      { id: "cobertura", label: "Plan", component: "step-cobertura" },
      { id: "validacion", label: "Validación", component: "step-validacion" },
      { id: "pago", label: "Pago", component: "step-pago" },
      { id: "resumen", label: "Resumen", component: "step-resumen" },
    ],
    validationRules: {
      titular: {
        nombre: { required: true, minLength: 2, maxLength: 50 },
        fechaNacimiento: {
          required: true,
          edadMinima: 18,
          edadMaxima: 60,
          customErrorMsg: "El titular debe tener entre 18 y 60 años.",
        },
        peso: { required: true, min: 30, max: 300 },
        estatura: { required: true, min: 100, max: 250 },
      },
      cargas: {
        nombre: { required: true, minLength: 2 },
        fechaNacimiento: {
          required: true,
          edadMinima: 2,
          edadMaxima: 75,
          customErrorMsg: "La carga debe tener entre 2 y 75 años.",
        },
        peso: { required: true, min: 10, max: 300 },
        estatura: { required: true, min: 50, max: 250 },
      },
      maxCargas: 5,
      minCargas: 1,
    },
    dpsConfig: {
      titulo: "Declaración Personal de Salud",
      descripcion:
        "Responda las siguientes preguntas sobre su estado de salud.",
      preguntas: [
        {
          id: "enfermedad_cronica",
          texto: "¿Padece alguna enfermedad crónica?",
          tipo: "si_no",
          requerida: true,
        },
        {
          id: "enfermedad_detalle",
          texto: "Indique cuál(es):",
          tipo: "texto",
          requerida: true,
          dependeDe: "enfermedad_cronica",
          dependeValor: "si",
          placeholder: "Ej: diabetes, hipertensión...",
        },
        {
          id: "medicamentos",
          texto: "¿Toma medicamentos de forma regular?",
          tipo: "si_no",
          requerida: true,
        },
        {
          id: "medicamentos_detalle",
          texto: "Indique cuál(es):",
          tipo: "texto",
          requerida: true,
          dependeDe: "medicamentos",
          dependeValor: "si",
        },
        {
          id: "cirugia_reciente",
          texto: "¿Ha sido operado en los últimos 2 años?",
          tipo: "si_no",
          requerida: true,
        },
        {
          id: "cirugia_fecha",
          texto: "Fecha de la última cirugía:",
          tipo: "fecha",
          requerida: true,
          dependeDe: "cirugia_reciente",
          dependeValor: "si",
        },
        {
          id: "fumador",
          texto: "¿Es fumador activo?",
          tipo: "si_no",
          requerida: true,
        },
        {
          id: "cigarrillos_dia",
          texto: "Cantidad de cigarrillos por día:",
          tipo: "numerico",
          requerida: true,
          dependeDe: "fumador",
          dependeValor: "si",
          placeholder: "Ej: 10",
        },
      ],
    },
  },

  "auto-basico": {
    productoId: "auto-basico",
    productoNombre: "Seguro Automotriz Básico",
    steps: [
      {
        id: "titular-cargas",
        label: "Datos",
        component: "step-titular-cargas",
        requiereCargas: false,
      },
      { id: "vehiculo", label: "Vehículo", component: "step-vehiculo" },
      { id: "cobertura", label: "Cobertura", component: "step-cobertura" },
      { id: "validacion", label: "Validación", component: "step-validacion" },
      { id: "pago", label: "Pago", component: "step-pago" },
      { id: "resumen", label: "Resumen", component: "step-resumen" },
    ],
    validationRules: {
      titular: {
        nombre: { required: true, minLength: 2 },
        rut: { required: true },
        fechaNacimiento: {
          required: true,
          edadMinima: 18,
          edadMaxima: 99,
          customErrorMsg: "Debe ser mayor de 18 años.",
        },
      },
    },
  },

  "hogar-basico": {
    productoId: "hogar-basico",
    productoNombre: "Seguro de Hogar Básico",
    steps: [
      {
        id: "titular",
        label: "Datos",
        component: "step-titular-cargas",
        requiereCargas: false,
      },
      { id: "validacion", label: "Validación", component: "step-validacion" },
      { id: "cobertura", label: "Cobertura", component: "step-cobertura" },
      { id: "pago", label: "Pago", component: "step-pago" },
      { id: "resumen", label: "Resumen", component: "step-resumen" },
    ],
    validationRules: {
      titular: {
        nombre: { required: true, minLength: 5 },
        rut: { required: true },
        fechaNacimiento: { required: true, edadMinima: 18, edadMaxima: 99 },
      },
    },
  },
};
