import { ZodError, type ZodObject, type ZodRawShape } from 'zod';

export function validateOrThrow(obj: object, schema: ZodObject<ZodRawShape>): void {
  schema.parse(obj);
}

export function manageFormError(
  error: unknown
): Record<string, string | string[] | undefined> {
  if (error instanceof ZodError) {
    return error.flatten().fieldErrors;
  }
  return {};
}
