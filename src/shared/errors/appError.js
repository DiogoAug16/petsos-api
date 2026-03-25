export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  getBody() {
    return {
      sucess: false,
      message: this.message,
      errorCode: this.errorCode,
    };
  }
}
