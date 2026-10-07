export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type Status = 'processing' | 'complete' | 'error';
export type ImpedimentStatus = 'open' | 'resolved';

export interface Task {
  id: string;
  title: string;
  assignee?: string;
  hours: number;
}

export interface Story {
  id: string;
  title?: string;
  asA: string;
  iWant: string;
  soThat: string;
  sprint: number;
  size: Size;
  points: number;
  confidence: number;
  tasks?: Task[];
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  sprint: number;
  endSprint?: number;
  size: Size;
  points: number;
  confidence: number;
  stories: Story[];
}

export interface Epic {
  id: string;
  title: string;
  description: string;
  sprint: number;
  size: Size;
  points: number;
  pointsOverridden?: boolean;
  confidence: number;
  features: Feature[];
}

export interface Dependency {
  from: string;
  to: string;
  type: 'blocks';
  reason: string;
}

export interface RaciItem {
  feature: string;
  accountable: string;
  responsible: string[];
  consulted: string[];
  informed: string[];
}

export interface Impediment {
  id?: string;
  description: string;
  owner: string;
  status: ImpedimentStatus;
}

export interface Session {
  id: string;
  title: string;
  transcriptRaw: string;
  createdAt: Date;
  status: Status;
  epics?: Epic[];
  dependencies?: Dependency[];
  raci?: RaciItem[];
  impediments?: Impediment[];
}
