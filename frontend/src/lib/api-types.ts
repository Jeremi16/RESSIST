export interface EventPreview {
  id?: string | null;
  title: string;
  full_title: string;
  course: string;
  original_course: string;
  course_id?: string | null;
  class_code?: string | null;
  description?: string | null;
  url?: string | null;
  deadline: string;
  timeRemaining: string;
  deadlineDate: Date;
  source: string;
}
