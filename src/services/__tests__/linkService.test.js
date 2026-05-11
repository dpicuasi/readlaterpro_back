jest.mock('../../models/Link', () => ({
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
  findOne: jest.fn().mockReturnValue({
    populate: jest.fn().mockResolvedValue(null),
  }),
  findOneAndUpdate: jest.fn().mockReturnValue({
    populate: jest.fn().mockResolvedValue(null),
  }),
  findOneAndDelete: jest.fn().mockResolvedValue(null),
  create: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../models/Collection', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../services/metadataService', () => ({
  fetchMetadata: jest.fn(),
  getSourceType: jest.fn(),
}));

const Link = require('../../models/Link');
const Collection = require('../../models/Collection');
const metadataService = require('../../services/metadataService');
const linkService = require('../linkService');
const AppError = require('../../utils/AppError');

const buildLink = (overrides = {}) => ({
  _id: 'link-id-123',
  userId: 'user-id-123',
  url: 'https://example.com',
  title: 'Example',
  summary: 'Example page',
  domain: 'example.com',
  sourceType: 'web',
  status: 'pending',
  priority: 'medium',
  tags: [],
  isFavorite: false,
  collectionId: null,
  toObject: function () {
    return { ...this };
  },
  save: jest.fn().mockResolvedValue(this),
  ...overrides,
});

describe('linkService', () => {
  const userId = 'user-id-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLink', () => {
    it('crea un link con metadata cuando la URL es válida', async () => {
      const payload = { url: 'https://example.com/article' };
      metadataService.fetchMetadata.mockResolvedValueOnce({
        title: 'Example Article',
        summary: 'A great article',
        domain: 'example.com',
        sourceType: 'web',
        imageUrl: 'https://example.com/image.jpg',
      });

      Link.create.mockResolvedValueOnce(buildLink({ title: 'Example Article' }));

      const result = await linkService.createLink(userId, payload);

      expect(metadataService.fetchMetadata).toHaveBeenCalledWith(payload.url);
      expect(Link.create).toHaveBeenCalled();
      expect(result.title).toBe('Example Article');
    });

    it('usa title custom cuando se proporciona', async () => {
      const payload = { url: 'https://example.com', title: 'My Custom Title' };
      metadataService.fetchMetadata.mockResolvedValueOnce({
        title: 'Example',
        summary: 'Summary',
        domain: 'example.com',
        sourceType: 'web',
      });

      Link.create.mockResolvedValueOnce(
        buildLink({ title: 'My Custom Title', summary: 'Summary' })
      );

      const result = await linkService.createLink(userId, payload);

      expect(result.title).toBe('My Custom Title');
    });

    it('lanza error cuando la colección no pertenece al usuario', async () => {
      const payload = { url: 'https://example.com', collectionId: 'collection-id-123' };
      Collection.findOne.mockResolvedValueOnce(null);

      let errorThrown;
      try {
        await linkService.createLink(userId, payload);
      } catch (error) {
        errorThrown = error;
      }

      expect(errorThrown).toBeInstanceOf(AppError);
      expect(errorThrown.statusCode).toBe(404);
    });
  });

  describe('listLinks', () => {
    it('lista links con paginación por defecto', async () => {
      const mockLinks = [buildLink(), buildLink()];

      Link.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue(mockLinks),
            }),
          }),
        }),
      });
      Link.countDocuments.mockResolvedValue(2);

      const result = await linkService.listLinks(userId, {});

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('aplica filtros de status y priority', async () => {
      Link.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      Link.countDocuments.mockResolvedValue(0);

      await linkService.listLinks(userId, { status: 'read', priority: 'high' });

      expect(Link.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          status: 'read',
          priority: 'high',
        })
      );
    });
  });

  describe('getLink', () => {
    it('retorna un link cuando existe y pertenece al usuario', async () => {
      const link = buildLink();
      Link.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(link),
      });

      const result = await linkService.getLink(userId, link._id);

      expect(result).toBeDefined();
    });

    it('lanza error cuando el link no existe', async () => {
      Link.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      let errorThrown;
      try {
        await linkService.getLink(userId, 'invalid-id');
      } catch (error) {
        errorThrown = error;
      }

      expect(errorThrown).toBeInstanceOf(AppError);
    });
  });

  describe('deleteLink', () => {
    it('elimina un link existente', async () => {
      Link.findOneAndDelete.mockResolvedValueOnce(buildLink());

      await linkService.deleteLink(userId, 'link-id-123');

      expect(Link.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'link-id-123',
        userId,
      });
    });

    it('lanza error cuando el link no existe', async () => {
      Link.findOneAndDelete.mockResolvedValueOnce(null);

      let errorThrown;
      try {
        await linkService.deleteLink(userId, 'invalid-id');
      } catch (error) {
        errorThrown = error;
      }

      expect(errorThrown).toBeInstanceOf(AppError);
    });
  });
});