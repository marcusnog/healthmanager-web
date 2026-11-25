/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CareInput } from '../models/CareInput';
import type { CareItem } from '../models/CareItem';
import type { CareWorkspace } from '../models/CareWorkspace';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PatientCareService {
    /**
     * @param patientId
     * @param source
     * @returns CareWorkspace OK
     * @throws ApiError
     */
    public static patientCareRead(
        patientId: string,
        source: string,
    ): CancelablePromise<CareWorkspace> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/patients/{patientId}/care/{source}',
            path: {
                'patientId': patientId,
                'source': source,
            },
            errors: {
                400: `Invalid care record or link`,
                403: `Forbidden`,
                404: `Patient or source unavailable`,
                409: `Conflicting revision or existing link`,
            },
        });
    }
    /**
     * @param patientId
     * @param source
     * @param id
     * @param requestBody
     * @returns CareItem OK
     * @throws ApiError
     */
    public static patientCareSave(
        patientId: string,
        source: string,
        id: string,
        requestBody: CareInput,
    ): CancelablePromise<CareItem> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/patients/{patientId}/care/{source}/{id}',
            path: {
                'patientId': patientId,
                'source': source,
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid care record or link`,
                403: `Forbidden`,
                404: `Patient or source unavailable`,
                409: `Conflicting revision or existing link`,
            },
        });
    }
}
