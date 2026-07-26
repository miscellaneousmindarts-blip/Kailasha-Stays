import "server-only";

import { revalidatePath } from "next/cache";

/** Call after any mutation that could change what the public site shows. */
export function revalidatePublicProperties() {
  revalidatePath("/(public)/properties", "page");
  revalidatePath("/(public)/properties/[slug]", "page");
}
