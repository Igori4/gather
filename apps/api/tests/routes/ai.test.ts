import request from 'supertest'
import { app } from '../../src/app'
import { prisma } from '../../src/lib/prisma'

jest.mock('../../src/lib/claude', () => ({
  generateAISuggestions: jest.fn().mockResolvedValue({
    suggestions: [
      {
        name: 'Escape Room',
        category: 'Entertainment',
        whyItFits: 'Fun.',
        estimatedCostRange: '$20–$30 per person',
        googleMapsLink: 'https://www.google.com/maps/search/escape+room',
      },
      {
        name: 'Rooftop Bar',
        category: 'Dining & Drinks',
        whyItFits: 'Nice views.',
        estimatedCostRange: '$30–$50 per person',
        googleMapsLink: 'https://www.google.com/maps/search/rooftop',
      },
      {
        name: 'Bowling',
        category: 'Sports & Fun',
        whyItFits: 'Casual.',
        estimatedCostRange: '$10–$20 per person',
        googleMapsLink: 'https://www.google.com/maps/search/bowling',
      },
    ],
  }),
}))

const DOMAIN = '@gather-ai-test.com'
const uid = () => Math.random().toString(36).slice(2, 10)
const email = (label: string) => `test-ai-${label}-${uid()}${DOMAIN}`

async function createTestUser(label: string) {
  const e = email(label)
  const res = await request(app)
    .post('/auth/register')
    .send({ email: e, password: 'Password123!', name: `User ${label}` })
  return { userId: res.body.user.id as string, token: res.body.accessToken as string }
}

async function createTestGroup(token: string) {
  const res = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'AI Test Group' })
  return res.body.id as string
}

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { contains: DOMAIN } },
    select: { id: true },
  })
  const ids = users.map(u => u.id)
  await prisma.group.deleteMany({ where: { createdBy: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

describe('POST /api/groups/:groupId/ai-suggestions', () => {
  it('201 — generates suggestions for group member', async () => {
    const { token } = await createTestUser('member')
    const groupId = await createTestGroup(token)

    const res = await request(app)
      .post(`/api/groups/${groupId}/ai-suggestions`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(201)
    expect(res.body.suggestions).toHaveLength(3)
    expect(res.body.suggestions[0].name).toBe('Escape Room')
  })

  it('401 — no auth', async () => {
    const res = await request(app).post('/api/groups/fake-id/ai-suggestions').send({})
    expect(res.status).toBe(401)
  })

  it('403 — non-member cannot generate suggestions', async () => {
    const { token: adminToken } = await createTestUser('admin2')
    const groupId = await createTestGroup(adminToken)
    const { token: outsiderToken } = await createTestUser('outsider2')

    const res = await request(app)
      .post(`/api/groups/${groupId}/ai-suggestions`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({})

    expect(res.status).toBe(403)
  })
})

describe('GET /api/groups/:groupId/ai-suggestions', () => {
  it('200 — returns suggestion list for member', async () => {
    const { token } = await createTestUser('list')
    const groupId = await createTestGroup(token)

    await request(app)
      .post(`/api/groups/${groupId}/ai-suggestions`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    const res = await request(app)
      .get(`/api/groups/${groupId}/ai-suggestions`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })

  it('401 — no auth', async () => {
    const res = await request(app).get('/api/groups/fake/ai-suggestions')
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/ai-suggestions/:id', () => {
  it('204 — dismisses own suggestion', async () => {
    const { token } = await createTestUser('dismiss')
    const groupId = await createTestGroup(token)

    const createRes = await request(app)
      .post(`/api/groups/${groupId}/ai-suggestions`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    const suggestionId = createRes.body.id as string

    const res = await request(app)
      .delete(`/api/ai-suggestions/${suggestionId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(204)
  })

  it('404 — non-existent suggestion', async () => {
    const { token } = await createTestUser('del404')
    const res = await request(app)
      .delete('/api/ai-suggestions/non-existent-id')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
