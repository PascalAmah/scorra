import type { AuthResponse } from '@scorra/types';

import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { LoginValues, RegisterValues } from '@/validations/auth';

export async function signIn(values: LoginValues): Promise<AuthResponse> {
  const session = await api.login(values.email, values.password);
  useAuthStore.getState().setSession(session);
  return session;
}

export async function signUp(values: RegisterValues): Promise<AuthResponse> {
  const session = await api.register({
    email: values.email,
    password: values.password,
    name: `${values.firstName} ${values.lastName}`.trim(),
    organizationName: values.organizationName,
  });
  useAuthStore.getState().setSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  await api.logout();
}
