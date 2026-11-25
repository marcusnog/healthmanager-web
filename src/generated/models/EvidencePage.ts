/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EvidenceDocument } from './EvidenceDocument';
import type { EvidenceHit } from './EvidenceHit';
export type EvidencePage = {
    inspected: number;
    manual: number;
    next?: string | null;
    manualDocuments: Array<EvidenceDocument>;
    hits: Array<EvidenceHit>;
};

