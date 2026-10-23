/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClinicalField } from './ClinicalField';
export type SaveClinicalCatalogRequest = {
    kind?: string | null;
    folder?: string | null;
    title?: string | null;
    content?: string | null;
    personal?: boolean;
    fields?: Array<ClinicalField> | null;
    revision?: string | null;
};

