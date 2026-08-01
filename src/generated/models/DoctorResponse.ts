/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpecialtyItem } from './SpecialtyItem';
export type DoctorResponse = {
    id?: string;
    name?: string;
    crm?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
    clinicSharePercentage?: number;
    specialties?: Array<SpecialtyItem>;
};

