import { useEffect } from 'react'
import { formatCourseUnits } from '../../lib/courseDisplay'
import { formatSchedule } from '../../lib/parseCourses'
import { CalendarCourseDetail } from '../CalendarCourseBlock'

/** Course details for a compare row: centered dialog (bottom sheet on mobile). */
export default function CourseDetailModal({ group, fallYear, springYear, onClose }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const [first] = group.sections

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${group.courseNumber} details`}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-xl bg-white p-4 shadow-2xl md:max-w-2xl md:rounded-xl"
      >
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
        <CalendarCourseDetail course={first} fallYear={fallYear} springYear={springYear} />

        {group.sections.length > 1 ? (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500">Sections</p>
            <ul className="mt-1 space-y-0.5 text-xs text-gray-700">
              {group.sections.map((s) => (
                <li key={s.courseId}>
                  {s.section} · {formatSchedule(s)} · {s.faculty || 'TBA'}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {group.unitVariants.length > 1 ? (
          <p className="mt-2 text-xs text-gray-600">
            Units vary by section: {group.unitVariants.map(formatCourseUnits).join(', ')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
