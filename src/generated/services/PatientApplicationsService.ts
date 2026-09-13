/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GrantApplicationBalanceRequest } from '../models/GrantApplicationBalanceRequest';
import type { PatientApplicationBalanceResponse } from '../models/PatientApplicationBalanceResponse';
import type { PatientApplicationRequest } from '../models/PatientApplicationRequest';
import type { PatientApplicationResponse } from '../models/PatientApplicationResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PatientApplicationsService {
    /**
     * @param patientId
     * @returns PatientApplicationResponse OK
     * @throws ApiError
     */
    public static patientApplicationsList(
        patientId: string,
    ): CancelablePromise<Array<PatientApplicationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/patients/{patientId}/applications',
            path: {
                'patientId': patientId,
            },
        });
    }
    /**
     * @param patientId
     * @param requestBody
     * @returns PatientApplicationResponse OK
     * @throws ApiError
     */
    public static patientApplicationsCreate(
        patientId: string,
        requestBody?: PatientApplicationRequest,
    ): CancelablePromise<PatientApplicationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/patients/{patientId}/applications',
            path: {
                'patientId': patientId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param patientId
     * @returns PatientApplicationBalanceResponse OK
     * @throws ApiError
     */
    public static patientApplicationBalanceList(
        patientId: string,
    ): CancelablePromise<Array<PatientApplicationBalanceResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/patients/{patientId}/applications/balance',
            path: {
                'patientId': patientId,
            },
        });
    }
    /**
     * @param patientId
     * @param requestBody
     * @returns PatientApplicationBalanceResponse OK
     * @throws ApiError
     */
    public static patientApplicationBalanceGrant(
        patientId: string,
        requestBody?: GrantApplicationBalanceRequest,
    ): CancelablePromise<Array<PatientApplicationBalanceResponse>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/patients/{patientId}/applications/balance',
            path: {
                'patientId': patientId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
