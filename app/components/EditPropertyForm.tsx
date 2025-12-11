"use client";

import {useServerAction} from "@/app/components/hooks/use-server-action";
import {updateProperty} from "@/app/properties/actions";

export function EditPropertyForm({
                                   id,
                                   property,
                                 }: {
  id: string;
  property: Record<string, any>;
}) {
  const { run, isPending } = useServerAction(updateProperty, {
    successMessage: "Property updated successfully",
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    run(id, formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="name" defaultValue={property.name} className="border p-2 w-full" />
      <input name="address" defaultValue={property.address} className="border p-2 w-full" />
      <input name="city" defaultValue={property.city} className="border p-2 w-full" />
      <input name="state" defaultValue={property.state} className="border p-2 w-full" />
      <input name="zip" defaultValue={property.zip} className="border p-2 w-full" />
      <textarea name="notes" defaultValue={property.notes || ""} className="border p-2 w-full" />

      <button type="submit" disabled={isPending} className="btn">
        {isPending ? "Saving..." : "Update"}
      </button>
    </form>
  );
}
