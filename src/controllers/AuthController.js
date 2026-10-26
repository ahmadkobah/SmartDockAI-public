const authService = require('../services/AuthService');
const { User, Role, AuditLog } = require('../models');

class AuthController {
  async register(req, res) {
    console.log('🔄 [REGISTER] Starting registration process');
    console.log('📥 [REGISTER] Request body:', { 
      email: req.body.email, 
      firstName: req.body.firstName, 
      lastName: req.body.lastName, 
      role: req.body.role,
      hasPassword: !!req.body.password 
    });

    try {
      const { email, password, firstName, lastName, role = 'user' } = req.body;

      // Validate required fields
      console.log('✅ [REGISTER] Validating required fields');
      if (!email || !password || !firstName || !lastName) {
        console.log('❌ [REGISTER] Missing required fields');
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Email, password, firstName, and lastName are required'
        });
      }

      // Validate email format
      console.log('✅ [REGISTER] Validating email format');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ [REGISTER] Invalid email format:', email);
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Please provide a valid email address'
        });
      }

      // Validate password strength
      console.log('✅ [REGISTER] Validating password strength');
      if (password.length < 6) {
        console.log('❌ [REGISTER] Password too short');
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Password must be at least 6 characters long'
        });
      }

      // Check if user already exists
      console.log('🔍 [REGISTER] Checking if user exists:', email);
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        console.log('❌ [REGISTER] User already exists:', email);
        return res.status(409).json({
          error: 'Conflict',
          message: 'User with this email already exists'
        });
      }
      console.log('✅ [REGISTER] User does not exist, proceeding');

      // Validate role exists
      console.log('🔍 [REGISTER] Validating role exists:', role);
      const userRole = await Role.findByName(role);
      if (!userRole) {
        console.log('❌ [REGISTER] Role not found:', role);
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid role specified'
        });
      }
      console.log('✅ [REGISTER] Role found:', userRole.name);

      // Create user with role
      console.log('👤 [REGISTER] Creating user with role');
      const user = await User.createWithRole({
        email: email.toLowerCase(),
        password,
        firstName,
        lastName
      }, role);
      console.log('✅ [REGISTER] User created successfully:', user.id);

      // Generate tokens
      console.log('🔑 [REGISTER] Generating tokens');
      const tokens = authService.generateTokens(user);
      console.log('✅ [REGISTER] Tokens generated successfully');

      // Log registration
      console.log('📝 [REGISTER] Logging registration action');
      await AuditLog.logUserAction(user, 'register', 'user', {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      console.log('✅ [REGISTER] Registration logged successfully');

      console.log('🎉 [REGISTER] Registration completed successfully');
      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        ...tokens
      });
    } catch (error) {
      console.error('💥 [REGISTER] Registration error:', error);
      console.error('📚 [REGISTER] Error stack:', error.stack);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to register user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async login(req, res) {
    console.log('🔄 [LOGIN] Starting login process');
    console.log('📥 [LOGIN] Request body:', { 
      email: req.body.email, 
      hasPassword: !!req.body.password,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    try {
      const { email, password } = req.body;

      // Validate required fields
      console.log('✅ [LOGIN] Validating required fields');
      if (!email || !password) {
        console.log('❌ [LOGIN] Missing required fields');
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Email and password are required'
        });
      }

      // Find user with roles
      console.log('🔍 [LOGIN] Finding user by email:', email);
      const user = await User.findByEmail(email);
      if (!user) {
        console.log('❌ [LOGIN] User not found:', email);
        return res.status(401).json({
          error: 'Authentication Error',
          message: 'Invalid email or password'
        });
      }
      console.log('✅ [LOGIN] User found:', { id: user.id, email: user.email, isActive: user.isActive });

      // Check if user is active
      console.log('✅ [LOGIN] Checking if user is active');
      if (!user.isActive) {
        console.log('❌ [LOGIN] User account is deactivated:', user.email);
        return res.status(401).json({
          error: 'Authentication Error',
          message: 'Account is deactivated'
        });
      }

      // Validate password
      console.log('🔒 [LOGIN] Validating password');
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        console.log('❌ [LOGIN] Invalid password for user:', user.email);
        return res.status(401).json({
          error: 'Authentication Error',
          message: 'Invalid email or password'
        });
      }
      console.log('✅ [LOGIN] Password validation successful');

      // Update last login time
      console.log('📅 [LOGIN] Updating last login time');
      try {
        await user.update({ lastLoginAt: new Date() });
        console.log('✅ [LOGIN] Last login time updated');
      } catch (updateError) {
        console.error('⚠️ [LOGIN] Failed to update last login time:', updateError);
        // Continue with login even if this fails
      }

      // Generate tokens
      console.log('🔑 [LOGIN] Generating tokens');
      let tokens;
      try {
        tokens = authService.generateTokens(user);
        console.log('✅ [LOGIN] Tokens generated successfully');
      } catch (tokenError) {
        console.error('💥 [LOGIN] Token generation failed:', tokenError);
        throw new Error('Token generation failed');
      }

      // Log login
      console.log('📝 [LOGIN] Logging user action');
      try {
        await AuditLog.logUserAction(user, 'login', 'user', {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        console.log('✅ [LOGIN] Login action logged successfully');
      } catch (auditError) {
        console.error('⚠️ [LOGIN] Failed to log audit action:', auditError);
        // Continue with login even if audit logging fails
      }

      console.log('🎉 [LOGIN] Login completed successfully');
      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        ...tokens
      });
    } catch (error) {
      console.error('💥 [LOGIN] Login error:', error);
      console.error('📚 [LOGIN] Error stack:', error.stack);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to authenticate user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Refresh token is required'
        });
      }

      const tokens = await authService.refreshAccessToken(refreshToken);

      res.json({
        message: 'Token refreshed successfully',
        ...tokens
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        error: 'Authentication Error',
        message: error.message
      });
    }
  }

  async logout(req, res) {
    try {
      // In a more advanced implementation, you might want to:
      // 1. Blacklist the token
      // 2. Store revoked tokens in Redis
      // 3. Clear any session data

      // Log logout
      if (req.user) {
        await AuditLog.logUserAction(req.user, 'logout', 'user', {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to logout user'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        include: ['roles']
      });

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      res.json({
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get user profile'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { firstName, lastName } = req.body;
      const updates = {};

      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'No valid fields to update'
        });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      await user.update(updates);

      // Log profile update
      await AuditLog.logUserAction(req.user, 'update', 'user', {
        changes: updates,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Profile updated successfully',
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update user profile'
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'New password must be at least 6 characters long'
        });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Validate current password
      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Authentication Error',
          message: 'Current password is incorrect'
        });
      }

      // Update password
      await user.update({ password: newPassword });

      // Log password change
      await AuditLog.logUserAction(req.user, 'change-password', 'user', {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to change password'
      });
    }
  }
}

module.exports = new AuthController();