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
    notes?: string;
};

