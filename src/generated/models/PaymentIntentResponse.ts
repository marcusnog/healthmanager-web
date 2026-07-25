/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PaymentIntentResponse = {
    id?: string;
    receivableId?: string;
    amount?: number;
    status?: PaymentIntentResponse.status;
    gateway?: string | null;
    gatewayReference?: string | null;
    idempotencyKey?: string;
    confirmedAt?: string | null;
    failureReason?: string | null;
};
export namespace PaymentIntentResponse {
    export enum status {
        CREATED = 'Created',
        PROCESSING = 'Processing',
        CONFIRMED = 'Confirmed',
        FAILED = 'Failed',
        CANCELLED = 'Cancelled',
    }
}

