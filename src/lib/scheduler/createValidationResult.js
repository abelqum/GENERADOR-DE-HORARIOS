export function createValidationResult({
  id,
  level,
  title,
  message,
  module,
  entityId = null,
  details = null,
}) {
  return {
    id,
    level,
    title,
    message,
    module,
    entityId,
    details,
  };
}