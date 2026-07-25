/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ClinicalRecordResponse = {
    id?: string;
    appointmentId?: string;
    patientId?: string;
    doctorId?: string;
    status?: ClinicalRecordResponse.status;
    chiefComplaint?: string | null;
    history?: string | null;
    physicalExam?: string | null;
    assessment?: string | null;
    plan?: string | null;
    finalizedAt?: string | null;
    patientName?: string | null;
    doctorName?: string | null;
};
export namespace ClinicalRecordResponse {
    export enum status {
        DRAFT = 'Draft',
        FINALIZED = 'Finalized',
    }
}

