/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PackageItemRequest } from './PackageItemRequest';
export type PackageRequest = {
    price: number;
    name: string;
    items: Array<PackageItemRequest>;
    isActive?: boolean;
};

