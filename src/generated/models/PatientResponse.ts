/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PatientDetails } from './PatientDetails';
export type PatientResponse = {
    id?: string;
    name?: string;
    cpf?: string;
    birthDate?: string;
    phone?: string;
    email?: string;
    healthInsurance?: string;
    healthInsuranceId?: string;
    healthInsuranceName?: string;
    notes?: string;
    patientAccessToken?: string;
    details?: PatientDetails;
};

