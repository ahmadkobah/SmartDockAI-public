const authService = require('../services/AuthService');
const { User } = require('../models');

// Middleware to authenticate requests
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'No authorization header provided'
      });
    }

    const token = authService.extractTokenFromHeader(authHeader);
    const decoded = authService.verifyToken(token);

    // Get user from database to ensure they still exist and are active
    const user = await User.findByPk(decoded.id, {
      include: ['roles']
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'User not found or inactive'
      });
    }

    // Attach user to request object
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Authentication Error',
      message: error.message
    });
  }
};

// Middleware to check if user has specific permission
const authorize = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication Error',
          message: 'User not authenticated'
        });
      }

      // Check if user has the required permission through their roles
      const userRoles = req.user.roles || [];
      const hasPermission = userRoles.some(role => 
        role.hasPermission(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Authorization Error',
          message: `Insufficient permissions. Required: ${permission}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check permissions'
      });
    }
  };
};

// Middleware to check if user has any of the specified roles
const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication Error',
          message: 'User not authenticated'
        });
      }

      const userRoles = req.user.roles || [];
      const userRoleNames = userRoles.map(role => role.name);
      
      const hasRequiredRole = roleArray.some(role => 
        userRoleNames.includes(role)
      );

      if (!hasRequiredRole) {
        return res.status(403).json({
          error: 'Authorization Error',
          message: `Access denied. Required roles: ${roleArray.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role check failed:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check roles'
      });
    }
  };
};

// Middleware to check if user is admin
const requireAdmin = requireRole('admin');

// Middleware to check if user owns the resource or is admin
const requireOwnershipOrAdmin = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication Error',
          message: 'User not authenticated'
        });
      }

      // Check if user is admin
      const userRoles = req.user.roles || [];
      const isAdmin = userRoles.some(role => role.name === 'admin');
      
      if (isAdmin) {
        return next();
      }

      // Check if user owns the resource
      const resourceUserId = typeof getResourceUserId === 'function' 
        ? await getResourceUserId(req) 
        : getResourceUserId;

      if (req.user.id === resourceUserId) {
        return next();
      }

      return res.status(403).json({
        error: 'Authorization Error',
        message: 'Access denied. You can only access your own resources.'
      });
    } catch (error) {
      console.error('Ownership check failed:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check ownership'
      });
    }
  };
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authService.extractTokenFromHeader(authHeader);
    const decoded = authService.verifyToken(token);

    const user = await User.findByPk(decoded.id, {
      include: ['roles']
    });

    if (user && user.isActive) {
      req.user = user;
      req.token = token;
      req.tokenPayload = decoded;
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors, just continue without user
    console.warn('Optional auth failed:', error.message);
    next();
  }
};

// Rate limiting by user
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user ? req.user.id : req.ip;
    const now = Date.now();
    
    if (!requests.has(userId)) {
      requests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userRequests = requests.get(userId);
    
    if (now > userRequests.resetTime) {
      userRequests.count = 1;
      userRequests.resetTime = now + windowMs;
      return next();
    }

    if (userRequests.count >= maxRequests) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }

    userRequests.count++;
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requireRole,
  requireAdmin,
  requireOwnershipOrAdmin,
  optionalAuth,
  rateLimitByUser
};