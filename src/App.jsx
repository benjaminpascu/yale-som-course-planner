import { useEffect, useState } from 'react'
import CourseBrowser from './components/CourseBrowser'
import { loadAppData } from './lib/loadData'

function App() {
  const [courses, setCourses] = useState([])
  const [tags, setTags] = useState([])
  const [dataSource, setDataSource] = useState('local')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAppData()
      .then(({ courses: loadedCourses, tags: loadedTags, source }) => {
        setCourses(loadedCourses)
        setTags(loadedTags)
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
          {courses.length} courses loaded · {tags.length} tag mappings loaded
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          Data source:{' '}
          {dataSource === 'supabase' ? 'Supabase' : 'Local sample CSVs'}
        </p>
      </header>

      <main className="overflow-hidden rounded-lg border border-gray-200 bg-white lg:mx-6 lg:my-4">
        <CourseBrowser courses={courses} tags={tags} />
      </main>
    </div>
  )
}

export default App
