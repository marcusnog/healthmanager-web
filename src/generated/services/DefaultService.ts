/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AppointmentResponse } from '../models/AppointmentResponse';
import type { AuthResponse } from '../models/AuthResponse';
import type { ChangePasswordRequest } from '../models/ChangePasswordRequest';
import type { CreateAppointmentRequest } from '../models/CreateAppointmentRequest';
import type { CreateDoctorRequest } from '../models/CreateDoctorRequest';
import type { CreateManualReceivableRequest } from '../models/CreateManualReceivableRequest';
import type { CreatePatientDocumentRequest } from '../models/CreatePatientDocumentRequest';
import type { CreatePatientRequest } from '../models/CreatePatientRequest';
import type { CreatePaymentRequest } from '../models/CreatePaymentRequest';
import type { DashboardSummaryResponse } from '../models/DashboardSummaryResponse';
import type { DoctorResponse } from '../models/DoctorResponse';
import type { LoginRequest } from '../models/LoginRequest';
import type { PagedAppointmentResponse } from '../models/PagedAppointmentResponse';
import type { PagedDoctorResponse } from '../models/PagedDoctorResponse';
import type { PagedPatientResponse } from '../models/PagedPatientResponse';
import type { PagedPaymentResponse } from '../models/PagedPaymentResponse';
import type { PagedReceivableResponse } from '../models/PagedReceivableResponse';
import type { PatientDocumentResponse } from '../models/PatientDocumentResponse';
import type { PatientPortalAppointmentResponse } from '../models/PatientPortalAppointmentResponse';
import type { PatientPortalAuthResponse } from '../models/PatientPortalAuthResponse';
import type { PatientPortalLoginRequest } from '../models/PatientPortalLoginRequest';
import type { PatientPortalProfileResponse } from '../models/PatientPortalProfileResponse';
import type { PatientPortalReceivableResponse } from '../models/PatientPortalReceivableResponse';
import type { PatientResponse } from '../models/PatientResponse';
import type { PaymentResponse } from '../models/PaymentResponse';
import type { ReceivableResponse } from '../models/ReceivableResponse';
import type { RefreshTokenRequest } from '../models/RefreshTokenRequest';
import type { UpdateAppointmentRequest } from '../models/UpdateAppointmentRequest';
import type { UpdateDoctorRequest } from '../models/UpdateDoctorRequest';
import type { UpdatePatientRequest } from '../models/UpdatePatientRequest';
import type { UploadPatientDocumentForm } from '../models/UploadPatientDocumentForm';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * @param requestBody
     * @returns AuthResponse OK
     * @throws ApiError
     */
    public static authLogin(
        requestBody: LoginRequest,
    ): CancelablePromise<AuthResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/login',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns AuthResponse OK
     * @throws ApiError
     */
    public static authRefresh(
        requestBody: RefreshTokenRequest,
    ): CancelablePromise<AuthResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/refresh',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static authLogout(
        requestBody: RefreshTokenRequest,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/logout',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static authChangePassword(
        requestBody: ChangePasswordRequest,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/change-password',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param page
     * @param pageSize
     * @param search
     * @param sortBy
     * @param sortDirection
     * @param email
     * @param healthInsurance
     * @returns PagedPatientResponse OK
     * @throws ApiError
     */
    public static patientsList(
        page: number = 1,
        pageSize: number = 20,
        search?: string,
        sortBy?: string,
        sortDirection?: string,
        email?: string,
        healthInsurance?: string,
    ): CancelablePromise<PagedPatientResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/patients',
            query: {
                'page': page,
                'pageSize': pageSize,
                'search': search,
                'sortBy': sortBy,
                'sortDirection': sortDirection,
                'email': email,
                'healthInsurance': healthInsurance,
            },
        });
    }
    /**
     * @param requestBody
     * @returns PatientResponse Created
     * @throws ApiError
     */
    public static patientsCreate(
        requestBody: CreatePatientRequest,
    ): CancelablePromise<PatientResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/patients',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns PatientResponse OK
     * @throws ApiError
     */
    public static patientsUpdate(
        id: string,
        requestBody: UpdatePatientRequest,
    ): CancelablePromise<PatientResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/patients/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @returns void
     * @throws ApiError
     */
    public static patientsDelete(
        id: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/patients/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @returns string OK
     * @throws ApiError
     */
    public static patientsRegenerateAccessToken(
        id: string,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/patients/{id}/access-token/regenerate',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @returns PatientDocumentResponse OK
     * @throws ApiError
     */
    public static patientsDocumentsList(
        id: string,
    ): CancelablePromise<Array<PatientDocumentResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/patients/{id}/documents',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns PatientDocumentResponse OK
     * @throws ApiError
     */
    public static patientsDocumentsCreate(
        id: string,
        requestBody: CreatePatientDocumentRequest,
    ): CancelablePromise<PatientDocumentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/patients/{id}/documents',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param formData
     * @returns PatientDocumentResponse OK
     * @throws ApiError
     */
    public static patientsDocumentsUpload(
        id: string,
        formData: UploadPatientDocumentForm,
    ): CancelablePromise<PatientDocumentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/patients/{id}/documents/upload',
            path: {
                'id': id,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * @param id
     * @param documentId
     * @returns binary OK
     * @throws ApiError
     */
    public static patientsDocumentsDownload(
        id: string,
        documentId: string,
    ): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/patients/{id}/documents/{documentId}/download',
            path: {
                'id': id,
                'documentId': documentId,
            },
        });
    }
    /**
     * @param id
     * @param documentId
     * @returns void
     * @throws ApiError
     */
    public static patientsDocumentsDelete(
        id: string,
        documentId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/patients/{id}/documents/{documentId}',
            path: {
                'id': id,
                'documentId': documentId,
            },
        });
    }
    /**
     * @param page
     * @param pageSize
     * @param search
     * @returns PagedDoctorResponse OK
     * @throws ApiError
     */
    public static doctorsList(
        page: number = 1,
        pageSize: number = 20,
        search?: string,
    ): CancelablePromise<PagedDoctorResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/doctors',
            query: {
                'Page': page,
                'PageSize': pageSize,
                'Search': search,
            },
        });
    }
    /**
     * @param requestBody
     * @returns DoctorResponse Created
     * @throws ApiError
     */
    public static doctorsCreate(
        requestBody: CreateDoctorRequest,
    ): CancelablePromise<DoctorResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/doctors',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns DoctorResponse OK
     * @throws ApiError
     */
    public static doctorsUpdate(
        id: string,
        requestBody: UpdateDoctorRequest,
    ): CancelablePromise<DoctorResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/doctors/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @returns void
     * @throws ApiError
     */
    public static doctorsDelete(
        id: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/doctors/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param page
     * @param pageSize
     * @param date
     * @param doctorId
     * @param status
     * @param dateFrom
     * @param dateTo
     * @returns PagedAppointmentResponse OK
     * @throws ApiError
     */
    public static appointmentsList(
        page: number = 1,
        pageSize: number = 20,
        date?: string,
        doctorId?: string,
        status?: 'Scheduled' | 'Confirmed' | 'Cancelled' | 'Completed' | 'NoShow' | 'InProgress',
        dateFrom?: string,
        dateTo?: string,
    ): CancelablePromise<PagedAppointmentResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/appointments',
            query: {
                'page': page,
                'pageSize': pageSize,
                'date': date,
                'doctorId': doctorId,
                'status': status,
                'dateFrom': dateFrom,
                'dateTo': dateTo,
            },
        });
    }
    /**
     * @param requestBody
     * @returns AppointmentResponse Created
     * @throws ApiError
     */
    public static appointmentsCreate(
        requestBody: CreateAppointmentRequest,
    ): CancelablePromise<AppointmentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/appointments',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @returns AppointmentResponse OK
     * @throws ApiError
     */
    public static appointmentsConfirm(
        id: string,
    ): CancelablePromise<AppointmentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/appointments/{id}/confirm',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @returns AppointmentResponse OK
     * @throws ApiError
     */
    public static appointmentsCancel(
        id: string,
    ): CancelablePromise<AppointmentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/appointments/{id}/cancel',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @returns AppointmentResponse OK
     * @throws ApiError
     */
    public static appointmentsInProgress(
        id: string,
    ): CancelablePromise<AppointmentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/appointments/{id}/in-progress',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @returns AppointmentResponse OK
     * @throws ApiError
     */
    public static appointmentsComplete(
        id: string,
    ): CancelablePromise<AppointmentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/appointments/{id}/complete',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @returns AppointmentResponse OK
     * @throws ApiError
     */
    public static appointmentsNoShow(
        id: string,
    ): CancelablePromise<AppointmentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/appointments/{id}/no-show',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns AppointmentResponse OK
     * @throws ApiError
     */
    public static appointmentsUpdate(
        id: string,
        requestBody: UpdateAppointmentRequest,
    ): CancelablePromise<AppointmentResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/appointments/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param page
     * @param pageSize
     * @param status
     * @param dateFrom
     * @param dateTo
     * @returns PagedReceivableResponse OK
     * @throws ApiError
     */
    public static receivablesList(
        page: number = 1,
        pageSize: number = 20,
        status?: 'Pending' | 'Partial' | 'Paid',
        dateFrom?: string,
        dateTo?: string,
    ): CancelablePromise<PagedReceivableResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/financial/receivables',
            query: {
                'page': page,
                'pageSize': pageSize,
                'status': status,
                'dateFrom': dateFrom,
                'dateTo': dateTo,
            },
        });
    }
    /**
     * @param requestBody
     * @returns ReceivableResponse Created
     * @throws ApiError
     */
    public static receivablesManual(
        requestBody: CreateManualReceivableRequest,
    ): CancelablePromise<ReceivableResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/financial/receivables/manual',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param page
     * @param pageSize
     * @param receivableId
     * @param dateFrom
     * @param dateTo
     * @returns PagedPaymentResponse OK
     * @throws ApiError
     */
    public static paymentsList(
        page: number = 1,
        pageSize: number = 20,
        receivableId?: string,
        dateFrom?: string,
        dateTo?: string,
    ): CancelablePromise<PagedPaymentResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/financial/payments',
            query: {
                'Page': page,
                'PageSize': pageSize,
                'ReceivableId': receivableId,
                'DateFrom': dateFrom,
                'DateTo': dateTo,
            },
        });
    }
    /**
     * @param requestBody
     * @returns PaymentResponse Created
     * @throws ApiError
     */
    public static paymentsCreate(
        requestBody: CreatePaymentRequest,
    ): CancelablePromise<PaymentResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/financial/payments',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param doctorId
     * @returns DashboardSummaryResponse OK
     * @throws ApiError
     */
    public static dashboardSummary(
        doctorId?: string,
    ): CancelablePromise<DashboardSummaryResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/dashboard/summary',
            query: {
                'doctorId': doctorId,
            },
        });
    }
    /**
     * @param requestBody
     * @returns PatientPortalAuthResponse OK
     * @throws ApiError
     */
    public static portalAuth(
        requestBody: PatientPortalLoginRequest,
    ): CancelablePromise<PatientPortalAuthResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/portal/auth',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns PatientPortalProfileResponse OK
     * @throws ApiError
     */
    public static portalMe(): CancelablePromise<PatientPortalProfileResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/portal/me',
        });
    }
    /**
     * @returns PatientPortalAppointmentResponse OK
     * @throws ApiError
     */
    public static portalAppointments(): CancelablePromise<Array<PatientPortalAppointmentResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/portal/appointments',
        });
    }
    /**
     * @returns PatientPortalReceivableResponse OK
     * @throws ApiError
     */
    public static portalReceivables(): CancelablePromise<Array<PatientPortalReceivableResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/portal/receivables',
        });
    }
    /**
     * @returns PatientDocumentResponse OK
     * @throws ApiError
     */
    public static portalDocuments(): CancelablePromise<Array<PatientDocumentResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/portal/documents',
        });
    }
}
