/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateManagedUserRequest = {
    name: string;
    email: string;
    role: CreateManagedUserRequest.role;
    screens?: Array<string>;
    password: string;
};
export namespace CreateManagedUserRequest {
    export enum role {
        ADMIN = 'Admin',
        SECRETARY = 'Secretary',
        DOCTOR = 'Doctor',
    }
}

