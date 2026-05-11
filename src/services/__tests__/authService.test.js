const AppError = require('../../utils/AppError');

jest.mock('../../models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../utils/jwt', () => ({
  signToken: jest.fn(),
}));

const User = require('../../models/User');
const { signToken } = require('../../utils/jwt');
const authService = require('../authService');

const buildUser = (overrides = {}) => ({
  _id: 'user-id-123',
  name: 'Jane Doe',
  email: 'jane@example.com',
  isActive: true,
  comparePassword: jest.fn().mockResolvedValue(true),
  ...overrides,
});

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('crea un nuevo usuario y retorna token cuando el email es único', async () => {
      const payload = { name: 'Jane Doe', email: 'jane@example.com', password: 'Secret123' };
      const createdUser = buildUser();
      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValueOnce(createdUser);
      signToken.mockReturnValueOnce('jwt-token');

      const result = await authService.register(payload);

      expect(User.findOne).toHaveBeenCalledWith({ email: payload.email });
      expect(User.create).toHaveBeenCalledWith(payload);
      expect(signToken).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual({ user: createdUser, token: 'jwt-token' });
    });

    it('lanza AppError cuando el email ya está registrado', async () => {
      const payload = { name: 'Jane Doe', email: 'jane@example.com', password: 'Secret123' };
      User.findOne.mockResolvedValueOnce(buildUser());

      expect.assertions(4);
      try {
        await authService.register(payload);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(409);
        expect(error.message).toBe('Ya existe una cuenta con ese email');
      }
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const email = 'jane@example.com';
    const password = 'Secret123';

    it('retorna usuario y token cuando las credenciales son válidas y la cuenta está activa', async () => {
      const user = buildUser();
      const selectMock = jest.fn().mockResolvedValue(user);
      User.findOne.mockReturnValueOnce({ select: selectMock });
      user.comparePassword.mockResolvedValueOnce(true);
      signToken.mockReturnValueOnce('jwt-token');

      const result = await authService.login({ email, password });

      expect(User.findOne).toHaveBeenCalledWith({ email });
      expect(selectMock).toHaveBeenCalledWith('+password');
      expect(user.comparePassword).toHaveBeenCalledWith(password);
      expect(signToken).toHaveBeenCalledWith(user);
      expect(result).toEqual({ user, token: 'jwt-token' });
    });

    it('lanza AppError cuando el usuario no existe o la contraseña es incorrecta', async () => {
      const user = buildUser();
      user.comparePassword.mockResolvedValueOnce(false);
      const selectMock = jest.fn().mockResolvedValue(user);
      User.findOne.mockReturnValueOnce({ select: selectMock });

      expect.assertions(3);
      try {
        await authService.login({ email, password });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Email o contraseña incorrectos');
      }
    });

    it('lanza AppError cuando la cuenta está inactiva', async () => {
      const user = buildUser({ isActive: false });
      const selectMock = jest.fn().mockResolvedValue(user);
      User.findOne.mockReturnValueOnce({ select: selectMock });

      expect.assertions(3);
      try {
        await authService.login({ email, password });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
        expect(error.message).toBe('La cuenta está inactiva');
      }
    });
  });
});
