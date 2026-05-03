import { ApplicationBaseError } from "./ApplicationBaseError.js";
import { HTTP_STATUS_CODES } from "../constants/http-status-code.constants.js";

export class UnauthorizedAccessError extends ApplicationBaseError {
  constructor(message: string) {
    super(message, HTTP_STATUS_CODES.UNAUTHORIZED);
  }
}
