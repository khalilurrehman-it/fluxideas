import { ApplicationBaseError } from "./ApplicationBaseError.js";
import { HTTP_STATUS_CODES } from "../constants/http-status-code.constants.js";

export class ResourceNotFoundError extends ApplicationBaseError {
  constructor(message: string) {
    super(message, HTTP_STATUS_CODES.NOT_FOUND);
  }
}
