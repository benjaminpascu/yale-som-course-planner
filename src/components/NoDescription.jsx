/** Shown wherever a course's description would go when the catalog has none. */
export default function NoDescription({ className = '' }) {
  return <p className={`text-gray-500 italic ${className}`}>No description provided</p>
}
