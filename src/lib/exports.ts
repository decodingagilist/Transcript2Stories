import type { Epic } from '../types';

function escapeCsv(val: string | number | undefined): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRallyCsv(epics: Epic[]) {
  const headers = ['ID', 'Name', 'Description', 'WorkProduct', 'PlanEstimate', 'Iteration', 'ScheduleState'];
  const rows: string[][] = [headers];

  epics.forEach(epic => {
    rows.push([epic.id, epic.title, epic.description, 'Epic', String(epic.points), `Sprint ${epic.sprint}`, 'Defined'].map(escapeCsv));
    epic.features.forEach(feat => {
      rows.push([feat.id, feat.title, feat.description, 'Feature', String(feat.points), `Sprint ${feat.sprint}`, 'Defined'].map(escapeCsv));
      feat.stories.forEach(story => {
        const name = `As a ${story.asA}, I want ${story.iWant}`;
        const desc = `So that ${story.soThat}`;
        rows.push([story.id, name, desc, 'UserStory', String(story.points), `Sprint ${story.sprint}`, 'Defined'].map(escapeCsv));
      });
    });
  });

  downloadCsv(rows.map(r => r.join(',')).join('\n'), 'ceremonyiq-rally.csv');
}

export function exportJiraCsv(epics: Epic[]) {
  const headers = ['Summary', 'Description', 'Issue Type', 'Story Points', 'Sprint', 'Priority'];
  const rows: string[][] = [headers];

  epics.forEach(epic => {
    rows.push([epic.title, epic.description, 'Epic', String(epic.points), `Sprint ${epic.sprint}`, 'Medium'].map(escapeCsv));
    epic.features.forEach(feat => {
      rows.push([feat.title, feat.description, 'Story', String(feat.points), `Sprint ${feat.sprint}`, 'Medium'].map(escapeCsv));
      feat.stories.forEach(story => {
        const summary = `As a ${story.asA}, I want ${story.iWant}`;
        const desc = `So that ${story.soThat}`;
        rows.push([summary, desc, 'Sub-task', String(story.points), `Sprint ${story.sprint}`, 'Medium'].map(escapeCsv));
      });
    });
  });

  downloadCsv(rows.map(r => r.join(',')).join('\n'), 'ceremonyiq-jira.csv');
}
