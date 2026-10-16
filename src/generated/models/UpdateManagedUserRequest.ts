/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateManagedUserRequest = {
    name: string;
    email: string;
    role: UpdateManagedUserRequest.role;
    screens?: Array<string>;
    isActive: boolean;
};
export namespace UpdateManagedUserRequest {
    export enum role {
        ADMIN = 'Admin',
        SECRETARY = 'Secretary',
        DOCTOR = 'Doctor',
    }
}

