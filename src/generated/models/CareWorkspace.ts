/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CareItem } from './CareItem';
import type { CareLink } from './CareLink';
import type { SourceField } from './SourceField';
export type CareWorkspace = {
    today: string;
    fields: Array<SourceField>;
    links: Array<CareLink>;
    records: Array<CareItem>;
};

