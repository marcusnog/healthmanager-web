/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClinicalField } from './ClinicalField';
export type ClinicalCatalogResponse = {
    id?: string;
    kind?: string | null;
    folder?: string | null;
    title?: string | null;
    content?: string | null;
    ownerUserId?: string | null;
    fields?: Array<ClinicalField> | null;
    revision?: string;
};

