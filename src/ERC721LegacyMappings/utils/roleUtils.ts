
const KNOWN_TYPE_DEFAULT_ADMIN: string =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const KNOWN_TYPE_MINTER_ROLE: string =
  "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";

const KNOWN_TYPE_SALES_MANAGER_ROLE: string =
  "0x5ebbf78043a2215b522b1366a193ec74dd1f54e441e841a87b9653246a9c49a6";

export function lookupRole(role: string): string {
  if (role.startsWith(KNOWN_TYPE_DEFAULT_ADMIN)) {
    return "DEFAULT_ADMIN";
  }
  if (role.startsWith(KNOWN_TYPE_MINTER_ROLE)) {
    return "MINTER";
  }
  if (role.startsWith(KNOWN_TYPE_SALES_MANAGER_ROLE)) {
    return "SALES_MANAGER";
  }

  return '';
}