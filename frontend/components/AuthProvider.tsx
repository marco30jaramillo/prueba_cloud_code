'use client';

import React from 'react';
import { useAuthInit } from '@/hooks/useAuthInit';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAuthInit();

  return <>{children}</>;
};
