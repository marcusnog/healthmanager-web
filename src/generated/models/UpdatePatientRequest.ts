/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PatientDetails } from './PatientDetails';
export type UpdatePatientRequest = {
    name: string;
    phone: string;
    email?: string;
    healthInsurance?: string;
    healthInsuranceId?: string;
    notes?: string;
    details?: PatientDetails;
};

