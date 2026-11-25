/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EvidencePage } from '../models/EvidencePage';
import type { EvidenceRequest } from '../models/EvidenceRequest';
import type { ReportCsv } from '../models/ReportCsv';
import type { ReportDirectory } from '../models/ReportDirectory';
import type { ReportResult } from '../models/ReportResult';
import type { SourcePage } from '../models/SourcePage';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ReportsService {
    /**
     * @param requestBody
     * @returns EvidencePage Evidence batch
     * @throws ApiError
     */
    public static reportsSearchEvidence(
        requestBody: EvidenceRequest,
    ): CancelablePromise<EvidencePage> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/reports/evidence/search',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid search`,
                403: `Clinic administrator required`,
            },
        });
    }
    /**
     * @returns ReportDirectory OK
     * @throws ApiError
     */
    public static reportsDirectory(): CancelablePromise<ReportDirectory> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/reports',
            errors: {
                400: `Invalid input`,
                401: `Authentication required`,
                403: `Clinic administrator required`,
                404: `Unknown report or source`,
            },
        });
    }
    /**
     * @param id
     * @param from
     * @param to
     * @returns ReportResult OK
     * @throws ApiError
     */
    public static reportsRun(
        id: string,
        from: string,
        to: string,
    ): CancelablePromise<ReportResult> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/reports/{id}',
            path: {
                'id': id,
            },
            query: {
                'from': from,
                'to': to,
            },
            errors: {
                400: `Invalid input`,
                401: `Authentication required`,
                403: `Clinic administrator required`,
                404: `Unknown report or source`,
            },
        });
    }
    /**
     * @param source
     * @param from
     * @param to
     * @param page
     * @returns SourcePage OK
     * @throws ApiError
     */
    public static reportsReadSource(
        source: string,
        from: string,
        to: string,
        page?: number,
    ): CancelablePromise<SourcePage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/reports/sources/{source}',
            path: {
                'source': source,
            },
            query: {
                'from': from,
                'to': to,
                'page': page,
            },
            errors: {
                400: `Invalid input`,
                401: `Authentication required`,
                403: `Clinic administrator required`,
                404: `Unknown report or source`,
            },
        });
    }
    /**
     * @param source
     * @param requestBody
     * @returns number OK
     * @throws ApiError
     */
    public static reportsImportSource(
        source: string,
        requestBody: ReportCsv,
    ): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/reports/sources/{source}/import',
            path: {
                'source': source,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid input`,
                401: `Authentication required`,
                403: `Clinic administrator required`,
                404: `Unknown report or source`,
            },
        });
    }
}
