/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PatientDetails = {
    socialName?: string;
    rg?: string;
    sex?: PatientDetails.sex;
    secondaryPhone?: string;
    commercialPhone?: string;
    contactName?: string;
    medicalRecordNumber?: string;
    healthInsuranceNumber?: string;
    cns?: string;
    isVip?: boolean;
    excludeFromMarketing?: boolean;
    receiveDirectMail?: boolean;
    tags?: string;
    zipCode?: string;
    street?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    region?: string;
    company?: string;
    reference?: string;
    acquisitionSource?: string;
    referredBy?: string;
    maritalStatus?: string;
    education?: string;
    profession?: string;
    religion?: string;
    fatherName?: string;
    motherName?: string;
    companionName?: string;
    childrenCount?: number;
    spouseName?: string;
};
export namespace PatientDetails {
    export enum sex {
        MASCULINO = 'Masculino',
        FEMININO = 'Feminino',
        PREFIRO_N_O_INFORMAR = 'Prefiro não informar',
    }
}

