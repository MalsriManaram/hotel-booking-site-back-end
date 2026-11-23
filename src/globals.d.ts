/// <reference types="@clerk/express/env" />

export {};

export type Role = "admin";

declare global {
  interface CustomJwtSessionClaims {
    role?: Role;
    metadata?: {
      role?: Role;
    };
    publicMetadata?: {
      role?: Role;
    };
  }
}
