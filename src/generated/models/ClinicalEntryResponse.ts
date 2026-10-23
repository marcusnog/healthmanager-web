/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClinicalField } from './ClinicalField';
export type ClinicalEntryResponse = {
    id?: string;
    appointmentId?: string;
    patientId?: string;
    kind?: string | null;
    title?: string | null;
    content?: string | null;
    fields?: Array<ClinicalField> | null;
    values?: Record<string, string> | null;
    signatureMode?: string | null;
    patientName?: string | null;
    doctorName?: string | null;
    doctorCrm?: string | null;
    clinicName?: string | null;
    createdAt?: string;
    correctsEntryId?: string | null;
};

