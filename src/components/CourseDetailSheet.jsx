import { useEffect } from 'react'
import { getViewportBottomInsetPx } from '../lib/portaledTooltip'
import { CalendarCourseDetail } from './CalendarCourseBlock'

/** Mobile bottom sheet for course metadata + description. */
export default function CourseDetailSheet({
  open,
  onClose,
  course,
  fallYear = null,
  springYear = null,
  detailId,
  /** Tailwind class: hide sheet at this breakpoint and up (default: md). */
  hideFromClass = 'md:hidden',
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const bottomInset = getViewportBottomInsetPx()

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-40 bg-black/30 ${hideFromClass}`}
        aria-label="Close course details"
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 z-50 max-h-[min(85vh,32rem)] overflow-y-auto rounded-t-xl border-t border-gray-200 bg-white px-4 pb-6 pt-4 shadow-2xl ${hideFromClass}`}
        style={{ bottom: bottomInset }}
        role="dialog"
        aria-labelledby={detailId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
        <div id={detailId}>
          <CalendarCourseDetail
            course={course}
            fallYear={fallYear}
            springYear={springYear}
          />
        </div>
        <p className="mt-3 text-center text-[11px] text-gray-400">
          Tap outside to close
        </p>
      </div>
    </>
  )
}
