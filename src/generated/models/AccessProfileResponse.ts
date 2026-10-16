/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AccessProfileResponse = {
    role: AccessProfileResponse.role;
    availableScreens: Array<string>;
    defaultScreens: Array<string>;
};
export namespace AccessProfileResponse {
    export enum role {
        ADMIN = 'Admin',
        SECRETARY = 'Secretary',
        DOCTOR = 'Doctor',
    }
}

