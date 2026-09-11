class ResponseFormatter {
  static success(res, data = {}, statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      statusCode,
      ...data
    });
  }

  static error(res, error, statusCode = 400) {
    return res.status(statusCode).json({
      status: 'error',
      statusCode,
      error,
      timestamp: new Date().toISOString()
    });
  }

  static unauthorized(res, reason = 'No autorizado') {
    return res.status(401).json({
      status: 'error',
      statusCode: 401,
      error: 'UNAUTHORIZED',
      message: reason,
      hint: 'Verifica que hayas incluido un token válido en el header Authorization',
      example: 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...',
      timestamp: new Date().toISOString()
    });
  }

  static forbidden(res, reason = 'Acceso denegado') {
    return res.status(403).json({
      status: 'error',
      statusCode: 403,
      error: 'FORBIDDEN',
      message: reason,
      timestamp: new Date().toISOString()
    });
  }

  static notFound(res, resource = 'Recurso') {
    return res.status(404).json({
      status: 'error',
      statusCode: 404,
      error: 'NOT_FOUND',
      message: `${resource} no encontrado`,
      timestamp: new Date().toISOString()
    });
  }

  static badRequest(res, message = 'Solicitud inválida', fields = {}) {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      error: 'BAD_REQUEST',
      message,
      fields: Object.keys(fields).length > 0 ? fields : undefined,
      timestamp: new Date().toISOString()
    });
  }

  static conflict(res, message = 'Conflicto') {
    return res.status(409).json({
      status: 'error',
      statusCode: 409,
      error: 'CONFLICT',
      message,
      timestamp: new Date().toISOString()
    });
  }

  static internalError(res, message = 'Error interno del servidor') {
    return res.status(500).json({
      status: 'error',
      statusCode: 500,
      error: 'INTERNAL_SERVER_ERROR',
      message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ResponseFormatter;
