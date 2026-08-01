/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateManualReceivableRequest = {
    amount: number;
    description?: string;
    dueDate?: string;
    paymentMethod: string;
    paidAt?: string;
    destinationBank?: string | null;
    fundsRecipient?: CreateManualReceivableRequest.fundsRecipient;
    notes?: string;
};
export namespace CreateManualReceivableRequest {
    export enum fundsRecipient {
        CLINIC = 'Clinic',
        OWNER = 'Owner',
    }
}

