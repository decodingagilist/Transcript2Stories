export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type Status = 'processing' | 'complete' | 'error';
export type ImpedimentStatus = 'open' | 'resolved';

export interface Task {
  id: string;
  title: string;
  assignee?: string;
  hours: number;
}

export interface Bug {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  assignee?: string;
  sprint?: number;
  dueDate?: string;
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
  assignee?: string;
  plannedStartDate?: string;
  tags?: string[];
  moscow?: string;
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
  color?: string;
  plannedStartDate?: string;
  stories: Story[];
  bugs?: Bug[];
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
  bugs?: Bug[];
}

export interface Dependency {
  from: string;
  to: string;
  type: 'blocks';
  reason: string;
}

export interface Risk {
  id: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  mitigation: string;
  owner: string;
  status: 'open' | 'mitigated';
  dueDate?: string;
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

export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate?: string;
  nextStep?: string;
  done: boolean;
}

export interface Stakeholder {
  id: string;
  name: string;
  geography: string;
  teamName: string;
  teamSize: number;
  role?: string;
}

export interface Phase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'Code Lock' | 'Moratorium' | 'Year End Shutdown' | 'Custom';
}

export interface LeaveEntry {
  id: string;
  memberName: string;
  teamName: string;
  fromDate: string;
  toDate: string;
}

export interface VoteOfConfidence {
  id: string;
  participantName: string;
  vote: 'Green' | 'Yellow' | 'Red' | null;
  comment: string;
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
  risks?: Risk[];
  actionItems?: ActionItem[];
  meetingMinutes?: string;
  stakeholders?: Stakeholder[];
  projectStartDate?: string;
  forecastedEndDate?: string;
  phases?: Phase[];
  votes?: VoteOfConfidence[];
}
