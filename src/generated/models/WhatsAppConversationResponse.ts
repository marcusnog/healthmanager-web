/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WhatsAppConversationResponse = {
    phone: string;
    patientName?: string | null;
    lastMessage: string;
    lastMessageAt: string;
    lastDirection: WhatsAppConversationResponse.lastDirection;
};
export namespace WhatsAppConversationResponse {
    export enum lastDirection {
        INBOUND = 'Inbound',
        OUTBOUND = 'Outbound',
    }
}

