/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CheckoutRequest = {
    receivableId: string;
    paymentMethod: CheckoutRequest.paymentMethod;
    amount?: number | null;
    returnUrl?: string | null;
};
export namespace CheckoutRequest {
    export enum paymentMethod {
        CASH = 'Cash',
        PIX = 'Pix',
        CREDIT_CARD = 'CreditCard',
        DEBIT_CARD = 'DebitCard',
        INSURANCE = 'Insurance',
    }
}

