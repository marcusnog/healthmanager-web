/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreatePaymentRequest = {
    receivableId: string;
    amount: number;
    paymentMethod: string;
    paidAt?: string;
    destinationBank?: string | null;
    fundsRecipient?: CreatePaymentRequest.fundsRecipient;
    notes?: string;
};
export namespace CreatePaymentRequest {
    export enum fundsRecipient {
        CLINIC = 'Clinic',
        OWNER = 'Owner',
    }
}

