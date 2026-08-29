export class SyllabusOperatorError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SyllabusOperatorError";
    this.code = code;
  }
}
