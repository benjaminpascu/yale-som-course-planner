import { bidBadge } from '../lib/courseDisplay'
import { formatSchedule, hasMeetingTime } from '../lib/parseCourses'
import { formatSessionLabel } from '../lib/sessionDisplay'

export default function CourseRow({ course }) {
  const badge = bidBadge(course.bidOrPermission)

  return (
    <li className="px-4 py-3 text-sm hover:bg-gray-50">
      <div className="flex flex-wrap items-start gap-2">
        <span
          className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900">
            {course.courseNumber} — {course.title}
          </div>
        </div>
      </div>
      <div className="mt-1 text-gray-600">{course.faculty || 'Faculty TBA'}</div>
      <div className="mt-1 text-gray-500">
        {formatSchedule(course)} · {course.units} unit
        {course.units === 1 ? '' : 's'} · {formatSessionLabel(course.session)}
        {course.category ? ` · ${course.category}` : ''}
      </div>
      {!hasMeetingTime(course) && (
        <p className="mt-1 text-xs text-amber-700">
          No time defined — won&apos;t show on calendar
        </p>
      )}
      {course.syllabusUrl && (
        <a
          href={course.syllabusUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs font-medium text-blue-800 underline decoration-blue-800/30 hover:decoration-blue-800"
        >
          Syllabus
        </a>
      )}
    </li>
  )
}
