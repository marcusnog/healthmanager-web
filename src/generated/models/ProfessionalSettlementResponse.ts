/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProfessionalSettlementItemResponse } from './ProfessionalSettlementItemResponse';
export type ProfessionalSettlementResponse = {
    professionalId?: string;
    professionalName?: string;
    accrued?: number;
    paid?: number;
    outstanding?: number;
    items?: Array<ProfessionalSettlementItemResponse>;
};

