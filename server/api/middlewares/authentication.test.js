/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb, seed } from '../../test/support';
import ApiKey from '../../models/ApiKey';
import randomstring from 'randomstring';
import auth from './authentication';

beforeEach(flushdb);

describe('Authentication middleware', async () => {
  describe('with JWT', () => {
    it('should authenticate with correct token', async () => {
      const state = {};
      const { user } = await seed();
      const authMiddleware = auth();

      await authMiddleware(
        {
          request: {
            get: jest.fn(() => `Bearer ${user.getJwtToken()}`),
          },
          state,
          cache: {},
        },
        jest.fn()
      );
      expect(state.user.id).toEqual(user.id);
    });

    it('should return error with invalid token', async () => {
      const state = {};
      const { user } = await seed();
      const authMiddleware = auth();

      try {
        await authMiddleware(
          {
            request: {
              get: jest.fn(() => `Bearer ${user.getJwtToken()}error`),
            },
            state,
            cache: {},
          },
          jest.fn()
        );
      } catch (e) {
        expect(e.message).toBe('Invalid token');
      }
    });
  });

  describe('with API key', () => {
    it('should authenticate user with valid API key', async () => {
      const state = {};
      const { user } = await seed();
      const authMiddleware = auth();
      const key = await ApiKey.create({
        userId: user.id,
      });

      await authMiddleware(
        {
          request: {
            get: jest.fn(() => `Bearer ${key.secret}`),
          },
          state,
          cache: {},
        },
        jest.fn()
      );
      expect(state.user.id).toEqual(user.id);
    });

    it('should return error with invalid API key', async () => {
      const state = {};
      const authMiddleware = auth();

      try {
        await authMiddleware(
          {
            request: {
              get: jest.fn(() => `Bearer ${randomstring.generate(38)}`),
            },
            state,
            cache: {},
          },
          jest.fn()
        );
      } catch (e) {
        expect(e.message).toBe('Invalid API key');
      }
    });
  });

  describe('adminOnly', () => {
    it('should work if user is an admin', async () => {
      const state = {};
      const { user } = await seed();
      const authMiddleware = auth({ adminOnly: true });
      user.isAdmin = true;
      await user.save();

      await authMiddleware(
        {
          request: {
            get: jest.fn(() => `Bearer ${user.getJwtToken()}`),
          },
          state,
          cache: {},
        },
        jest.fn()
      );
      expect(state.user.id).toEqual(user.id);
    });

    it('should raise 403 if user is not an admin', async () => {
      const { user } = await seed();
      const authMiddleware = auth({ adminOnly: true });
      user.idAdmin = true;
      await user.save();

      try {
        await authMiddleware({
          request: {
            get: jest.fn(() => `Bearer ${user.getJwtToken()}`),
          },
        });
      } catch (e) {
        expect(e.message).toBe('Only available for admins');
      }
    });
  });

  it('should return error message if no auth token is available', async () => {
    const state = {};
    const authMiddleware = auth();

    try {
      await authMiddleware(
        {
          request: {
            get: jest.fn(() => 'error'),
          },
          state,
          cache: {},
        },
        jest.fn()
      );
    } catch (e) {
      expect(e.message).toBe(
        'Bad Authorization header format. Format is "Authorization: Bearer <token>"'
      );
    }
  });

  it('should allow passing auth token as a GET param', async () => {
    const state = {};
    const { user } = await seed();
    const authMiddleware = auth();

    await authMiddleware(
      {
        request: {
          get: jest.fn(() => null),
          query: {
            token: user.getJwtToken(),
          },
        },
        body: {},
        state,
        cache: {},
      },
      jest.fn()
    );
    expect(state.user.id).toEqual(user.id);
  });

  it('should allow passing auth token in body params', async () => {
    const state = {};
    const { user } = await seed();
    const authMiddleware = auth();

    await authMiddleware(
      {
        request: {
          get: jest.fn(() => null),
        },
        body: {
          token: user.getJwtToken(),
        },
        state,
        cache: {},
      },
      jest.fn()
    );
    expect(state.user.id).toEqual(user.id);
  });
});
