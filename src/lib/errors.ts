export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}
export class UnauthenticatedError extends AppError {
  constructor(message = 'You must be signed in.') {
    super(message, 401, 'unauthenticated')
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 403, 'forbidden')
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super(message, 404, 'not_found')
  }
}
export class ValidationError extends AppError {
  constructor(message = 'Validation failed.') {
    super(message, 422, 'validation_error')
  }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflict.') {
    super(message, 409, 'conflict')
  }
}
export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429, 'rate_limited')
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'You do not have access to this resource.') {
    super(message, 403, 'unauthorized')
  }
}
