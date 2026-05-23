import { useEffect, useState } from 'react'
import { loadAppData } from './lib/loadData'
import { formatSchedule, hasMeetingTime } from './lib/parseCourses'

function App() {
  const [courses, setCourses] = useState([])
  const [tagCount, setTagCount] = useState(0)
  const [dataSource, setDataSource] = useState('local')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAppData()
      .then(({ courses: loadedCourses, tags, source }) => {
        setCourses(loadedCourses)
        setTagCount(tags.length)
        setDataSource(source)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [])

  if (status === 'loading') {
    return (
      <div className="p-6 text-gray-600">
        Loading course data…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="p-6 text-red-700">
        <p className="font-semibold">Could not load data</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">
          Yale SOM Course Planner
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {courses.length} courses loaded · {tagCount} tag mappings loaded
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          Data source:{' '}
          {dataSource === 'supabase' ? 'Supabase' : 'Local sample CSVs'}
        </p>
      </header>

      <main className="px-6 py-4">
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {courses.map((course) => (
            <li
              key={course.courseId}
              className="px-4 py-3 text-sm"
            >
              <div className="font-medium text-gray-900">
                {course.courseNumber} — {course.title}
              </div>
              <div className="mt-1 text-gray-600">
                {course.faculty || 'Faculty TBA'}
              </div>
              <div className="mt-1 text-gray-500">
                {formatSchedule(course)} · {course.units} unit
                {course.units === 1 ? '' : 's'} · {course.session}
              </div>
              {!hasMeetingTime(course) && (
                <p className="mt-1 text-xs text-amber-700">
                  No time defined — won&apos;t show on calendar
                </p>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

export default App
