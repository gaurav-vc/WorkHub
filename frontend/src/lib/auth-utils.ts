export type PortalType = 'super_user' | 'site_admin' | 'employee';

export const getCurrentPortal = (userType: string | null | undefined): PortalType => {
  if (userType === 'super_user') {
    return 'super_user';
  }
  if (userType === 'site_admin') {
    return 'site_admin';
  }
  // Default to employee for any other role or if undefined
  return 'employee';
};
