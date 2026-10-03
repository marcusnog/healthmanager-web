/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateAppointmentStatusRequest = {
    status: UpdateAppointmentStatusRequest.status;
};
export namespace UpdateAppointmentStatusRequest {
    export enum status {
        SCHEDULED = 'Scheduled',
        CONFIRMED = 'Confirmed',
        CANCELLED = 'Cancelled',
        COMPLETED = 'Completed',
        NO_SHOW = 'NoShow',
        IN_PROGRESS = 'InProgress',
    }
}

