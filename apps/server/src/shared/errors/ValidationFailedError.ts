import { ApplicationBaseError } from "./ApplicationBaseError.js";
import { HTTP_STATUS_CODES } from "../constants/http-status-code.constants.js";

export class ValidationFailedError extends ApplicationBaseError {
  constructor(message: string) {
    super(message, HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY);
  }
}
