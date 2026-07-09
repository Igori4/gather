import { Request, Response } from 'express'

jest.mock('../../src/repositories/group.repository', () => ({
  GroupRepository: {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    findById: jest.fn(),
    findByIdWithMembers: jest.fn(),
    findMembership: jest.fn(),
    findInvitation: jest.fn(),
    joinViaInvitation: jest.fn().mockResolvedValue([{}, {}]),
    createInvitation: jest.fn(),
  },
}))

import { acceptInvite, getGroup, inviteMember } from '../../src/controllers/groups.controller'
import { GroupRepository } from '../../src/repositories/group.repository'

const repo = GroupRepository as jest.Mocked<typeof GroupRepository>

function mockReq(overrides: object = {}): Request {
  return { body: {}, params: {}, userId: 'user_abc', ...overrides } as unknown as Request
}

function mockRes() {
  const res = { status: jest.fn(), json: jest.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res as unknown as Response
}

beforeEach(() => jest.clearAllMocks())

// ─── acceptInvite ─────────────────────────────────────────────────────────────

describe('acceptInvite', () => {
  it('400 — missing token in body', async () => {
    const res = mockRes()
    await acceptInvite(mockReq({ body: {} }), res)
    expect(res.status as jest.Mock).toHaveBeenCalledWith(400)
  })

  it('400 — invitation not found', async () => {
    repo.findInvitation.mockResolvedValue(null)
    const res = mockRes()
    await acceptInvite(mockReq({ body: { token: 'abc' } }), res)
    expect(res.status as jest.Mock).toHaveBeenCalledWith(400)
  })

  it('400 — invitation expired', async () => {
    repo.findInvitation.mockResolvedValue({
      id: 'inv1',
      groupId: 'g1',
      role: 'member',
      acceptedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    } as any)
    const res = mockRes()
    await acceptInvite(mockReq({ body: { token: 'abc' } }), res)
    expect(res.status as jest.Mock).toHaveBeenCalledWith(400)
  })

  it('400 — invitation already accepted', async () => {
    repo.findInvitation.mockResolvedValue({
      id: 'inv1',
      groupId: 'g1',
      role: 'member',
      acceptedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
    } as any)
    const res = mockRes()
    await acceptInvite(mockReq({ body: { token: 'abc' } }), res)
    expect(res.status as jest.Mock).toHaveBeenCalledWith(400)
  })

  it('409 — already a member', async () => {
    repo.findInvitation.mockResolvedValue({
      id: 'inv1',
      groupId: 'g1',
      role: 'member',
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
    } as any)
    repo.findMembership.mockResolvedValue({
      groupId: 'g1',
      userId: 'user_abc',
      role: 'member',
    } as any)
    const res = mockRes()
    await acceptInvite(mockReq({ body: { token: 'abc' } }), res)
    expect(res.status as jest.Mock).toHaveBeenCalledWith(409)
  })
})

// ─── getGroup ─────────────────────────────────────────────────────────────────

describe('getGroup', () => {
  it('404 — group not found', async () => {
    repo.findByIdWithMembers.mockResolvedValue(null)
    const res = mockRes()
    await getGroup(mockReq({ params: { id: 'unknown' } }), res)
    expect(res.status as jest.Mock).toHaveBeenCalledWith(404)
  })

  it('403 — requester is not a member', async () => {
    repo.findByIdWithMembers.mockResolvedValue({
      id: 'g1',
      members: [{ userId: 'other_user', user: {} }],
    } as any)
    const res = mockRes()
    // userId on req = 'user_abc', not in members
    await getGroup(mockReq({ params: { id: 'g1' } }), res)
    expect(res.status as jest.Mock).toHaveBeenCalledWith(403)
  })
})

// ─── inviteMember ─────────────────────────────────────────────────────────────

describe('inviteMember', () => {
  it('400 — invalid request body', async () => {
    const res = mockRes()
    await inviteMember(mockReq({ params: { id: 'g1' }, body: {} }), res)
    expect(res.status as jest.Mock).toHaveBeenCalledWith(400)
  })

  it('403 — requester is not a member', async () => {
    repo.findMembership.mockResolvedValue(null)
    const res = mockRes()
    await inviteMember(
      mockReq({ params: { id: 'g1' }, body: { email: 'a@b.com', role: 'member' } }),
      res
    )
    expect(res.status as jest.Mock).toHaveBeenCalledWith(403)
  })

  it('403 — requester is a member but not admin', async () => {
    repo.findMembership.mockResolvedValue({
      groupId: 'g1',
      userId: 'user_abc',
      role: 'member',
    } as any)
    const res = mockRes()
    await inviteMember(
      mockReq({ params: { id: 'g1' }, body: { email: 'a@b.com', role: 'member' } }),
      res
    )
    expect(res.status as jest.Mock).toHaveBeenCalledWith(403)
  })
})
