import SUBJECT_NAMES from '../../docs/data-samples/yale_subjects.json'

/**
 * Department filter label, like Yale's course search: "Economics (ECON)".
 * Names come from Yale's subject list (saved by the daily Yale update).
 */
export function departmentLabel(code) {
  const name = SUBJECT_NAMES[code]
  return name ? `${name} (${code})` : code
}
