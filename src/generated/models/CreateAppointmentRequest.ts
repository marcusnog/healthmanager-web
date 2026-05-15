/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateAppointmentRequest = {
    patientId: string;
    doctorId: string;
    startAt: string;
    durationMinutes?: number;
    notes?: string;
    type?: string;
    amount?: number;
};

