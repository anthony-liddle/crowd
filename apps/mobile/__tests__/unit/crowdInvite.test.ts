import { parseCrowdInvite } from '@/utils/crowdInvite';

const ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('parseCrowdInvite', () => {
  it('parses bare UUID as open invite', () => {
    expect(parseCrowdInvite(ID)).toEqual({ kind: 'open', crowdId: ID });
  });

  it('parses crowd://join/<id>', () => {
    expect(parseCrowdInvite(`crowd://join/${ID}`)).toEqual({
      kind: 'open',
      crowdId: ID,
    });
  });

  it('tolerates trailing slash on open URL', () => {
    expect(parseCrowdInvite(`crowd://join/${ID}/`)).toEqual({
      kind: 'open',
      crowdId: ID,
    });
  });

  it('strips surrounding whitespace', () => {
    expect(parseCrowdInvite(`  crowd://join/${ID}  `)).toEqual({
      kind: 'open',
      crowdId: ID,
    });
    expect(parseCrowdInvite(`\n${ID}\t`)).toEqual({ kind: 'open', crowdId: ID });
  });

  it('parses token URL with cid', () => {
    const url = `crowd://join-token/abc123?cid=${ID}`;
    expect(parseCrowdInvite(url)).toEqual({
      kind: 'token',
      token: 'abc123',
      crowdId: ID,
    });
  });

  it('tolerates trailing slash on cid query value', () => {
    const url = `crowd://join-token/abc123?cid=${ID}/`;
    expect(parseCrowdInvite(url)).toEqual({
      kind: 'token',
      token: 'abc123',
      crowdId: ID,
    });
  });

  it('rejects token URL without cid', () => {
    expect(parseCrowdInvite(`crowd://join-token/abc123`)).toBeNull();
  });

  it('rejects token URL with malformed cid', () => {
    expect(parseCrowdInvite(`crowd://join-token/abc123?cid=not-a-uuid`)).toBeNull();
  });

  it('rejects malformed garbage', () => {
    expect(parseCrowdInvite('hello world')).toBeNull();
    expect(parseCrowdInvite('')).toBeNull();
    expect(parseCrowdInvite('   ')).toBeNull();
  });

  it('rejects open URL with malformed UUID', () => {
    expect(parseCrowdInvite('crowd://join/not-a-uuid')).toBeNull();
  });
});
