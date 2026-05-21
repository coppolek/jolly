export type Role = 'employee' | 'manager';

export type LeaveType = 'vacation' | 'sick' | 'personal';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  role: Role;
  department: string;
  avatar: string;
  email?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  status: LeaveStatus;
  reason: string;
  requestedAt: string;
}

export interface LeaveBalance {
  userId: string;
  vacation: number;
  sick: number;
  personal: number;
}

export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  email?: string;
  fiscalCode?: string;
  notes?: string;
}

export interface WorksiteAssignment {
  workerId: string;
  schedule: {
    lun: string;
    mar: string;
    mer: string;
    gio: string;
    ven: string;
    sab: string;
    dom: string;
  };
}

export interface Worksite {
  id: string;
  name: string;
  address?: string;
  client?: string;
  active: boolean;
  assignments?: WorksiteAssignment[];
  lat?: number;
  lng?: number;
}
