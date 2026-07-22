// Shared layout injection is disabled.
// The checklist page now contains its navigation and footer directly,
// so it no longer depends on an Edge Function.

export default async (_request: Request, context: any) => {
  return context.next();
};

export const config = {
  path: ["/__disabled-shared-layout/*"],
};
