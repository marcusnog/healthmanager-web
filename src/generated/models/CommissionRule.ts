/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CommissionRule = {
    enabled: boolean;
    mode: CommissionRule.mode;
    value: number;
    basis: CommissionRule.basis;
};
export namespace CommissionRule {
    export enum mode {
        FIXED = 'Fixed',
        PERCENTAGE = 'Percentage',
    }
    export enum basis {
        DEPOSIT = 'Deposit',
        CONSULTATION = 'Consultation',
        PRODUCT_SALE = 'ProductSale',
        PRODUCT_RECEIVED = 'ProductReceived',
    }
}

