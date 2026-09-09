import type { ComponentType } from 'react';

export interface IconProps {
  size?: number | string;
  className?: string;
}

export interface TaskRow {
  id: string;
  type: string;
  icon: ComponentType<IconProps>;
  title: string;
  sub: string;
  badge: { label: string; solid: boolean };
  pct: number;
}

export interface DatasetRow {
  icon: ComponentType<IconProps>;
  name: string;
  meta: string;
  badge: { label: string; solid: boolean };
}