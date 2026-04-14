import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Mirror the validation schemas from projects.ts (not exported, tested standalone)
const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Projektname ist erforderlich').max(100, 'Name zu lang'),
  description: z.string().max(500, 'Beschreibung zu lang').optional(),
})

const UpdateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Projektname ist erforderlich').max(100, 'Name zu lang'),
  description: z.string().max(500, 'Beschreibung zu lang').optional(),
})

describe('CreateProjectSchema', () => {
  it('accepts a valid name without description', () => {
    const result = CreateProjectSchema.safeParse({ name: 'My Project' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid name with description', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'My Project',
      description: 'A short description',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = CreateProjectSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Projektname ist erforderlich')
    }
  })

  it('rejects a name longer than 100 characters', () => {
    const result = CreateProjectSchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name zu lang')
    }
  })

  it('accepts a name exactly 100 characters long', () => {
    const result = CreateProjectSchema.safeParse({ name: 'A'.repeat(100) })
    expect(result.success).toBe(true)
  })

  it('rejects a description longer than 500 characters', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Valid Name',
      description: 'A'.repeat(501),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Beschreibung zu lang')
    }
  })

  it('accepts a description exactly 500 characters long', () => {
    const result = CreateProjectSchema.safeParse({
      name: 'Valid Name',
      description: 'A'.repeat(500),
    })
    expect(result.success).toBe(true)
  })

  it('description is optional (undefined is valid)', () => {
    const result = CreateProjectSchema.safeParse({ name: 'Valid Name', description: undefined })
    expect(result.success).toBe(true)
  })
})

describe('UpdateProjectSchema', () => {
  it('accepts a valid id, name, and description', () => {
    const result = UpdateProjectSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Renamed Project',
      description: 'Updated description',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-UUID id', () => {
    const result = UpdateProjectSchema.safeParse({
      id: 'not-a-uuid',
      name: 'Valid Name',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty name on update', () => {
    const result = UpdateProjectSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Projektname ist erforderlich')
    }
  })
})
