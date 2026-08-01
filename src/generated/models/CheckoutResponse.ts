/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CheckoutResponse = {
    paymentIntentId?: string;
    receivableId?: string;
    amount?: number;
    paymentMethod?: string;
    status?: string;
    pixQrCode?: string | null;
    pixCopyPaste?: string | null;
    checkoutUrl?: string | null;
    expiresAt?: string | null;
};

