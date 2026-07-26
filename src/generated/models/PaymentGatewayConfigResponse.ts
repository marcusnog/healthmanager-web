/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PaymentGatewayConfigResponse = {
    id?: string;
    provider?: PaymentGatewayConfigResponse.provider;
    environment?: PaymentGatewayConfigResponse.environment;
    isEnabled?: boolean;
};
export namespace PaymentGatewayConfigResponse {
    export enum provider {
        ASAAS = 'Asaas',
        MERCADO_PAGO = 'MercadoPago',
        STRIPE = 'Stripe',
    }
    export enum environment {
        SANDBOX = 'Sandbox',
        PRODUCTION = 'Production',
    }
}

