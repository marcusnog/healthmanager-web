/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WhatsAppMessageResponse = {
    id: string;
    phone: string;
    message: string;
    status: WhatsAppMessageResponse.status;
    direction: WhatsAppMessageResponse.direction;
    createdAt: string;
    providerTimestamp?: string | null;
};
export namespace WhatsAppMessageResponse {
    export enum status {
        PENDING = 'Pending',
        SENT = 'Sent',
        DELIVERED = 'Delivered',
        FAILED = 'Failed',
        READ = 'Read',
    }
    export enum direction {
        INBOUND = 'Inbound',
        OUTBOUND = 'Outbound',
    }
}

