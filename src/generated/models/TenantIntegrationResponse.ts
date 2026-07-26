/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BrandingResponse } from './BrandingResponse';
import type { NotificationConfigResponse } from './NotificationConfigResponse';
import type { PaymentGatewayConfigResponse } from './PaymentGatewayConfigResponse';
import type { WhatsAppConfigResponse } from './WhatsAppConfigResponse';
export type TenantIntegrationResponse = {
    whatsApp?: WhatsAppConfigResponse | null;
    paymentGateway?: PaymentGatewayConfigResponse | null;
    notification?: NotificationConfigResponse | null;
    branding?: BrandingResponse | null;
    defaultAppointmentMinutes?: number;
};

