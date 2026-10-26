const jwt = require('jsonwebtoken');
const config = require('../../config');

class AuthService {
  constructor() {
    this.jwtSecret = config.jwt.secret;
    this.jwtExpiresIn = config.jwt.expiresIn;
    this.refreshExpiresIn = config.jwt.refreshExpiresIn;
  }

  generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      roles: [] // We'll handle roles later if needed
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'smartdockai',
      audience: 'smartdockai-users'
    });

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      this.jwtSecret,
      {
        expiresIn: this.refreshExpiresIn,
        issuer: 'smartdockai',
        audience: 'smartdockai-users'
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtExpiresIn
    };
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'smartdockai',
        audience: 'smartdockai-users'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      if (error.name === 'NotBeforeError') {
        throw new Error('Token not active');
      }
      throw new Error('Token verification failed');
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Get user from database to ensure they still exist and get current roles
      const { User } = require('../models');
      const user = await User.findByPk(decoded.id, {
        include: ['roles']
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const { accessToken } = this.generateTokens(user);
      
      return {
        accessToken,
        expiresIn: this.jwtExpiresIn
      };
    } catch (error) {
      throw new Error(`Refresh token validation failed: ${error.message}`);
    }
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format');
    }

    return parts[1];
  }

  decodeTokenPayload(token) {
    return jwt.decode(token) || null;
  }

  getTokenExpirationTime(token) {
    const decoded = this.decodeTokenPayload(token);
    return decoded ? new Date(decoded.exp * 1000) : null;
  }

  isTokenExpired(token) {
    const expirationTime = this.getTokenExpirationTime(token);
    return expirationTime ? new Date() > expirationTime : true;
  }

  generatePasswordResetToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: 'password-reset'
      },
      this.jwtSecret,
      {
        expiresIn: '1h',
        issuer: 'smartdockai',
        audience: 'smartdockai-users'
      }
    );
  }

  verifyPasswordResetToken(token) {
    try {
      const decoded = this.verifyToken(token);
      
      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid password reset token');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Password reset token validation failed: ${error.message}`);
    }
  }

  generateEmailVerificationToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: 'email-verification'
      },
      this.jwtSecret,
      {
        expiresIn: '24h',
        issuer: 'smartdockai',
        audience: 'smartdockai-users'
      }
    );
  }

  verifyEmailVerificationToken(token) {
    try {
      const decoded = this.verifyToken(token);
      
      if (decoded.type !== 'email-verification') {
        throw new Error('Invalid email verification token');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Email verification token validation failed: ${error.message}`);
    }
  }
}

// Create singleton instance
const authService = new AuthService();

module.exports = authService;