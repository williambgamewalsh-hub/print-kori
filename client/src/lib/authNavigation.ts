export function getOwnerLoginReturnPath(pathname: string) {
  return pathname === "/settings" ? "/settings" : "/dashboard";
}

export function isOwnerOnlyRoute(pathname: string) {
  return pathname === "/dashboard" || pathname === "/settings";
}
