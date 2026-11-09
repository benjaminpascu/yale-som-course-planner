import { describe, expect, it } from 'vitest'
import { duplicatePlanInStore, nextCopyName } from './planStorage.js'

const store = {
  version: 1,
  activePlanId: 'a',
  plans: [
    { id: 'a', name: 'Plan A', courseIds: ['1', '2'] },
    { id: 'b', name: 'Finance heavy', courseIds: ['3'] },
  ],
}

describe('nextCopyName', () => {
  it('adds (2), then the next free number', () => {
    expect(nextCopyName(store.plans, 'Plan A')).toBe('Plan A (2)')
    const plans = [...store.plans, { id: 'c', name: 'Plan A (2)', courseIds: [] }]
    expect(nextCopyName(plans, 'Plan A')).toBe('Plan A (3)')
  })

  it('copying a copy counts from the original name', () => {
    const plans = [...store.plans, { id: 'c', name: 'Plan A (2)', courseIds: [] }]
    expect(nextCopyName(plans, 'Plan A (2)')).toBe('Plan A (3)')
  })
})

describe('duplicatePlanInStore', () => {
  it('copies the saved courses right under the original and opens the copy', () => {
    const { store: next, planId } = duplicatePlanInStore(store, 'a')
    expect(next.plans.map((p) => p.name)).toEqual(['Plan A', 'Plan A (2)', 'Finance heavy'])
    expect(next.activePlanId).toBe(planId)
    const copy = next.plans[1]
    expect(copy.id).toBe(planId)
    expect(copy.courseIds).toEqual(['1', '2'])
    expect(copy.courseIds).not.toBe(store.plans[0].courseIds)
  })

  it('leaves the original untouched', () => {
    const { store: next } = duplicatePlanInStore(store, 'b')
    expect(next.plans[0]).toBe(store.plans[0])
    expect(next.plans[1]).toBe(store.plans[1])
  })
})
