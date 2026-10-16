/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ManagedUserResponse = {
    name: string;
    email: string;
    role: ManagedUserResponse.role;
    screens: Array<string>;
    id: string;
    isActive: boolean;
};
export namespace ManagedUserResponse {
    export enum role {
        ADMIN = 'Admin',
        SECRETARY = 'Secretary',
        DOCTOR = 'Doctor',
    }
}

