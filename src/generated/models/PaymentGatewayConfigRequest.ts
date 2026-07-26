/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PaymentGatewayConfigRequest = {
    provider: PaymentGatewayConfigRequest.provider;
    apiKey?: string | null;
    secret?: string | null;
    environment: PaymentGatewayConfigRequest.environment;
    webhookSecret?: string | null;
    isEnabled: boolean;
};
export namespace PaymentGatewayConfigRequest {
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

